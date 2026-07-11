import { useState, useCallback, useEffect } from 'react';
import { User, Settings, Application, RequestType, ReviewData, DecisionStatus, otherUser, userMeta } from './types';
import {
  defaultSettings, saveSettings, saveApplication, updateApplication,
  subscribeSettings, subscribeApplications, loadCurrentUser, saveCurrentUser,
} from './lib/store';
import { notifyApplication, notifyDecision } from './lib/notify';
import { pushToCashflow } from './lib/cashflow';
import Toast from './components/ui/Toast';
import HubButton from './components/ui/HubButton';
import Medallion from './components/ui/Medallion';
import Stamp from './components/ui/Stamp';
import Home from './screens/Home';
import Apply from './screens/Apply';
import Decide from './screens/Decide';
import History from './screens/History';
import SettingsScreen from './screens/Settings';

export type Tab = 'home' | 'apply' | 'decide' | 'history' | 'settings';

export type ReapplyValues = {
  item: string;
  amount: number;
  reason?: string;
  reapplyFromId?: string;
  requestType?: RequestType;
};

const TABS: { key: Tab; kanji: string; label: string }[] = [
  { key: 'home',     kanji: '家', label: 'ホーム' },
  { key: 'apply',    kanji: '申', label: '申請' },
  { key: 'decide',   kanji: '裁', label: '決裁' },
  { key: 'history',  kanji: '歴', label: '履歴' },
  { key: 'settings', kanji: '設', label: '設定' },
];

