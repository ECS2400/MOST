import type { ClosureBundle } from './types';

export const CLOSURE_EN: ClosureBundle = {
  survey: [
    { id: 'talkQuality', prompt: 'How do you rate this conversation?', options: ['Poorly', 'Average', 'Well', 'Very well'] },
    { id: 'heard', prompt: 'Do you feel heard?', options: ['Yes', 'Partly', 'No', 'Hard to say'] },
    { id: 'ready', prompt: 'Are you ready for the next step in your relationship?', options: ['Yes', 'Not yet', 'I don\'t know'] },
    {
      id: 'hardest',
      prompt: 'What was hardest?',
      options: ['Describing emotions', 'Understanding the other side', 'Staying calm', 'Finding a solution', 'Something else'],
    },
    { id: 'closer', prompt: 'After this talk, do you feel closer to your partner?', options: ['Yes', 'A little', 'No', 'Too early to tell'] },
  ],
  dateIdeaDefault: {
    title: 'Walk with one question',
    description:
      'Go for a 30–40 minute walk. Rule: one question at a time, no interrupting. First: "What mattered most to you in our conversation today?" Second: "What do you need from us right now?" Third (optional): "What could we do differently tomorrow?" After the walk, hug or hold hands — without expecting a big talk right away.',
    whyItFits:
      'Movement and not staring into each other\'s eyes often makes honest talk easier after a fight. Simple, cheap, and it works.',
    estimatedCost: '$0',
  },
  ui: {
    surveyTitle: 'Short survey',
    dateIdeaTitle: 'Date idea',
    dateIdeaTodayTitle: 'Idea for today',
    durationLabel: 'Time',
    durationMinutes: '{minutes} min',
    budgetFree: 'Free',
    budgetLow: 'Low cost',
    shuffleDateIdea: 'Pick another idea',
    questionProgress: 'Question {current} of {total}',
    loadingMediation: 'Ending mediation...',
    loadingDateIdea: 'Preparing a heartfelt date idea...',
    whyItFits: 'Why it fits',
    cost: 'Cost',
    footerNote: 'A heartfelt idea — no big spending, just closeness. Adapt it to yourselves.',
    finish: 'Finish',
    finishLive: 'Go to summary',
    errorPrep: 'Could not end mediation.',
    errorSave: 'Could not save. Try again.',
    errorTitle: 'Error',
    noSession: 'No solo session to save.',
  },
};
