export type WeatherCategory = 'sunny' | 'cloudy' | 'rainy' | 'snowy';

// 気象庁の天気コードのうち頻出のものに日本語ラベルを与える。
// 表にないコードは百の位(1晴・2曇・3雨・4雪)で分類だけ行う。
const LABELS: Record<string, string> = {
  '100': '晴れ',
  '101': '晴れ時々くもり',
  '102': '晴れ一時雨',
  '103': '晴れ時々雨',
  '104': '晴れ一時雪',
  '110': '晴れ後時々くもり',
  '111': '晴れ後くもり',
  '112': '晴れ後一時雨',
  '114': '晴れ後雨',
  '115': '晴れ後一時雪',
  '117': '晴れ後雪',
  '200': 'くもり',
  '201': 'くもり時々晴れ',
  '202': 'くもり一時雨',
  '203': 'くもり時々雨',
  '204': 'くもり一時雪',
  '205': 'くもり時々雪',
  '210': 'くもり後時々晴れ',
  '211': 'くもり後晴れ',
  '212': 'くもり後一時雨',
  '214': 'くもり後雨',
  '215': 'くもり後一時雪',
  '217': 'くもり後雪',
  '300': '雨',
  '301': '雨時々晴れ',
  '302': '雨時々止む',
  '303': '雨時々雪',
  '304': '雨か雪',
  '311': '雨後晴れ',
  '313': '雨後くもり',
  '400': '雪',
  '401': '雪時々晴れ',
  '402': '雪時々止む',
  '403': '雪時々雨',
  '411': '雪後晴れ',
  '413': '雪後くもり',
};

const CATEGORY_NAMES: Record<WeatherCategory, string> = {
  sunny: '晴れ',
  cloudy: 'くもり',
  rainy: '雨',
  snowy: '雪',
};

export function weatherCategory(code: string): WeatherCategory {
  switch (code.charAt(0)) {
    case '1':
      return 'sunny';
    case '2':
      return 'cloudy';
    case '3':
      return 'rainy';
    case '4':
      return 'snowy';
    default:
      return 'cloudy';
  }
}

export function weatherLabel(code: string): string {
  return LABELS[code] ?? CATEGORY_NAMES[weatherCategory(code)];
}

/** 気象庁の文面に含まれる全角スペースの連なりを読みやすく整える */
export function normalizeText(text: string): string {
  return text.replace(/[\u3000 ]+/g, ' ').trim();
}
