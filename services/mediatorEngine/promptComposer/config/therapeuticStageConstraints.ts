import type { MediatorLang, TherapeuticGoal } from '@/types/mediator';
import { isEarlyExplorationGoal } from '@/services/mediatorEngine/goalContinuity/therapeuticExplorationReadiness';
import { PERSONA_PRECEDENCE_SHORT } from '@/services/mediatorEngine/promptComposer/config/personaPrecedence';

const STORY_COLLECTION_GOALS: ReadonlySet<TherapeuticGoal> = new Set([
  'EMOTION_NAMING',
  'PERSPECTIVE_SHARING',
]);

export function isStoryCollectionGoal(goal: TherapeuticGoal | string | null | undefined): boolean {
  return typeof goal === 'string' && STORY_COLLECTION_GOALS.has(goal as TherapeuticGoal);
}

const SOLUTION_SEEKING_FORBIDDEN_PL = [
  'konkretne kroki',
  'kroki moglibyście',
  'kroki moglibyscie',
  'plan działania',
  'plan dzialania',
  'kompromis',
  'rozwiązanie',
  'rozwiazanie',
  'co możecie zrobić',
  'co mozecie zrobic',
  'jak poprawić sytuację',
  'jak poprawic sytuacje',
  'jak możecie się lepiej zrozumieć',
  'jak mozecie sie lepiej zrozumiec',
] as const;

const GENERIC_MEDIATOR_FORBIDDEN_PL = [
  'to zrozumiałe',
  'to zrozumiale',
  'słyszę, że to jest trudne',
  'slysze, ze to jest trudne',
  'zatrzymajmy się na chwilę i mówcie po kolei',
] as const;

const SOLUTION_SEEKING_FORBIDDEN_EN = [
  'concrete steps',
  'action plan',
  'compromise',
  'what can you do',
  'how can you fix',
  'how can you better understand each other',
] as const;

const GENERIC_MEDIATOR_FORBIDDEN_EN = [
  'i hear that this is difficult',
  'let us take a moment and speak one at a time',
  "that's understandable",
] as const;

export function solutionSeekingForbiddenPhrases(language: MediatorLang): readonly string[] {
  return language === 'pl' ? SOLUTION_SEEKING_FORBIDDEN_PL : SOLUTION_SEEKING_FORBIDDEN_EN;
}

export function genericMediatorForbiddenPhrases(language: MediatorLang): readonly string[] {
  return language === 'pl' ? GENERIC_MEDIATOR_FORBIDDEN_PL : GENERIC_MEDIATOR_FORBIDDEN_EN;
}

export function buildTherapeuticStageConstraints(
  goal: TherapeuticGoal | string,
  language: MediatorLang
): string[] {
  if (!isEarlyExplorationGoal(goal)) {
    return [];
  }

  const forbidden =
    language === 'pl'
      ? [
          'konkretnych kroków',
          'rozwiązań',
          'kompromisu',
          'planu działania',
          '„co możecie zrobić”',
          '„jak poprawić sytuację”',
        ]
      : [
          'concrete steps',
          'solutions',
          'compromise',
          'action plans',
          '“what can you do”',
          '“how to fix the situation”',
        ];

  const lines = [
    '=== Stage focus (early exploration — mandatory) ===',
    `Current goal: ${goal}.`,
    'Do NOT ask about: ' + forbidden.join(', ') + '.',
    'Stay in investigation: identify the conflict mechanism, spot the misunderstanding, compare both perspectives, find the real trigger.',
    'Translate psychology into everyday language; point out the irony of the situation when useful.',
    'Ask about specific situations, concrete behaviours, and exact moments — never abstract emotional questions.',
    'Forbidden: “how do you feel”, “what emotions came up”, “what happens inside you”, “I hear…”, “it is understandable”, “Rozumiem…”, “Słyszę…”, “Ważne jest…”.',
    PERSONA_PRECEDENCE_SHORT,
  ];

  if (isStoryCollectionGoal(goal)) {
    lines.push(
      language === 'pl'
        ? [
            'W jednym precyzyjnym zdaniu nazwij różnicę perspektyw — użyj ich własnych słów z transkryptu.',
            'Zadaj dokładnie jedno konkretne pytanie do jednej lub obu stron.',
            'Odnieś się do tego, co każda osoba faktycznie powiedziała; zero abstrakcyjnego coachingu.',
            'Przykładowy kształt: „[Host] mówi X, a [Partner] słyszy Y. To jeszcze nie o [temat] — chodzi o [mechanizm/trigger]. [Imię], co dokładnie się dzieje w momencie, gdy [cytat]?”',
          ].join('\n')
        : [
            'Name the perspective gap in one precise sentence — use their exact words from the transcript.',
            'Ask exactly one focused question to one or both partners.',
            'Reference what each person actually said; no abstract coaching formulas.',
            'Example shape: “[Host] says X, and [Partner] hears Y. This is not yet about [surface topic] — it is about [mechanism/trigger]. [Name], what exactly happens in the moment when [quote]?”',
          ].join('\n')
    );
  }

  return lines;
}
