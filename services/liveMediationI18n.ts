import type { Language } from '@/constants/i18n';

function localized<T>(language: string, dict: Record<string, T>): T {
  return dict[language] ?? dict.pl;
}

export function partnerBDefaultLabel(language: string): string {
  return localized(language, {
    pl: 'Partnerka/Partner B',
    en: 'Partner B',
    it: 'Partner B',
    de: 'Partner B',
    fr: 'Partenaire B',
    es: 'Pareja B',
  });
}

function openingGoalText(language: string): string {
  return localized(language, {
    pl: 'Celem tej rozmowy jest zrozumieć, co każde z was widzi inaczej — zanim zaczniemy szukać rozwiązań.',
    en: 'The goal of this conversation is to understand what each of you sees differently — before we look for solutions.',
    it: "L'obiettivo di questa conversazione è capire cosa ciascuno di voi vede in modo diverso — prima di cercare soluzioni.",
    de: 'Das Ziel dieses Gesprächs ist zu verstehen, was jeder von euch anders sieht — bevor wir nach Lösungen suchen.',
    fr: "L'objectif de cette conversation est de comprendre ce que chacun de vous voit différemment — avant de chercher des solutions.",
    es: 'El objetivo de esta conversación es entender qué ve cada uno de vosotros de forma diferente — antes de buscar soluciones.',
  });
}

export function formatOpeningSummary(
  language: string,
  nameA: string,
  nameB: string,
  perspectiveA: string,
  perspectiveB: string,
  mainConflict: string,
  biggestGap: string
): string {
  const goal = openingGoalText(language);
  const headers = localized(language, {
    pl: { title: '📋 Podsumowanie konfliktu', core: 'Sedno konfliktu', gap: 'Największa różnica między waszymi wersjami' },
    en: { title: '📋 Conflict summary', core: 'Core of the conflict', gap: 'Biggest difference between your versions' },
    it: { title: '📋 Riepilogo del conflitto', core: 'Nucleo del conflitto', gap: 'Maggiore differenza tra le vostre versioni' },
    de: { title: '📋 Konfliktzusammenfassung', core: 'Kern des Konflikts', gap: 'Größter Unterschied zwischen euren Versionen' },
    fr: { title: '📋 Résumé du conflit', core: 'Cœur du conflit', gap: 'Plus grande différence entre vos versions' },
    es: { title: '📋 Resumen del conflicto', core: 'Núcleo del conflicto', gap: 'Mayor diferencia entre vuestras versiones' },
  });
  return (
    `${headers.title}\n\n` +
    `${nameA}\n\n${perspectiveA}\n\n` +
    `${nameB}\n\n${perspectiveB}\n\n` +
    `${headers.core}\n\n${mainConflict}\n\n` +
    `${headers.gap}\n\n${biggestGap}\n\n` +
    goal
  );
}

