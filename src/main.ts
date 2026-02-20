import './style.css';
import {
  AREA_URL,
  escapeHtml,
  forecastUrl,
  groupOffices,
  listForecastAreas,
  normalizeText,
  overviewUrl,
  parseForecast,
  renderTempChart,
  weatherCategory,
  weatherIcon,
  weatherLabel,
} from './lib';
import type { Dashboard, Overview, ShortTermDay } from './lib';

const dashboardEl = document.getElementById('dashboard')!;
const officeSelect = document.getElementById('office-select') as HTMLSelectElement;
const areaSelect = document.getElementById('area-select') as HTMLSelectElement;
const reloadButton = document.getElementById('reload-button')!;

const OFFICE_KEY = 'tenki-office';
const DEFAULT_OFFICE = '130000';

let currentOffice = DEFAULT_OFFICE;
let currentAreaIndex = 0;
let currentForecastRaw: unknown = null;
let currentOverview: Overview | null = null;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`取得に失敗 (${res.status})`);
  return res.json();
}

function dayHeading(date: string, index: number): string {
  const names = ['今日', '明日', '明後日'];
  const label = names[index] ?? '';
  const md = `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
  return label ? `${label} ${md}` : md;
}

function renderDayCard(day: ShortTermDay, index: number): string {
  const category = weatherCategory(day.weatherCode);
  const pops = day.pops
    .map(
      (p) =>
        `<div class="pop-slot"><span class="pop-time">${p.time}</span>` +
        `<span class="pop-bar" style="--pop:${p.pop}%"></span>` +
        `<span class="pop-value">${p.pop}%</span></div>`,
    )
    .join('');
  const temp =
    `<p class="temps">` +
    `<span class="temp-max">${day.tempMax !== null ? `${day.tempMax}°` : '--'}</span>` +
    ` / <span class="temp-min">${day.tempMin !== null ? `${day.tempMin}°` : '--'}</span>` +
    `</p>`;
  return (
    `<article class="card day-card">` +
    `<h2>${dayHeading(day.date, index)}</h2>` +
    `<div class="day-main">${weatherIcon(category, 56)}` +
    `<div><p class="weather-label">${escapeHtml(weatherLabel(day.weatherCode))}</p>${temp}</div></div>` +
    `<p class="weather-text">${escapeHtml(normalizeText(day.weatherText))}</p>` +
    (day.wind ? `<p class="wind">風: ${escapeHtml(normalizeText(day.wind))}</p>` : '') +
    (pops ? `<div class="pops" role="list" aria-label="時間帯別の降水確率">${pops}</div>` : '') +
    `</article>`
  );
}

function renderWeekly(dashboard: Dashboard): string {
  if (dashboard.weekly.length === 0) return '';
  const cells = dashboard.weekly
    .map((d) => {
      const category = weatherCategory(d.weatherCode);
      return (
        `<div class="weekly-cell" role="listitem">` +
        `<span class="weekly-date">${d.date.slice(5).replace('-', '/')}</span>` +
        `${weatherIcon(category, 32)}` +
        `<span class="weekly-pop">${d.pop !== null ? `${d.pop}%` : '--'}</span>` +
        `<span class="weekly-temp"><span class="temp-max">${d.tempMax ?? '--'}</span>/<span class="temp-min">${d.tempMin ?? '--'}</span></span>` +
        (d.reliability
          ? `<span class="weekly-rel" title="予報の信頼度">${d.reliability}</span>`
          : '<span class="weekly-rel"></span>') +
        `</div>`
      );
    })
    .join('');
  return (
    `<section class="card weekly-card">` +
    `<h2>週間予報${dashboard.tempAreaName ? `(気温: ${escapeHtml(dashboard.tempAreaName)})` : ''}</h2>` +
    `<div class="weekly-strip" role="list">${cells}</div>` +
    `<div class="chart-wrap">${renderTempChart(dashboard.weekly)}</div>` +
    `</section>`
  );
}

function renderDashboard(dashboard: Dashboard, overview: Overview | null): void {
  const updated = new Date(dashboard.reportDatetime).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const days = dashboard.days.slice(0, 3).map(renderDayCard).join('');
  const overviewHtml = overview
    ? `<section class="card overview-card"><h2>天気概況</h2>` +
      (overview.headlineText
        ? `<p class="headline">${escapeHtml(normalizeText(overview.headlineText))}</p>`
        : '') +
      `<p class="overview-text">${escapeHtml(overview.text).replace(/\n+/g, '</p><p class="overview-text">')}</p>` +
      `</section>`
    : '';
  dashboardEl.innerHTML =
    `<p class="meta">${escapeHtml(dashboard.areaName)} / ${escapeHtml(dashboard.publishingOffice)} ${updated}発表</p>` +
    `<div class="day-grid">${days}</div>` +
    renderWeekly(dashboard) +
    overviewHtml;
}

function renderError(message: string): void {
  dashboardEl.innerHTML =
    `<div class="card error-card"><p class="error">${escapeHtml(message)}</p>` +
    `<button id="retry-button" class="text-button" type="button">再試行</button></div>`;
  document.getElementById('retry-button')!.addEventListener('click', () => void load());
}

function syncAreaSelect(): void {
  const areas = listForecastAreas(currentForecastRaw);
  areaSelect.innerHTML = areas
    .map((a) => `<option value="${a.index}">${escapeHtml(a.name)}</option>`)
    .join('');
  if (currentAreaIndex >= areas.length) currentAreaIndex = 0;
  areaSelect.value = String(currentAreaIndex);
  areaSelect.hidden = areas.length <= 1;
}

function writeHash(): void {
  history.replaceState(null, '', `#a=${currentOffice}&i=${currentAreaIndex}`);
}

