import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]+/g, '-').trim() || 'engineering-report';
}

const PRINT_CSS = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    padding: 24px;
    background: #ffffff;
    color: #0f172a;
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
    line-height: 1.45;
    width: 794px;
  }
  img, canvas { max-width: 100%; height: auto; display: block; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  svg { display: none !important; }
`;

/** Replace SVGs with canvas snapshots so capture does not choke. */
async function rasterizeSvgs(root: HTMLElement): Promise<void> {
  const svgs = Array.from(root.querySelectorAll('svg'));
  for (const svg of svgs) {
    try {
      const serializer = new XMLSerializer();
      let xml = serializer.serializeToString(svg);
      if (!xml.includes('xmlns=')) {
        xml = xml.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('SVG rasterize failed'));
        image.src = url;
      });
      URL.revokeObjectURL(url);

      const width = Math.max(img.naturalWidth || 640, 280);
      const height = Math.max(img.naturalHeight || 360, 160);
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(width, 1200);
      canvas.height = Math.min(height, 800);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        svg.remove();
        continue;
      }
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      svg.replaceWith(canvas);
    } catch {
      const note = document.createElement('p');
      note.textContent = '[Single-line diagram — open in app / use Print for full detail]';
      note.style.cssText = 'padding:12px;background:#0f172a;color:#94a3b8;font-size:11px;';
      svg.replaceWith(note);
    }
  }
}

function flattenCloneStyles(root: HTMLElement): void {
  const walk = (el: HTMLElement) => {
    const cs = window.getComputedStyle(el);
    el.style.backgroundColor = cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? '' : cs.backgroundColor;
    el.style.color = cs.color;
    el.style.borderColor = cs.borderColor;
    el.style.boxShadow = 'none';
    el.style.textShadow = 'none';
    el.style.filter = 'none';
    el.style.backdropFilter = 'none';
    el.style.transform = 'none';
    Array.from(el.children).forEach(child => {
      if (child instanceof HTMLElement) walk(child);
    });
  };
  walk(root);
}

function sliceCanvasToPdf(canvas: HTMLCanvasElement, filename: string): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Convert full canvas to JPEG once, then position across pages
  const imgData = canvas.toDataURL('image/jpeg', 0.86);

  let heightLeft = imgHeight;
  let y = margin;

  pdf.addImage(imgData, 'JPEG', margin, y, imgWidth, imgHeight);
  heightLeft -= contentHeight;

  while (heightLeft > 2) {
    y = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', margin, y, imgWidth, imgHeight);
    heightLeft -= contentHeight;
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Reliable PDF export: clone into an isolated iframe (avoids Tailwind oklch),
 * rasterize diagrams, then paginate with jsPDF.
 */
export async function exportReportPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const safeName = sanitizeFilename(filename);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'pdf-export');
  iframe.style.cssText =
    'position:fixed;left:-14000px;top:0;width:794px;height:1200px;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!idoc) {
    iframe.remove();
    throw new Error('Could not create PDF export frame.');
  }

  idoc.open();
  idoc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PRINT_CSS}</style></head><body></body></html>`
  );
  idoc.close();

  try {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll<HTMLElement>('[class*="print:hidden"]').forEach(el => {
      el.style.display = 'none';
    });
    // Drop absolute decorative overlays that confuse capture
    clone.querySelectorAll<HTMLElement>('.pointer-events-none').forEach(el => {
      if (el.className.includes('absolute')) el.style.display = 'none';
    });

    flattenCloneStyles(clone);
    const imported = idoc.importNode(clone, true);
    idoc.body.appendChild(imported);
    await rasterizeSvgs(idoc.body);

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const target = idoc.body;
    const canvas = await html2canvas(target, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
      width: 794,
      height: Math.min(target.scrollHeight || target.offsetHeight, 16000),
      foreignObjectRendering: false,
      onclone: clonedDoc => {
        const body = clonedDoc.body;
        body.style.width = '794px';
        body.style.background = '#ffffff';
      }
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('Empty PDF capture.');
    }

    sliceCanvasToPdf(canvas, safeName);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // Last-resort: open a print window so the user can still "Save as PDF"
    try {
      const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
      if (win) {
        win.document.write(
          `<!DOCTYPE html><html><head><title>${safeName}</title><style>${PRINT_CSS}</style></head><body></body></html>`
        );
        const clone = element.cloneNode(true) as HTMLElement;
        clone.querySelectorAll<HTMLElement>('[class*="print:hidden"]').forEach(el => {
          el.style.display = 'none';
        });
        win.document.body.appendChild(clone);
        win.document.close();
        win.focus();
        win.print();
        throw new Error(
          `Direct PDF download failed (${detail}). A print window was opened — choose "Save as PDF".`
        );
      }
    } catch (inner) {
      if (inner instanceof Error && inner.message.includes('Direct PDF')) throw inner;
    }
    throw new Error(
      `PDF export failed (${detail}). Try Print → Save as PDF from your browser.`
    );
  } finally {
    iframe.remove();
  }
}
