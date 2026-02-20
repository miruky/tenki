import { describe, expect, it } from 'vitest';
import { renderTempChart } from './chart';
import type { WeeklyDay } from './types';

const day = (date: string, min: number | null, max: number | null): WeeklyDay => ({
  date,
  weatherCode: '100',
  pop: 10,
  tempMin: min,
  tempMax: max,
  reliability: 'A',
});

describe('renderTempChart', () => {
  it('最高・最低の2系列を折れ線で描く', () => {
    const svg = renderTempChart([
      day('2026-06-13', 18, 27),
      day('2026-06-14', 20, 28),
      day('2026-06-15', 19, 25),
    ]);
    expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 700 220"/);
    expect(svg.match(/chart-line chart-max/g)).toHaveLength(1);
    expect(svg.match(/chart-line chart-min/g)).toHaveLength(1);
    expect(svg.match(/class="chart-dot/g)).toHaveLength(6);
    expect(svg.match(/class="chart-date"/g)).toHaveLength(3);
    expect(svg).toContain('>06/13<');
  });

  it('欠測をまたぐと折れ線が分割される', () => {
    const svg = renderTempChart([
      day('2026-06-13', 18, 27),
      day('2026-06-14', 19, 26),
      day('2026-06-15', null, null),
      day('2026-06-16', 20, 28),
      day('2026-06-17', 21, 29),
    ]);
    expect(svg.match(/chart-line chart-max/g)).toHaveLength(2);
    expect(svg.match(/class="chart-dot/g)).toHaveLength(8);
  });

  it('先頭が欠測でも残りで描ける(週間予報の初日)', () => {
    const svg = renderTempChart([
      day('2026-06-13', null, null),
      day('2026-06-14', 20, 28),
      day('2026-06-15', 19, 27),
    ]);
    expect(svg.match(/chart-line chart-max/g)).toHaveLength(1);
  });

  it('データが空なら空状態の表示になる', () => {
    expect(renderTempChart([])).toContain('気温データがありません');
    expect(renderTempChart([day('2026-06-13', null, null)])).toContain('気温データがありません');
  });
});