async function load(): Promise<void> {
  dashboardEl.innerHTML = '<p class="status">読み込み中...</p>';
  try {
    const [forecastRaw, overviewRaw] = await Promise.all([
      fetchJson(forecastUrl(currentOffice)),
      fetchJson(overviewUrl(currentOffice)).catch(() => null),
    ]);
    currentForecastRaw = forecastRaw;
    currentOverview = overviewRaw as Overview | null;
    syncAreaSelect();
    renderDashboard(parseForecast(forecastRaw, currentAreaIndex), currentOverview);
    localStorage.setItem(OFFICE_KEY, currentOffice);
    writeHash();
  } catch (err) {
    renderError(err instanceof Error ? err.message : '予報の取得に失敗しました');
  }
}

async function initOffices(): Promise<void> {
  try {
    const groups = groupOffices(await fetchJson(AREA_URL));
    officeSelect.innerHTML = groups
      .map(
        (g) =>
          `<optgroup label="${escapeHtml(g.name)}">` +
          g.offices
            .map((o) => `<option value="${o.code}">${escapeHtml(o.name)}</option>`)
            .join('') +
          `</optgroup>`,
      )
      .join('');
    officeSelect.value = currentOffice;
    if (officeSelect.value !== currentOffice) {
      officeSelect.value = DEFAULT_OFFICE;
      currentOffice = DEFAULT_OFFICE;
    }
  } catch {
    officeSelect.innerHTML = `<option value="${DEFAULT_OFFICE}">東京都</option>`;
  }
}

officeSelect.addEventListener('change', () => {
  currentOffice = officeSelect.value;
  currentAreaIndex = 0;
  void load();
});

areaSelect.addEventListener('change', () => {
  currentAreaIndex = Number(areaSelect.value);
  if (!currentForecastRaw) return;
  try {
    renderDashboard(parseForecast(currentForecastRaw, currentAreaIndex), currentOverview);
    writeHash();
  } catch {
    void load();
  }
});

reloadButton.addEventListener('click', () => void load());

// ---- 配色テーマ ----

const THEME_KEY = 'tenki-theme';
const themeToggle = document.getElementById('theme-toggle')!;

function applyTheme(theme: string | null): void {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

themeToggle.addEventListener('click', () => {
  const current =
    document.documentElement.getAttribute('data-theme') ??
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

applyTheme(localStorage.getItem(THEME_KEY));

// ---- 起動: ハッシュ > 保存値 > 既定 ----

const params = new URLSearchParams(location.hash.slice(1));
const hashOffice = params.get('a');
if (hashOffice && /^\d{6}$/.test(hashOffice)) {
  currentOffice = hashOffice;
} else {
  currentOffice = localStorage.getItem(OFFICE_KEY) ?? DEFAULT_OFFICE;
}
const hashIndex = Number(params.get('i'));
if (Number.isInteger(hashIndex) && hashIndex >= 0) currentAreaIndex = hashIndex;

void initOffices().then(load);
