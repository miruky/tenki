/** 表示用に整形した短期予報の1日分 */
export interface ShortTermDay {
  /** YYYY-MM-DD */
  date: string;
  weatherCode: string;
  weatherText: string;
  wind: string;
  /** 6時間区切りの降水確率(%) */
  pops: { time: string; pop: number }[];
  tempMin: number | null;
  tempMax: number | null;
}

/** 週間予報の1日分 */
export interface WeeklyDay {
  date: string;
  weatherCode: string;
  pop: number | null;
  tempMin: number | null;
  tempMax: number | null;
  /** 予報の信頼度。A-C、空は未提供 */
  reliability: string;
}

/** ダッシュボード1画面分のモデル */
export interface Dashboard {
  publishingOffice: string;
  reportDatetime: string;
  areaName: string;
  tempAreaName: string;
  days: ShortTermDay[];
  weekly: WeeklyDay[];
}

/** 天気概況(overview_forecast) */
export interface Overview {
  targetArea: string;
  headlineText: string;
  text: string;
  reportDatetime: string;
}

/** 地域選択用にまとめた予報区 */
export interface OfficeGroup {
  code: string;
  name: string;
  offices: { code: string; name: string }[];
}
