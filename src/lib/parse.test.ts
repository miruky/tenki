import { describe, expect, it } from 'vitest';
import { listForecastAreas, parseForecast } from './parse';
import { tokyoForecastFixture } from './fixture';

describe('parseForecast(東京都の実レスポンス)', () => {
  const dashboard = parseForecast(tokyoForecastFixture);

  it('発表元と対象地域を取り出す', () => {
    expect(dashboard.publishingOffice).toBe('気象庁');
    expect(dashboard.areaName).toBe('東京地方');
    expect(dashboard.tempAreaName).toBe('東京');
    expect(dashboard.reportDatetime).toMatch(/^2026-06-13T/);
  });

  it('短期予報は日付ごとに天気・風・降水確率がまとまる', () => {
    expect(dashboard.days).toHaveLength(2);
    const today = dashboard.days[0]!;
    expect(today.date).toBe('2026-06-13');
    expect(today.weatherCode).toBe('111');
    expect(today.weatherText).toContain('晴れ');
    expect(today.wind).toContain('風');
    expect(today.pops.map((p) => p.pop)).toEqual([10, 20, 20]);
    expect(today.pops[0]!.time).toBe('06:00');
  });

  it('気温はT00:00を最低・T09:00を最高として日付に対応づける', () => {
    expect(dashboard.days[0]!.tempMax).toBe(28);
    expect(dashboard.days[1]!.tempMin).toBe(20);
    expect(dashboard.days[1]!.tempMax).toBe(28);
  });

  it('週間予報7日分の天気・降水確率・気温・信頼度を取り出す', () => {
    expect(dashboard.weekly).toHaveLength(7);
    expect(dashboard.weekly[0]!.pop).toBeNull();
    const second = dashboard.weekly[1]!;
    expect(second.pop).toBe(30);
    expect(second.tempMin).toBe(20);
    expect(second.tempMax).toBe(28);
    expect(dashboard.weekly[2]!.reliability).toBe('C');
  });

  it('地域添字で別の予報区を選べる', () => {
    const izu = parseForecast(tokyoForecastFixture, 1);
    expect(izu.areaName).toBe('伊豆諸島北部');
    expect(izu.days[0]!.weatherCode).toBe('201');
  });

  it('系列ごとに地域数が違っても添字を丸めて対応づける', () => {
    const beyond = parseForecast(tokyoForecastFixture, 9);
    expect(beyond.areaName).toBe('伊豆諸島北部');
    expect(beyond.days[0]!.tempMin).not.toBeUndefined();
  });

  it('形式が異なる入力は例外', () => {
    expect(() => parseForecast(null)).toThrow('形式');
    expect(() => parseForecast([])).toThrow('形式');
    expect(() => parseForecast([{ timeSeries: [] }])).toThrow('系列');
  });
});

describe('listForecastAreas', () => {
  it('予報区の名前と添字を列挙する', () => {
    expect(listForecastAreas(tokyoForecastFixture)).toEqual([
      { name: '東京地方', index: 0 },
      { name: '伊豆諸島北部', index: 1 },
    ]);
  });

  it('不正な入力は空配列', () => {
    expect(listForecastAreas(undefined)).toEqual([]);
  });
});