export function buildOpeningFirstQuestion(
  language: string,
  nameA: string,
  nameB: string,
  perspectiveA: string,
  perspectiveB: string,
  named: boolean
): string {
  const claimA = perspectiveA.trim().replace(/[.!?…]+$/, '');
  const claimB = perspectiveB.trim().replace(/[.!?…]+$/, '');
  const lowerA = claimA ? claimA.charAt(0).toLowerCase() + claimA.slice(1) : '';
  const lowerB = claimB ? claimB.charAt(0).toLowerCase() + claimB.slice(1) : '';

  const blocks = localized(language, {
    pl: {
      prefixNamed: `${nameA} i ${nameB}`,
      prefixBoth: 'Oboje',
      perspective: (a: string, b: string) => `${nameA} uważa, że ${a}.\n${nameB} uważa, że ${b}.\n\n`,
      line1: 'nie próbujcie jeszcze ustalać, kto ma rację.\n\n',
      line2: 'Chcę najpierw zrozumieć, dlaczego każde z was widzi tę sytuację inaczej.\n\n',
      line3: 'Opiszcie po jednym konkretnym wydarzeniu, które najlepiej pokazuje waszą wersję.\n\n',
      line4: 'Skupcie się na faktach — bez oceniania partnera.',
    },
    en: {
      prefixNamed: `${nameA} and ${nameB}`,
      prefixBoth: 'Both of you',
      perspective: (a: string, b: string) => `${nameA} believes that ${a}.\n${nameB} believes that ${b}.\n\n`,
      line1: 'do not try to decide who is right yet.\n\n',
      line2: 'I first want to understand why each of you sees this situation differently.\n\n',
      line3: 'Each of you describe one concrete event that best supports your version.\n\n',
      line4: 'Focus on facts — do not judge your partner.',
    },
    it: {
      prefixNamed: `${nameA} e ${nameB}`,
      prefixBoth: 'Entrambi',
      perspective: (a: string, b: string) => `${nameA} crede che ${a}.\n${nameB} crede che ${b}.\n\n`,
      line1: 'non cercate ancora di stabilire chi ha ragione.\n\n',
      line2: 'Voglio prima capire perché ciascuno di voi vede questa situazione in modo diverso.\n\n',
      line3: 'Descrivete ciascuno un evento concreto che supporti meglio la vostra versione.\n\n',
      line4: 'Concentratevi sui fatti — senza giudicare il partner.',
    },
    de: {
      prefixNamed: `${nameA} und ${nameB}`,
      prefixBoth: 'Beide',
      perspective: (a: string, b: string) => `${nameA} glaubt, dass ${a}.\n${nameB} glaubt, dass ${b}.\n\n`,
      line1: 'versucht noch nicht festzulegen, wer recht hat.\n\n',
      line2: 'Ich möchte zuerst verstehen, warum jeder von euch diese Situation anders sieht.\n\n',
      line3: 'Beschreibt jeweils ein konkretes Ereignis, das eure Version am besten stützt.\n\n',
      line4: 'Konzentriert euch auf Fakten — ohne den Partner zu beurteilen.',
    },
    fr: {
      prefixNamed: `${nameA} et ${nameB}`,
      prefixBoth: 'Tous les deux',
      perspective: (a: string, b: string) => `${nameA} pense que ${a}.\n${nameB} pense que ${b}.\n\n`,
      line1: "n'essayez pas encore de décider qui a raison.\n\n",
      line2: "Je veux d'abord comprendre pourquoi chacun de vous voit cette situation différemment.\n\n",
      line3: 'Décrivez chacun un événement concret qui soutient le mieux votre version.\n\n',
      line4: 'Concentrez-vous sur les faits — sans juger le partenaire.',
    },
    es: {
      prefixNamed: `${nameA} y ${nameB}`,
      prefixBoth: 'Ambos',
      perspective: (a: string, b: string) => `${nameA} cree que ${a}.\n${nameB} cree que ${b}.\n\n`,
      line1: 'no intentéis aún decidir quién tiene razón.\n\n',
      line2: 'Quiero primero entender por qué cada uno de vosotros ve esta situación de forma diferente.\n\n',
      line3: 'Describid cada uno un evento concreto que mejor respalde vuestra versión.\n\n',
      line4: 'Centraos en los hechos — sin juzgar al partner.',
    },
  });

  const prefix = named ? blocks.prefixNamed : blocks.prefixBoth;
  const perspectiveBlock =
    named && lowerA && lowerB ? blocks.perspective(lowerA, lowerB) : '';
  return (
    `🎯 ${prefix},\n\n` +
    perspectiveBlock +
    blocks.line1 +
    blocks.line2 +
    blocks.line3 +
    blocks.line4
  );
}

