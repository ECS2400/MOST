import type { ClosureBundle } from './types';

export const CLOSURE_DE: ClosureBundle = {
  survey: [
    { id: 'talkQuality', prompt: 'Wie bewertest du dieses Gespräch?', options: ['Schlecht', 'Durchschnittlich', 'Gut', 'Sehr gut'] },
    { id: 'heard', prompt: 'Fühlst du dich gehört?', options: ['Ja', 'Teilweise', 'Nein', 'Schwer zu sagen'] },
    { id: 'ready', prompt: 'Bist du bereit für den nächsten Schritt in der Beziehung?', options: ['Ja', 'Noch nicht', 'Ich weiß nicht'] },
    {
      id: 'hardest',
      prompt: 'Was war am schwersten?',
      options: ['Gefühle beschreiben', 'Die andere Seite verstehen', 'Ruhig bleiben', 'Eine Lösung finden', 'Etwas anderes'],
    },
    { id: 'closer', prompt: 'Fühlst du dich nach dem Gespräch dem Partner näher?', options: ['Ja', 'Ein wenig', 'Nein', 'Zu früh um zu sagen'] },
  ],
  dateIdeaDefault: {
    title: 'Spaziergang mit einer Frage',
    description:
      'Geht 30–40 Minuten spazieren. Regel: eine Frage nach der anderen, ohne zu unterbrechen. Erste: „Was war dir in unserem Gespräch heute am wichtigsten?" Zweite: „Was brauchst du jetzt von uns?" Dritte (optional): „Was könnten wir morgen anders machen?" Danach umarmt euch oder haltet Händchen — ohne sofort ein großes Gespräch zu erwarten.',
    whyItFits:
      'Bewegung und kein direkter Blickkontakt erleichtern oft ein ehrliches Gespräch nach einem Streit. Einfach, günstig und wirksam.',
    estimatedCost: '0 €',
  },
  ui: {
    surveyTitle: 'Kurze Umfrage',
    dateIdeaTitle: 'Date-Idee',
    dateIdeaTodayTitle: 'Idee für heute',
    durationLabel: 'Zeit',
    durationMinutes: '{minutes} Min.',
    budgetFree: 'Kostenlos',
    budgetLow: 'Geringe Kosten',
    shuffleDateIdea: 'Andere Idee wählen',
    questionProgress: 'Frage {current} von {total}',
    loadingMediation: 'Mediation wird beendet...',
    loadingDateIdea: 'Wir bereiten eine herzliche Date-Idee vor...',
    whyItFits: 'Warum es passt',
    cost: 'Kosten',
    footerNote: 'Eine Idee von Herzen — ohne teure Dinge, mit Nähe. Passt sie euch an.',
    finish: 'Fertig',
    finishLive: 'Zur Zusammenfassung',
    errorPrep: 'Mediation konnte nicht beendet werden.',
    errorSave: 'Speichern fehlgeschlagen. Bitte erneut versuchen.',
    errorTitle: 'Fehler',
    noSession: 'Keine Solo-Sitzung zum Speichern.',
  },
};
