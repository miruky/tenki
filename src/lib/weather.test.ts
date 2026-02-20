import { describe, expect, it } from 'vitest';
import { normalizeText, weatherCategory, weatherLabel } from './weather';

describe('weatherCategory', () => {
  it('百の位で晴・曇・雨・雪に分類する', () => {
    expect(weatherCategory('100')).toBe('sunny');
    expect(weatherCategory('201')).toBe('cloudy');
    expect(weatherCategory('313')).toBe('rainy');
    expect(weatherCategory('402')).toBe('snowy');
  });

  it('未知のコードはくもり扱いにする', () => {
    expect(weatherCategory('')).toBe('cloudy');
    expect(weatherCategory('999')).toBe('cloudy');
  });
});

describe('weatherLabel', () => {
  it('頻出コードに日本語ラベルを返す', () => {
    expect(weatherLabel('100')).toBe('晴れ');
    expect(weatherLabel('111')).toBe('晴れ後くもり');
    expect(weatherLabel('203')).toBe('くもり時々雨');
    expect(weatherLabel('400')).toBe('雪');
  });

  it('表にないコードは分類名へ落とす', () => {
    expect(weatherLabel('328')).toBe('雨');
    expect(weatherLabel('260')).toBe('くもり');
  });
});

describe('normalizeText', () => {
  it('全角スペースの連なりを1つの半角スペースへ畳む', () => {
    expect(normalizeText('晴れ　夕方　から　くもり')).toBe('晴れ 夕方 から くもり');
    expect(normalizeText('　北の風　後　南の風　')).toBe('北の風 後 南の風');
  });
});
