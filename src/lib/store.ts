import { db } from '../firebase';
import { doc, setDoc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { Settings, Application, User } from '../types';

export const defaultSettings: Settings = {
  userA: { name: 'Aさん', email: '' },
  userB: { name: 'Bさん', email: '' },
  monthlyIncome: 0,
  extraIncome: 0,
  fixedCosts: [],
  alertThresholdWarning: 0.30,
  alertThresholdDanger: 0.50,
  appIcon: '💑',
  ntfyTopic: '',
};

// ── Firestore（既存スキーマ互換） ───────────────────────────────
// settings:     doc  'ringi/settings'
// applications: coll 'applications'

/** Firestoreはundefinedを受け付けないため除去する */
function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await setDoc(doc(db, 'ringi', 'settings'), settings);
}

export async function saveApplication(app: Application): Promise<void> {
  await setDoc(doc(db, 'applications', app.id), stripUndefined(app));
}

export async function updateApplication(id: string, data: Partial<Application>): Promise<void> {
  await updateDoc(doc(db, 'applications', id), stripUndefined(data));
}

export function subscribeSettings(
  callback: (settings: Settings) => void,
  onError?: () => void
): () => void {
  return onSnapshot(
    doc(db, 'ringi', 'settings'),
    snap => {
      callback(snap.exists()
        ? { ...defaultSettings, ...(snap.data() as Settings) }
        : { ...defaultSettings });
    },
    () => onError?.()
  );
}

export function subscribeApplications(
  callback: (apps: Application[]) => void,
  onError?: () => void
): () => void {
  return onSnapshot(
    collection(db, 'applications'),
    snap => callback(snap.docs.map(d => d.data() as Application)),
    () => onError?.()
  );
}

export function isSettingsComplete(settings: Settings): boolean {
  return settings.monthlyIncome > 0 || settings.fixedCosts.length > 0;
}

// ── 自分がどちらか（この端末に記憶・全アプリ共通キー） ──────────
import { loadUser, saveUser, clearUser } from '../shared/users';

const LEGACY = { key: 'ringi_current_user', map: { A: 'kenshin', B: 'rena' } as Record<string, User> };

export function loadCurrentUser(): User | null {
  return loadUser(LEGACY);
}

export function saveCurrentUser(user: User | null): void {
  if (user) saveUser(user);
  else clearUser();
}
