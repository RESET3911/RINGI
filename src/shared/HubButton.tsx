// ⚠️ 自動配布ファイル — 直接編集しないこと！
// マスター: _Claude/ST_SHARED/shared/ を編集して `node ST_SHARED/sync.mjs` を実行
// ST APPS 共通: 左上に固定表示する HUB へ戻るボタン（Tailwind非依存）
export default function HubButton() {
  return (
    <a
      href="https://RESET3911.github.io/"
      aria-label="HUBへ戻る"
      style={{
        position: 'fixed', top: 8, left: 8, zIndex: 45,
        display: 'flex', alignItems: 'center', gap: 4,
        borderRadius: 999, border: '1px solid #e5e7eb',
        background: 'rgba(255,255,255,0.85)', padding: '6px 10px',
        fontSize: 12, fontWeight: 700, color: '#4b5563',
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)', backdropFilter: 'blur(4px)',
        textDecoration: 'none',
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>🏠</span>
      <span>HUB</span>
    </a>
  );
}
