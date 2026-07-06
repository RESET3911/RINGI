import type { Tone } from '../../types';

const TONE_COLOR: Record<Tone, string> = {
  shu: '#c73e2c',
  ink: '#2a251d',
  ai: '#39587a',
  karashi: '#a97e22',
  nezu: '#8a8578',
  matsu: '#3d7357',
};

/** インクのかすれ質感（SVGノイズマスク） */
const INK_MASK =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='3' stitchTiles='stitch'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='2.4' intercept='-0.35'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='120' height='120' fill='%23fff' filter='url(%23n)'/%3E%3C/svg%3E")`;

type Props = {
  text: string;           // 2文字推奨（承認 / 否決 など）
  tone?: Tone;
  size?: number;          // px
  animate?: boolean;      // 押印アニメーション
  className?: string;
};

/** 丸ハンコ（朱印） */
export default function Stamp({ text, tone = 'shu', size = 72, animate = false, className = '' }: Props) {
  const color = TONE_COLOR[tone];
  const chars = [...text];
  return (
    <span
      aria-label={text}
      className={`inline-flex items-center justify-center select-none ${animate ? 'animate-stamp-in' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        border: `${Math.max(2, size * 0.045)}px solid ${color}`,
        borderRadius: '50%',
        color,
        rotate: animate ? undefined : '-8deg',
        WebkitMaskImage: INK_MASK,
        maskImage: INK_MASK,
        WebkitMaskSize: '110% 110%',
        maskSize: '110% 110%',
      }}
    >
      <span
        className="font-mincho font-extrabold leading-none text-center"
        style={{ fontSize: size * (chars.length >= 3 ? 0.26 : 0.34), letterSpacing: '0.05em' }}
      >
        {chars.length >= 3
          ? text
          : <>{chars[0]}<br />{chars[1] ?? ''}</>}
      </span>
    </span>
  );
}
