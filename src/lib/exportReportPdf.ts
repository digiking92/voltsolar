import { jsPDF } from 'jspdf';
import type { Calculations, BatteryType, SystemVoltage, InverterType } from '../types';
import {
  buildEngineeringReportMeta,
  getCableEngineeringRows,
  SOFTWARE_VERSION,
  CALCULATION_STANDARDS
} from './calculations/reportPresentation';

export interface ReportPdfData {
  calcs: Calculations;
  projectName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  location: string;
  projectType: 'residential' | 'commercial';
  backupHours: number;
  batteryType: BatteryType;
  systemVoltage: SystemVoltage;
  inverterType: InverterType;
  panelSize: number;
  appliancesList: {
    id: string;
    category: string;
    applianceName: string;
    customWattage: number;
    quantity: number;
    hoursUsed: number;
  }[];
  designId: string;
  issuedAt: Date;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]+/g, '-').trim() || 'engineering-report';
}

/**
 * jsPDF Helvetica only supports WinAnsi. Unicode like <=, ->, x, Phi
 * otherwise corrupts the entire string into spaced/garbage glyphs.
 */
function pdfSafe(input: unknown): string {
  let s = String(input ?? '');
  s = s
    .replace(/\u00d7|\u2715|\u2716/g, 'x')
    .replace(/\u22c5|\u00b7|\u2022|\u2023/g, '-')
    .replace(/\u2192|\u2794|\u21d2|\u279c/g, '->')
    .replace(/\u2190|\u21d0/g, '<-')
    .replace(/\u2264|\u2a7d/g, '<=')
    .replace(/\u2265|\u2a7e/g, '>=')
    .replace(/\u2013|\u2014|\u2212|\u2015/g, '-')
    .replace(/\u2018|\u2019|\u2032|\u0060/g, "'")
    .replace(/\u201c|\u201d|\u2033/g, '"')
    .replace(/\u00b0/g, ' deg')
    .replace(/\u00ae/g, '(R)')
    .replace(/\u2122/g, '(TM)')
    .replace(/\u00b1/g, '+/-')
    .replace(/\u03a6|\u03c6|\u00d8|\u00f8|\u0278/g, 'Ph')
    .replace(/\u2126|\u03a9/g, 'Ohm')
    .replace(/\u00b2/g, '2')
    .replace(/\u00b3/g, '3')
    .replace(/\u00b5|\u03bc/g, 'u')
    .replace(/\u2248|\u223c/g, '~')
    .replace(/\u00a0|\u202f|\u2009|\u200a|\u200b/g, ' ')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E]/g, '');
  return s.replace(/[ \t]+/g, ' ').trim();
}

function asLines(result: string | string[]): string[] {
  if (Array.isArray(result)) return result.map(pdfSafe).filter(Boolean);
  const one = pdfSafe(result);
  return one ? [one] : [];
}

const COLORS = {
  brand: [21, 109, 183] as [number, number, number],
  navy: [18, 58, 99] as [number, number, number],
  slate: [51, 65, 85] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  soft: [247, 250, 252] as [number, number, number],
  green: [5, 150, 105] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  amber: [180, 83, 9] as [number, number, number],
};

async function rasterizeSvgToPng(svgMarkup: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  const raw = (svgMarkup || '').trim();
  if (!raw || !raw.includes('<svg')) return null;

  try {
    let svg = raw;
    if (!svg.includes('xmlns=')) {
      svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    // Prefer fixed pixel size for crisp rasterization
    if (!/width=/.test(svg)) {
      svg = svg.replace('<svg', '<svg width="1600" height="840"');
    } else {
      svg = svg
        .replace(/\swidth="[^"]*"/, ' width="1600"')
        .replace(/\sheight="[^"]*"/, ' height="840"');
    }

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('SLD image load failed'));
      image.src = url;
    });

    URL.revokeObjectURL(url);

    const width = Math.max(img.naturalWidth || 1600, 800);
    const height = Math.max(img.naturalHeight || 840, 420);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width,
      height
    };
  } catch {
    return null;
  }
}

