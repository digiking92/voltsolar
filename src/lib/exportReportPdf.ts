import html2pdf from 'html2pdf.js';

function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]+/g, '-').trim() || 'engineering-report';
}

/** Replace SVGs with canvas snapshots so html2canvas does not choke. */
async function rasterizeSvgs(root: HTMLElement): Promise<void> {
  const svgs = Array.from(root.querySelectorAll('svg'));
  for (const svg of svgs) {
    try {
      const bbox = svg.getBoundingClientRect();
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

      const width = Math.max(
        Math.floor(bbox.width || img.naturalWidth || 800),
        320
      );
      const height = Math.max(
        Math.floor(bbox.height || img.naturalHeight || 420),
        180
      );
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        svg.remove();
        continue;
      }
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.className = svg.getAttribute('class') || '';
      svg.replaceWith(canvas);
    } catch {
      // Prefer a missing diagram over a total PDF failure.
      svg.remove();
    }
  }
}

/**
 * Inline computed rgb/hex colors so html2canvas does not parse modern
 * CSS color functions (oklch/lab) from Tailwind stylesheets.
 */
function flattenCloneStyles(root: HTMLElement): void {
  const walk = (el: HTMLElement) => {
    const cs = window.getComputedStyle(el);
    el.style.backgroundColor = cs.backgroundColor;
    el.style.color = cs.color;
    el.style.borderColor = cs.borderColor;
    el.style.boxShadow = 'none';
    el.style.textShadow = 'none';
    el.style.filter = 'none';
    el.style.backdropFilter = 'none';
    Array.from(el.children).forEach(child => {
      if (child instanceof HTMLElement) walk(child);
    });
  };
  walk(root);
}

export async function exportReportPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const safeName = sanitizeFilename(filename);

  // Work on an off-screen clone so UI stays intact and capture is more reliable
  const host = document.createElement('div');
  host.setAttribute('data-pdf-export-host', 'true');
  host.style.cssText =
    'position:fixed;left:-12000px;top:0;width:794px;padding:0;margin:0;background:#ffffff;z-index:-1;';
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>('[class*="print:hidden"]').forEach(el => {
    el.style.display = 'none';
  });
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    flattenCloneStyles(clone);
    await rasterizeSvgs(clone);
    // Allow layout/paint to settle after SVG → canvas swaps
    await new Promise(r => requestAnimationFrame(() => r(undefined)));

    // Modest scale avoids browser canvas size limits on long engineering reports
    await (html2pdf() as any)
      .set({
        margin: [10, 10, 12, 10],
        filename: `${safeName}.pdf`,
        image: { type: 'jpeg', quality: 0.88 },
        html2canvas: {
          scale: 1.2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: clone.scrollWidth || 794,
          foreignObjectRendering: false,
          removeContainer: true,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(clone)
      .save();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `PDF export failed (${detail}). Try again, or use Print → Save as PDF.`
    );
  } finally {
    host.remove();
  }
}
