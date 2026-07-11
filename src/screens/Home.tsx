import { User, Settings, Application, REQUEST_TYPE_CONFIG, STATUS_CONFIG, userMeta } from '../types';
import { calcSurplus } from '../lib/alert';
import { isSettingsComplete } from '../lib/store';
import { useCashflowBalance } from '../lib/cashflow';
import { yen, shortDate } from '../lib/format';
import CashflowPanel from '../components/CashflowPanel';
import Medallion from '../components/ui/Medallion';
import Seal from '../components/ui/Seal';
import type { Tab } from '../App';

type Props = {
  settings: Settings;
  applications: Application[];
  currentUser: User;
  onGoto: (tab: Tab) => void;
};

export default function Home({ settings, applications, currentUser, onGoto }: Props) {
  const cashflow = useCashflowBalance();
  const hasCashflow = cashflow && (cashflow.monthlyIncome > 0 || cashflow.monthlyExpense > 0);
  const surplus = calcSurplus(settings);
  const settingsComplete = isSettingsComplete(settings);

  const getName = (u: User) => userMeta(settings, u).name;

  // 自分が決裁すべきもの / 相手の決裁待ち（自分の申請）
  const toDecide = applications.filter(a => a.status === 'pending' && a.applicant !== currentUser);
  const myWaiting = applications.filter(a => a.status === 'pending' && a.applicant === currentUser);

  // 最近の動き（決裁済みの直近5件）
  const recent = applications
    .filter(a => a.status !== 'pending' && a.decidedAt)
    .sort((a, b) => (b.decidedAt! > a.decidedAt! ? 1 : -1))
    .slice(0, 5);

  // 今月の実績
  const thisYM = new Date().toISOString().slice(0, 7);
  const thisMonth = applications.filter(a => a.createdAt.startsWith(thisYM));
  const approvedAmount = thisMonth
    .filter(a => a.status === 'approved')
    .reduce((s, a) => s + a.amount, 0);

  return (
    <div className="px-4 py-5 space-y-4">
      {/* 挨拶 */}
      <div className="animate-rise-in">
        <p className="heading-note">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        <h2 className="font-mincho font-bold text-ink text-xl mt-1">
          {getName(currentUser)}の決裁室
        </h2>
      </div>

      {/* 設定未完了バナー */}
      {!settingsComplete && !hasCashflow && (
        <button onClick={() => onGoto('settings')} className="w-full text-left card border-karashi/40 bg-karashi-pale flex items-start gap-2.5 animate-rise-in">
          <span className="seal border-karashi text-karashi bg-transparent mt-0.5">未設定</span>
          <span className="text-[13px] text-karashi leading-relaxed">
            収入・固定費を設定するとアラート機能が使えます →
          </span>
        </button>
      )}

      {/* 余剰資金 */}
      <div className="animate-rise-in [animation-delay:.05s]">
        {hasCashflow ? (
          <CashflowPanel large />
        ) : settingsComplete && (
          <div className="document">
            <p className="heading-note mb-1">今月の余剰資金</p>
            <p className={`font-mincho font-extrabold text-4xl ${surplus < 0 ? 'text-shu' : 'text-ink'}`}>
              {yen(surplus)}
            </p>
            <p className="text-xs text-ink-faint mt-1">
              月収 {yen(settings.monthlyIncome)}
              {settings.extraIncome > 0 && ` + 臨時 ${yen(settings.extraIncome)}`}
              {' − '}固定費 {yen(settings.fixedCosts.reduce((s, c) => s + c.amount, 0))}
            </p>
          </div>
        )}
      </div>

      {/* あなたの決裁待ち */}
      {toDecide.length > 0 && (
        <div className="document animate-rise-in [animation-delay:.1s]">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mincho font-bold text-ink tracking-widest text-sm">
              あなたの決裁待ち
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-shu text-paper-card text-xs font-gothic">{toDecide.length}</span>
            </p>
            <button onClick={() => onGoto('decide')} className="text-xs font-bold text-shu">
              決裁する →
            </button>
          </div>
          <div className="space-y-2">
            {toDecide.slice(0, 3).map(app => {
              const cfg = app.requestType ? REQUEST_TYPE_CONFIG[app.requestType] : null;
              return (
                <button key={app.id} onClick={() => onGoto('decide')} className="w-full flex items-center gap-3 bg-paper rounded-md border border-ink-line/70 px-3 py-2.5 text-left active:bg-paper-deep transition-colors">
                  <Medallion kanji={cfg?.kanji ?? '申'} size={30} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-ink truncate">{app.item}</span>
                    <span className="block text-[11px] text-ink-faint">{getName(app.applicant)} · {shortDate(app.createdAt)}</span>
                  </span>
                  {app.amount > 0 && (
                    <span className="text-sm font-bold text-ink whitespace-nowrap">{yen(app.amount)}</span>
                  )}
                </button>
              );
            })}
            {toDecide.length > 3 && (
              <p className="text-[11px] text-ink-faint text-center">他 {toDecide.length - 3} 件</p>
            )}
          </div>
        </div>
      )}

      {/* 自分の申請の状況 */}
      {myWaiting.length > 0 && (
        <div className="card animate-rise-in [animation-delay:.12s]">
          <p className="heading-note mb-2">相手の決裁待ち（あなたの申請）</p>
          <div className="space-y-1.5">
            {myWaiting.slice(0, 3).map(app => (
              <div key={app.id} className="flex items-center gap-2 text-sm">
                <Seal status="pending" />
                <span className="flex-1 truncate text-ink-soft">{app.item}</span>
                {app.amount > 0 && <span className="text-ink-faint text-xs">{yen(app.amount)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 今月のまとめ */}
      <div className="grid grid-cols-3 gap-2.5 animate-rise-in [animation-delay:.15s]">
        <div className="card text-center py-3">
          <p className="font-mincho font-extrabold text-2xl text-ink">{thisMonth.length}</p>
          <p className="text-[10px] text-ink-faint tracking-widest mt-0.5">今月の申請</p>
        </div>
        <div className="card text-center py-3">
          <p className="font-mincho font-extrabold text-2xl text-shu">{thisMonth.filter(a => a.status === 'approved').length}</p>
          <p className="text-[10px] text-ink-faint tracking-widest mt-0.5">承認</p>
        </div>
        <div className="card text-center py-3">
          <p className="font-mincho font-extrabold text-lg text-ink leading-[1.6]">{yen(approvedAmount)}</p>
          <p className="text-[10px] text-ink-faint tracking-widest mt-0.5">承認額</p>
        </div>
      </div>

      {/* 最近の動き */}
      {recent.length > 0 && (
        <div className="card animate-rise-in [animation-delay:.2s]">
          <div className="flex items-center justify-between mb-2.5">
            <p className="heading-note">最近の決裁</p>
            <button onClick={() => onGoto('history')} className="text-xs font-bold text-ink-soft">すべて見る →</button>
          </div>
          <div className="divide-y divide-ink-line/60">
            {recent.map(app => (
              <div key={app.id} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                <Seal status={app.status} />
                <span className="flex-1 min-w-0 text-sm text-ink truncate">{app.item}</span>
                <span className="text-[11px] text-ink-faint whitespace-nowrap">{shortDate(app.decidedAt!)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 申請CTA */}
      <button
        onClick={() => onGoto('apply')}
        className="w-full btn-primary flex items-center justify-center gap-2 animate-rise-in [animation-delay:.25s]"
      >
        <span className="font-mincho tracking-[0.3em]">新しく申請する</span>
      </button>

      {/* STATUS_CONFIG 凡例（さりげなく） */}
      <p className="text-center text-[10px] text-ink-faint tracking-widest pb-2">
        {STATUS_CONFIG.approved.label}は朱印、{STATUS_CONFIG.rejected.label}は墨印で記されます
      </p>
    </div>
  );
}
