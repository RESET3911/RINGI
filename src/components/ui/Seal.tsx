import { Status, STATUS_CONFIG } from '../../types';
import { TONE_SEAL } from './tones';

/** ステータスを示す小さな角印 */
export default function Seal({ status, className = '' }: { status: Status; className?: string }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`seal ${TONE_SEAL[cfg.tone]} ${className}`}>
      {cfg.seal}
    </span>
  );
}
