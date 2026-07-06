/** 漢字一文字の印鑑風メダリオン（タブ・申請タイプ用） */
type Props = {
  kanji: string;
  active?: boolean;
  size?: number;
  className?: string;
};

export default function Medallion({ kanji, active = false, size = 34, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-mincho font-bold transition-colors ${
        active
          ? 'bg-shu text-paper-card border border-shu'
          : 'bg-transparent text-ink-soft border border-ink-faint/60'
      } ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {kanji}
    </span>
  );
}