export default function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [applications, setApplications] = useState<Application[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(loadCurrentUser());
  const [tab, setTab] = useState<Tab>('home');
  const [loading, setLoading] = useState(true);
  const [reapplyValues, setReapplyValues] = useState<ReapplyValues | undefined>(undefined);
  const [toast, setToast] = useState<{ msg: string; type?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const unsubSettings = subscribeSettings(
      s => { setSettings(s); setLoading(false); },
      () => { setLoading(false); setToast({ msg: 'DB接続エラー。Firebaseのルールを確認してください。', type: 'error' }); }
    );
    const unsubApps = subscribeApplications(
      apps => setApplications(apps),
      () => setToast({ msg: 'データ取得エラー', type: 'error' })
    );
    return () => { unsubSettings(); unsubApps(); };
  }, []);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    saveCurrentUser(user);
  };

  const handleSwitchUser = () => {
    if (!currentUser) return;
    const next: User = otherUser(currentUser);
    handleSelectUser(next);
    const name = userMeta(settings, next).name;
    setToast({ msg: `${name} に切り替えました` });
  };

  const handleSaveSettings = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings).catch(() => setToast({ msg: '設定の保存に失敗しました', type: 'error' }));
  }, []);

  const handleSubmitApplication = useCallback((app: Application) => {
    setApplications(prev => [...prev, app]);
    setReapplyValues(undefined);
    saveApplication(app).catch(() => setToast({ msg: '申請の保存に失敗しました', type: 'error' }));
    notifyApplication(app, settings).catch(() => {});
  }, [settings]);

  const handleDecide = useCallback((
    app: Application,
    status: DecisionStatus,
    comment?: string,
    conditionData?: { conditionType?: string | null; conditionText?: string | null; conditionAmount?: number | null }
  ) => {
    const decidedAt = new Date().toISOString();
    const update: Partial<Application> = { status, comment, decidedAt, ...conditionData };
    const updated = { ...app, ...update };
    setApplications(prev => prev.map(a => a.id === app.id ? updated : a));
    updateApplication(app.id, update).catch(() => setToast({ msg: '決裁の保存に失敗しました', type: 'error' }));
    notifyDecision(updated, status, comment, settings).catch(() => {});
    if (status === 'approved' && app.cashflowCategory && app.cashflowCategory !== 'none') {
      pushToCashflow(updated, app.cashflowCategory, app.cashflowSubCategory ?? 'misc').catch(() => {});
    }
  }, [settings]);

  const handleCancel = useCallback((app: Application) => {
    const decidedAt = new Date().toISOString();
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'cancelled', decidedAt } : a));
    updateApplication(app.id, { status: 'cancelled', decidedAt }).catch(() => {});
    notifyDecision(app, 'cancelled', undefined, settings).catch(() => {});
  }, [settings]);

  const handleReapply = useCallback((app: Application) => {
    // 条件付き承認からの再申請時は条件文をreason先頭に引き継ぐ
    const reason = app.status === 'conditional' && app.conditionText
      ? `[条件] ${app.conditionText}${app.reason ? '\n' + app.reason : ''}`.trim()
      : app.reason;
    setReapplyValues({ item: app.item, amount: app.amount, reason, reapplyFromId: app.id, requestType: app.requestType });
    setTab('apply');
  }, []);

  const handleMarkPurchased = useCallback((id: string) => {
    const purchasedAt = new Date().toISOString();
    setApplications(prev => prev.map(a => a.id === id ? { ...a, isPurchased: true, purchasedAt } : a));
    updateApplication(id, { isPurchased: true, purchasedAt }).catch(() => {});
  }, []);

  const handleSubmitReview = useCallback((id: string, review: ReviewData) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, review } : a));
    updateApplication(id, { review }).catch(() => {});
  }, []);

  const pendingForMe = currentUser
    ? applications.filter(a => a.status === 'pending' && a.applicant !== currentUser).length
    : 0;

  // ── ローディング ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <Stamp text="稟議" size={84} />
          <p className="text-ink-faint text-xs tracking-[0.4em] mt-4">読み込み中</p>
        </div>
      </div>
    );
  }

  // ── 初回：自分がどちらか選ぶ ─────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">
        <HubButton />
        <div className="text-center mb-10 animate-rise-in">
          <Stamp text="稟議" size={96} />
          <h1 className="heading text-2xl mt-5">ふたりの決裁</h1>
          <p className="heading-note mt-2">RINGI — COUPLE APPROVAL</p>
        </div>
        <p className="text-sm font-bold text-ink-soft mb-4 animate-rise-in [animation-delay:.1s]">あなたはどちら？</p>
        <div className="flex gap-4 w-full max-w-sm animate-rise-in [animation-delay:.15s]">
          {(['kenshin', 'rena'] as const).map(u => {
            const name = userMeta(settings, u).name;
            return (
              <button
                key={u}
                onClick={() => handleSelectUser(u)}
                className="flex-1 document flex flex-col items-center gap-3 py-7 active:bg-paper-deep transition-colors"
              >
                <span className="w-14 h-14 rounded-full border-2 border-shu text-shu font-mincho font-extrabold text-2xl flex items-center justify-center">
                  {name.charAt(0)}
                </span>
                <span className="font-mincho font-bold text-ink tracking-widest">{name}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-ink-faint mt-6">この端末に記憶されます（設定タブでいつでも切替可）</p>
      </div>
    );
  }

  const userName = userMeta(settings, currentUser).name;

  return (
    <div className="min-h-dvh pb-24">
      <HubButton />

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-sm border-b border-ink-line">
        <div className="max-w-lg mx-auto h-14 px-4 flex items-center justify-center relative">
          <div className="text-center leading-none">
            <span className="font-mincho font-extrabold text-lg tracking-[0.35em] text-ink">稟議</span>
            <span className="block text-[9px] text-ink-faint tracking-[0.35em] mt-0.5">RINGI</span>
          </div>
          <button
            onClick={handleSwitchUser}
            className="absolute right-3 flex items-center gap-1.5 rounded-full border border-ink-line bg-paper-card px-2.5 py-1.5 active:bg-paper-deep transition-colors"
            aria-label="ユーザー切替"
          >
            <span className="w-5 h-5 rounded-full bg-shu text-paper-card text-[11px] font-mincho font-bold flex items-center justify-center">
              {userName.charAt(0)}
            </span>
            <span className="text-[11px] font-bold text-ink-soft">{userName}</span>
            <span className="text-[9px] text-ink-faint">⇄</span>
          </button>
        </div>
      </header>

      {/* ── 画面 ── */}
      <main className="max-w-lg mx-auto">
        {tab === 'home' && (
          <Home
            settings={settings}
            applications={applications}
            currentUser={currentUser}
            onGoto={setTab}
          />
        )}
        {tab === 'apply' && (
          <Apply
            currentUser={currentUser}
            settings={settings}
            onSubmit={handleSubmitApplication}
            initialValues={reapplyValues}
            onClearInitial={() => setReapplyValues(undefined)}
          />
        )}
        {tab === 'decide' && (
          <Decide
            currentUser={currentUser}
            settings={settings}
            applications={applications}
            onDecide={handleDecide}
          />
        )}
        {tab === 'history' && (
          <History
            settings={settings}
            applications={applications}
            currentUser={currentUser}
            onReapply={handleReapply}
            onCancel={handleCancel}
            onMarkPurchased={handleMarkPurchased}
            onSubmitReview={handleSubmitReview}
          />
        )}
        {tab === 'settings' && (
          <SettingsScreen settings={settings} onSave={handleSaveSettings} />
        )}
      </main>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── タブバー ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-paper-card/95 backdrop-blur-sm border-t border-ink-line safe-bottom">
        <div className="max-w-lg mx-auto flex">
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  if (t.key !== 'apply') setReapplyValues(undefined);
                  setTab(t.key);
                }}
                className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 min-h-[62px]"
              >
                <span className="relative">
                  <Medallion kanji={t.kanji} active={active} size={32} />
                  {t.key === 'decide' && pendingForMe > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-shu text-paper-card text-[10px] font-bold flex items-center justify-center">
                      {pendingForMe}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] font-bold tracking-widest ${active ? 'text-ink' : 'text-ink-faint'}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
