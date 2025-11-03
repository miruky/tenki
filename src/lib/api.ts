import type { OfficeGroup } from './types';

const BASE = 'https://www.jma.go.jp/bosai';

export const AREA_URL = `${BASE}/common/const/area.json`;

export function forecastUrl(officeCode: string): string {
  return `${BASE}/forecast/data/forecast/${officeCode}.json`;
}

export function overviewUrl(officeCode: string): string {
  return `${BASE}/forecast/data/overview_forecast/${officeCode}.json`;
}

interface RawAreaJson {
  centers: Record<string, { name: string; children?: string[] }>;
  offices: Record<string, { name: string }>;
}

/** area.json を「地方ごとの予報区一覧」へ整形する。コード順で安定させる */
export function groupOffices(raw: unknown): OfficeGroup[] {
  const data = raw as RawAreaJson;
  if (!data?.centers || !data?.offices) {
    throw new Error('地域定義の形式が想定と異なる');
  }
  return Object.entries(data.centers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, center]) => ({
      code,
      name: center.name,
      offices: (center.children ?? [])
        .filter((child) => data.offices[child])
        .map((child) => ({ code: child, name: data.offices[child]!.name })),
    }))
    .filter((group) => group.offices.length > 0);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
