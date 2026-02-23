import { describe, expect, it } from 'vitest';
import {
  favoriteId,
  isFavorite,
  readFavorites,
  removeFavorite,
  toggleFavorite,
  writeFavorites,
  type Favorite,
} from './favorites';

function store(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const tokyo: Favorite = { office: '130000', areaIndex: 0, label: '東京地方' };
const osaka: Favorite = { office: '270000', areaIndex: 1, label: '南部' };

describe('favoriteId / isFavorite', () => {
  it('officeと添字で一意のIDを作る', () => {
    expect(favoriteId('130000', 2)).toBe('130000:2');
  });

  it('一致する地点だけ真', () => {
    expect(isFavorite([tokyo], '130000', 0)).toBe(true);
    expect(isFavorite([tokyo], '130000', 1)).toBe(false);
  });
});

describe('toggleFavorite', () => {
  it('無ければ先頭に加える', () => {
    expect(toggleFavorite([tokyo], osaka)).toEqual([osaka, tokyo]);
  });

  it('あれば外す', () => {
    expect(toggleFavorite([osaka, tokyo], tokyo)).toEqual([osaka]);
  });

  it('上限12件を超えない', () => {
    const many: Favorite[] = Array.from({ length: 12 }, (_, i) => ({
      office: String(100000 + i).padStart(6, '0'),
      areaIndex: 0,
      label: `区域${i}`,
    }));
    const next = toggleFavorite(many, tokyo);
    expect(next).toHaveLength(12);
    expect(next[0]).toEqual(tokyo);
  });
});

describe('removeFavorite', () => {
  it('指定地点を取り除く', () => {
    expect(removeFavorite([osaka, tokyo], '270000', 1)).toEqual([tokyo]);
  });
});

describe('readFavorites / writeFavorites', () => {
  it('未設定は空配列', () => {
    expect(readFavorites(store())).toEqual([]);
  });

  it('保存して読み戻せる', () => {
    const s = store();
    writeFavorites(s, [tokyo, osaka]);
    expect(readFavorites(s)).toEqual([tokyo, osaka]);
  });

  it('壊れた要素は読み飛ばす', () => {
    const s = store({
      'tenki-favorites': JSON.stringify([tokyo, { office: 'xx' }, 42, { office: '130000' }]),
    });
    expect(readFavorites(s)).toEqual([tokyo]);
  });

  it('配列でなければ空', () => {
    expect(readFavorites(store({ 'tenki-favorites': '{"a":1}' }))).toEqual([]);
  });

  it('getItemが例外でも空を返す', () => {
    const broken = {
      getItem() {
        throw new Error('blocked');
      },
    };
    expect(readFavorites(broken)).toEqual([]);
  });
});