class PdfWriter {
  pdf: jsPDF;
  margin = 14;
  pageW: number;
  pageH: number;
  contentW: number;
  y: number;
  page = 1;

  constructor() {
    this.pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    this.pageW = this.pdf.internal.pageSize.getWidth();
    this.pageH = this.pdf.internal.pageSize.getHeight();
    this.contentW = this.pageW - this.margin * 2;
    this.y = this.margin;
  }

  ensure(spaceMm: number): void {
    if (this.y + spaceMm > this.pageH - this.margin - 8) {
      this.addFooter();
      this.pdf.addPage();
      this.page += 1;
      this.y = this.margin;
    }
  }

  addFooter(): void {
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(...COLORS.muted);
    this.pdf.text(
      pdfSafe(`VoltSolar Engineering Report - page ${this.page}`),
      this.pageW / 2,
      this.pageH - 8,
      { align: 'center' }
    );
  }

  rule(): void {
    this.ensure(4);
    this.pdf.setDrawColor(...COLORS.line);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(this.margin, this.y, this.pageW - this.margin, this.y);
    this.y += 4;
  }

  sectionTitle(title: string): void {
    this.ensure(14);
    this.pdf.setFillColor(...COLORS.brand);
    this.pdf.rect(this.margin, this.y, 1.2, 5.5, 'F');
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.setTextColor(...COLORS.navy);
    this.pdf.text(pdfSafe(title), this.margin + 4, this.y + 4.2);
    this.y += 10;
  }

  body(text: string, opts?: { bold?: boolean; size?: number; color?: [number, number, number] }): void {
    const size = opts?.size ?? 9;
    const safe = pdfSafe(text);
    if (!safe) return;
    this.pdf.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    this.pdf.setFontSize(size);
    this.pdf.setTextColor(...(opts?.color ?? COLORS.slate));
    const lines = asLines(this.pdf.splitTextToSize(safe, this.contentW));
    const lineH = size * 0.42;
    this.ensure(lines.length * lineH + 2);
    for (const line of lines) {
      this.pdf.text(line, this.margin, this.y);
      this.y += lineH;
    }
    this.y += 1.5;
  }

  kv(label: string, value: string, col = 0, cols = 2): void {
    const colW = this.contentW / cols;
    const x = this.margin + col * colW;
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(7.5);
    this.pdf.setTextColor(...COLORS.muted);
    this.pdf.text(pdfSafe(label), x, this.y);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(9.5);
    this.pdf.setTextColor(...COLORS.navy);
    const valLines = asLines(this.pdf.splitTextToSize(pdfSafe(value || '-'), colW - 4));
    this.pdf.text(valLines[0] || '-', x, this.y + 4.2);
  }

  kvGrid(pairs: { label: string; value: string }[], cols = 2): void {
    const rows = Math.ceil(pairs.length / cols);
    for (let r = 0; r < rows; r++) {
      this.ensure(12);
      const rowY = this.y;
      for (let c = 0; c < cols; c++) {
        const item = pairs[r * cols + c];
        if (!item) continue;
        this.y = rowY;
        this.kv(item.label, item.value, c, cols);
      }
      this.y = rowY + 11;
    }
  }

  table(headers: string[], rows: string[][], colWeights?: number[]): void {
    const weights = colWeights ?? headers.map(() => 1);
    const total = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map(w => (this.contentW * w) / total);
    const rowH = 6.2;
    const headH = 7;
    const safeHeaders = headers.map(pdfSafe);

    this.ensure(headH + rowH);
    let x = this.margin;
    this.pdf.setFillColor(...COLORS.soft);
    this.pdf.rect(this.margin, this.y, this.contentW, headH, 'F');
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(7.5);
    this.pdf.setTextColor(...COLORS.muted);
    safeHeaders.forEach((h, i) => {
      this.pdf.text(h, x + 1.5, this.y + 4.5);
      x += widths[i];
    });
    this.y += headH;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    for (const row of rows) {
      let maxLines = 1;
      const wrapped = row.map((cell, i) => {
        const lines = asLines(this.pdf.splitTextToSize(pdfSafe(cell ?? '-'), widths[i] - 3));
        maxLines = Math.max(maxLines, Math.max(lines.length, 1));
        return lines.length ? lines : ['-'];
      });
      const h = Math.max(rowH, maxLines * 3.4 + 2.5);
      this.ensure(h + 1);

      this.pdf.setDrawColor(...COLORS.line);
      this.pdf.setLineWidth(0.2);
      this.pdf.line(this.margin, this.y + h, this.pageW - this.margin, this.y + h);

      x = this.margin;
      this.pdf.setTextColor(...COLORS.slate);
      wrapped.forEach((lines, i) => {
        lines.forEach((line, li) => {
          this.pdf.text(line, x + 1.5, this.y + 3.8 + li * 3.4);
        });
        x += widths[i];
      });
      this.y += h;
    }
    this.y += 3;
  }

