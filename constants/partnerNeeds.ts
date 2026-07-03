/** Stable ids for partner need signals (15 options). */
export const PARTNER_NEED_IDS = [
  'alone_time',
  'closeness',
  'quality_time',
  'date_night',
  'shared_meal',
  'talk',
  'understanding',
  'hug',
  'space',
  'support',
  'fun',
  'rest',
  'appreciation',
  'patience',
  'connection',
] as const;

export type PartnerNeedId = (typeof PARTNER_NEED_IDS)[number];

export const PARTNER_NEED_EMOJI: Record<PartnerNeedId, string> = {
  alone_time: '🧘',
  closeness: '💕',
  quality_time: '⏳',
  date_night: '🌹',
  shared_meal: '🍽️',
  talk: '💬',
  understanding: '🤝',
  hug: '🤗',
  space: '🌿',
  support: '🫶',
  fun: '😄',
  rest: '😴',
  appreciation: '✨',
  patience: '🕊️',
  connection: '🔗',
};

export function isPartnerNeedId(value: string): value is PartnerNeedId {
  return (PARTNER_NEED_IDS as readonly string[]).includes(value);
}
