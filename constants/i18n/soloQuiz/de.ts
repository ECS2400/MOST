import type { SoloQuizBundle } from './types';

export const SOLO_QUIZ_DE: SoloQuizBundle = {
  progress: 'Frage {current} von {total}',
  skipQuiz: 'Quiz überspringen',
  nextDescribe: 'Weiter — Situation beschreiben',
  contextHeader: 'Kontext aus dem Quiz:',
  contextLabels: {
    situationType: 'Art der Situation',
    when: 'Wann',
    intensity: 'Intensität (1-10)',
    mainPain: 'Was am meisten wehtut',
    partnerReaction: 'Typische Reaktion des Partners',
    goal: 'Ziel des Nutzers',
  },
  questions: [
    {
      id: 'situationType',
      prompt: 'Was beschreibt diese Situation am besten?',
      options: [
        'Streit oder Auseinandersetzung',
        'Gefühl der Vernachlässigung',
        'Mangelnde Kommunikation',
        'Vertrauensbruch',
        'Unterschiedliche Prioritäten',
        'Etwas anderes',
      ],
    },
    {
      id: 'when',
      prompt: 'Wann ist es passiert?',
      options: ['Heute', 'Gestern', 'Diese Woche', 'Länger her'],
    },
    {
      id: 'intensity',
      prompt: 'Wie stark spürst du es jetzt? (1 = leicht, 10 = sehr)',
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    },
    {
      id: 'mainPain',
      prompt: 'Was tut in dieser Situation am meisten weh?',
      options: [
        'Gefühl, ignoriert zu werden',
        'Mangelnder Respekt',
        'Einsamkeit in der Beziehung',
        'Ungerechtigkeit',
        'Angst um die Zukunft',
        'Etwas anderes',
      ],
    },
    {
      id: 'partnerReaction',
      prompt: 'Wie reagiert dein Partner in solchen Momenten normalerweise?',
      options: [
        'Meidet das Gespräch',
        'Greift an oder beschuldigt',
        'Spielt das Problem herunter',
        'Entschuldigt sich und kehrt zum Thema zurück',
        'Weiß nicht / unterschiedlich',
      ],
    },
    {
      id: 'goal',
      prompt: 'Was brauchst du jetzt am meisten?',
      options: [
        'Mich und meine Gefühle verstehen',
        'Mich auf ein Gespräch vorbereiten',
        'Ruhe wiederfinden',
        'Eine konkrete Lösung finden',
      ],
    },
  ],
};
