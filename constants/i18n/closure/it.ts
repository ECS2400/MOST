import type { ClosureBundle } from './types';

export const CLOSURE_IT: ClosureBundle = {
  survey: [
    { id: 'talkQuality', prompt: 'Come valuti questa conversazione?', options: ['Male', 'Nella media', 'Bene', 'Molto bene'] },
    { id: 'heard', prompt: 'Ti senti ascoltato/a?', options: ['Sì', 'In parte', 'No', 'Difficile da dire'] },
    { id: 'ready', prompt: 'Sei pronto/a per il prossimo passo nella relazione?', options: ['Sì', 'Non ancora', 'Non so'] },
    {
      id: 'hardest',
      prompt: 'Cosa è stato più difficile?',
      options: ['Descrivere le emozioni', 'Capire l\'altra parte', 'Parlare con calma', 'Trovare una soluzione', 'Altro'],
    },
    { id: 'closer', prompt: 'Dopo questa conversazione ti senti più vicino/a al partner?', options: ['Sì', 'Un po\'', 'No', 'È troppo presto per dirlo'] },
  ],
  dateIdeaDefault: {
    title: 'Passeggiata con una domanda',
    description:
      'Uscite per una passeggiata di 30–40 minuti. Regola: una domanda alla volta, senza interrompersi. Prima: «Cosa è stato più importante per te nella nostra conversazione di oggi?» Seconda: «Di cosa hai bisogno da noi adesso?» Terza (opzionale): «Cosa potremmo fare diversamente domani?». Dopo la passeggiata abbracciatevi o tenetevi per mano — senza aspettarvi subito una grande conversazione.',
    whyItFits:
      'Il movimento e non guardarsi negli occhi spesso facilitano un dialogo sincero dopo un litigio. È semplice, economico e funziona davvero.',
    estimatedCost: '0 €',
  },
  ui: {
    surveyTitle: 'Breve questionario',
    dateIdeaTitle: 'Idea per un appuntamento',
    dateIdeaTodayTitle: 'Idea per oggi',
    durationLabel: 'Tempo',
    durationMinutes: '{minutes} min',
    budgetFree: 'Gratis',
    budgetLow: 'Costo basso',
    shuffleDateIdea: 'Scegli un\'altra idea',
    questionProgress: 'Domanda {current} di {total}',
    loadingMediation: 'Stiamo chiudendo la mediazione...',
    loadingDateIdea: 'Prepariamo un\'idea romantica per voi...',
    whyItFits: 'Perché fa al caso vostro',
    cost: 'Costo',
    footerNote: 'Un\'idea dal cuore — senza spese e con vicinanza. Potete adattarla a voi.',
    finish: 'Fine',
    finishLive: 'Vai al riepilogo',
    errorPrep: 'Impossibile chiudere la mediazione.',
    errorSave: 'Impossibile salvare. Riprova.',
    errorTitle: 'Errore',
    noSession: 'Nessuna sessione solo da salvare.',
  },
};
