import { db } from '../firebase';
import { doc, setDoc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { Settings, Application } from '../types';

export const defaultSettings: Settings = {
  userA: { name: 'Aさん', email: '' },
  userB: { name: 'Bさん', email: '' },
  monthlyIncome: 0,
  extraIncome: 0,
  fixedCosts: [],
  alertThresholdWarning: 0.30,
  alertThresholdDanger: 0.50,
  appIcon: '💑',
};

export async function saveSettings(settings: Settings): Promise<void> {
  await setDoc(doc(db, 'ringi', 'settings'), settings);
}

export async function saveApplication(app: Application): Promise<void> {
  await setDoc(doc(db, 'applications', app.id), app);
}

export async function updateApplication(
  id: string,
  data: Partial<Application>
): Promise<void> {
  await updateDoc(doc(db, 'applications', id), data);
}

export function subscribeSettings(
  callback: (settings: Settings) => void
): () => void {
  return onSnapshot(doc(db, 'ringi', 'settings'), snap => {
    if (snap.exists()) {
      callback({ ...defaultSettings, ...(snap.data() as Settings) });
    } else {
      callback({ ...defaultSettings });
    }
  });
}

export function subscribeApplications(
  callback: (apps: Application[]) => void
): () => void {
  return onSnapshot(collection(db, 'applications'), snap => {
    const apps = snap.docs.map(d => d.data() as Application);
    callback(apps);
  });
}

export function isSettingsComplete(settings: Settings): boolean {
  return settings.monthlyIncome > 0 || settings.fixedCosts.length > 0;
}
