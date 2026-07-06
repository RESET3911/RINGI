/** ¥12,345 形式 */
export function yen(amount: number): string {
  return '¥' + Math.round(amount).toLocaleString('ja-JP');
}

/** 7/6(月) 形式 */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  const wd = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${wd})`;
}

/** 2026年7月6日 形式 */
export function longDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 7/6 14:30 形式 */
export function dateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

/** "2026-07" → 2026年7月 */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m, 10)}月`;
}
