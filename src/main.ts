import './style.css';
import {
  AREA_URL,
  escapeHtml,
  forecastUrl,
  groupOffices,
  isFavorite,
  listForecastAreas,
  normalizeText,
  overviewUrl,
  parseForecast,
  readFavorites,
  removeFavorite,
  renderTempChart,
  toggleFavorite,
  weatherCategory,
  weatherIcon,
  weatherLabel,
  writeFavorites,
} from './lib';
import type { Dashboard, Favorite, Overview, ShortTermDay } from './lib';

const dashboardEl = document.getElementById('dashboard')!;
const officeSelect = document.getElementById('office-select') as HTMLSelectElement;
const areaSelect = document.getElementById('area-select') as HTMLSelectElement;
const reloadButton = document.getElementById('reload-button')!;
const shareButton = document.getElementById('share-button')!;
const pinButton = document.getElementById('pin-button')!;
const favoritesBar = document.getElementById('favorites-bar')!;
const toolbarStatus = document.getElementById('toolbar-status')!;

const OFFICE_KEY = 'tenki-office';
const DEFAULT_OFFICE = '130000';
const STALE_MS = 30 * 60 * 1000;

let currentOffice = DEFAULT_OFFICE;
let currentAreaIndex = 0;
let currentForecastRaw: unknown = null;
let currentOverview: Overview | null = null;
let currentLabel = '';
let favorites = readFavorites(localStorage);
let lastLoadedAt = 0;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`取得に失敗 (${res.status})`);
  return res.json();
}

