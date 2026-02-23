// よく見る予報地点をlocalStorageに保存する。officeコードと細分区域の添字、
// 表示名の3点で1件を表す。保存・検証は純粋に保ち、UIから切り離す。

export interface Favorite {
  /** 気象庁の予報区(office)コード。6桁 */
  office: string;
  /** 細分区域の添字 */
  areaIndex: number;
  /** チップに出す表示名 */
  label: string;
}

const KEY = 'tenki-favorites';
const MAX = 12;

export function favoriteId(office: string, areaIndex: number): string {
  return `${office}:${areaIndex}`;
}

export function isFavorite(list: Favorite[], office: string, areaIndex: number): boolean {
  return list.some((f) => f.office === office && f.areaIndex === areaIndex);
}

function isValid(value: unknown): value is Favorite {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.office === 'string' &&
    /^\d{6}$/.test(v.office) &&
    typeof v.areaIndex === 'number' &&
    Number.isInteger(v.areaIndex) &&
    v.areaIndex >= 0 &&
    typeof v.label === 'string'
  );
}

export function readFavorites(storage: Pick<Storage, 'getItem'>): Favorite[] {
  try {
    const raw = storage.getItem(KEY);
    if (raw === null) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(isValid).slice(0, MAX);
  } catch {
    return [];
  }
}

export function writeFavorites(storage: Pick<Storage, 'setItem'>, list: Favorite[]): void {
  try {
    storage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // 保存できない環境でも表示は続けられるので握り潰す。
  }
}

// 同じ地点があれば外し、なければ先頭へ加える(上限を超えた古いものは捨てる)。
export function toggleFavorite(list: Favorite[], fav: Favorite): Favorite[] {
  if (isFavorite(list, fav.office, fav.areaIndex)) {
    return list.filter((f) => !(f.office === fav.office && f.areaIndex === fav.areaIndex));
  }
  return [fav, ...list].slice(0, MAX);
}

export function removeFavorite(list: Favorite[], office: string, areaIndex: number): Favorite[] {
  return list.filter((f) => !(f.office === office && f.areaIndex === areaIndex));
}
