import type { Dashboard, ShortTermDay, WeeklyDay } from './types';

interface RawArea {
  area: { name: string; code: string };
  weatherCodes?: string[];
  weathers?: string[];
  winds?: string[];
  pops?: string[];
  temps?: string[];
  tempsMin?: string[];
  tempsMax?: string[];
  reliabilities?: string[];
}

interface RawTimeSeries {
  timeDefines: string[];
  areas: RawArea[];
}

interface RawPart {
  publishingOffice: string;
  reportDatetime: string;
  timeSeries: RawTimeSeries[];
}

const dateOf = (iso: string) => iso.slice(0, 10);

const toNumber = (value: string | undefined): number | null => {
  if (value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** 系列ごとに地域数が違うため、添字は範囲内へ丸めて対応づける */
function areaAt(series: RawTimeSeries, index: number): RawArea {
  const area = series.areas[Math.min(index, series.areas.length - 1)];
  if (!area) throw new Error('予報データに地域がない');
  return area;
}

/**
 * 気象庁 forecast JSON をダッシュボード用モデルへ整形する。
 * [0]が向こう2-3日の詳細、[1]が週間予報という公開仕様に沿う。
 */
export function parseForecast(raw: unknown, areaIndex = 0): Dashboard {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('予報データの形式が想定と異なる');
  }
  const short = raw[0] as RawPart;
  const weatherSeries = short.timeSeries[0];
  if (!weatherSeries) throw new Error('天気の系列が見つからない');
  const popSeries = short.timeSeries[1];
  const tempSeries = short.timeSeries[2];
  const weatherArea = areaAt(weatherSeries, areaIndex);

  // 気温は「日付×(T00:00=最低, T09:00=最高)」の組で届く
  const tempsByDate = new Map<string, { min: number | null; max: number | null }>();
  if (tempSeries) {
    const tempArea = areaAt(tempSeries, areaIndex);
    tempSeries.timeDefines.forEach((iso, i) => {
      const date = dateOf(iso);
      const slot = tempsByDate.get(date) ?? { min: null, max: null };
      const value = toNumber(tempArea.temps?.[i]);
      if (iso.includes('T09:')) slot.max = value;
      else slot.min = value;
      tempsByDate.set(date, slot);
    });
  }

  const days: ShortTermDay[] = weatherSeries.timeDefines.map((iso, i) => {
    const date = dateOf(iso);
    const pops: ShortTermDay['pops'] = [];
    if (popSeries) {
      const popArea = areaAt(popSeries, areaIndex);
      popSeries.timeDefines.forEach((popIso, j) => {
        const pop = toNumber(popArea.pops?.[j]);
        if (dateOf(popIso) === date && pop !== null) {
          pops.push({ time: popIso.slice(11, 16), pop });
        }
      });
    }
    return {
      date,
      weatherCode: weatherArea.weatherCodes?.[i] ?? '',
      weatherText: weatherArea.weathers?.[i] ?? '',
      wind: weatherArea.winds?.[i] ?? '',
      pops,
      tempMin: tempsByDate.get(date)?.min ?? null,
      tempMax: tempsByDate.get(date)?.max ?? null,
    };
  });

  const weekly: WeeklyDay[] = [];
  const week = raw[1] as RawPart | undefined;
  let tempAreaName = '';
  if (week?.timeSeries[0]) {
    const weekWeather = week.timeSeries[0];
    const weekTemp = week.timeSeries[1];
    const weekArea = areaAt(weekWeather, areaIndex);
    const weekTempArea = weekTemp ? areaAt(weekTemp, areaIndex) : undefined;
    tempAreaName = weekTempArea?.area.name ?? '';
    weekWeather.timeDefines.forEach((iso, i) => {
      weekly.push({
        date: dateOf(iso),
        weatherCode: weekArea.weatherCodes?.[i] ?? '',
        pop: toNumber(weekArea.pops?.[i]),
        tempMin: toNumber(weekTempArea?.tempsMin?.[i]),
        tempMax: toNumber(weekTempArea?.tempsMax?.[i]),
        reliability: weekArea.reliabilities?.[i] ?? '',
      });
    });
  }

  return {
    publishingOffice: short.publishingOffice,
    reportDatetime: short.reportDatetime,
    areaName: weatherArea.area.name,
    tempAreaName,
    days,
    weekly,
  };
}

/** 地域選択肢: areas[0]の系列から (名前, 添字) を列挙する */
export function listForecastAreas(raw: unknown): { name: string; index: number }[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const series = (raw[0] as RawPart).timeSeries[0];
  if (!series) return [];
  return series.areas.map((a, index) => ({ name: a.area.name, index }));
}
