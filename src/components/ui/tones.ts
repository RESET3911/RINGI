import type { Tone } from '../../types';

/** 角印・ハンコ用の色クラス（枠＋文字が同色、背景は淡色） */
export const TONE_SEAL: Record<Tone, string> = {
  shu:     'border-shu text-shu bg-shu-pale',
  ink:     'border-ink text-ink bg-paper-deep',
  ai:      'border-ai text-ai bg-ai-pale',
  karashi: 'border-karashi text-karashi bg-karashi-pale',
  nezu:    'border-nezu text-nezu bg-nezu-pale',
  matsu:   'border-matsu text-matsu bg-matsu-pale',
};

export const TONE_TEXT: Record<Tone, string> = {
  shu: 'text-shu', ink: 'text-ink', ai: 'text-ai',
  karashi: 'text-karashi', nezu: 'text-nezu', matsu: 'text-matsu',
};

export const TONE_SOLID_BTN: Record<Tone, string> = {
  shu:     'bg-shu text-paper-card active:bg-shu-deep',
  ink:     'bg-ink text-paper active:bg-black',
  ai:      'bg-ai text-paper-card active:brightness-90',
  karashi: 'bg-karashi text-paper-card active:brightness-90',
  nezu:    'bg-nezu text-paper-card active:brightness-90',
  matsu:   'bg-matsu text-paper-card active:brightness-90',
};