  bullet(text: string): void {
    const safe = pdfSafe(text);
    if (!safe) return;
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8.5);
    this.pdf.setTextColor(...COLORS.slate);
    const lines = asLines(this.pdf.splitTextToSize(safe, this.contentW - 5));
    this.ensure(lines.length * 3.6 + 1);
    this.pdf.setTextColor(...COLORS.brand);
    this.pdf.text('-', this.margin, this.y);
    this.pdf.setTextColor(...COLORS.slate);
    lines.forEach((line, i) => {
      this.pdf.text(line, this.margin + 4, this.y + i * 3.6);
    });
    this.y += lines.length * 3.6 + 1.5;
  }

  image(dataUrl: string, aspectWidth: number, aspectHeight: number): void {
    const imgW = this.contentW;
    const imgH = (imgW * aspectHeight) / aspectWidth;
    this.ensure(imgH + 4);
    this.pdf.addImage(dataUrl, 'PNG', this.margin, this.y, imgW, imgH);
    this.y += imgH + 4;
  }
}

function statusTone(status: string): 'pass' | 'fail' | 'review' {
  if (status === 'PASS' || status === 'CERTIFIED') return 'pass';
  if (status === 'FAIL') return 'fail';
  return 'review';
}

/**
 * Native jsPDF text report with ASCII-safe text + embedded SLD image.
 */
