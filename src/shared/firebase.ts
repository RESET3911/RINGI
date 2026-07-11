// ⚠️ 自動配布ファイル — 直接編集しないこと！
// マスター: _Claude/ST_SHARED/shared/ を編集して `node ST_SHARED/sync.mjs` を実行
// ST APPS 共通: Firebase 初期化 + Google 認証
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut,
  onAuthStateChanged, setPersistence, browserLocalPersistence, type User,
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey: 'AIzaSyD46e6p6Kv_gLkEDtP1YIsaj8eqh_UBtQ4',
  authDomain: 'ringi-1b31a.firebaseapp.com',
  projectId: 'ringi-1b31a',
  storageBucket: 'ringi-1b31a.firebasestorage.app',
  messagingSenderId: '903432482546',
  appId: '1:903432482546:web:88186598c98486e514aa6b',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Firestoreルール(firestore.rules)と同じ許可リスト。変更時は両方更新すること。
export const ALLOWED_EMAILS = [
  'kenshin39cg@gmail.com',
  'kenshincoco911@gmail.com',
  'yukiyukiyu0312@gmail.com',
];

export function isAllowed(user: User | null): boolean {
  return !!user?.email && ALLOWED_EMAILS.includes(user.email);
}

export async function signInWithGoogle(): Promise<void> {
  await setPersistence(auth, browserLocalPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(auth, provider);
}

export function signOut(): Promise<void> {
  return fbSignOut(auth);
}

export function watchAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
