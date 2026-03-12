import { Settings, Application } from '../types';

const SETTINGS_KEY = 'ringi_settings';
const APPLICATIONS_KEY = 'ringi_applications';

export const defaultSettings: Settings = {
  userA: { name: 'Aさん', email: '' },
  userB: { name: 'Bさん', email: '' },
  monthlyIncome: 0,
  extraIncome: 0,
  fixedCosts: [],
  alertThresholdWarning: 0.30,
  alertThresholdDanger: 0.50,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadApplications(): Application[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Application[];
  } catch {
    return [];
  }
}

export function saveApplications(apps: Application[]): void {
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(apps));
}

export function isSettingsComplete(settings: Settings): boolean {
  return settings.monthlyIncome > 0 || settings.fixedCosts.length > 0;
}
