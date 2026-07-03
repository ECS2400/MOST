import type { ClosureBundle } from './types';

export const CLOSURE_FR: ClosureBundle = {
  survey: [
    { id: 'talkQuality', prompt: 'Comment évaluez-vous cette conversation ?', options: ['Mal', 'Moyennement', 'Bien', 'Très bien'] },
    { id: 'heard', prompt: 'Vous sentez-vous écouté(e) ?', options: ['Oui', 'En partie', 'Non', 'Difficile à dire'] },
    { id: 'ready', prompt: 'Êtes-vous prêt(e) pour la prochaine étape ?', options: ['Oui', 'Pas encore', 'Je ne sais pas'] },
    {
      id: 'hardest',
      prompt: 'Qu\'est-ce qui a été le plus difficile ?',
      options: ['Décrire les émotions', 'Comprendre l\'autre', 'Rester calme', 'Trouver une solution', 'Autre chose'],
    },
    { id: 'closer', prompt: 'Après cette conversation, vous sentez-vous plus proche ?', options: ['Oui', 'Un peu', 'Non', 'Trop tôt pour dire'] },
  ],
  dateIdeaDefault: {
    title: 'Balade avec une question',
    description:
      'Sortez pour une marche de 30–40 minutes. Règle : une question à la fois, sans interrompre. Première : « Qu\'est-ce qui a été le plus important pour toi dans notre conversation aujourd\'hui ? » Deuxième : « De quoi as-tu besoin de nous maintenant ? » Troisième (optionnel) : « Que pourrions-nous faire différemment demain ? » Après la balade, faites un câlin ou prenez-vous la main — sans attendre tout de suite une grande discussion.',
    whyItFits:
      'Le mouvement et l\'absence de regard direct facilitent souvent une conversation sincère après une dispute. Simple, peu coûteux et efficace.',
    estimatedCost: '0 €',
  },
  ui: {
    surveyTitle: 'Court questionnaire',
    dateIdeaTitle: 'Idée de rendez-vous',
    dateIdeaTodayTitle: 'Idée pour aujourd\'hui',
    durationLabel: 'Durée',
    durationMinutes: '{minutes} min',
    budgetFree: 'Gratuit',
    budgetLow: 'Coût faible',
    shuffleDateIdea: 'Tirer une autre idée',
    questionProgress: 'Question {current} sur {total}',
    loadingMediation: 'Fin de la médiation...',
    loadingDateIdea: 'Nous préparons une idée de rendez-vous...',
    whyItFits: 'Pourquoi ça convient',
    cost: 'Coût',
    footerNote: 'Une idée du cœur — sans dépenses, avec proximité. Adaptez-la à vous.',
    finish: 'Terminer',
    finishLive: 'Aller au résumé',
    errorPrep: 'Impossible de terminer la médiation.',
    errorSave: 'Impossible d\'enregistrer. Réessayez.',
    errorTitle: 'Erreur',
    noSession: 'Aucune session solo à enregistrer.',
  },
};
