import { AlertInfo } from '../../types';
import { yen } from '../../lib/format';

/** 余剰資金に対する申請額の警告表示 */
export default function AlertNote({ alert }: { alert: AlertInfo }) {
  if (alert.level === 'none') return null;

  const isDanger = alert.level === 'danger';
  const tone = isDanger
    ? 'border-shu/50 bg-shu-pale text-shu-deep'
    : 'border-karashi/50 bg-karashi-pale text-karashi';

  return (
    <div className={`border rounded-md p-3 flex items-start gap-2.5 ${tone}`}>
      <span className="seal border-current text-current bg-transparent mt-0.5">
        {isDanger ? '危険' : '警戒'}
      </span>
      <div className="text-[13px] leading-relaxed">
        <p className="font-bold">{alert.message}</p>
        <p className="opacity-80">月次余剰: {yen(alert.surplus)}</p>
      </div>
    </div>
  );
}
