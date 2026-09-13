export interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
}

export function setupCanvas(canvas: HTMLCanvasElement): CanvasContext {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  return { canvas, ctx, width, height, dpr };
}

export function clearCanvas(cc: CanvasContext) {
  cc.ctx.clearRect(0, 0, cc.width, cc.height);
}

export interface ChartArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function getChartArea(width: number, height: number, padding?: Partial<ChartArea>): ChartArea {
  const p = { top: 50, right: 20, bottom: 40, left: 60, ...padding };
  return {
    top: p.top,
    right: width - p.right,
    bottom: height - p.bottom,
    left: p.left,
  };
}

export function mapX(
  value: number,
  minVal: number,
  maxVal: number,
  area: ChartArea
): number {
  if (maxVal === minVal) return area.left;
  return area.left + ((value - minVal) / (maxVal - minVal)) * (area.right - area.left);
}

export function mapY(
  value: number,
  minVal: number,
  maxVal: number,
  area: ChartArea
): number {
  if (maxVal === minVal) return area.bottom;
  return area.bottom - ((value - minVal) / (maxVal - minVal)) * (area.bottom - area.top);
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  area: ChartArea,
  xSteps: number,
  ySteps: number,
  color: string = '#e5e7eb'
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;

  for (let i = 0; i <= xSteps; i++) {
    const x = area.left + (i / xSteps) * (area.right - area.left);
    ctx.beginPath();
    ctx.moveTo(x, area.top);
    ctx.lineTo(x, area.bottom);
    ctx.stroke();
  }

  for (let i = 0; i <= ySteps; i++) {
    const y = area.top + (i / ySteps) * (area.bottom - area.top);
    ctx.beginPath();
    ctx.moveTo(area.left, y);
    ctx.lineTo(area.right, y);
    ctx.stroke();
  }
}

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  area: ChartArea,
  color: string = '#374151'
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(area.left, area.top);
  ctx.lineTo(area.left, area.bottom);
  ctx.lineTo(area.right, area.bottom);
  ctx.stroke();
}

export function drawLabels(
  ctx: CanvasRenderingContext2D,
  labels: { x: string[]; y: string[] },
  area: ChartArea,
  xValues: number[],
  yValues: number[],
  color: string = '#6b7280'
) {
  ctx.fillStyle = color;
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';

  const xStep = (area.right - area.left) / Math.max(1, labels.x.length - 1);
  labels.x.forEach((label, i) => {
    const x = area.left + i * xStep;
    ctx.fillText(label, x, area.bottom + 16);
  });

  ctx.textAlign = 'right';
  const yStep = (area.bottom - area.top) / Math.max(1, labels.y.length - 1);
  labels.y.forEach((label, i) => {
    const y = area.bottom - i * yStep;
    ctx.fillText(label, area.left - 8, y + 3);
  });
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toFixed(0);
}
