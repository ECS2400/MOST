import type { SoloQuizBundle } from './types';

export const SOLO_QUIZ_IT: SoloQuizBundle = {
  progress: 'Domanda {current} di {total}',
  skipQuiz: 'Salta il quiz',
  nextDescribe: 'Avanti — descrivi la situazione',
  contextHeader: 'Contesto dal quiz:',
  contextLabels: {
    situationType: 'Tipo di situazione',
    when: 'Quando',
    intensity: 'Intensità (1-10)',
    mainPain: 'Cosa fa più male',
    partnerReaction: 'Reazione tipica del partner',
    goal: 'Obiettivo dell\'utente',
  },
  questions: [
    {
      id: 'situationType',
      prompt: 'Cosa descrive meglio questa situazione?',
      options: [
        'Lite o litigio',
        'Sensazione di trascuratezza',
        'Mancanza di comunicazione',
        'Tradimento della fiducia',
        'Differenza di priorità',
        'Altro',
      ],
    },
    {
      id: 'when',
      prompt: 'Quando è successo?',
      options: ['Oggi', 'Ieri', 'Questa settimana', 'Più tempo fa'],
    },
    {
      id: 'intensity',
      prompt: 'Quanto lo senti adesso? (1 = poco, 10 = molto)',
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    },
    {
      id: 'mainPain',
      prompt: 'Cosa fa più male in questa situazione?',
      options: [
        'Sentirsi ignorati',
        'Mancanza di rispetto',
        'Solitudine nella relazione',
        'Ingiustizia',
        'Paura per il futuro',
        'Altro',
      ],
    },
    {
      id: 'partnerReaction',
      prompt: 'Come reagisce di solito il partner in questi momenti?',
      options: [
        'Evita la conversazione',
        'Attacca o accusa',
        'Minimizza il problema',
        'Si scusa e torna al tema',
        'Non so / varia',
      ],
    },
    {
      id: 'goal',
      prompt: 'Di cosa hai più bisogno adesso?',
      options: [
        'Capire me stesso e le mie emozioni',
        'Prepararmi al dialogo',
        'Ritrovare la calma',
        'Trovare una soluzione concreta',
      ],
    },
  ],
};
