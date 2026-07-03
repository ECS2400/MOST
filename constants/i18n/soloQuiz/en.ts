import type { SoloQuizBundle } from './types';

export const SOLO_QUIZ_EN: SoloQuizBundle = {
  progress: 'Question {current} of {total}',
  skipQuiz: 'Skip quiz',
  nextDescribe: 'Next — describe the situation',
  contextHeader: 'Quiz context:',
  contextLabels: {
    situationType: 'Situation type',
    when: 'When',
    intensity: 'Intensity (1-10)',
    mainPain: 'What hurts most',
    partnerReaction: 'Partner\'s typical reaction',
    goal: 'User goal',
  },
  questions: [
    {
      id: 'situationType',
      prompt: 'What best describes this situation?',
      options: [
        'Argument or fight',
        'Feeling neglected',
        'Lack of communication',
        'Breach of trust',
        'Different priorities',
        'Something else',
      ],
    },
    {
      id: 'when',
      prompt: 'When did it happen?',
      options: ['Today', 'Yesterday', 'This week', 'Longer ago'],
    },
    {
      id: 'intensity',
      prompt: 'How strongly do you feel it now? (1 = lightly, 10 = very)',
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    },
    {
      id: 'mainPain',
      prompt: 'What hurts most in this situation?',
      options: [
        'Feeling ignored',
        'Lack of respect',
        'Loneliness in the relationship',
        'Unfairness',
        'Fear about the future',
        'Something else',
      ],
    },
    {
      id: 'partnerReaction',
      prompt: 'How does your partner usually react in such moments?',
      options: [
        'Avoids the conversation',
        'Attacks or blames',
        'Downplays the problem',
        'Apologizes and returns to the topic',
        'I don\'t know / varies',
      ],
    },
    {
      id: 'goal',
      prompt: 'What do you need most right now?',
      options: [
        'Understand myself and my emotions',
        'Prepare for a conversation',
        'Regain calm',
        'Find a concrete solution',
      ],
    },
  ],
};
