import type { AnalyticsDimension, AnalyticsEvent, AnalyticsReport } from './analytics.api';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 38;
const COLORS = {
  background: '#081321', panel: '#10233A', panelAlt: '#152C44', text: '#E5F1F5', muted: '#91AAB8',
  line: '#29465B', accent: '#00C8C8', teal: '#008E99', red: '#D75454', orange: '#E27351', amber: '#E5A83A', green: '#31A48E',
};

function rgb(hex: string): string {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => (parseInt(value.slice(i, i + 2), 16) / 255).toFixed(3));
  return channels.join(' ');
}

function pdfString(value: string): string {
  const winAnsi: Record<string, number> = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f };
  return [...value].map((character) => {
    const code = character.codePointAt(0) ?? 63;
    const byte = winAnsi[character] ?? (code >= 32 && code <= 255 ? code : 63);
    return byte.toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}

function safe(value: unknown, fallback = '—'): string {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return text || fallback;
}

function textOp(value: string, x: number, top: number, size: number, color: string, bold = false): string {
  const font = bold ? 'F2' : 'F1';
  return `BT /${font} ${size} Tf ${rgb(color)} rg 1 0 0 1 ${x.toFixed(2)} ${(PAGE_HEIGHT - top).toFixed(2)} Tm <${pdfString(value)}> Tj ET`;
}

function textWidth(value: string, size: number): number {
  // Aproximación visual suficiente para los cortes y alineación de la tabla.
  return [...value].length * size * 0.51;
}

function clipped(value: string, maxWidth: number, size: number): string {
  let text = safe(value);
  while (text.length > 3 && textWidth(text, size) > maxWidth) text = `${text.slice(0, -2)}…`;
  return text;
}

function wrappedLines(value: string, maxWidth: number, size: number, maxLines = 2): string[] {
  const words = safe(value, '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, size) <= maxWidth || !current) current = candidate;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const visible = lines.slice(0, maxLines);
    visible[maxLines - 1] = clipped(`${visible[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, maxWidth, size);
    return visible;
  }
  return lines;
}

function rect(x: number, top: number, width: number, height: number, fill: string, stroke?: string, radius = 8): string {
  const y = PAGE_HEIGHT - top - height;
  const r = Math.min(radius, width / 2, height / 2);
  const k = 0.55228475 * r;
  const n = (value: number) => value.toFixed(2);
  const path = [
    `${n(x + r)} ${n(y)} m`, `${n(x + width - r)} ${n(y)} l`,
    `${n(x + width - r + k)} ${n(y)} ${n(x + width)} ${n(y + r - k)} ${n(x + width)} ${n(y + r)} c`,
    `${n(x + width)} ${n(y + height - r)} l`,
    `${n(x + width)} ${n(y + height - r + k)} ${n(x + width - r + k)} ${n(y + height)} ${n(x + width - r)} ${n(y + height)} c`,
    `${n(x + r)} ${n(y + height)} l`,
    `${n(x + r - k)} ${n(y + height)} ${n(x)} ${n(y + height - r + k)} ${n(x)} ${n(y + height - r)} c`,
    `${n(x)} ${n(y + r)} l`,
    `${n(x)} ${n(y + r - k)} ${n(x + r - k)} ${n(y)} ${n(x + r)} ${n(y)} c h`,
  ].join(' ');
  return `q ${rgb(fill)} rg ${stroke ? `${rgb(stroke)} RG 0.7 w` : ''} ${path} ${stroke ? 'B' : 'f'} Q`;
}

function line(x1: number, top1: number, x2: number, top2: number, color: string, width = 0.7): string {
  return `q ${rgb(color)} RG ${width} w ${x1.toFixed(2)} ${(PAGE_HEIGHT - top1).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE_HEIGHT - top2).toFixed(2)} l S Q`;
}

function formatDate(value?: string | null, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '—';
  return date.toLocaleString('es-CO', withTime
    ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' });
}

function sectionTitle(ops: string[], title: string, x: number, y: number, rightLabel?: string): void {
  ops.push(textOp(title, x, y, 10, COLORS.text, true));
  if (rightLabel) ops.push(textOp(rightLabel, PAGE_WIDTH - MARGIN - textWidth(rightLabel, 7), y, 7, COLORS.muted));
}

function drawBreakdown(ops: string[], x: number, top: number, width: number, title: string, entries: AnalyticsDimension[], color: (entry: AnalyticsDimension) => string = () => COLORS.accent): void {
  ops.push(textOp(title, x, top, 8, COLORS.text, true));
  const rows = entries.slice(0, 4);
  if (!rows.length) {
    ops.push(textOp('Sin datos en el periodo seleccionado.', x, top + 24, 7, COLORS.muted));
    return;
  }
  const max = Math.max(1, ...rows.map((entry) => entry.count));
  rows.forEach((entry, index) => {
    const y = top + 20 + index * 27;
    const name = clipped(entry.name || entry.code || 'Sin clasificar', width - 42, 7.2);
    ops.push(textOp(name, x, y, 7.2, COLORS.text));
    const countText = String(entry.count);
    ops.push(textOp(countText, x + width - textWidth(countText, 7.2), y, 7.2, COLORS.text, true));
    ops.push(rect(x, y + 6, width, 4, COLORS.panelAlt, undefined, 2));
    ops.push(rect(x, y + 6, Math.max(4, width * entry.count / max), 4, color(entry), undefined, 2));
  });
}

function drawChart(ops: string[], entries: AnalyticsReport['metrics']['byDay'], x: number, top: number, width: number): void {
  if (!entries.length) {
    ops.push(textOp('No se registraron eventos por dia durante el periodo.', x, top + 44, 8, COLORS.muted));
    return;
  }
  const max = Math.max(1, ...entries.map((entry) => entry.count));
  const plotTop = top + 15;
  const base = top + 78;
  const slot = width / entries.length;
  const barWidth = Math.max(1.5, Math.min(12, slot * 0.58));
  ops.push(line(x, base, x + width, base, COLORS.line, 0.8));
  const labelEvery = Math.max(1, Math.ceil(entries.length / 12));
  entries.forEach((entry, index) => {
    const barHeight = Math.max(2, (entry.count / max) * 48);
    const bx = x + index * slot + (slot - barWidth) / 2;
    ops.push(rect(bx, base - barHeight, barWidth, barHeight, COLORS.accent, undefined, Math.min(2, barWidth / 2)));
    if (index % labelEvery === 0 || index === entries.length - 1) {
      const date = new Date(`${entry.date}T00:00:00`);
      const label = Number.isNaN(date.valueOf()) ? entry.date : date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
      const labelWidth = textWidth(label, 5.8);
      ops.push(textOp(label, bx + barWidth / 2 - labelWidth / 2, base + 12, 5.8, COLORS.muted));
    }
    if (entries.length <= 14 && barWidth >= 7) {
      const count = String(entry.count);
      ops.push(textOp(count, bx + barWidth / 2 - textWidth(count, 6) / 2, Math.max(plotTop + 5, base - barHeight - 4), 6, COLORS.muted, true));
    }
  });
}

function createContent(report: AnalyticsReport): string {
  const ops: string[] = [];
  const x = MARGIN;
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const metrics = report.metrics;
  const scope = metrics.scope.adminView
    ? 'Vista administrativa'
    : `Mi cuenta - ${metrics.scope.deviceCount} dispositivo${metrics.scope.deviceCount === 1 ? '' : 's'} asignado${metrics.scope.deviceCount === 1 ? '' : 's'}`;
  const rangeStart = formatDate(report.range?.from ?? metrics.range.from);
  const rangeEnd = formatDate(report.range?.to ?? metrics.range.to);
  const period = rangeStart === rangeEnd ? rangeStart : `${rangeStart} a ${rangeEnd}`;
  const generated = formatDate(report.generatedAt ?? new Date().toISOString(), true);

  ops.push(`q ${rgb(COLORS.background)} rg 0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT} re f Q`);
  ops.push(rect(x, 27, 28, 28, COLORS.accent, undefined, 7));
  ops.push(textOp('S', x + 9.5, 46, 14, COLORS.background, true));
  ops.push(textOp('SOMNGUARD', x + 38, 43, 10, COLORS.text, true));
  ops.push(textOp('REPORTE DE ANALITICA', x, 82, 21, COLORS.text, true));
  ops.push(textOp('Actividad y eventos registrados en el periodo', x, 101, 8.5, COLORS.muted));
  ops.push(textOp('PLANTILLA A - RESUMEN EJECUTIVO', PAGE_WIDTH - MARGIN - textWidth('PLANTILLA A - RESUMEN EJECUTIVO', 6.5), 43, 6.5, COLORS.muted, true));

  const metaTop = 116;
  ops.push(rect(x, metaTop, contentWidth, 42, COLORS.panel, COLORS.line, 8));
  const meta = [
    { label: 'PERIODO', value: period, width: 220 },
    { label: 'ALCANCE', value: scope, width: 178 },
    { label: 'GENERADO', value: generated, width: contentWidth - 398 },
  ];
  let mx = x + 12;
  for (let i = 0; i < meta.length; i++) {
    const item = meta[i];
    if (i) ops.push(line(mx - 10, metaTop + 8, mx - 10, metaTop + 34, COLORS.line));
    ops.push(textOp(item.label, mx, metaTop + 15, 6, COLORS.muted, true));
    ops.push(textOp(clipped(item.value, item.width - 18, 7.3), mx, metaTop + 30, 7.3, COLORS.text, true));
    mx += item.width;
  }

  const gap = 9;
  const cardWidth = (contentWidth - gap * 3) / 4;
  const kpis = [
    { label: 'EVENTOS', value: String(metrics.totalEvents), detail: report.summary.trend ? `${report.summary.trend.delta > 0 ? '+' : ''}${report.summary.trend.delta} vs. periodo previo` : 'Total del periodo' },
    { label: 'DISPOSITIVOS', value: String(metrics.scope.deviceCount), detail: metrics.scope.adminView ? 'En alcance administrativo' : 'Asignados a mi cuenta' },
    { label: 'EVENTOS SIN CONEXION', value: `${(metrics.offlineSync.ratio * 100).toFixed(1)}%`, detail: `${metrics.offlineSync.offlineCount} guardados y sincronizados` },
    { label: 'VARIACION DE EVENTOS', value: report.summary.trend?.percentChange == null ? 'N/D' : `${report.summary.trend.percentChange > 0 ? '+' : ''}${report.summary.trend.percentChange.toFixed(1)}%`, detail: report.summary.trend ? `${report.summary.trend.currentTotal} vs. ${report.summary.trend.previousTotal} eventos` : 'Sin comparacion disponible' },
  ];
  kpis.forEach((item, index) => {
    const cx = x + index * (cardWidth + gap);
    ops.push(rect(cx, 169, cardWidth, 62, COLORS.panel, COLORS.line, 8));
    ops.push(textOp(item.label, cx + 10, 185, 6.1, COLORS.muted, true));
    ops.push(textOp(clipped(item.value, cardWidth - 18, 16), cx + 10, 207, 16, COLORS.text, true));
    ops.push(textOp(clipped(item.detail, cardWidth - 18, 6.1), cx + 10, 222, 6.1, COLORS.muted));
  });

  ops.push(rect(x, 243, contentWidth, 137, COLORS.panel, COLORS.line, 9));
  sectionTitle(ops, 'Actividad por dia', x + 13, 262, `${metrics.byDay.length} dias`);
  drawChart(ops, metrics.byDay, x + 15, 274, contentWidth - 30);

  const breakdownTop = 393;
  const panelGap = 12;
  const panelWidth = (contentWidth - panelGap) / 2;
  ops.push(rect(x, breakdownTop, panelWidth, 130, COLORS.panel, COLORS.line, 9));
  ops.push(rect(x + panelWidth + panelGap, breakdownTop, panelWidth, 130, COLORS.panel, COLORS.line, 9));
  const severityColors: Record<string, string> = { critical: COLORS.red, high: COLORS.orange, warning: COLORS.amber, info: COLORS.green };
  drawBreakdown(ops, x + 13, breakdownTop + 21, panelWidth - 26, 'EVENTOS POR SEVERIDAD', metrics.bySeverity,
    (entry) => severityColors[(entry.code ?? '').toLowerCase()] ?? COLORS.accent);
  drawBreakdown(ops, x + panelWidth + panelGap + 13, breakdownTop + 21, panelWidth - 26, 'EVENTOS POR CATEGORIA', metrics.byCategory);

  const recentTop = 539;
  const recentHeight = 190;
  ops.push(rect(x, recentTop, contentWidth, recentHeight, COLORS.panel, COLORS.line, 9));
  sectionTitle(ops, 'Eventos recientes', x + 13, recentTop + 21, `${Math.min(5, report.recentEvents.length)} de ${metrics.totalEvents}`);
  const tableX = x + 12;
  const tableTop = recentTop + 34;
  const tableWidth = contentWidth - 24;
  const rowHeight = 24;
  const columns = [94, 190, 126, tableWidth - 410];
  const headers = ['FECHA', 'EVENTO', 'DISPOSITIVO', 'SEVERIDAD'];
  ops.push(rect(tableX, tableTop, tableWidth, rowHeight * 6, COLORS.panel, COLORS.line, 6));
  ops.push(rect(tableX, tableTop, tableWidth, rowHeight, COLORS.panelAlt, undefined, 6));
  headers.forEach((header, index) => {
    const cx = tableX + columns.slice(0, index).reduce((sum, width) => sum + width, 0) + 7;
    ops.push(textOp(header, cx, tableTop + 17, 6, COLORS.muted, true));
  });
  const events: AnalyticsEvent[] = report.recentEvents.slice(0, 5);
  events.forEach((event, index) => {
    const rowTop = tableTop + rowHeight * (index + 1);
    if (index % 2 === 1) ops.push(`q ${rgb(COLORS.panelAlt)} rg ${tableX} ${PAGE_HEIGHT - rowTop - rowHeight} ${tableWidth} ${rowHeight} re f Q`);
    ops.push(line(tableX, rowTop + rowHeight, tableX + tableWidth, rowTop + rowHeight, COLORS.line, 0.45));
    const values = [formatDate(event.occurredAt, true), event.eventTypeName || event.eventTypeCode || 'Evento', event.deviceId || '—', event.severityName || event.severityCode || '—'];
    values.forEach((value, columnIndex) => {
      const cx = tableX + columns.slice(0, columnIndex).reduce((sum, width) => sum + width, 0) + 7;
      ops.push(textOp(clipped(value, columns[columnIndex] - 14, 6.7), cx, rowTop + 16, 6.7, COLORS.text));
    });
  });
  if (!events.length) ops.push(textOp('No hay eventos recientes para el periodo.', tableX + 8, tableTop + 47, 7, COLORS.muted));

  const highlights = [
    metrics.firstEventAt ? `Primer evento: ${formatDate(metrics.firstEventAt, true)}` : '',
    metrics.lastEventAt ? `Ultimo evento: ${formatDate(metrics.lastEventAt, true)}` : '',
    metrics.severityPriorityAvg != null ? `Prioridad media: ${metrics.severityPriorityAvg.toFixed(2)} (ordinal)` : '',
  ].filter(Boolean).join('  |  ');
  const notes = [
    'Sin conexion: son eventos guardados offline y sincronizados al recuperar internet; no mide tiempo desconectado.',
    'Variacion: compara el conteo con el periodo anterior; una baja no significa por si sola una mejora.',
    [highlights, metrics.severityPriorityNote, metrics.eventSpan?.note].filter(Boolean).join('  |  '),
  ].filter(Boolean);
  notes.forEach((note, index) => {
    const line = wrappedLines(note, contentWidth, 5.6, 1)[0];
    ops.push(textOp(line, x + 1, 739 + index * 8, 5.6, COLORS.muted));
  });
  ops.push(line(x, 763, PAGE_WIDTH - MARGIN, 763, COLORS.line, 0.6));
  ops.push(textOp('SomnGuard | Reporte descriptivo generado desde los datos de la API', x, 778, 6.2, COLORS.muted));
  ops.push(textOp('1', PAGE_WIDTH - MARGIN - 4, 778, 6.2, COLORS.muted));
  return ops.join('\n');
}

function makePdfBytes(content: string): Uint8Array {
  const encoder = new TextEncoder();
  const stream = `${content}\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`,
  ];
  let pdf = '%PDF-1.4\n%SomnGuard Analytics\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index++) {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(pdf);
}

export function downloadAnalyticsPdf(report: AnalyticsReport): void {
  const bytes = makePdfBytes(createContent(report));
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `somnguard-analitica-${date}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
