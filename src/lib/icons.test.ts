import { describe, expect, it } from 'vitest';
import { weatherIcon } from './icons';
import type { WeatherCategory } from './weather';

describe('weatherIcon', () => {
  it('4カテゴリすべてが装飾SVGとして描ける', () => {
    for (const category of ['sunny', 'cloudy', 'rainy', 'snowy'] as WeatherCategory[]) {
      const svg = weatherIcon(category);
      expect(svg).toMatch(/^<svg /);
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).toContain(`weather-icon-${category}`);
    }
  });

  it('サイズを指定できる', () => {
    expect(weatherIcon('sunny', 48)).toContain('width="48"');
  });

  it('雨と雪は雲とあわせて描く', () => {
    expect(weatherIcon('rainy')).toContain('icon-cloud');
    expect(weatherIcon('rainy')).toContain('icon-rain');
    expect(weatherIcon('snowy')).toContain('icon-snow');
  });
});
