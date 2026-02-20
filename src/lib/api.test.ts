import { describe, expect, it } from 'vitest';
import { AREA_URL, escapeHtml, forecastUrl, groupOffices, overviewUrl } from './api';

describe('エンドポイント', () => {
  it('予報区コードからURLを組み立てる', () => {
    expect(forecastUrl('130000')).toBe(
      'https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json',
    );
    expect(overviewUrl('270000')).toBe(
      'https://www.jma.go.jp/bosai/forecast/data/overview_forecast/270000.json',
    );
    expect(AREA_URL).toContain('/common/const/area.json');
  });
});

describe('groupOffices', () => {
  const areaJson = {
    centers: {
      '010300': { name: '関東甲信地方', children: ['130000', '140000', '999999'] },
      '010100': { name: '北海道地方', children: ['011000'] },
      '019999': { name: '空の地方', children: [] },
    },
    offices: {
      '130000': { name: '東京都' },
      '140000': { name: '神奈川県' },
      '011000': { name: '宗谷地方' },
    },
  };

  it('地方ごとに予報区をまとめ、コード順に並べる', () => {
    const groups = groupOffices(areaJson);
    expect(groups.map((g) => g.name)).toEqual(['北海道地方', '関東甲信地方']);
    expect(groups[1]!.offices).toEqual([
      { code: '130000', name: '東京都' },
      { code: '140000', name: '神奈川県' },
    ]);
  });

  it('officesに存在しない参照と空の地方は除外する', () => {
    const groups = groupOffices(areaJson);
    expect(groups.flatMap((g) => g.offices.map((o) => o.code))).not.toContain('999999');
    expect(groups.map((g) => g.name)).not.toContain('空の地方');
  });

  it('形式が異なる入力は例外', () => {
    expect(() => groupOffices(null)).toThrow('形式');
  });
});

describe('escapeHtml', () => {
  it('HTML特殊文字を実体参照にする', () => {
    expect(escapeHtml('<b>"&"</b>')).toBe('&lt;b&gt;&quot;&amp;&quot;&lt;/b&gt;');
  });
});
