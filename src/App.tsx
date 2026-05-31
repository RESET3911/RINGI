import { useState, useCallback, useEffect } from 'react';
import { User, Settings, Application, RequestType, ReviewData } from './types';
import {
  defaultSettings,
  saveSettings,
  saveApplication,
  updateApplication,
  cancelApplication,
  subscribeSettings,
  subscribeApplications,
} from './utils/storage';
import { notifyApplication, notifyDecision } from './utils/notify';
import { pushToCashflow } from './utils/cashflow';
import Toast from './components/Toast';
import HomeScreen from './components/HomeScreen';
import ApplicationScreen from './components/ApplicationScreen';
import ApprovalScreen from './components/ApprovalScreen';
import HistoryScreen from './components/HistoryScreen';
import SettingsScreen from './components/SettingsScreen';

type Screen = 'home' | 'apply' | 'approve' | 'history' | 'settings';

type ReapplyValues = {
  item: string;
  amount: number;
  reason?: string;
  reapplyFromId?: string;
  requestType?: RequestType;
};

export default function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [applications, setApplications] = useState<Application[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [loading, setLoading] = useState(true);
  const [reapplyValues, setReapplyValues] = useState<ReapplyValues | undefined>(undefined);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  useEffect(() => {
    const unsubSettings = subscribeSettings(
      s => { setSettings(s); setLoading(false); },
      () => { setLoading(false); setErrorToast('DB接続エラー。Firebaseのルールを確認してください。'); }
    );
    const unsubApps = subscribeApplications(
      apps => setApplications(apps),
      () => setErrorToast('データ取得エラー。Firebaseのルールを確認してください。')
    );
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
    saveApplication(app).catch(() => setErrorToast('申請の保存に失敗しました'));
    notifyApplication(app, settings).catch(() => {});
  }, [settings]);

  // Feature B: 拡張された決裁ハンドラ
  const handleDecide = useCallback((
    id: string,
    status: 'approved' | 'rejected' | 'hold' | 'conditional' | 'discuss',
    comment?: string,
    conditionData?: { conditionType?: string | null; conditionText?: string | null; conditionAmount?: number | null }
  ) => {
    const decidedAt = new Date().toISOString();
    const update: Partial<Application> = { status, comment, decidedAt, ...conditionData };
    setApplications(prev =>
      prev.map(a => a.id === id ? { ...a, ...update } : a)
    );
    updateApplication(id, update);
    const app = applications.find(a => a.id === id);
    if (app) {
      notifyDecision(app, status, comment, settings).catch(() => {});
      if (status === 'approved' && app.cashflowCategory && app.cashflowCategory !== 'none') {
        pushToCashflow(
          { ...app, decidedAt },
          app.cashflowCategory,
          app.cashflowSubCategory ?? 'misc',
        ).catch(() => {});
      }
    }
  }, [applications, settings]);

  const handleCancel = useCallback((id: string) => {
    setApplications(prev =>
      prev.map(a => a.id === id ? { ...a, status: 'cancelled', decidedAt: new Date().toISOString() } : a)
    );
    cancelApplication(id);
    const app = applications.find(a => a.id === id);
    if (app) notifyDecision(app, 'cancelled', undefined, settings).catch(() => {});
  }, [applications, settings]);

  const handleReapply = useCallback((app: Application) => {
    // Feature B: 条件付き承認からの再申請時に条件文をreason先頭に追加
    const reason = app.status === 'conditional' && app.conditionText
      ? `[条件] ${app.conditionText}${app.reason ? '\n' + app.reason : ''}`.trim()
      : app.reason;
    setReapplyValues({ item: app.item, amount: app.amount, reason, reapplyFromId: app.id, requestType: app.requestType });
    setScreen('apply');
  }, []);

  // Feature C: 購入完了フラグ
  const handleMarkPurchased = useCallback((id: string) => {
    const purchasedAt = new Date().toISOString();
    setApplications(prev =>
      prev.map(a => a.id === id ? { ...a, isPurchased: true, purchasedAt } : a)
    );
    updateApplication(id, { isPurchased: true, purchasedAt });
  }, []);

  // Feature C: レビュー登録
  const handleSubmitReview = useCallback((id: string, review: ReviewData) => {
    setApplications(prev =>
      prev.map(a => a.id === id ? { ...a, review } : a)
    );
    updateApplication(id, { review });
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

  if (errorToast && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white p-6">
        <div className="card text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="font-bold text-gray-900 mb-2">接続エラー</p>
          <p className="text-sm text-gray-500">Firebaseのセキュリティルールを確認してください。</p>
        </div>
      </div>
    );
  }

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
            onMarkPurchased={handleMarkPurchased}
            onSubmitReview={handleSubmitReview}
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSave={handleSaveSettings}
          />
        )}
      </div>

      {errorToast && <Toast message={errorToast} type="error" onClose={() => setErrorToast(null)} />}

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
