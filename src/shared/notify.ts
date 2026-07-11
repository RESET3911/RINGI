// ⚠️ 自動配布ファイル — 直接編集しないこと！
// マスター: _Claude/ST_SHARED/shared/ を編集して `node ST_SHARED/sync.mjs` を実行
// ST APPS 共通: アプリ内通知（Firestore notifications）+ ntfy プッシュ
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { UserOrBoth } from './users';

export type NotifyApp =
  | 'ringi' | 'wishlist' | 'cashflow' | 'calendar'
  | 'hobby' | 'konomi' | 'setsu' | 'stock' | 'system';

/** HUBの通知センターに出る通知を書き込む */
export async function writeNotification(params: {
  toUser: UserOrBoth;
  fromApp: NotifyApp;
  type: string;
  title: string;
  body: string;
  linkedUrl?: string | null;
  linkedId?: string | null;
}): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    toUser: params.toUser,
    fromApp: params.fromApp,
    type: params.type,
    title: params.title,
    body: params.body,
    isRead: false,
    linkedUrl: params.linkedUrl ?? null,
    linkedId: params.linkedId ?? null,
    createdAt: Date.now(),
  });
}

/** ntfy.sh へプッシュ通知を送る */
export async function ntfyPush(topic: string, title: string, body: string): Promise<void> {
  if (!topic?.trim()) return;
  await fetch('https://ntfy.sh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: topic.trim(), title, message: body, priority: 3 }),
  });
}

/** 共有ntfyトピック（ringi/settings.ntfyTopic）を取得 */
export async function getSharedNtfyTopic(): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'ringi', 'settings'));
    return (snap.data()?.ntfyTopic as string) ?? '';
  } catch {
    return '';
  }
}