export function buildAlternativeProposalMessage(language: Language | string = 'pl'): string {
  return localized(language, {
    pl: `Rozumiem. Skoro ta propozycja nie daje wam jeszcze poczucia domknięcia, nie ma sensu na siłę uznawać sporu za rozwiązany.\n\nMoja alternatywna propozycja:\n\nNa dziś zatrzymajcie rozmowę bez dalszego przekonywania się.\nZróbcie coś neutralnego razem albo dajcie sobie krótką przerwę.\nWróćcie do tematu później, kiedy emocje będą niższe.\n\nNajważniejsze ustalenie na teraz:\nnie musicie mieć identycznej wersji wydarzeń, żeby potraktować swoje emocje poważnie.`,
    en: `I understand. If this proposal does not yet give you a sense of closure, there is no point in forcing the dispute to be "resolved."\n\nMy alternative proposal:\n\nFor today, pause the conversation without trying to convince each other further.\nDo something neutral together or take a short break.\nCome back to the topic later, when emotions are lower.\n\nThe most important agreement for now:\nyou do not need identical versions of events to take each other's emotions seriously.`,
    it: `Capisco. Se questa proposta non vi dà ancora un senso di chiusura, non ha senso forzare il conflitto come "risolto".\n\nLa mia proposta alternativa:\n\nPer oggi, mettete in pausa la conversazione senza cercare di convincervi a vicenda.\nFate qualcosa di neutro insieme o prendetevi una breve pausa.\nTornate all'argomento più tardi, quando le emozioni saranno più basse.\n\nL'accordo più importante per ora:\nnon avete bisogno di versioni identiche degli eventi per prendere sul serio le emozioni dell'altro.`,
    de: `Ich verstehe. Wenn dieser Vorschlag euch noch kein Gefühl des Abschlusses gibt, macht es keinen Sinn, den Streit gewaltsam als "gelöst" zu betrachten.\n\nMein alternativer Vorschlag:\n\nPausiert heute das Gespräch, ohne euch weiter überzeugen zu wollen.\nMacht etwas Neutrales zusammen oder nehmt euch eine kurze Pause.\nKehrt später zum Thema zurück, wenn die Emotionen niedriger sind.\n\nDie wichtigste Vereinbarung für jetzt:\nIhr braucht keine identischen Versionen der Ereignisse, um die Emotionen des anderen ernst zu nehmen.`,
    fr: `Je comprends. Si cette proposition ne vous donne pas encore un sentiment de clôture, il est inutile de forcer le conflit à être "résolu".\n\nMa proposition alternative :\n\nPour aujourd'hui, mettez la conversation en pause sans essayer de vous convaincre davantage.\nFaites quelque chose de neutre ensemble ou prenez une courte pause.\nRevenez au sujet plus tard, quand les émotions seront plus basses.\n\nL'accord le plus important pour l'instant :\nvous n'avez pas besoin de versions identiques des événements pour prendre au sérieux les émotions de l'autre.`,
    es: `Entiendo. Si esta propuesta aún no os da sensación de cierre, no tiene sentido forzar el conflicto como "resuelto".\n\nMi propuesta alternativa:\n\nPor hoy, pausad la conversación sin intentar convenceros más.\nHaced algo neutral juntos o tomad un descanso breve.\nVolved al tema más tarde, cuando las emociones sean más bajas.\n\nEl acuerdo más importante por ahora:\nno necesitáis versiones idénticas de los hechos para tomar en serio las emociones del otro.`,
  });
}

export function buildProposalAcceptedFinalMessage(language: Language | string = 'pl'): string {
  return localized(language, {
    pl: `Mediacja zakończona.\n\nUstaliliście zasadę na przyszłość i oboje zaakceptowaliście propozycję mediatora.\nWróćcie do tej zasady przy następnej trudnej rozmowie.`,
    en: `Mediation complete.\n\nYou agreed on a rule for the future and both accepted the mediator's proposal.\nReturn to this rule in your next difficult conversation.`,
    it: `Mediazione completata.\n\nAvete concordato una regola per il futuro e entrambi avete accettato la proposta del mediatore.\nTornate a questa regola nella prossima conversazione difficile.`,
    de: `Mediation abgeschlossen.\n\nIhr habt eine Regel für die Zukunft vereinbart und beide den Vorschlag des Mediators akzeptiert.\nKehrt bei eurem nächsten schwierigen Gespräch zu dieser Regel zurück.`,
    fr: `Médiation terminée.\n\nVous avez convenu d'une règle pour l'avenir et accepté tous les deux la proposition du médiateur.\nRevenez à cette règle lors de votre prochaine conversation difficile.`,
    es: `Mediación completada.\n\nHabéis acordado una regla para el futuro y ambos aceptasteis la propuesta del mediador.\nVolved a esta regla en vuestra próxima conversación difícil.`,
  });
}