function dayHeading(date: string, index: number): string {
  const names = ['今日', '明日', '明後日'];
  const label = names[index] ?? '';
  const md = `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
  const weekday = new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(
    new Date(`${date}T00:00:00+09:00`),
  );
  return label ? `${label} ${md} ${weekday}` : `${md} ${weekday}`;
}

function renderDayCard(day: ShortTermDay, index: number): string {
  const category = weatherCategory(day.weatherCode);
  const primary = index === 0;
  const pops = day.pops
    .map(
      (p) =>
        `<div class="pop-slot"><span class="pop-time">${p.time}</span>` +
        `<span class="pop-bar" style="--pop:${p.pop}%"></span>` +
        `<span class="pop-value">${p.pop}%</span></div>`,
    )
    .join('');
  const temp =
    `<p class="temps" aria-label="最高気温と最低気温">` +
    `<span class="temp-max">${day.tempMax !== null ? `${day.tempMax}°` : '--'}</span>` +
    `<span class="temp-divider">/</span><span class="temp-min">${day.tempMin !== null ? `${day.tempMin}°` : '--'}</span>` +
    `</p>`;
  return (
    `<article class="day-card${primary ? ' is-primary' : ''}">` +
    `<header class="day-heading"><span>${dayHeading(day.date, index)}</span><small>${day.date}</small></header>` +
    `<div class="day-main">${weatherIcon(category, primary ? 104 : 58)}` +
    `<div class="weather-reading"><p class="weather-label">${escapeHtml(weatherLabel(day.weatherCode))}</p>${temp}</div></div>` +
    `<div class="day-copy"><p class="weather-text">${escapeHtml(normalizeText(day.weatherText))}</p>` +
    (day.wind ? `<p class="wind"><span>風</span>${escapeHtml(normalizeText(day.wind))}</p>` : '') +
    `</div>` +
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
    `<section class="forecast-section weekly-card">` +
    `<header class="section-heading"><div><span>Seven day outlook</span><h2>週間予報</h2></div>` +
    `<p>${dashboard.tempAreaName ? `気温観測地点 ${escapeHtml(dashboard.tempAreaName)}` : ''}</p></header>` +
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
  // 夕方以降は短期予報が2日分のことがある。枚数に合わせて段組を変え、空欄を残さない。
  const shownDays = dashboard.days.slice(0, 3);
  const days = shownDays.map(renderDayCard).join('');
  const maxPop = Math.max(
    0,
    ...dashboard.days.flatMap((day) => day.pops.map((entry) => entry.pop)),
    ...dashboard.weekly.map((day) => day.pop ?? 0),
  );
  const today = dashboard.days[0];
  const overviewHtml = overview
    ? `<section class="forecast-section overview-card"><header class="section-heading"><div><span>Forecast bulletin</span><h2>天気概況</h2></div></header>` +
      (overview.headlineText
        ? `<p class="headline">${escapeHtml(normalizeText(overview.headlineText))}</p>`
        : '') +
      `<p class="overview-text">${escapeHtml(overview.text).replace(/\n+/g, '</p><p class="overview-text">')}</p>` +
      `</section>`
    : '';
  dashboardEl.innerHTML =
    `<header class="dashboard-intro"><div><span class="dashboard-kicker">Current forecast</span>` +
    `<h1>${escapeHtml(dashboard.areaName)}</h1><p>${escapeHtml(dashboard.publishingOffice)}・${updated}発表</p></div>` +
    `<dl class="forecast-facts">` +
    `<div><dt>最高</dt><dd class="temp-max">${today?.tempMax ?? '--'}°</dd></div>` +
    `<div><dt>最低</dt><dd class="temp-min">${today?.tempMin ?? '--'}°</dd></div>` +
    `<div><dt>最大降水</dt><dd>${maxPop}%</dd></div>` +
    `<div><dt>予報日数</dt><dd>${dashboard.weekly.length}日</dd></div>` +
    `</dl></header>` +
    `<div class="day-grid day-grid-${Math.max(1, shownDays.length)}">${days}</div>` +
    renderWeekly(dashboard) +
    overviewHtml;
  toolbarStatus.textContent = `${dashboard.areaName}を表示中`;
  currentLabel = dashboard.areaName;
  updatePinState();
  renderFavorites();
}

function updatePinState(): void {
  const pinned = isFavorite(favorites, currentOffice, currentAreaIndex);
  pinButton.setAttribute('aria-pressed', String(pinned));
  const label = pinned ? 'この地域をお気に入りから外す' : 'この地域をお気に入りに追加する';
  pinButton.setAttribute('aria-label', label);
  pinButton.setAttribute('title', pinned ? 'お気に入りから外す' : 'お気に入りに追加');
}

const REMOVE_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true">' +
  '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

function renderFavorites(): void {
  if (favorites.length === 0) {
    favoritesBar.hidden = true;
    favoritesBar.innerHTML = '';
    return;
  }
  favoritesBar.hidden = false;
  favoritesBar.innerHTML =
    '<span class="favorites-label">お気に入り</span>' +
    favorites
      .map((f) => {
        const active = f.office === currentOffice && f.areaIndex === currentAreaIndex;
        return (
          `<span class="fav-chip${active ? ' is-active' : ''}">` +
          `<button type="button" class="fav-go" data-office="${f.office}" data-index="${f.areaIndex}">${escapeHtml(f.label)}</button>` +
          `<button type="button" class="fav-remove" data-office="${f.office}" data-index="${f.areaIndex}" aria-label="${escapeHtml(f.label)}をお気に入りから外す">${REMOVE_ICON}</button>` +
          `</span>`
        );
      })
      .join('');
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
  dashboardEl.innerHTML =
    '<div class="loading-shell" aria-label="予報を読み込み中"><span></span><span></span><span></span></div>';
  toolbarStatus.textContent = '予報を更新中';
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
    lastLoadedAt = Date.now();
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

pinButton.addEventListener('click', () => {
  const fav: Favorite = {
    office: currentOffice,
    areaIndex: currentAreaIndex,
    label: currentLabel || currentOffice,
  };
  favorites = toggleFavorite(favorites, fav);
  writeFavorites(localStorage, favorites);
  const added = isFavorite(favorites, currentOffice, currentAreaIndex);
  updatePinState();
  renderFavorites();
  toolbarStatus.textContent = added ? 'お気に入りに追加しました' : 'お気に入りから外しました';
});

favoritesBar.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const remove = target.closest<HTMLElement>('.fav-remove');
  if (remove) {
    favorites = removeFavorite(
      favorites,
      remove.dataset.office ?? '',
      Number(remove.dataset.index),
    );
    writeFavorites(localStorage, favorites);
    updatePinState();
    renderFavorites();
    return;
  }
  const go = target.closest<HTMLElement>('.fav-go');
  if (go) {
    currentOffice = go.dataset.office ?? DEFAULT_OFFICE;
    currentAreaIndex = Number(go.dataset.index);
    officeSelect.value = currentOffice;
    void load();
  }
});

shareButton.addEventListener('click', async () => {
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    toolbarStatus.textContent = '表示中の地域URLをコピーしました';
  } catch {
    toolbarStatus.textContent = 'アドレスバーのURLを共有してください';
  }
});

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

// ---- キーボード操作と再表示時の自動更新 ----

document.addEventListener('keydown', (e) => {
  const target = e.target;
  if (
    target instanceof HTMLElement &&
    (target.matches('input, select, textarea') || target.isContentEditable)
  ) {
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === 'r') {
    e.preventDefault();
    void load();
  } else if (key === 't') {
    e.preventDefault();
    themeToggle.click();
  } else if (key === 'f') {
    e.preventDefault();
    pinButton.click();
  }
});

// タブへ戻ったとき、最後の取得から時間が経っていれば静かに更新する。
document.addEventListener('visibilitychange', () => {
  if (
    document.visibilityState === 'visible' &&
    lastLoadedAt > 0 &&
    Date.now() - lastLoadedAt > STALE_MS
  ) {
    void load();
  }
});

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
