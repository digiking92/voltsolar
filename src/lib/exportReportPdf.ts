import html2pdf from 'html2pdf.js';

export async function exportReportPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const safeName = filename.replace(/[<>:"/\\|?*]+/g, '-').trim() || 'engineering-report';

  const hidden: { el: HTMLElement; display: string }[] = [];
  element.querySelectorAll<HTMLElement>('[class*="print:hidden"]').forEach(el => {
    hidden.push({ el, display: el.style.display });
    el.style.display = 'none';
  });

  try {
    // Options cast: html2pdf typings omit pagebreak in some resolutions
    await (html2pdf() as any)
      .set({
        margin: [10, 10, 12, 10],
        filename: `${safeName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(element)
      .save();
  } finally {
    hidden.forEach(({ el, display }) => {
      el.style.display = display;
    });
  }
}