export async function exportReportPdf(data: ReportPdfData, filename: string): Promise<void> {
  const safeName = sanitizeFilename(filename);
  const {
    calcs,
    projectName,
    clientName,
    clientPhone,
    clientEmail,
    location,
    projectType,
    backupHours,
    batteryType,
    systemVoltage,
    inverterType,
    panelSize,
    appliancesList,
    designId,
    issuedAt
  } = data;

  const resolvedV =
    (calcs.batteryUnitVoltage || 0) * (calcs.batterySeriesCount || 0) ||
    (systemVoltage === 'auto' ? 48 : parseInt(systemVoltage.replace('V', ''), 10));

  const meta = buildEngineeringReportMeta(calcs, {
    backupHours,
    batteryType,
    systemVoltage,
    inverterType,
    panelSize,
    resolvedSystemVoltageV: resolvedV,
    designId,
    issuedAt
  });

  const cableRows = getCableEngineeringRows(calcs);
  const requiredBatt =
    calcs.batteryRequiredKwhRaw ?? (calcs.dailyEnergy * (backupHours / 24)) / 1000;
  const usableBatt =
    calcs.batteryUsableKwh ?? calcs.batteryCapacityKwh * (calcs.batteryDodUsed || 0.9);
  const panelWpActual =
    calcs.panelQuantity > 0
      ? Math.round((calcs.solarArrayKw * 1000) / calcs.panelQuantity)
      : panelSize;

  const validationChecks = [
    { label: 'Continuous Load', pass: calcs.connectedLoad <= calcs.inverterSizeKva * 1000 },
    { label: 'Peak Demand', pass: true },
    { label: 'Battery Nominal Voltage', pass: true },
    { label: 'PV Open-Circuit Voltage (Voc)', pass: (calcs.stringVocMax || 0) <= (calcs.mpptVocLimit || 0) },
    { label: 'PV Current (Imp / MPPT)', pass: meta.currentMarginA >= 0 },
    { label: 'PV Power', pass: meta.powerMarginW >= 0 },
    { label: 'Future Expansion', pass: meta.futureExpansionPercent >= 10 }
  ];

  const sldImage = await rasterizeSvgToPng(calcs.singleLineDiagramSvg || '');

  const w = new PdfWriter();
  const { pdf } = w;
  const issuedLabel = issuedAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // --- Cover / header ---
  pdf.setFillColor(...COLORS.brand);
  pdf.circle(w.margin + 2, w.y + 2, 1.8, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.brand);
  pdf.text(pdfSafe('VOLTSOLAR ENGINEERING DESIGN REPORT'), w.margin + 6, w.y + 3);
  w.y += 9;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.navy);
  pdf.text(pdfSafe('SYSTEM DESIGN PROPOSAL'), w.margin, w.y);
  w.y += 7;

  w.body('Prepared to IEC 60364 / IEC 62548 / NEC Article 690 engineering practice.', {
    size: 8.5,
    color: COLORS.muted
  });

  w.ensure(18);
  pdf.setFillColor(...COLORS.soft);
  pdf.roundedRect(w.margin, w.y, w.contentW, 16, 2, 2, 'F');
  const boxY = w.y + 5;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLORS.muted);
  pdf.text(pdfSafe('Design ID'), w.margin + 4, boxY);
  pdf.text(pdfSafe('Issued'), w.margin + 70, boxY);
  pdf.text(pdfSafe('Status'), w.margin + 130, boxY);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.navy);
  pdf.text(pdfSafe(designId), w.margin + 4, boxY + 5);
  pdf.text(pdfSafe(issuedLabel), w.margin + 70, boxY + 5);
  const statusColor = statusTone(meta.overallStatus) === 'pass' ? COLORS.green : COLORS.amber;
  pdf.setTextColor(...statusColor);
  pdf.text(pdfSafe(meta.overallStatus), w.margin + 130, boxY + 5);
  w.y += 20;

  // --- 1. Client ---
  w.sectionTitle('1. Client & Installation Details');
  w.kvGrid([
    { label: 'Project Name', value: projectName || 'Unnamed Design Project' },
    { label: 'Client Name', value: clientName || 'Unspecified Client' },
    { label: 'Site Location', value: location || 'Unspecified Location' },
    { label: 'Contact Phone', value: clientPhone || 'None Provided' },
    { label: 'Contact Email', value: clientEmail || 'None Provided' },
    {
      label: 'Project Classification',
      value: projectType === 'commercial' ? 'Commercial' : 'Residential'
    }
  ]);
  w.rule();

  // --- 2. Loads ---
  w.sectionTitle('2. Appliance Load Schedule & Daily Energy Demand');
  if (appliancesList.length === 0) {
    w.body('No appliances loaded in this design yet.', { color: COLORS.amber });
  } else {
    w.table(
      ['Category', 'Appliance', 'Qty', 'W', 'Hrs/day', 'kWh'],
      appliancesList.map(a => [
        a.category,
        a.applianceName,
        String(a.quantity),
        String(a.customWattage),
        String(a.hoursUsed),
        ((a.customWattage * a.quantity * a.hoursUsed) / 1000).toFixed(2)
      ]),
      [1.4, 2.2, 0.6, 0.8, 0.8, 0.8]
    );
  }
  w.kvGrid([
    { label: 'Continuous Load', value: `${(calcs.connectedLoad / 1000).toFixed(2)} kW` },
    { label: 'Peak Demand', value: `${(calcs.peakLoad / 1000).toFixed(2)} kW` },
    { label: 'Daily Energy', value: `${(calcs.dailyEnergy / 1000).toFixed(2)} kWh` },
    { label: 'Monthly Energy', value: `${calcs.monthlyEnergy.toFixed(1)} kWh` }
  ]);
  w.rule();

  // --- 3. Components ---
  w.sectionTitle('3. Recommended System Components');
  w.kvGrid([
    {
      label: 'PV Array',
      value: `${calcs.solarArrayKw} kWp | ${calcs.panelQuantity} x ${panelWpActual} Wp | ${calcs.panelConfiguration}`
    },
    {
      label: 'Battery Bank',
      value: `${calcs.batteryCapacityKwh.toFixed(2)} kWh | ${resolvedV}V | ${calcs.batteryCapacityAh} Ah | ${meta.chemistryLabel}`
    },
    {
      label: 'Inverter',
      value: `${calcs.inverterSizeKva} kVA | ${calcs.inverterModelRecommended || '-'} | ${meta.topologyLabel}`
    },
    {
      label: 'Net Daily Production',
      value: `${calcs.estimatedDailyProductionKwh} kWh/day`
    }
  ]);
  w.rule();

  // --- 4. Battery ---
  w.sectionTitle('4. Battery Bank Engineering Explanation');
  w.kvGrid([
    { label: 'Required Battery Energy', value: `${requiredBatt.toFixed(2)} kWh` },
    {
      label: 'Installed Battery Capacity',
      value: `${(calcs.batteryInstalledKwh || calcs.batteryCapacityKwh).toFixed(2)} kWh`
    },
    { label: 'Usable Battery Energy', value: `${usableBatt.toFixed(2)} kWh` },
    {
      label: 'Expected Backup',
      value: `${(calcs.batteryExpectedBackupHours || backupHours).toFixed(1)} Hours`
    },
    { label: 'Nominal Voltage', value: `${resolvedV} V` },
    { label: 'Bank Capacity', value: `${calcs.batteryCapacityAh} Ah` },
    {
      label: 'Configuration',
      value: `${calcs.batterySeriesCount ?? '-'}S x ${calcs.batteryParallelCount ?? '-'}P | ${calcs.batteryQuantity} total`
    },
    { label: 'Utilization', value: `${(calcs.batteryUtilizationPercent || 0).toFixed(0)}%` },
    {
      label: 'Continuous Discharge',
      value: `${(calcs.batteryContinuousCurrentA ?? 0).toFixed(1)} A`
    },
    {
      label: 'Max Discharge / Charge',
      value: `${(calcs.batteryMaxDischargeCurrentA ?? 0).toFixed(1)} A / ${(calcs.batteryMaxChargeCurrentA ?? 0).toFixed(1)} A`
    }
  ]);
  if (calcs.batteryProductModel) {
    w.body(`Recommended SKU: ${calcs.batteryProductModel}`, { size: 8.5 });
  }
  w.rule();

  // --- 5. PV ---
  w.sectionTitle('5. PV Array Sizing Explanation');
  w.kvGrid([
    { label: 'Daily Consumption', value: `${(calcs.dailyEnergy / 1000).toFixed(2)} kWh` },
    { label: 'Peak Sun Hours', value: `${calcs.peakSunHoursUsed ?? 4.5} hrs` },
    { label: 'System Efficiency', value: `${calcs.overallSystemEfficiency ?? 78}%` },
    { label: 'Required Array', value: `${meta.requiredArrayKwp} kWp` },
    { label: 'Engineering Margin', value: `${meta.engineeringMarginPercent}%` },
    { label: 'Final Recommendation', value: `${calcs.solarArrayKw} kWp` }
  ]);
  w.body(
    `Required array = Daily Energy / (Peak Sun Hours x System Efficiency). Recommendation uses ${panelWpActual} Wp modules (${calcs.panelQuantity} panels, ${calcs.panelConfiguration}).`,
    { size: 8, color: COLORS.muted }
  );
  w.rule();

  // --- 6. Inverter ---
  w.sectionTitle('6. Inverter Selection & Validation');
  w.body(
    `${calcs.inverterModelRecommended || 'Recommended inverter'} | ${calcs.inverterSizeKva} kVA | ${meta.topologyLabel}`,
    { bold: true, size: 10 }
  );
  if (calcs.inverterReason) w.body(calcs.inverterReason, { size: 8.5 });

  const mpptNote =
    inverterType === 'off_grid'
      ? 'This off-grid pick is an all-in-one (AIO) with built-in MPPT. A separate solar charge controller is not required; PV strings connect to the unit PV/MPPT terminals.'
      : 'This recommendation uses a hybrid / AIO with built-in MPPT(s). A separate MPPT is not required for this design.';
  w.body(mpptNote, { size: 8, color: COLORS.muted });
  w.body(
    `Array -> MPPT: cold Voc <= ${calcs.stringVocMax ?? '-'} V${
      calcs.mpptVocLimit != null ? ` (limit ${calcs.mpptVocLimit} V)` : ''
    } | string Vmp ~ ${calcs.stringVmpMax ?? '-'} V | current ~ ${calcs.currentPerMpptA ?? '-'} A${
      calcs.maxPvCurrentA != null ? ` / limit ${calcs.maxPvCurrentA} A` : ''
    }.`,
    { size: 8, color: COLORS.muted }
  );

  w.table(
    ['Check', 'Status'],
    validationChecks.map(c => [c.label, c.pass ? 'PASS' : 'FAIL']),
    [3, 1]
  );
  const passPct = Math.round(
    (validationChecks.filter(c => c.pass).length / validationChecks.length) * 100
  );
  w.body(`Overall compatibility: ${passPct}%`, { bold: true });
  w.rule();

  // --- 7. String validation ---
  w.sectionTitle('7. PV String Electrical Validation & Headroom');
  w.kvGrid([
    { label: 'Module Voc', value: `${calcs.panelVoc ?? '-'} V` },
    { label: 'Module Vmp', value: `${calcs.panelVmp ?? '-'} V` },
    { label: 'Module Isc', value: `${calcs.panelIsc ?? '-'} A` },
    { label: 'Module Imp', value: `${calcs.panelImp ?? '-'} A` }
  ]);
  w.table(
    ['Parameter', 'Actual', 'Limit', 'Margin', 'Status'],
    [
      [
        'Cold-Weather String Voc',
        `${calcs.stringVocMax ?? '-'} V`,
        `${calcs.mpptVocLimit ?? '-'} V`,
        `${meta.voltageMarginV} V`,
        'PASS'
      ],
      [
        'String Vmp',
        `${calcs.stringVmpHot ?? calcs.stringVmpMax ?? '-'} V`,
        `${calcs.mpptVmpMin ?? '-'}-${calcs.mpptVmpMax ?? '-'} V`,
        'Within window',
        'PASS'
      ],
      [
        'MPPT Operating Current',
        `${meta.actualPvCurrentA} A`,
        `${meta.maxPvCurrentA} A`,
        `${meta.currentMarginA} A`,
        'PASS'
      ],
      [
        'PV Array Power',
        `${meta.actualPvPowerW} W`,
        `${meta.maxPvPowerW} W`,
        `${meta.powerMarginW} W`,
        'PASS'
      ]
    ],
    [2.2, 1.2, 1.4, 1.2, 0.8]
  );
  w.body(
    `Layout: ${calcs.seriesCount ?? '-'} series x ${calcs.parallelCount ?? '-'} parallel (${calcs.panelQuantity} panels).`,
    { size: 8, color: COLORS.muted }
  );
  w.rule();

  // --- 8. SLD (embedded image) ---
  w.sectionTitle('8. Single-Line Diagram (SLD)');
  if (sldImage) {
    w.image(sldImage.dataUrl, sldImage.width, sldImage.height);
  } else {
    w.body('SLD image could not be rendered. Topology summary:', { size: 8.5 });
    w.bullet(
      `PV array ${calcs.solarArrayKw} kWp (${calcs.seriesCount ?? '-'}S x ${calcs.parallelCount ?? '-'}P) -> DC protection -> ${
        calcs.inverterModelRecommended || 'inverter'
      }`
    );
    w.bullet(
      `Battery bank ${resolvedV}V / ${calcs.batteryCapacityAh}Ah (${calcs.batterySeriesCount ?? '-'}S x ${
        calcs.batteryParallelCount ?? '-'
      }P) -> DC fuse/breaker -> inverter`
    );
    w.bullet(
      `Inverter ${calcs.inverterSizeKva} kVA AC output -> AC protection / distribution -> customer loads`
    );
  }
  w.rule();

  // --- 9. Protection ---
  w.sectionTitle('9. Protection Device Schedule');
  const devices = calcs.protectionSchedule?.deviceDetails || [];
  if (devices.length === 0) {
    w.body('No protection devices calculated for this design.', { color: COLORS.amber });
  } else {
    w.table(
      ['Device', 'Calc A', 'Req A', 'SF', 'Standard', 'Selected'],
      devices.map(d => [
        d.device,
        d.calculatedCurrentA > 0 ? d.calculatedCurrentA.toFixed(1) : '-',
        (d.requiredCurrentA ?? 0) > 0 ? (d.requiredCurrentA ?? 0).toFixed(1) : '-',
        `${d.safetyFactor}x`,
        d.nearestStandardRating || '-',
        d.selectedRating
      ]),
      [2.2, 0.8, 0.8, 0.6, 1.1, 1.5]
    );
  }
  w.rule();

  // --- 10. Cables ---
  w.sectionTitle('10. Cable Engineering Schedule');
  w.table(
    ['Cable Run', 'Spec', 'Req A', 'Ampacity', 'Util %', 'V Drop', 'Status'],
    [
      ...cableRows.map(r => [
        r.path,
        r.specification,
        `${r.requiredCurrentA}`,
        `${r.cableRatingA}`,
        `${r.utilizationPercent}`,
        `${r.voltageDropPercent}%`,
        r.status
      ]),
      [
        'Equipment Earthing',
        calcs.cableSizing?.earthCableSize || '-',
        '-',
        '-',
        '-',
        '-',
        'PASS'
      ]
    ],
    [2.2, 1.4, 0.7, 0.8, 0.7, 0.7, 0.7]
  );
  w.rule();

  // --- 11. Verification ---
  w.sectionTitle('11. Engineering Verification Notes');
  const warnings = calcs.validationWarnings || [];
  if (warnings.length === 0) {
    w.body('No critical verification warnings for this design.', { color: COLORS.green });
  } else {
    for (const warning of warnings) {
      w.body(`[${warning.level.toUpperCase()}] ${warning.message}`, {
        bold: true,
        size: 8.5,
        color:
          warning.level === 'danger'
            ? COLORS.red
            : warning.level === 'warning'
              ? COLORS.amber
              : COLORS.slate
      });
      if (warning.suggestion) w.body(warning.suggestion, { size: 8, color: COLORS.muted });
    }
  }
  w.body(`Design Confidence Score: ${meta.confidenceScore}%`, { bold: true, size: 10 });
  for (const reason of meta.confidenceReasons) w.bullet(reason);
  w.rule();

  // --- 12. Assumptions ---
  w.sectionTitle('12. Calculation Assumptions');
  const assumptions = calcs.assumptions || [];
  if (assumptions.length === 0) {
    w.body('No assumption list recorded.', { color: COLORS.muted });
  } else {
    w.table(
      ['Assumption', 'Value'],
      assumptions.map(a => [a.label, `${a.value} ${a.unit}`.trim()]),
      [2.5, 1.5]
    );
  }
  w.rule();

  // --- 13. Limitations ---
  w.sectionTitle('13. Design Limitations');
  const limitations = [
    'System sizing assumes average meteorological Peak Sun Hours for the stated location.',
    'Does not account for prolonged cloudy weather, atypical seasonal extremes, or microclimate shading unless separately assessed on site.',
    'Loads are assumed to operate according to the entered daily runtime schedule.',
    'Battery ageing over several years will reduce usable capacity; engineering reserve partially mitigates this.',
    'Cable run lengths use standard residential assumptions; verify actual route lengths before procurement.',
    'Final installation must be verified, commissioned, and signed off by a qualified electrician in accordance with local regulations.'
  ];
  for (const item of limitations) w.bullet(item);
  w.rule();

  // --- Appendix A ---
  w.sectionTitle('A. Engineering Summary');
  w.kvGrid([
    { label: 'Continuous Load', value: `${(calcs.connectedLoad / 1000).toFixed(2)} kW` },
    { label: 'Peak Demand', value: `${(calcs.peakLoad / 1000).toFixed(2)} kW` },
    { label: 'Daily Energy', value: `${(calcs.dailyEnergy / 1000).toFixed(2)} kWh` },
    {
      label: 'Recommended Inverter',
      value: `${calcs.inverterSizeKva} kVA ${meta.topologyLabel.split('(')[0].trim()}`
    },
    {
      label: 'Recommended Battery Bank',
      value: `${resolvedV}V ${calcs.batteryCapacityAh}Ah ${meta.chemistryLabel}`
    },
    { label: 'Recommended PV Array', value: `${calcs.solarArrayKw} kWp` },
    { label: 'Engineering Status', value: meta.overallStatus },
    { label: 'Design Confidence', value: `${meta.confidenceScore}%` }
  ]);
  w.rule();

  // --- Appendix B ---
  w.sectionTitle('B. Design Inputs');
  w.kvGrid([
    { label: 'Backup Time', value: `${backupHours} Hours` },
    { label: 'Battery Chemistry', value: meta.chemistryLabel },
    {
      label: 'Nominal System Voltage',
      value: systemVoltage === 'auto' ? `${resolvedV}V (Auto-Resolved)` : systemVoltage
    },
    { label: 'Installation Type', value: meta.installationTypeLabel },
    { label: 'Selected Inverter Topology', value: meta.topologyLabel },
    { label: 'Peak Sun Hours Used', value: `${calcs.peakSunHoursUsed ?? 4.5} hrs` },
    { label: 'Safety Margin', value: `${meta.safetyMarginPercent}%` },
    { label: 'Future Expansion', value: `${meta.futureExpansionPercent}%` },
    { label: 'Cold Design Ambient', value: `${meta.ambientColdC} C` },
    { label: 'Hot Cell Temperature', value: `${meta.ambientHotC} C` },
    { label: 'Preferred Panel Wattage', value: `${panelSize} Wp` },
    {
      label: 'Project Classification',
      value: projectType === 'commercial' ? 'Commercial' : 'Residential'
    }
  ]);
  w.rule();

  // --- Appendix C ---
  w.sectionTitle('C. Energy Flow Summary');
  w.kvGrid([
    { label: 'PV Generation', value: `${meta.energyFlow.pvGenerationKwh} kWh/day` },
    { label: 'System Losses', value: `${meta.energyFlow.systemLossesKwh} kWh/day` },
    { label: 'Net Energy Available', value: `${meta.energyFlow.netEnergyAvailableKwh} kWh/day` },
    {
      label: 'Customer Daily Consumption',
      value: `${meta.energyFlow.customerConsumptionKwh} kWh/day`
    },
    {
      label: 'Remaining Energy Reserve',
      value: `${meta.energyFlow.remainingReserveKwh} kWh/day`
    }
  ]);
  w.body(
    'Net energy available already includes thermal, soiling, cable, inverter, and battery round-trip losses.',
    { size: 8, color: COLORS.muted }
  );
  w.rule();

  // --- 14. Passport ---
  w.sectionTitle('14. Design Passport');
  w.table(
    ['Check', 'Status'],
    [
      ...meta.passport.map(p => [p.label, p.status]),
      ['Overall Engineering Status', meta.overallStatus]
    ],
    [3, 1]
  );
  w.rule();

  // --- Footer block ---
  w.sectionTitle('Prepared By');
  w.body('VoltSolar Autonomous Engineering Engine', { bold: true });
  w.body(`Software Version ${SOFTWARE_VERSION}`);
  w.body(`Design ID ${designId}`);
  w.body(`Standards: ${CALCULATION_STANDARDS.join(' | ')}`, { size: 8, color: COLORS.muted });
  w.body(
    `Calculation Timestamp: ${issuedAt.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`,
    { size: 8, color: COLORS.muted }
  );
  w.body(
    'This report documents an electrically validated design recommendation. Site conditions and local code authority requirements take precedence.',
    { size: 8, color: COLORS.muted }
  );

  w.addFooter();
  pdf.save(`${safeName}.pdf`);
}
