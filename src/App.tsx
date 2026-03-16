import { useState, useCallback, useEffect } from 'react';
import { User, Settings, Application } from './types';
import {
  defaultSettings,
  saveSettings,
  saveApplication,
  updateApplication,
  cancelApplication,
  subscribeSettings,
  subscribeApplications,
} from './utils/storage';
import { sendApplicationEmail, sendDecisionEmail } from './utils/email';
import HomeScreen from './components/HomeScreen';
import ApplicationScreen from './components/ApplicationScreen';
import ApprovalScreen from './components/ApprovalScreen';
import HistoryScreen from './components/HistoryScreen';
import SettingsScreen from './components/SettingsScreen';

type Screen = 'home' | 'apply' | 'approve' | 'history' | 'settings';

type ReapplyValues = { item: string; amount: number; reason?: string; reapplyFromId?: string };

export default function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [applications, setApplications] = useState<Application[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [loading, setLoading] = useState(true);
  const [reapplyValues, setReapplyValues] = useState<ReapplyValues | undefined>(undefined);

  useEffect(() => {
    const unsubSettings = subscribeSettings(s => {
      setSettings(s);
      setLoading(false);
    });
    const unsubApps = subscribeApplications(apps => {
      // onSnapshotの反映（サーバー確定データで上書き）
      setApplications(apps);
    });
    return () => { unsubSettings(); unsubApps(); };
  }, []);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setScreen('apply');
  };

  const handleSaveSettings = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  const handleSubmitApplication = useCallback((app: Application) => {
    setApplications(prev => [...prev, app]);
    saveApplication(app);
    sendApplicationEmail(app, settings).catch(() => {});
  }, [settings]);

  const handleDecide = useCallback((id: string, status: 'approved' | 'rejected', comment?: string) => {
    const decidedAt = new Date().toISOString();
    setApplications(prev =>
      prev.map(a => a.id === id ? { ...a, status, comment, decidedAt } : a)
    );
    updateApplication(id, { status, comment, decidedAt });
    const app = applications.find(a => a.id === id);
    if (app) sendDecisionEmail(app, status, comment, settings).catch(() => {});
  }, [applications, settings]);

  const handleCancel = useCallback((id: string) => {
    setApplications(prev =>
      prev.map(a => a.id === id ? { ...a, status: 'cancelled', decidedAt: new Date().toISOString() } : a)
    );
    cancelApplication(id);
    const app = applications.find(a => a.id === id);
    if (app) sendDecisionEmail(app, 'cancelled', undefined, settings).catch(() => {});
  }, [applications, settings]);

  const handleReapply = useCallback((app: Application) => {
    setReapplyValues({ item: app.item, amount: app.amount, reason: app.reason, reapplyFromId: app.id });
    setScreen('apply');
  }, []);

  const pendingForCurrent = currentUser
    ? applications.filter(a => a.status === 'pending' && a.applicant !== currentUser).length
    : 0;

  const tabs: { key: Screen; label: string; icon: string }[] = [
    { key: 'apply', label: '申請', icon: '📝' },
    { key: 'approve', label: `決裁${pendingForCurrent > 0 ? `(${pendingForCurrent})` : ''}`, icon: '🔖' },
    { key: 'history', label: '履歴', icon: '📋' },
    { key: 'settings', label: '設定', icon: '⚙️' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white">
        <div className="text-center">
          <div className="text-4xl mb-3">{defaultSettings.appIcon}</div>
          <p className="text-gray-500 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || screen === 'home') {
    return (
      <HomeScreen
        settings={settings}
        applications={applications}
        onSelectUser={handleSelectUser}
      />
    );
  }

  const userName = currentUser === 'A' ? settings.userA.name : settings.userB.name;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => { setCurrentUser(null); setScreen('home'); setReapplyValues(undefined); }}
            className="text-gray-500 p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <div className="text-center">
            <p className="font-bold text-gray-900 text-sm">{settings.appIcon} RINGI</p>
            <p className="text-xs text-primary-500">{userName}モード</p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Screen content */}
      <div className="max-w-lg mx-auto">
        {screen === 'apply' && (
          <ApplicationScreen
            currentUser={currentUser}
            settings={settings}
            onSubmit={handleSubmitApplication}
            initialValues={reapplyValues}
          />
        )}
        {screen === 'approve' && (
          <ApprovalScreen
            currentUser={currentUser}
            settings={settings}
            applications={applications}
            onDecide={handleDecide}
          />
        )}
        {screen === 'history' && (
          <HistoryScreen
            settings={settings}
            applications={applications}
            currentUser={currentUser}
            onReapply={handleReapply}
            onCancel={handleCancel}
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSave={handleSaveSettings}
          />
        )}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-10">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key !== 'apply') setReapplyValues(undefined);
                setScreen(tab.key);
              }}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 min-h-[60px] transition-colors ${
                screen === tab.key ? 'text-primary-500' : 'text-gray-400'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
