import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD46e6p6Kv_gLkEDtP1YIsaj8eqh_UBtQ4",
  authDomain: "ringi-1b31a.firebaseapp.com",
  projectId: "ringi-1b31a",
  storageBucket: "ringi-1b31a.firebasestorage.app",
  messagingSenderId: "903432482546",
  appId: "1:903432482546:web:88186598c98486e514aa6b",
};

const app = initializeApp(firebaseConfig);

// iOS Safari対応：SingleTabManagerを使用
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({ forceOwnership: true }),
  }),
});
