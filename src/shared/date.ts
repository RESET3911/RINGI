// ⚠️ 自動配布ファイル — 直接編集しないこと！
// マスター: _Claude/ST_SHARED/shared/ を編集して `node ST_SHARED/sync.mjs` を実行
// ST APPS 共通: ローカル（日本時間）基準の日付ユーティリティ
// ※ toISOString() はUTCのため、JSTでは朝9時まで前日になる。必ずこちらを使う。
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** ローカル日付を YYYY-MM-DD で返す */
export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 今月を YYYY-MM で返す */
export function thisYM(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** 先月を YYYY-MM で返す */
export function prevYM(d: Date = new Date()): string {
  const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return thisYM(p);
}

/** YYYY-MM-DD に n 日足した YYYY-MM-DD を返す */
export function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

/** 今日0時から dateStr までの日数（過去は負） */
export function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}
