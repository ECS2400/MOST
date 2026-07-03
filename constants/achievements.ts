export type AchievementCondition =
  | { type: 'totalDisputes'; min: number }
  | { type: 'resolvedDisputes'; min: number }
  | { type: 'streak'; min: number }
  | { type: 'soloCount'; min: number }
  | { type: 'gratitudeEntries'; min: number }
  | { type: 'gratitudeStreak'; min: number }
  | { type: 'coupleConnected' }
  | { type: 'coupleMediations'; min: number }
  | { type: 'gratitudeShared' }
  | { type: 'aiSessions'; min: number }
  | { type: 'aiPhasesCompleted'; min: number }
  | { type: 'referralCount'; min: number }
  | { type: 'isPremium' }
  | { type: 'screenshotCount'; min: number }
  | { type: 'mirrorCount'; min: number }
  | { type: 'successRate'; min: number }
  | { type: 'totalPoints'; min: number }
  | { type: 'profileComplete' }
  | { type: 'appDays'; min: number };

export interface Achievement {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  color: string;
  gradient: [string, string];
  points: number;
  secret?: boolean;
  condition?: AchievementCondition;
  /** Retired goals — kept for users who already unlocked; not earnable anymore. */
  legacy?: boolean;
}

const GRADIENTS: [string, string][] = [
  ['#7C3AED', '#6D28D9'],
  ['#10B981', '#059669'],
  ['#C026D3', '#A21CAF'],
  ['#F59E0B', '#D97706'],
  ['#3B82F6', '#2563EB'],
  ['#F97316', '#EA580C'],
  ['#EAB308', '#CA8A04'],
  ['#06B6D4', '#0891B2'],
  ['#EC4899', '#DB2777'],
  ['#8B5CF6', '#7C3AED'],
  ['#6366F1', '#4F46E5'],
  ['#0EA5E9', '#0284C7'],
  ['#14B8A6', '#0D9488'],
  ['#F43F5E', '#E11D48'],
  ['#84CC16', '#65A30D'],
];

const ICONS = [
  '🌱', '🌉', '🏗️', '🏆', '🪞', '🔥', '⚡', '💎', '💑', '🔍',
  '⭐', '📣', '🌟', '🤖', '📸', '💜', '🎯', '🚀', '🌈', '🎖️',
  '🦋', '🌺', '🍀', '🎁', '💫', '🧠', '❤️', '🤝', '🕊️', '✨',
];

function g(i: number): [string, string] {
  return GRADIENTS[i % GRADIENTS.length];
}

function icon(i: number): string {
  return ICONS[i % ICONS.length];
}

function ach(
  id: string,
  iconEmoji: string,
  gradient: [string, string],
  points: number,
  condition?: AchievementCondition,
  secret?: boolean,
  legacy?: boolean
): Achievement {
  return {
    id,
    titleKey: id,
    descriptionKey: id,
    icon: iconEmoji,
    color: gradient[0],
    gradient,
    points,
    condition,
    secret,
    legacy,
  };
}

