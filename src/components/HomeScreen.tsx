import { User, Settings, Application } from '../types';
import { calcSurplus, formatCurrency } from '../utils/alert';
import { isSettingsComplete } from '../utils/storage';

type Props = {
  settings: Settings;
  applications: Application[];
  onSelectUser: (user: User) => void;
};

export default function HomeScreen({ settings, applications, onSelectUser }: Props) {
  const pendingForA = applications.filter(a => a.status === 'pending' && a.applicant === 'B').length;
  const pendingForB = applications.filter(a => a.status === 'pending' && a.applicant === 'A').length;
  const surplus = calcSurplus(settings);
  const settingsComplete = isSettingsComplete(settings);

  const UserButton = ({ user, name, pendingCount }: { user: User; name: string; pendingCount: number }) => (
    <button
      onClick={() => onSelectUser(user)}
      className="flex-1 bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-3 active:bg-primary-50 transition-colors border-2 border-transparent active:border-primary-200 min-h-[140px]"
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-300 to-accent-400 flex items-center justify-center text-white text-2xl font-bold shadow-md">
          {name.charAt(0)}
        </div>
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
            {pendingCount}
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="font-bold text-gray-900 text-lg">{name}</p>
        {pendingCount > 0 ? (
          <p className="text-sm text-primary-500 font-medium mt-1">決裁待ち {pendingCount}件</p>
        ) : (
          <p className="text-sm text-gray-400 mt-1">決裁待ちなし</p>
        )}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            💑 カップル稟議
          </h1>
          <p className="text-gray-500 mt-2 text-sm">2人の購入申請・決裁システム</p>
        </div>

        {/* Settings incomplete banner */}
        {!settingsComplete && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">設定が未完了です</p>
              <p className="text-amber-700 text-xs mt-0.5">収入・固定費を設定するとアラート機能が使えます。</p>
            </div>
          </div>
        )}

        {/* Surplus summary */}
        {settingsComplete && (
          <div className="card mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">今月の余剰資金</p>
            <p className={`text-3xl font-bold ${surplus < 0 ? 'text-red-500' : 'text-primary-500'}`}>
              {formatCurrency(surplus)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              月収 {formatCurrency(settings.monthlyIncome)}
              {settings.extraIncome > 0 && ` + 臨時 ${formatCurrency(settings.extraIncome)}`}
              {' − '}固定費 {formatCurrency(settings.fixedCosts.reduce((s, c) => s + c.amount, 0))}
            </p>
          </div>
        )}

        {/* User selection */}
        <p className="text-center text-gray-600 font-medium mb-4">どちらのモードで使いますか？</p>
        <div className="flex gap-4 mb-8">
          <UserButton user="A" name={settings.userA.name} pendingCount={pendingForA} />
          <UserButton user="B" name={settings.userB.name} pendingCount={pendingForB} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '申請中', count: applications.filter(a => a.status === 'pending').length, color: 'text-blue-500' },
            { label: '承認', count: applications.filter(a => a.status === 'approved').length, color: 'text-green-500' },
            { label: '否決', count: applications.filter(a => a.status === 'rejected').length, color: 'text-red-500' },
          ].map(({ label, count, color }) => (
            <div key={label} className="card text-center">
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
