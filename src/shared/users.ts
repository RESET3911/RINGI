// ⚠️ 自動配布ファイル — 直接編集しないこと！
// マスター: _Claude/ST_SHARED/shared/ を編集して `node ST_SHARED/sync.mjs` を実行
// ST APPS 共通: 正規ユーザーID（全アプリ・全Firestoreコレクションでこの2値のみ使う）
// 旧表記（saku/takahashi/A/B/けんしん/れな）は2026-07-11に廃止・移行済み。
export type UserId = 'kenshin' | 'rena';
export type UserOrBoth = UserId | 'both';
export type Owner = UserId | 'shared';

export const USER_IDS: readonly UserId[] = ['kenshin', 'rena'] as const;

export const USERS: Record<UserId, {
  name: string;        // 表示名
  short: string;       // 短い表示名
  emoji: string;
  colorFrom: string;   // グラデ起点（hex）
  colorTo: string;     // グラデ終点（hex）
}> = {
  kenshin: { name: 'けんしん',   short: 'けんしん', emoji: '👦', colorFrom: '#7c3aed', colorTo: '#4f46e5' },
  rena:    { name: 'れなちゃん', short: 'れな',     emoji: '🌸', colorFrom: '#be185d', colorTo: '#e11d48' },
};

export function other(u: UserId): UserId {
  return u === 'kenshin' ? 'rena' : 'kenshin';
}

export function ownerLabel(o: Owner): string {
  return o === 'shared' ? '共用' : USERS[o].name;
}

// ── ユーザー選択の永続化（全アプリ共通キー） ──────────────────────
// 一度どれかのアプリで選べば、同一オリジン(github.io)の全アプリで共有される。
const STORAGE_KEY = 'st_user';

export type LegacyUserStore = { key: string; map: Record<string, UserId> };

export function loadUser(legacy?: LegacyUserStore): UserId | null {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === 'kenshin' || v === 'rena') return v;
  if (legacy) {
    const lv = localStorage.getItem(legacy.key);
    const mapped = lv != null ? legacy.map[lv] : undefined;
    if (mapped) {
      saveUser(mapped);
      localStorage.removeItem(legacy.key);
      return mapped;
    }
  }
  return null;
}

export function saveUser(u: UserId): void {
  localStorage.setItem(STORAGE_KEY, u);
}

export function clearUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}
