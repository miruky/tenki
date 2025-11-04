import type { WeeklyDay } from './types';

const W = 700;
const H = 220;
const PAD = { top: 28, right: 28, bottom: 32, left: 40 };

function scaleX(i: number, count: number): number {
  if (count <= 1) return PAD.left;
  return PAD.left + (i * (W - PAD.left - PAD.right)) / (count - 1);
}

/** 欠測(null)をまたいだ折れ線を、連続区間ごとのpolylineに分けて作る */
function polylines(points: { x: number; y: number | null }[], className: string): string {
  const runs: string[][] = [[]];
  for (const p of points) {
    if (p.y === null) {
      if (runs[runs.length - 1]!.length > 0) runs.push([]);
    } else {
      runs[runs.length - 1]!.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
  }
  return runs
    .filter((run) => run.length >= 2)
    .map((run) => `<polyline class="${className}" points="${run.join(' ')}"/>`)
    .join('');
}

/** 週間の最高・最低気温を2本の折れ線で描く。DOM不要の純関数 */
export function renderTempChart(weekly: WeeklyDay[]): string {
  const values = weekly
    .flatMap((d) => [d.tempMin, d.tempMax])
    .filter((v): v is number => v !== null);
  if (weekly.length === 0 || values.length === 0) {
    return (
      `<svg class="tenki-chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ` +
      `role="img" aria-label="気温データなし"><text class="chart-empty" x="${W / 2}" y="${H / 2}" ` +
      `text-anchor="middle">気温データがありません</text></svg>`
    );
  }
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const scaleY = (v: number) => PAD.top + ((max - v) * (H - PAD.top - PAD.bottom)) / (max - min);

  const grid: string[] = [];
  const step = max - min > 16 ? 10 : 5;
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) {
    const y = scaleY(t);
    grid.push(
      `<line class="chart-grid" x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${W - PAD.right}" y2="${y.toFixed(1)}"/>`,
      `<text class="chart-tick" x="${PAD.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${t}</text>`,
    );
  }

  const maxPts = weekly.map((d, i) => ({
    x: scaleX(i, weekly.length),
    y: d.tempMax === null ? null : scaleY(d.tempMax),
  }));
  const minPts = weekly.map((d, i) => ({
    x: scaleX(i, weekly.length),
    y: d.tempMin === null ? null : scaleY(d.tempMin),
  }));

  const dots: string[] = [];
  const labels: string[] = [];
  weekly.forEach((d, i) => {
    const x = scaleX(i, weekly.length);
    if (d.tempMax !== null) {
      dots.push(
        `<circle class="chart-dot chart-max" cx="${x.toFixed(1)}" cy="${scaleY(d.tempMax).toFixed(1)}" r="3"/>`,
      );
      labels.push(
        `<text class="chart-value chart-max" x="${x.toFixed(1)}" y="${(scaleY(d.tempMax) - 8).toFixed(1)}" text-anchor="middle">${d.tempMax}</text>`,
      );
    }
    if (d.tempMin !== null) {
      dots.push(
        `<circle class="chart-dot chart-min" cx="${x.toFixed(1)}" cy="${scaleY(d.tempMin).toFixed(1)}" r="3"/>`,
      );
      labels.push(
        `<text class="chart-value chart-min" x="${x.toFixed(1)}" y="${(scaleY(d.tempMin) + 16).toFixed(1)}" text-anchor="middle">${d.tempMin}</text>`,
      );
    }
    labels.push(
      `<text class="chart-date" x="${x.toFixed(1)}" y="${H - 10}" text-anchor="middle">${d.date.slice(5).replace('-', '/')}</text>`,
    );
  });

  return (
    `<svg class="tenki-chart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ` +
    `role="img" aria-label="週間の最高気温と最低気温の推移">` +
    `<g>${grid.join('')}</g>` +
    polylines(maxPts, 'chart-line chart-max') +
    polylines(minPts, 'chart-line chart-min') +
    `<g>${dots.join('')}</g><g>${labels.join('')}</g>` +
    `</svg>`
  );
}
