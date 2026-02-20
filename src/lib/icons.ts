import type { WeatherCategory } from './weather';

// 天気アイコンはCSSクラスで配色するインラインSVG。
// 装飾なので aria-hidden を付け、ラベルはテキスト側で示す。
const ICONS: Record<WeatherCategory, string> = {
  sunny:
    '<circle cx="12" cy="12" r="4.6" class="icon-sun-core"/>' +
    '<g class="icon-sun-ray" stroke-linecap="round">' +
    '<path d="M12 3v2.6M12 18.4V21M3 12h2.6M18.4 12H21M5.6 5.6l1.9 1.9M16.5 16.5l1.9 1.9M18.4 5.6l-1.9 1.9M7.5 16.5l-1.9 1.9"/>' +
    '</g>',
  cloudy:
    '<path class="icon-cloud" d="M7 17.5a4 4 0 0 1-.4-8 5 5 0 0 1 9.7-1.2A3.8 3.8 0 0 1 16 17.5Z"/>',
  rainy:
    '<path class="icon-cloud" d="M7 14.5a4 4 0 0 1-.4-8 5 5 0 0 1 9.7-1.2A3.8 3.8 0 0 1 16 14.5Z"/>' +
    '<g class="icon-rain" stroke-linecap="round"><path d="M8.5 17.5 7.5 20M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/></g>',
  snowy:
    '<path class="icon-cloud" d="M7 14.5a4 4 0 0 1-.4-8 5 5 0 0 1 9.7-1.2A3.8 3.8 0 0 1 16 14.5Z"/>' +
    '<g class="icon-snow"><circle cx="8" cy="18.5" r="1.1"/><circle cx="12.5" cy="20" r="1.1"/><circle cx="16.5" cy="18.5" r="1.1"/></g>',
};

/** カテゴリに応じた天気アイコンのSVG文字列 */
export function weatherIcon(category: WeatherCategory, size = 24): string {
  return (
    `<svg class="weather-icon weather-icon-${category}" viewBox="0 0 24 24" ` +
    `width="${size}" height="${size}" aria-hidden="true">${ICONS[category]}</svg>`
  );
}
