// ⚠️ 自動配布ファイル — 直接編集しないこと！
// マスター: _Claude/ST_SHARED/shared/ を編集して `node ST_SHARED/sync.mjs` を実行
// ST APPS 共通: Googleログインゲート
// アプリ全体をこれで包む。許可リスト外のアカウントはブロックされる。
// Tailwind非依存（アプリごとにテーマが違うためインラインスタイル）。
import { useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { watchAuth, signInWithGoogle, signOut, isAllowed } from './firebase';

type Phase = 'loading' | 'signedout' | 'unauthorized' | 'ok';

const wrap: React.CSSProperties = {
  minHeight: '100dvh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
  fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
  background: '#f7f6fb', color: '#1e1a2e', textAlign: 'center',
};

export default function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  useEffect(() => watchAuth(u => {
    setUser(u);
    setPhase(u ? (isAllowed(u) ? 'ok' : 'unauthorized') : 'signedout');
  }), []);

  if (phase === 'ok') return <>{children}</>;

  if (phase === 'loading') {
    return <div style={wrap}><div style={{ fontSize: 40 }}>🔐</div><div style={{ fontSize: 13, color: '#6b6480' }}>確認中…</div></div>;
  }

  if (phase === 'unauthorized') {
    return (
      <div style={wrap}>
        <div style={{ fontSize: 40 }}>🚫</div>
        <div style={{ fontWeight: 700 }}>このアカウントは利用できません</div>
        <div style={{ fontSize: 12, color: '#6b6480' }}>{user?.email}</div>
        <button onClick={() => signOut()} style={btnStyle('#6b6480')}>別のアカウントでログイン</button>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 44 }}>💑</div>
      <div style={{ fontWeight: 800, fontSize: 18 }}>ST APPS</div>
      <div style={{ fontSize: 13, color: '#6b6480', lineHeight: 1.7 }}>
        ふたり専用アプリです。<br />Googleアカウントでログインしてください。
      </div>
      <button
        onClick={async () => {
          setError('');
          try { await signInWithGoogle(); }
          catch (e) { setError(e instanceof Error ? e.message : 'ログインに失敗しました'); }
        }}
        style={btnStyle('#7c3aed')}
      >
        Googleでログイン
      </button>
      {error && <div style={{ fontSize: 11, color: '#e11d48', maxWidth: 280 }}>{error}</div>}
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '13px 26px', borderRadius: 12, border: 'none', background: bg,
    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  };
}