function buildAchievements(): Achievement[] {
  const list: Achievement[] = [];
  let i = 0;

  // ── Spory utworzone (10) ──────────────────────────────────────────────────
  const disputeMilestones: { id: string; n: number; title: string }[] = [
    { id: 'first_dispute', n: 1, title: 'Pierwszy krok' },
    { id: 'disputes_2', n: 2, title: 'Drugi most' },
    { id: 'disputes_3', n: 3, title: 'Trójka budowniczych' },
    { id: 'disputes_5', n: 5, title: 'Piątka odwagi' },
    { id: 'disputes_7', n: 7, title: 'Siódemka dialogu' },
    { id: 'disputes_10', n: 10, title: 'Dziesiątka rozmów' },
    { id: 'disputes_15', n: 15, title: 'Piętnastka mostów' },
    { id: 'disputes_25', n: 25, title: 'Ćwierć setki' },
    { id: 'disputes_50', n: 50, title: 'Pół setki sporów' },
  ];
  for (const m of disputeMilestones) {
    list.push(
      ach(
        m.id,
        icon(i),
        g(i++),
        5 + m.n * 2,
        { type: 'totalDisputes', min: m.n }
      )
    );
  }

  // ── Spory rozwiązane (12) ─────────────────────────────────────────────────
  const resolvedMilestones: { id: string; n: number; title: string }[] = [
    { id: 'first_resolution', n: 1, title: 'Pierwszy most' },
    { id: 'resolved_2', n: 2, title: 'Podwójne zwycięstwo' },
    { id: 'three_resolutions', n: 3, title: 'Budowniczy' },
    { id: 'resolved_5', n: 5, title: 'Pięć ugód' },
    { id: 'resolved_7', n: 7, title: 'Siedem mostów' },
    { id: 'ten_resolutions', n: 10, title: 'Mistrz dialogu' },
    { id: 'resolved_15', n: 15, title: 'Piętnastka ugód' },
    { id: 'resolved_20', n: 20, title: 'Dwudziestka spokoju' },
    { id: 'resolved_30', n: 30, title: 'Trzydzieści mostów' },
    { id: 'resolved_50', n: 50, title: 'Pół setki ugód' },
    { id: 'resolved_75', n: 75, title: 'Siedemdziesiąt pięć' },
  ];
  for (const m of resolvedMilestones) {
    list.push(
      ach(
        m.id,
        icon(i),
        g(i++),
        10 + m.n * 3,
        { type: 'resolvedDisputes', min: m.n }
      )
    );
  }

  // ── Serie dni (14) ────────────────────────────────────────────────────────
  const streakMilestones: { id: string; n: number; title: string }[] = [
    { id: 'streak_1', n: 1, title: 'Pierwszy dzień' },
    { id: 'streak_2', n: 2, title: 'Dwa dni z rzędu' },
    { id: 'streak_3', n: 3, title: '3-dniowa seria' },
    { id: 'streak_5', n: 5, title: 'Piątka dni' },
    { id: 'streak_7', n: 7, title: 'Tygodniowiec' },
    { id: 'streak_10', n: 10, title: 'Dziesięć dni' },
    { id: 'streak_14', n: 14, title: 'Dwa tygodnie' },
    { id: 'streak_21', n: 21, title: 'Trzy tygodnie' },
    { id: 'streak_30', n: 30, title: 'Niezniszczalny' },
    { id: 'streak_45', n: 45, title: 'Półtora miesiąca' },
    { id: 'streak_60', n: 60, title: 'Dwa miesiące' },
    { id: 'streak_90', n: 90, title: 'Kwartał razem' },
    { id: 'streak_180', n: 180, title: 'Pół roku serii' },
    { id: 'streak_365', n: 365, title: 'Rok z Mostem' },
  ];
  for (const m of streakMilestones) {
    list.push(
      ach(
        m.id,
        '🔥',
        g(i++),
        5 + Math.round(m.n * 1.5),
        { type: 'streak', min: m.n }
      )
    );
  }

  // ── Analiza solo (8) ──────────────────────────────────────────────────────
  const soloMilestones: { id: string; n: number; title: string }[] = [
    { id: 'first_solo', n: 1, title: 'Introspektysta' },
    { id: 'solo_3', n: 3, title: 'Trzy refleksje' },
    { id: 'solo_5', n: 5, title: 'Pięć rozmów solo' },
    { id: 'solo_10', n: 10, title: 'Dziesięć sesji' },
    { id: 'solo_15', n: 15, title: 'Piętnastka refleksji' },
    { id: 'solo_25', n: 25, title: 'Coach regularny' },
    { id: 'solo_50', n: 50, title: 'Mistrz introspekcji' },
    { id: 'solo_100', n: 100, title: 'Sto rozmów z AI' },
  ];
  for (const m of soloMilestones) {
    list.push(
      ach(
        m.id,
        icon(i),
        g(i++),
        8 + m.n * 2,
        { type: 'soloCount', min: m.n }
      )
    );
  }

  // ── Dziennik wdzięczności — wpisy (7) ─────────────────────────────────────
  const gratitudeMilestones = [1, 3, 7, 14, 30, 50, 100];
  gratitudeMilestones.forEach((n) => {
    list.push(
      ach(
        `gratitude_${n}`,
        '💜',
        g(i++),
        5 + n * 2,
        { type: 'gratitudeEntries', min: n }
      )
    );
  });

  // ── Dziennik wdzięczności — serie (5) ─────────────────────────────────────
  [3, 7, 14, 30, 60].forEach((n) => {
    list.push(
      ach(
        `gratitude_streak_${n}`,
        '💫',
        g(i++),
        10 + n * 3,
        { type: 'gratitudeStreak', min: n }
      )
    );
  });

  // ── Para / partner (7) ────────────────────────────────────────────────────
  list.push(
    ach(
        'couple_connected',
        '💑', g(i++), 20, { type: 'coupleConnected' }),
    ach(
        'couple_med_1',
        '🤝', g(i++), 25, { type: 'coupleMediations', min: 1 }),
    ach(
        'couple_med_5',
        '❤️', g(i++), 40, { type: 'coupleMediations', min: 5 }),
    ach(
        'couple_med_10',
        '💞', g(i++), 60, { type: 'coupleMediations', min: 10 }),
    ach(
        'couple_med_25',
        '👑', g(i++), 100, { type: 'coupleMediations', min: 25 }),
    ach(
        'gratitude_shared',
        '🌸', g(i++), 15, { type: 'gratitudeShared' })
  );

  // ── Live mediacja / AI (9) ─────────────────────────────────────────────────
  list.push(
    ach(
        'ai_conversation',
        '🤖', g(i++), 15, { type: 'aiSessions', min: 1 }),
    ach(
        'ai_3',
        '🗣️', g(i++), 20, { type: 'aiSessions', min: 3 }),
    ach(
        'ai_5',
        '💬', g(i++), 30, { type: 'aiSessions', min: 5 }),
    ach(
        'ai_10',
        '🎙️', g(i++), 45, { type: 'aiSessions', min: 10 }),
    ach(
        'ai_25',
        '📡', g(i++), 75, { type: 'aiSessions', min: 25 }),
    ach(
        'ai_phase1',
        '1️⃣', g(i++), 20, { type: 'aiPhasesCompleted', min: 1 }),
    ach(
        'ai_phase2',
        '2️⃣', g(i++), 25, { type: 'aiPhasesCompleted', min: 2 }),
    ach(
        'ai_phase3',
        '3️⃣', g(i++), 30, { type: 'aiPhasesCompleted', min: 3 }),
    ach(
        'ai_phase4',
        '4️⃣', g(i++), 50, { type: 'aiPhasesCompleted', min: 4 })
  );

  // ── Premium i polecenia (6) ───────────────────────────────────────────────
  list.push(
    ach(
        'premium_member',
        '⭐', g(i++), 50, { type: 'isPremium' }),
    ach(
        'ambassador',
        '📣', g(i++), 30, { type: 'referralCount', min: 1 }),
    ach(
        'referral_3',
        '📢', g(i++), 50, { type: 'referralCount', min: 3 }),
    ach(
        'five_referrals',
        '🌟', g(i++), 100, { type: 'referralCount', min: 5 }),
    ach(
        'referral_10',
        '🎺', g(i++), 150, { type: 'referralCount', min: 10 }),
    ach(
        'referral_25',
        '🏅', g(i++), 300, { type: 'referralCount', min: 25 })
  );

  // ── Empatia / lustro (4) ──────────────────────────────────────────────────
  list.push(
    ach(
        'first_mirror',
        '🪞', g(i++), 20, { type: 'mirrorCount', min: 1 }),
    ach(
        'mirror_5',
        '🔮', g(i++), 35, { type: 'mirrorCount', min: 5 }),
    ach(
        'mirror_10',
        '🌊', g(i++), 55, { type: 'mirrorCount', min: 10 }),
    ach(
        'mirror_25',
        '🧘', g(i++), 90, { type: 'mirrorCount', min: 25 })
  );

  // ── OCR / zrzuty ekranu (4) ───────────────────────────────────────────────
  list.push(
    ach(
        'screenshot_upload',
        '📸', g(i++), 15, { type: 'screenshotCount', min: 1 }),
    ach(
        'screenshot_5',
        '🔍', g(i++), 25, { type: 'screenshotCount', min: 5 }),
    ach(
        'screenshot_10',
        '📁', g(i++), 40, { type: 'screenshotCount', min: 10 }),
    ach(
        'screenshot_25',
        '🖼️', g(i++), 70, { type: 'screenshotCount', min: 25 })
  );

  // ── Skuteczność mediacji (4) ───────────────────────────────────────────────
  [50, 75, 90, 100].forEach((rate) => {
    list.push(
      ach(
        `success_${rate}`,
        '🎯',
        g(i++),
        20 + rate / 2,
        { type: 'successRate', min: rate }
      )
    );
  });

  // ── Kamienie milowe punktów (4) ───────────────────────────────────────────
  [100, 500, 1000, 2500].forEach((pts) => {
    list.push(
      ach(
        `points_${pts}`,
        '🎖️',
        g(i++),
        10,
        { type: 'totalPoints', min: pts }
      )
    );
  });

  // ── Profil i aplikacja (6) ────────────────────────────────────────────────
  list.push(
    ach(
        'profile_complete',
        '👤', g(i++), 10, { type: 'profileComplete' }),
    ach(
        'avatar_set',
        '🖼️', g(i++), 10, undefined, false, true),
    ach(
        'app_7days',
        '📅', g(i++), 15, { type: 'appDays', min: 7 }),
    ach(
        'app_30days',
        '🗓️', g(i++), 30, { type: 'appDays', min: 30 }),
    ach(
        'app_100days',
        '💯', g(i++), 75, { type: 'appDays', min: 100 })
  );

  // ── Sekretne / specjalne (5) ──────────────────────────────────────────────
  list.push(
    ach(
        'night_owl',
        '🦉', ['#312E81', '#1E1B4B'], 25, undefined, true),
    ach(
        'early_bird',
        '🌅', ['#FDE68A', '#F59E0B'], 25, undefined, true),
    ach(
        'weekend_warrior',
        '🎉', ['#A855F7', '#7C3AED'], 20, undefined, true),
    ach(
        'comeback',
        '💪', ['#34D399', '#059669'], 30, undefined, true)
  );

  return list;
}

export const ACHIEVEMENTS: Achievement[] = buildAchievements();

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];

export const ACHIEVEMENT_MAP = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
) as Record<AchievementId, Achievement>;

export const ACTIVE_ACHIEVEMENTS = ACHIEVEMENTS.filter((a) => !a.legacy);

export function isDisplayedAchievement(
  achievement: Achievement,
  unlockedIds: ReadonlySet<string>
): boolean {
  return !achievement.legacy || unlockedIds.has(achievement.id);
}

if (__DEV__ && ACHIEVEMENTS.length !== 100) {
  console.warn(`[achievements] Expected 100 achievements, got ${ACHIEVEMENTS.length}`);
}
