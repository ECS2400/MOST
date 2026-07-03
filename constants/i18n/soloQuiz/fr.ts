import type { SoloQuizBundle } from './types';

export const SOLO_QUIZ_FR: SoloQuizBundle = {
  progress: 'Question {current} sur {total}',
  skipQuiz: 'Passer le quiz',
  nextDescribe: 'Suivant — décrire la situation',
  contextHeader: 'Contexte du quiz :',
  contextLabels: {
    situationType: 'Type de situation',
    when: 'Quand',
    intensity: 'Intensité (1-10)',
    mainPain: 'Ce qui fait le plus mal',
    partnerReaction: 'Réaction typique du partenaire',
    goal: 'Objectif de l\'utilisateur',
  },
  questions: [
    {
      id: 'situationType',
      prompt: 'Qu\'est-ce qui décrit le mieux cette situation ?',
      options: [
        'Dispute ou querelle',
        'Sentiment de négligence',
        'Manque de communication',
        'Rupture de confiance',
        'Différence de priorités',
        'Autre chose',
      ],
    },
    {
      id: 'when',
      prompt: 'Quand cela s\'est-il produit ?',
      options: ['Aujourd\'hui', 'Hier', 'Cette semaine', 'Il y a plus longtemps'],
    },
    {
      id: 'intensity',
      prompt: 'À quel point le ressentez-vous maintenant ? (1 = légèrement, 10 = très)',
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    },
    {
      id: 'mainPain',
      prompt: 'Qu\'est-ce qui fait le plus mal dans cette situation ?',
      options: [
        'Se sentir ignoré(e)',
        'Manque de respect',
        'Solitude dans le couple',
        'Injustice',
        'Peur pour l\'avenir',
        'Autre chose',
      ],
    },
    {
      id: 'partnerReaction',
      prompt: 'Comment votre partenaire réagit-il généralement dans ces moments ?',
      options: [
        'Évite la conversation',
        'Attaque ou accuse',
        'Minimise le problème',
        'S\'excuse et revient au sujet',
        'Je ne sais pas / ça varie',
      ],
    },
    {
      id: 'goal',
      prompt: 'De quoi avez-vous le plus besoin maintenant ?',
      options: [
        'Me comprendre et comprendre mes émotions',
        'Me préparer à la conversation',
        'Retrouver le calme',
        'Trouver une solution concrète',
      ],
    },
  ],
};
