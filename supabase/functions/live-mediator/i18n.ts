export const LANGUAGE_NAMES: Record<string, string> = {
  pl: 'Polish',
  en: 'English',
  it: 'Italian',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
};

export type MediatorLang = 'pl' | 'en' | 'it' | 'de' | 'fr' | 'es';

export function normalizeLanguage(raw: unknown): MediatorLang {
  if (raw === 'en' || raw === 'it' || raw === 'de' || raw === 'fr' || raw === 'es') return raw;
  return 'pl';
}

export function localized<T>(language: string, dict: Record<string, T>): T {
  return dict[language] ?? dict.pl;
}

export function openAiLanguageDirective(language: string): string {
  const languageName = LANGUAGE_NAMES[language] ?? 'Polish';
  return `CRITICAL: Write all user-facing text only in ${languageName}.
Do not mix languages.
Use the same mediation structure and do not change the phase logic.`;
}

export function openAiLanguageLabel(language: string): string {
  return LANGUAGE_NAMES[language] ?? 'Polish';
}

export const RESPONSIBILITY_BANK: Record<MediatorLang, string[]> = {
  pl: [
    'Co każde z was zrobiło, co realnie pogorszyło sytuację?',
    'Za co każde z was bierze odpowiedzialność — bez przerzucania winy?',
    'Jaki był wasz wkład w eskalację — konkretne działanie, nie intencja?',
    'Co mogliście zrobić inaczej w kluczowym momencie sporu?',
  ],
  en: [
    'What did each of you do that made the situation worse?',
    'What does each of you take responsibility for — without blaming?',
    'What was each of your contributions to escalation — a concrete action, not intent?',
    'What could each of you have done differently at the key moment?',
  ],
  it: [
    'Cosa ha fatto ciascuno di voi che ha peggiorato realmente la situazione?',
    'Di cosa si assume la responsabilità ciascuno di voi — senza scaricare la colpa?',
    'Qual è stato il vostro contributo all\'escalation — un\'azione concreta, non l\'intenzione?',
    'Cosa avreste potuto fare diversamente nel momento chiave del conflitto?',
  ],
  de: [
    'Was hat jeder von euch getan, das die Situation wirklich verschlechtert hat?',
    'Wofür übernimmt jeder von euch Verantwortung — ohne Schuldzuweisungen?',
    'Was war euer Beitrag zur Eskalation — eine konkrete Handlung, nicht die Absicht?',
    'Was hätte jeder von euch im entscheidenden Moment anders machen können?',
  ],
  fr: [
    'Qu\'est-ce que chacun de vous a fait qui a réellement aggravé la situation ?',
    'De quoi chacun de vous assume-t-il la responsabilité — sans rejeter la faute ?',
    'Quelle a été votre contribution à l\'escalade — une action concrète, pas l\'intention ?',
    'Qu\'auriez-vous pu faire autrement au moment clé du conflit ?',
  ],
  es: [
    '¿Qué hizo cada uno de vosotros que empeoró realmente la situación?',
    '¿De qué se responsabiliza cada uno — sin echar la culpa?',
    '¿Cuál fue vuestra contribución a la escalada — una acción concreta, no la intención?',
    '¿Qué podríais haber hecho de otra forma en el momento clave del conflicto?',
  ],
};

export const REPAIR_BANK: Record<MediatorLang, string[]> = {
  pl: [
    'Jaką konkretną zasadę wprowadzicie od następnej rozmowy, aby temu zapobiec?',
    'Co konkretnie każde z was zmieni od następnego konfliktu?',
    'Jaki sygnał ostrzegawczy rozpoznacie wcześniej następnym razem?',
    'Co zrobicie w ciągu 24h, żeby naprawić szkody z tego sporu?',
  ],
  en: [
    'What concrete rule will you adopt from the next conversation to prevent this?',
    'What will each of you concretely change from the next conflict?',
    'What early warning sign will you recognize sooner next time?',
    'What will each of you do within 24 hours to repair damage from this dispute?',
  ],
  it: [
    'Quale regola concreta adotterete dalla prossima conversazione per evitare che accada di nuovo?',
    'Cosa cambierà concretamente ciascuno di voi dal prossimo conflitto?',
    'Quale segnale d\'allarme riconoscerete prima la prossima volta?',
    'Cosa farete entro 24 ore per riparare i danni di questo conflitto?',
  ],
  de: [
    'Welche konkrete Regel werdet ihr ab dem nächsten Gespräch einführen, um das zu verhindern?',
    'Was wird jeder von euch ab dem nächsten Konflikt konkret ändern?',
    'Welches Frühwarnzeichen werdet ihr beim nächsten Mal früher erkennen?',
    'Was werdet ihr innerhalb von 24 Stunden tun, um den Schaden aus diesem Streit auszugleichen?',
  ],
  fr: [
    'Quelle règle concrète adopterez-vous dès la prochaine conversation pour éviter que cela se reproduise ?',
    'Qu\'est-ce que chacun de vous changera concrètement dès le prochain conflit ?',
    'Quel signal d\'alerte reconnaîtrez-vous plus tôt la prochaine fois ?',
    'Que ferez-vous dans les 24 heures pour réparer les dégâts de ce conflit ?',
  ],
  es: [
    '¿Qué regla concreta adoptaréis a partir de la próxima conversación para evitar que vuelva a pasar?',
    '¿Qué cambiará concretamente cada uno de vosotros a partir del próximo conflicto?',
    '¿Qué señal de alerta reconoceréis antes la próxima vez?',
    '¿Qué haréis en 24 horas para reparar los daños de esta disputa?',
  ],
};

export const RECONCILIATION_PATTERNS: Record<MediatorLang, RegExp[]> = {
  pl: [
    /kocham\s+cie/i,
    /kocham\s+cię/i,
    /dzi[eę]kuj[eę]/i,
    /czuj[eę]\s+ulg[eę]/i,
    /rozumiem\s+cie/i,
    /rozumiem\s+cię/i,
    /lepiej\s+rozumiem/i,
    /przepraszam/i,
    /masz\s+racj[eę]/i,
    /zgadzam\s+si[eę]/i,
    /czuj[eę]\s+si[eę]\s+lepiej/i,
    /doceniam/i,
    /nie\s+chc[eę]\s+ju[żz]\s+walczy[cć]/i,
    /chc[eę]\s+to\s+naprawi[cć]/i,
  ],
  en: [
    /\bi\s+love\s+you\b/i,
    /\bthank\s+you\b/i,
    /\bi\s+feel\s+relief\b/i,
    /\bi\s+understand\s+you\b/i,
    /\bi\s+understand\s+better\b/i,
    /\bi'?m\s+sorry\b/i,
    /\byou\s+are\s+right\b/i,
    /\bi\s+agree\b/i,
    /\bi\s+feel\s+better\b/i,
    /\bi\s+appreciate\b/i,
    /\bi\s+don'?t\s+want\s+to\s+fight\b/i,
    /\bi\s+want\s+to\s+fix\s+this\b/i,
  ],
  it: [
    /\bti\s+amo\b/i,
    /\bgrazie\b/i,
    /mi\s+dispiace/i,
    /\bcapisco\b/i,
    /sono\s+d'accordo/i,
    /mi\s+sent[oò]\s+meglio/i,
    /ti\s+capisco/i,
    /ho\s+capito/i,
    /scusami/i,
    /hai\s+ragione/i,
  ],
  de: [
    /\bich\s+liebe\s+dich\b/i,
    /\bdanke\b/i,
    /es\s+tut\s+mir\s+leid/i,
    /\bich\s+verstehe\b/i,
    /ich\s+stimme\s+zu/i,
    /mir\s+geht\s+es\s+besser/i,
    /entschuldig/i,
    /du\s+hast\s+recht/i,
  ],
  fr: [
    /\bje\s+t['']aime\b/i,
    /\bmerci\b/i,
    /je\s+suis\s+d[eé]sol[eé]/i,
    /\bje\s+comprends\b/i,
    /je\s+suis\s+d'accord/i,
    /je\s+me\s+sens\s+mieux/i,
    /pardon/i,
    /tu\s+as\s+raison/i,
  ],
  es: [
    /\bte\s+quiero\b/i,
    /\bgracias\b/i,
    /\blo\s+siento\b/i,
    /\bentiendo\b/i,
    /estoy\s+de\s+acuerdo/i,
    /me\s+siento\s+mejor/i,
    /perd[oó]n/i,
    /tienes\s+raz[oó]n/i,
  ],
};

export const RECONCILIATION_STRONG_PATTERNS: Record<MediatorLang, RegExp[]> = {
  pl: [/kocham\s+ci[eę]/i, /czuj[eę]\s+ulg[eę]/i, /\bprzepraszam\b/i],
  en: [/\bi\s+love\s+you\b/i, /\bi\s+feel\s+relief\b/i, /\bi'?m\s+sorry\b/i],
  it: [/\bti\s+amo\b/i, /mi\s+dispiace/i, /\bgrazie\b/i],
  de: [/\bich\s+liebe\s+dich\b/i, /es\s+tut\s+mir\s+leid/i, /\bdanke\b/i],
  fr: [/\bje\s+t['']aime\b/i, /je\s+suis\s+d[eé]sol[eé]/i, /\bmerci\b/i],
  es: [/\bte\s+quiero\b/i, /\blo\s+siento\b/i, /\bgracias\b/i],
};

export const EVASIVE_ANSWER_PATTERNS: Record<MediatorLang, RegExp> = {
  pl: /\b(nie wiem|może|nieważne|bo tak wyszło|tak wyszło|nieprawda)\b/i,
  en: /\b(i don'?t know|not sure|maybe|whatever|that'?s how it went|not true)\b/i,
  it: /\b(non lo so|forse|non importa|è andata così|non è vero)\b/i,
  de: /\b(ich weiß nicht|vielleicht|egal|so ist es gelaufen|stimmt nicht)\b/i,
  fr: /\b(je ne sais pas|peut-être|peu importe|c'est comme ça|ce n'est pas vrai)\b/i,
  es: /\b(no lo sé|quizás|no importa|salió así|no es verdad)\b/i,
};

export function getReconciliationPatterns(language: string): RegExp[] {
  return localized(language, RECONCILIATION_PATTERNS);
}

export function getReconciliationStrongPatterns(language: string): RegExp[] {
  return localized(language, RECONCILIATION_STRONG_PATTERNS);
}

export function getResponsibilityBank(language: string): string[] {
  return localized(language, RESPONSIBILITY_BANK);
}

export function getRepairBank(language: string): string[] {
  return localized(language, REPAIR_BANK);
}

export function obojePrefix(language: string): string {
  return localized(language, {
    pl: '@Oboje',
    en: '@Both',
    it: '@Entrambi',
    de: '@Beide',
    fr: '@Tous les deux',
    es: '@Ambos',
  });
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

export function singleSidedPartnerPrompt(language: string): string {
  return localized(language, {
    pl: 'Do przejścia dalej potrzebna jest odpowiedź drugiej strony. Partner, który jeszcze nie odpowiedział: odnieś się konkretnie do ostatniego pytania.',
    en: 'To move forward, the other partner needs to answer. The partner who has not answered yet: respond specifically to the last question.',
    it: 'Per andare avanti serve la risposta dell\'altro partner. Partner che non ha ancora risposto: rispondete specificamente all\'ultima domanda.',
    de: 'Um weiterzukommen, brauchen wir die Antwort der anderen Seite. Partner, der noch nicht geantwortet hat: bezieht euch konkret auf die letzte Frage.',
    fr: 'Pour avancer, l\'autre partenaire doit répondre. Partenaire qui n\'a pas encore répondu : répondez précisément à la dernière question.',
    es: 'Para avanzar, el otro partner debe responder. Partner que aún no ha respondido: responded concretamente a la última pregunta.',
  });
}

export function bankExhaustedFallback(language: string, phase: 'responsibility' | 'repair'): string {
  if (phase === 'repair') {
    return localized(language, {
      pl: 'Nie chcę powtarzać pytania. Podajcie teraz po jednym konkretnym zachowaniu, które zmienicie w najbliższej rozmowie.',
      en: 'I do not want to repeat the question. Each of you now name one concrete behaviour you will change in the next conversation.',
      it: 'Non voglio ripetere la domanda. Ognuno di voi indichi ora un comportamento concreto che cambierà nella prossima conversazione.',
      de: 'Ich möchte die Frage nicht wiederholen. Nennt jetzt jeweils ein konkretes Verhalten, das ihr im nächsten Gespräch ändern werdet.',
      fr: 'Je ne veux pas répéter la question. Chacun de vous nomme maintenant un comportement concret que vous changerez lors de la prochaine conversation.',
      es: 'No quiero repetir la pregunta. Cada uno de vosotros indique ahora un comportamiento concreto que cambiará en la próxima conversación.',
    });
  }
  return localized(language, {
    pl: 'Nie chcę powtarzać pytania. Podajcie teraz po jednym konkretnym działaniu, które pogorszyło ten konflikt.',
    en: 'I do not want to repeat the question. Each of you now name one concrete action you took that worsened this conflict.',
    it: 'Non voglio ripetere la domanda. Ognuno di voi indichi ora un\'azione concreta che ha peggiorato questo conflitto.',
    de: 'Ich möchte die Frage nicht wiederholen. Nennt jetzt jeweils eine konkrete Handlung, die diesen Konflikt verschlimmert hat.',
    fr: 'Je ne veux pas répéter la question. Chacun de vous nomme maintenant une action concrète qui a aggravé ce conflit.',
    es: 'No quiero repetir la pregunta. Cada uno de vosotros indique ahora una acción concreta que empeoró este conflicto.',
  });
}

export function defaultSharedRule(language: string): string {
  return localized(language, {
    pl: 'Najpierw zatrzymujemy się przy emocjach drugiej osoby. Dopiero potem wyjaśniamy intencje. Jeśli rozmowa znowu skręca w obronę albo ból, zatrzymujemy się i wracamy do emocji.',
    en: 'First we pause at the other person\'s emotions. Then we clarify intentions. If the talk turns to defense or pain, we stop and return to emotions.',
    it: 'Prima ci fermiamo sulle emozioni dell\'altra persona. Poi chiarifichiamo le intenzioni. Se la conversazione torna alla difesa o al dolore, ci fermiamo e torniamo alle emozioni.',
    de: 'Zuerst halten wir bei den Emotionen der anderen Person inne. Dann klären wir die Absichten. Wenn das Gespräch wieder in Verteidigung oder Schmerz kippt, halten wir inne und kehren zu den Emotionen zurück.',
    fr: 'D\'abord nous faisons une pause sur les émotions de l\'autre. Ensuite nous clarifions les intentions. Si la conversation repart dans la défense ou la douleur, nous nous arrêtons et revenons aux émotions.',
    es: 'Primero nos detenemos en las emociones de la otra persona. Luego aclaramos las intenciones. Si la conversación vuelve a la defensa o al dolor, nos detenemos y volvemos a las emociones.',
  });
}

export function defaultFallbackPlan(language: string): string {
  return localized(language, {
    pl: 'Jeśli zasada zawiedzie, robicie krótką przerwę i wracacie do pytania: „Co teraz czujesz i czego potrzebujesz, zanim przejdziemy do wyjaśnień?”',
    en: 'If the rule fails, take a short break and return to: "What do you feel and need before we explain?"',
    it: 'Se la regola fallisce, fate una breve pausa e tornate alla domanda: «Cosa senti e di cosa hai bisogno prima di spiegare?»',
    de: 'Wenn die Regel scheitert, macht eine kurze Pause und kehrt zurück zu: „Was fühlst du und was brauchst du, bevor wir erklären?"',
    fr: 'Si la règle échoue, faites une courte pause et revenez à : « Que ressens-tu et de quoi as-tu besoin avant d\'expliquer ? »',
    es: 'Si la regla falla, haced una pausa breve y volved a: «¿Qué sientes y qué necesitas antes de explicar?»',
  });
}

export function buildReconciliationTransitionMessage(language: string): string {
  return localized(language, {
    pl: 'Widzę, że zaczęliście się wzajemnie rozumieć. Nie będę dalej dociskać tego samego punktu. Domknijmy tę rozmowę konkretną zasadą na przyszłość.',
    en: 'I can see that you are beginning to understand each other. I will not keep pressing the same point. Let us close this with one concrete rule for the future.',
    it: 'Vedo che state iniziando a capirvi. Non continuerò a insistere sullo stesso punto. Chiudiamo con una regola concreta per il futuro.',
    de: 'Ich sehe, dass ihr euch anfangt zu verstehen. Ich werde nicht weiter auf denselben Punkt drücken. Schließen wir mit einer konkreten Regel für die Zukunft ab.',
    fr: 'Je vois que vous commencez à vous comprendre. Je ne vais pas continuer à insister sur le même point. Clôturons avec une règle concrète pour l\'avenir.',
    es: 'Veo que empezáis a entenderos. No seguiré presionando el mismo punto. Cerremos con una regla concreta para el futuro.',
  });
}

export function buildGenericRepairBothQuestion(language: string): string {
  return localized(language, {
    pl: 'Co każde z was może zrobić następnym razem, żeby emocje i intencje miały swoje miejsce w rozmowie?',
    en: 'What can each of you do next time so emotions and intentions both have their place in the conversation?',
    it: 'Cosa può fare ciascuno di voi la prossima volta affinché emozioni e intenzioni abbiano entrambe il loro posto nella conversazione?',
    de: 'Was kann jeder von euch beim nächsten Mal tun, damit Emotionen und Absichten beide ihren Platz im Gespräch haben?',
    fr: 'Que peut faire chacun de vous la prochaine fois pour que les émotions et les intentions aient toutes deux leur place dans la conversation ?',
    es: '¿Qué puede hacer cada uno de vosotros la próxima vez para que emociones e intenciones tengan ambas su lugar en la conversación?',
  });
}

export function buildReconciliationRepairQuestion(
  language: string,
  nameA: string,
  nameB: string,
  named: boolean
): string {
  const dict: Record<string, string> = {
    pl: named
      ? `🎯 ${nameA} i ${nameB},\n\njaką jedną zasadę możecie ustalić na następną trudną rozmowę, żeby najpierw uznać emocje, a dopiero później wyjaśniać intencje?`
      : `🎯 Oboje,\n\njaką jedną zasadę możecie ustalić na następną trudną rozmowę, żeby najpierw uznać emocje, a dopiero później wyjaśniać intencje?`,
    en: named
      ? `🎯 ${nameA} and ${nameB},\n\nwhat one rule can you agree on for the next difficult conversation so that emotions are acknowledged first and intentions are explained afterward?`
      : `🎯 Both of you,\n\nwhat one rule can you agree on for the next difficult conversation so that emotions are acknowledged first and intentions are explained afterward?`,
    it: named
      ? `🎯 ${nameA} e ${nameB},\n\nquale regola unica potete concordare per la prossima conversazione difficile, affinché le emozioni siano riconosciute prima e le intenzioni spiegate dopo?`
      : `🎯 Entrambi,\n\nquale regola unica potete concordare per la prossima conversazione difficile, affinché le emozioni siano riconosciute prima e le intenzioni spiegate dopo?`,
    de: named
      ? `🎯 ${nameA} und ${nameB},\n\nwelche eine Regel könnt ihr für das nächste schwierige Gespräch vereinbaren, damit zuerst Emotionen anerkannt und danach Absichten erklärt werden?`
      : `🎯 Beide,\n\nwelche eine Regel könnt ihr für das nächste schwierige Gespräch vereinbaren, damit zuerst Emotionen anerkannt und danach Absichten erklärt werden?`,
    fr: named
      ? `🎯 ${nameA} et ${nameB},\n\nquelle règle unique pouvez-vous convenir pour la prochaine conversation difficile, afin que les émotions soient reconnues d'abord et les intentions expliquées ensuite ?`
      : `🎯 Tous les deux,\n\nquelle règle unique pouvez-vous convenir pour la prochaine conversation difficile, afin que les émotions soient reconnues d'abord et les intentions expliquées ensuite ?`,
    es: named
      ? `🎯 ${nameA} y ${nameB},\n\n¿qué regla única podéis acordar para la próxima conversación difícil, para que primero se reconozcan las emociones y después se expliquen las intenciones?`
      : `🎯 Ambos,\n\n¿qué regla única podéis acordar para la próxima conversación difícil, para que primero se reconozcan las emociones y después se expliquen las intenciones?`,
  };
  return localized(language, dict);
}

export function gapFactsQuestion(language: string): string {
  return localized(language, {
    pl: 'Każde z was opisze jedno konkretne wydarzenie (same fakty), które najlepiej pokazuje waszą wersję.',
    en: 'Each of you describe one concrete event (facts only) that best supports your version.',
    it: 'Ciascuno di voi descriva un evento concreto (solo fatti) che supporti meglio la propria versione.',
    de: 'Beschreibt jeweils ein konkretes Ereignis (nur Fakten), das eure Version am besten stützt.',
    fr: 'Chacun de vous décrit un événement concret (faits seulement) qui soutient le mieux votre version.',
    es: 'Cada uno de vosotros describe un evento concreto (solo hechos) que mejor respalde vuestra versión.',
  });
}

export function gapInterpretationQuestion(language: string, gapDesc: string): string {
  return localized(language, {
    pl: `Wygląda na to, że ${gapDesc}. Co każde z was założyło wtedy o intencjach drugiej osoby?`,
    en: `It looks like ${gapDesc}. What did each of you assume about the other's intent in that moment?`,
    it: `Sembra che ${gapDesc}. Cosa ha supposto ciascuno di voi sulle intenzioni dell'altro in quel momento?`,
    de: `Es sieht so aus, als ob ${gapDesc}. Was hat jeder von euch in dem Moment über die Absicht des anderen angenommen?`,
    fr: `Il semble que ${gapDesc}. Qu'a supposé chacun de vous sur les intentions de l'autre à ce moment-là ?`,
    es: `Parece que ${gapDesc}. ¿Qué supuso cada uno de vosotros sobre las intenciones del otro en ese momento?`,
  });
}

export function gapAcknowledgmentQuestion(
  language: string,
  nameA: string,
  nameB: string,
  named: boolean
): string {
  const dict: Record<string, string> = {
    pl: named
      ? `${nameA} i ${nameB}, jaki jeden słuszny element perspektywy partnera możecie teraz uznać?`
      : 'Jaki jeden słuszny element perspektywy partnera może teraz uznać każde z was?',
    en: named
      ? `${nameA} and ${nameB}, what is one fair part of your partner's perspective that you can acknowledge right now?`
      : "What is one fair part of your partner's perspective that each of you can acknowledge right now?",
    it: named
      ? `${nameA} e ${nameB}, quale elemento giusto della prospettiva del partner potete riconoscere adesso?`
      : 'Quale elemento giusto della prospettiva del partner può riconoscere ciascuno di voi adesso?',
    de: named
      ? `${nameA} und ${nameB}, welchen fairen Teil der Perspektive des Partners könnt ihr jetzt anerkennen?`
      : 'Welchen fairen Teil der Perspektive des Partners kann jeder von euch jetzt anerkennen?',
    fr: named
      ? `${nameA} et ${nameB}, quel élément juste de la perspective du partenaire pouvez-vous reconnaître maintenant ?`
      : 'Quel élément juste de la perspective du partenaire chacun de vous peut-il reconnaître maintenant ?',
    es: named
      ? `${nameA} y ${nameB}, ¿qué elemento justo de la perspectiva del partner podéis reconocer ahora?`
      : '¿Qué elemento justo de la perspectiva del partner puede reconocer cada uno de vosotros ahora?',
  };
  return localized(language, dict);
}

export function gapUnresolvedQuestion(language: string, gapDesc: string): string {
  return localized(language, {
    pl: `Po tym, co usłyszeliście, co nadal pozostaje nierozwiązane w kwestii ${gapDesc}?`,
    en: `After what you have heard, what still feels unresolved about ${gapDesc}?`,
    it: `Dopo ciò che avete sentito, cosa resta irrisolto riguardo a ${gapDesc}?`,
    de: `Nach dem, was ihr gehört habt, was fühlt sich bei ${gapDesc} noch ungelöst an?`,
    fr: `Après ce que vous avez entendu, qu'est-ce qui reste non résolu concernant ${gapDesc} ?`,
    es: `Después de lo que habéis oído, ¿qué sigue sin resolverse respecto a ${gapDesc}?`,
  });
}

export function repairCheckQuestion(language: string): string {
  return localized(language, {
    pl: 'Czy zasada, którą zaproponowaliście, naprawdę obejmuje moment, gdy rosną emocje — co dokładnie zrobi każde z was inaczej?',
    en: 'Does the rule you proposed truly cover the moment when emotions rise — what exactly will each of you do differently?',
    it: 'La regola che avete proposto copre davvero il momento in cui crescono le emozioni — cosa farà esattamente ciascuno di voi in modo diverso?',
    de: 'Deckt die vorgeschlagene Regel wirklich den Moment ab, in dem Emotionen steigen — was genau wird jeder von euch anders machen?',
    fr: 'La règle que vous avez proposée couvre-t-elle vraiment le moment où les émotions montent — que fera exactement chacun de vous différemment ?',
    es: '¿La regla que propusisteis cubre realmente el momento en que suben las emociones — qué hará exactamente cada uno de vosotros de forma diferente?',
  });
}

export function repairStressTestQuestion(language: string): string {
  return localized(language, {
    pl: 'Co zrobicie, jeśli ta zasada zawiedzie w następnym konflikcie — jak zatrzymacie się i wrócicie najpierw do emocji?',
    en: 'What will you do if this rule fails in the next conflict — how will you pause and return to emotions first?',
    it: 'Cosa farete se questa regola fallisce nel prossimo conflitto — come vi fermerete e tornerete prima alle emozioni?',
    de: 'Was werdet ihr tun, wenn diese Regel im nächsten Konflikt scheitert — wie haltet ihr inne und kehrt zuerst zu den Emotionen zurück?',
    fr: 'Que ferez-vous si cette règle échoue lors du prochain conflit — comment ferez-vous une pause et reviendrez-vous d\'abord aux émotions ?',
    es: '¿Qué haréis si esta regla falla en el próximo conflicto — cómo os detendréis y volveréis primero a las emociones?',
  });
}

export function buildRepairClosureHints(language: string): { tone: string } {
  return {
    tone: localized(language, {
      pl: 'To jest dobry moment na domknięcie rozmowy. Nie dokładaj kolejnych wyjaśnień — potwierdź zasadę i trzymajcie się jej w następnej trudnej rozmowie.',
      en: 'This is a good moment to close the conversation. Do not add more explanations — confirm the rule and hold to it in the next difficult talk.',
      it: 'È un buon momento per chiudere la conversazione. Non aggiungete altre spiegazioni — confermate la regola e mantenetela nella prossima conversazione difficile.',
      de: 'Dies ist ein guter Moment, das Gespräch abzuschließen. Fügt keine weiteren Erklärungen hinzu — bestätigt die Regel und haltet euch daran im nächsten schwierigen Gespräch.',
      fr: 'C\'est un bon moment pour clore la conversation. N\'ajoutez pas d\'autres explications — confirmez la règle et tenez-vous-y lors de la prochaine conversation difficile.',
      es: 'Es un buen momento para cerrar la conversación. No añadáis más explicaciones — confirmad la regla y mantenedla en la próxima conversación difícil.',
    }),
  };
}

export function humanizeGapDefault(language: string): string {
  return localized(language, {
    pl: 'tej różnicy między wami',
    en: 'this difference between you',
    it: 'questa differenza tra voi',
    de: 'dieser Unterschied zwischen euch',
    fr: 'cette différence entre vous',
    es: 'esta diferencia entre vosotros',
  });
}

export function humanizeGapAbstract(language: string): string {
  return localized(language, {
    pl: 'jedno z was szybciej przechodziło do wyjaśniania intencji, a drugie potrzebowało najpierw uznania emocji',
    en: 'one of you moved quickly to explaining intentions while the other needed emotions acknowledged first',
    it: 'uno di voi passava rapidamente a spiegare le intenzioni mentre l\'altro aveva bisogno che le emozioni fossero riconosciute prima',
    de: 'einer von euch ging schnell zur Erklärung der Absichten über, während der andere zuerst Anerkennung der Emotionen brauchte',
    fr: 'l\'un de vous passait rapidement à l\'explication des intentions tandis que l\'autre avait besoin que les émotions soient reconnues d\'abord',
    es: 'uno de vosotros pasaba rápido a explicar intenciones mientras el otro necesitaba que se reconocieran primero las emociones',
  });
}

export function evasionDeadlockPrompt(language: string): string {
  return localized(language, {
    pl: 'Zatrzymuję ten etap, bo od kilku odpowiedzi nie pojawiają się nowe fakty. Nie będę zadawał tego samego pytania w innej formie. Przejdźmy do tego, co możecie zrobić mimo braku wspólnej wersji wydarzeń.',
    en: 'I am stopping this stage because the last few answers did not add new facts. I will not keep asking the same question in another form. Let us move to what you can do despite not having one shared version of events.',
    it: 'Interrompo questa fase perché le ultime risposte non hanno aggiunto nuovi fatti. Non continuerò a porre la stessa domanda in altra forma. Passiamo a ciò che potete fare nonostante non abbiate una versione condivisa degli eventi.',
    de: 'Ich stoppe diese Phase, weil die letzten Antworten keine neuen Fakten geliefert haben. Ich werde nicht dieselbe Frage in anderer Form stellen. Gehen wir zu dem über, was ihr tun könnt, obwohl ihr keine gemeinsame Version der Ereignisse habt.',
    fr: 'J\'arrête cette étape car les dernières réponses n\'ont pas apporté de nouveaux faits. Je ne poserai pas la même question sous une autre forme. Passons à ce que vous pouvez faire malgré l\'absence d\'une version commune des événements.',
    es: 'Detengo esta etapa porque las últimas respuestas no aportaron hechos nuevos. No seguiré haciendo la misma pregunta de otra forma. Pasemos a lo que podéis hacer a pesar de no tener una versión compartida de los hechos.',
  });
}

export function escalationRisingMessage(language: string): string {
  return localized(language, {
    pl: 'Wykryto wzrost napięcia. 2 minuty przerwy.',
    en: 'Tension rising. 2-minute pause.',
    it: 'Tensione in aumento. Pausa di 2 minuti.',
    de: 'Spannung steigt. 2 Minuten Pause.',
    fr: 'Tension en hausse. Pause de 2 minutes.',
    es: 'Tensión en aumento. Pausa de 2 minutos.',
  });
}

export function escalationDetectedMessage(language: string): string {
  return localized(language, {
    pl: 'Wykryto napięcie. 2 minuty przerwy.',
    en: 'Tension detected. 2-minute pause.',
    it: 'Tensione rilevata. Pausa di 2 minuti.',
    de: 'Spannung erkannt. 2 Minuten Pause.',
    fr: 'Tension détectée. Pause de 2 minutes.',
    es: 'Tensión detectada. Pausa de 2 minutos.',
  });
}

export function openingGoalText(language: string): string {
  return localized(language, {
    pl: 'Celem tej rozmowy jest zrozumieć, co każde z was widzi inaczej — zanim zaczniemy szukać rozwiązań.',
    en: 'The goal of this conversation is to understand what each of you sees differently — before we look for solutions.',
    it: 'L\'obiettivo di questa conversazione è capire cosa ciascuno di voi vede in modo diverso — prima di cercare soluzioni.',
    de: 'Das Ziel dieses Gesprächs ist zu verstehen, was jeder von euch anders sieht — bevor wir nach Lösungen suchen.',
    fr: 'L\'objectif de cette conversation est de comprendre ce que chacun de vous voit différemment — avant de chercher des solutions.',
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
      line1: 'n\'essayez pas encore de décider qui a raison.\n\n',
      line2: 'Je veux d\'abord comprendre pourquoi chacun de vous voit cette situation différemment.\n\n',
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

export function buildConflictQuestion(
  perspectiveA: string,
  perspectiveB: string,
  language: string
): string {
  const a = perspectiveA.slice(0, 180);
  const b = perspectiveB.slice(0, 180);
  return localized(language, {
    pl: `Partner A twierdzi: "${a}" — Partner B twierdzi: "${b}". Każde z was podaj jedno konkretne wydarzenie (fakty, nie emocje), które pokazuje, dlaczego wierzycie swojej wersji.`,
    en: `Partner A claims: "${a}" — Partner B claims: "${b}". Each give one concrete event (facts only, not emotions) that shows why you believe your version.`,
    it: `Partner A afferma: "${a}" — Partner B afferma: "${b}". Ciascuno indichi un evento concreto (solo fatti, non emozioni) che mostri perché credete alla propria versione.`,
    de: `Partner A behauptet: "${a}" — Partner B behauptet: "${b}". Nennt jeweils ein konkretes Ereignis (nur Fakten, keine Emotionen), das zeigt, warum ihr eurer Version glaubt.`,
    fr: `Partner A affirme : "${a}" — Partner B affirme : "${b}". Chacun donne un événement concret (faits seulement, pas d'émotions) qui montre pourquoi vous croyez votre version.`,
    es: `Partner A afirma: "${a}" — Partner B afirma: "${b}". Cada uno indique un evento concreto (solo hechos, no emociones) que muestre por qué creéis en vuestra versión.`,
  });
}

export function fallbackGapQuestion(gapDesc: string, round: number, language: string): string {
  if (round <= 0) {
    return localized(language, {
      pl: `Wygląda na to, że ${gapDesc}. Co dokładnie każde z was widzi inaczej?`,
      en: `It looks like ${gapDesc}. What exactly does each of you see differently?`,
      it: `Sembra che ${gapDesc}. Cosa vede esattamente ciascuno di voi in modo diverso?`,
      de: `Es sieht so aus, als ob ${gapDesc}. Was genau sieht jeder von euch anders?`,
      fr: `Il semble que ${gapDesc}. Qu'est-ce que chacun de vous voit exactement différemment ?`,
      es: `Parece que ${gapDesc}. ¿Qué ve exactamente cada uno de vosotros de forma diferente?`,
    });
  }
  if (round === 1) {
    return localized(language, {
      pl: `Wróćmy do tego: który konkretny fakt z odpowiedzi partnera wydaje się niezgodny z waszą wersją?`,
      en: `Going back to that: which specific fact from your partner's answer feels inconsistent with your version?`,
      it: `Torniamo a questo: quale fatto specifico dalla risposta del partner sembra incoerente con la vostra versione?`,
      de: `Zurück dazu: welcher konkrete Fakt aus der Antwort des Partners wirkt im Widerspruch zu eurer Version?`,
      fr: `Revenons à cela : quel fait précis de la réponse du partenaire semble incohérent avec votre version ?`,
      es: `Volvamos a eso: ¿qué hecho concreto de la respuesta del partner parece inconsistente con vuestra versión?`,
    });
  }
  if (round === 2) {
    return localized(language, {
      pl: 'Podajcie po jednym dowodzie lub przykładzie, który najlepiej potwierdza waszą wersję.',
      en: 'Each of you give one piece of evidence that best supports your version.',
      it: 'Ciascuno di voi dia una prova o un esempio che supporti meglio la propria versione.',
      de: 'Gebt jeweils einen Beweis oder ein Beispiel, der eure Version am besten stützt.',
      fr: 'Chacun de vous donne une preuve ou un exemple qui soutient le mieux votre version.',
      es: 'Cada uno de vosotros dé una prueba o ejemplo que mejor respalde vuestra versión.',
    });
  }
  return localized(language, {
    pl: 'To nadal nie jest jasne. Co musiałoby się okazać prawdą, żebyście uznali wersję partnera za możliwą?',
    en: 'This still feels unclear. What would have to be true for you to consider your partner\'s version possible?',
    it: 'Questo non è ancora chiaro. Cosa dovrebbe essere vero perché consideriate possibile la versione del partner?',
    de: 'Das ist immer noch unklar. Was müsste wahr sein, damit ihr die Version des Partners für möglich haltet?',
    fr: 'Ce n\'est toujours pas clair. Que faudrait-il que ce soit vrai pour que vous considériez la version du partenaire comme possible ?',
    es: 'Esto sigue sin estar claro. ¿Qué tendría que ser verdad para que consideréis posible la versión del partner?',
  });
}

export function fallbackDeepenQuestion(
  lastQuestion: string,
  evasiveAnswer: string,
  language: string
): string {
  const quote = evasiveAnswer.slice(0, 80);
  if (lastQuestion) {
    const q = lastQuestion.slice(0, 100);
    return localized(language, {
      pl: `Nadal nie odpowiedzieliście na pytanie: "${q}". Powiedzieliście "${quote}" — podajcie konkretny powód, nie unikajcie.`,
      en: `You still haven't answered: "${q}". You said "${quote}" — give a concrete reason, not a deflection.`,
      it: `Non avete ancora risposto: "${q}". Avete detto "${quote}" — date una ragione concreta, non una deviazione.`,
      de: `Ihr habt noch nicht geantwortet: "${q}". Ihr sagtet "${quote}" — gebt einen konkreten Grund, keine Ausweichantwort.`,
      fr: `Vous n'avez toujours pas répondu : "${q}". Vous avez dit "${quote}" — donnez une raison concrète, pas une esquive.`,
      es: `Aún no habéis respondido: "${q}". Dijisteis "${quote}" — dad una razón concreta, no una evasión.`,
    });
  }
  return localized(language, {
    pl: `Powiedzieliście "${quote}" — to nie jest odpowiedź. Podajcie konkretny fakt.`,
    en: `You said "${quote}" — that doesn't answer the question. Give a specific fact.`,
    it: `Avete detto "${quote}" — non è una risposta. Date un fatto specifico.`,
    de: `Ihr sagtet "${quote}" — das ist keine Antwort. Gebt einen konkreten Fakt.`,
    fr: `Vous avez dit "${quote}" — ce n'est pas une réponse. Donnez un fait précis.`,
    es: `Dijisteis "${quote}" — eso no es una respuesta. Dad un hecho concreto.`,
  });
}

export function buildContradictionQuestion(
  who: string,
  previousClaim: string,
  newClaim: string,
  language: string
): string {
  const prev = previousClaim.slice(0, 80);
  const curr = newClaim.slice(0, 80);
  return localized(language, {
    pl: `${who}, wcześniej powiedziałeś/aś: "${prev}". Teraz mówisz: "${curr}". Co się zmieniło?`,
    en: `${who}, earlier you said "${prev}". Now you say "${curr}". What changed?`,
    it: `${who}, prima hai detto "${prev}". Ora dici "${curr}". Cosa è cambiato?`,
    de: `${who}, zuvor sagtest du "${prev}". Jetzt sagst du "${curr}". Was hat sich geändert?`,
    fr: `${who}, tu as dit plus tôt "${prev}". Maintenant tu dis "${curr}". Qu'est-ce qui a changé ?`,
    es: `${who}, antes dijiste "${prev}". Ahora dices "${curr}". ¿Qué cambió?`,
  });
}

export function contradictionSpeakerLabel(
  speaker: 'partnerA' | 'partnerB' | 'unknown',
  language: string
): string {
  if (speaker === 'partnerA') return 'Partner A';
  if (speaker === 'partnerB') return 'Partner B';
  return localized(language, {
    pl: 'Jeden z partnerów',
    en: 'One partner',
    it: 'Uno dei partner',
    de: 'Ein Partner',
    fr: 'Un des partenaires',
    es: 'Uno de los partners',
  });
}

export function formatProposedSolutionMessage(
  language: string,
  nameA: string,
  nameB: string,
  commitA: string,
  commitB: string,
  fallbackPlan: string
): string {
  const h = localized(language, {
    pl: {
      title: '📌 Propozycja mediatora',
      intro: 'Z tego, co ustaliliście, wasza zasada na następną trudną rozmowę brzmi:',
      r1: '1. Najpierw zatrzymujemy się przy emocjach drugiej osoby.',
      r2: '2. Dopiero potem wyjaśniamy intencje.',
      r3: '3. Jeśli rozmowa znowu skręca w obronę albo ból, zatrzymujemy się i wracamy do emocji.',
      ca: `Konkretne zobowiązanie — ${nameA}:`,
      cb: `Konkretne zobowiązanie — ${nameB}:`,
      backup: 'Plan awaryjny:',
      ask: 'Czy oboje akceptujecie tę zasadę na następną trudną rozmowę?',
    },
    en: {
      title: '📌 Mediator proposal',
      intro: 'From what you agreed, your rule for the next difficult conversation is:',
      r1: '1. First pause at the other person\'s emotions.',
      r2: '2. Then clarify intentions.',
      r3: '3. If the talk turns to defense or pain, stop and return to emotions.',
      ca: `Concrete commitment — ${nameA}:`,
      cb: `Concrete commitment — ${nameB}:`,
      backup: 'Backup plan:',
      ask: 'Do you both accept this rule for your next difficult conversation?',
    },
    it: {
      title: '📌 Proposta del mediatore',
      intro: 'Da ciò che avete concordato, la vostra regola per la prossima conversazione difficile è:',
      r1: '1. Prima ci fermiamo sulle emozioni dell\'altra persona.',
      r2: '2. Poi chiarifichiamo le intenzioni.',
      r3: '3. Se la conversazione torna alla difesa o al dolore, ci fermiamo e torniamo alle emozioni.',
      ca: `Impegno concreto — ${nameA}:`,
      cb: `Impegno concreto — ${nameB}:`,
      backup: 'Piano di emergenza:',
      ask: 'Accettate entrambi questa regola per la prossima conversazione difficile?',
    },
    de: {
      title: '📌 Vorschlag des Mediators',
      intro: 'Aus dem, was ihr vereinbart habt, lautet eure Regel für das nächste schwierige Gespräch:',
      r1: '1. Zuerst halten wir bei den Emotionen der anderen Person inne.',
      r2: '2. Dann klären wir die Absichten.',
      r3: '3. Wenn das Gespräch wieder in Verteidigung oder Schmerz kippt, halten wir inne und kehren zu den Emotionen zurück.',
      ca: `Konkretes Commitment — ${nameA}:`,
      cb: `Konkretes Commitment — ${nameB}:`,
      backup: 'Notfallplan:',
      ask: 'Akzeptiert ihr beide diese Regel für euer nächstes schwieriges Gespräch?',
    },
    fr: {
      title: '📌 Proposition du médiateur',
      intro: 'D\'après ce que vous avez convenu, votre règle pour la prochaine conversation difficile est :',
      r1: '1. D\'abord nous faisons une pause sur les émotions de l\'autre.',
      r2: '2. Ensuite nous clarifions les intentions.',
      r3: '3. Si la conversation repart dans la défense ou la douleur, nous nous arrêtons et revenons aux émotions.',
      ca: `Engagement concret — ${nameA} :`,
      cb: `Engagement concret — ${nameB} :`,
      backup: 'Plan de secours :',
      ask: 'Acceptez-vous tous les deux cette règle pour votre prochaine conversation difficile ?',
    },
    es: {
      title: '📌 Propuesta del mediador',
      intro: 'De lo que acordasteis, vuestra regla para la próxima conversación difícil es:',
      r1: '1. Primero nos detenemos en las emociones de la otra persona.',
      r2: '2. Luego aclaramos las intenciones.',
      r3: '3. Si la conversación vuelve a la defensa o al dolor, nos detenemos y volvemos a las emociones.',
      ca: `Compromiso concreto — ${nameA}:`,
      cb: `Compromiso concreto — ${nameB}:`,
      backup: 'Plan de emergencia:',
      ask: '¿Aceptáis ambos esta regla para vuestra próxima conversación difícil?',
    },
  });
  return (
    `${h.title}\n\n${h.intro}\n\n${h.r1}\n${h.r2}\n${h.r3}\n\n` +
    `${h.ca}\n${commitA}\n\n${h.cb}\n${commitB}\n\n${h.backup}\n${fallbackPlan}\n\n${h.ask}`
  );
}

export function defaultCommitmentA(language: string, nameA: string): string {
  return localized(language, {
    pl: `${nameA} zatrzyma rozmowę i wróci do emocji, gdy poczuje obronę.`,
    en: `${nameA} will pause and return to emotions when defensiveness rises.`,
    it: `${nameA} metterà in pausa e tornerà alle emozioni quando sentirà difensività.`,
    de: `${nameA} wird innehalten und zu den Emotionen zurückkehren, wenn Verteidigung aufkommt.`,
    fr: `${nameA} fera une pause et reviendra aux émotions quand la défensive montera.`,
    es: `${nameA} hará una pausa y volverá a las emociones cuando sienta defensiva.`,
  });
}

export function defaultCommitmentB(language: string, nameB: string): string {
  return localized(language, {
    pl: `${nameB} poprosi o przerwę i wróci z gotowością wysłuchania.`,
    en: `${nameB} will ask for a pause and return ready to listen.`,
    it: `${nameB} chiederà una pausa e tornerà pronto/a ad ascoltare.`,
    de: `${nameB} wird um eine Pause bitten und bereit zum Zuhören zurückkehren.`,
    fr: `${nameB} demandera une pause et reviendra prêt(e) à écouter.`,
    es: `${nameB} pedirá una pausa y volverá dispuesto/a a escuchar.`,
  });
}

export function buildReconciliationPrivateHints(
  language: string,
  partnerLabel: string,
  hostLabel: string
): { hostHint: string; partnerHint: string; hostFallback: string; partnerFallback: string } {
  return {
    hostHint: localized(language, {
      pl: `Zrobiłeś ważny krok: uznałeś emocje ${partnerLabel}. Teraz nie tłumacz się dalej — zaproponuj jedną konkretną zasadę na następną rozmowę.`,
      en: `You took an important step: you acknowledged ${partnerLabel}'s emotions. Do not keep explaining — propose one concrete rule for the next conversation.`,
      it: `Hai fatto un passo importante: hai riconosciuto le emozioni di ${partnerLabel}. Non continuare a spiegare — proponi una regola concreta per la prossima conversazione.`,
      de: `Du hast einen wichtigen Schritt gemacht: du hast ${partnerLabel}s Emotionen anerkannt. Erkläre nicht weiter — schlage eine konkrete Regel für das nächste Gespräch vor.`,
      fr: `Tu as fait un pas important : tu as reconnu les émotions de ${partnerLabel}. Ne continue pas à t'expliquer — propose une règle concrète pour la prochaine conversation.`,
      es: `Diste un paso importante: reconociste las emociones de ${partnerLabel}. No sigas explicando — propón una regla concreta para la próxima conversación.`,
    }),
    partnerHint: localized(language, {
      pl: `Zrobiłaś ważny krok: nazwałaś ulgę i otworzyłaś przestrzeń na porozumienie. Teraz pomóż domknąć rozmowę konkretną zasadą.`,
      en: `You took an important step: you named relief and opened space for understanding. Help close this with one concrete rule.`,
      it: `Hai fatto un passo importante: hai nominato sollievo e aperto spazio per la comprensione. Aiuta a chiudere con una regola concreta.`,
      de: `Du hast einen wichtigen Schritt gemacht: du hast Erleichterung benannt und Raum für Verständnis geöffnet. Hilf mit einer konkreten Regel abzuschließen.`,
      fr: `Tu as fait un pas important : tu as nommé le soulagement et ouvert l'espace à la compréhension. Aide à clore avec une règle concrète.`,
      es: `Diste un paso importante: nombraste alivio y abriste espacio para el entendimiento. Ayuda a cerrar con una regla concreta.`,
    }),
    hostFallback: localized(language, {
      pl: 'Uznaj to, co partner właśnie powiedział, zanim pójdziecie dalej.',
      en: 'Acknowledge what your partner just said before moving on.',
      it: 'Riconosci ciò che il partner ha appena detto prima di andare avanti.',
      de: 'Erkenne an, was dein Partner gerade gesagt hat, bevor ihr weitermacht.',
      fr: 'Reconnais ce que ton partenaire vient de dire avant d\'avancer.',
      es: 'Reconoce lo que el partner acaba de decir antes de seguir.',
    }),
    partnerFallback: localized(language, {
      pl: `Wesprzyj krok naprawczy, który zaczął ${hostLabel} — nazwij jedną zasadę na przyszłość.`,
      en: `Support the repair step ${hostLabel} started — name one rule for next time.`,
      it: `Sostieni il passo di riparazione iniziato da ${hostLabel} — nomina una regola per la prossima volta.`,
      de: `Unterstütze den Reparaturschritt, den ${hostLabel} begonnen hat — nenne eine Regel für das nächste Mal.`,
      fr: `Soutiens l'étape de réparation commencée par ${hostLabel} — nomme une règle pour la prochaine fois.`,
      es: `Apoya el paso de reparación que empezó ${hostLabel} — nombra una regla para la próxima vez.`,
    }),
  };
}

export function openingFallbackTexts(language: string): {
  noDescA: string;
  noDescB: string;
  mainConflict: string;
  biggestGap: string;
  intentGap: string;
  trustGap: string;
} {
  return {
    noDescA: localized(language, {
      pl: 'Brak opisu od partnera A.',
      en: 'No description from partner A.',
      it: 'Nessuna descrizione dal partner A.',
      de: 'Keine Beschreibung von Partner A.',
      fr: 'Pas de description du partenaire A.',
      es: 'Sin descripción del partner A.',
    }),
    noDescB: localized(language, {
      pl: 'Brak opisu od partnera B.',
      en: 'No description from partner B yet.',
      it: 'Nessuna descrizione dal partner B per ora.',
      de: 'Noch keine Beschreibung von Partner B.',
      fr: 'Pas encore de description du partenaire B.',
      es: 'Aún sin descripción del partner B.',
    }),
    mainConflict: localized(language, {
      pl: 'Nierozwiązane napięcie między stronami.',
      en: 'Unresolved tension between both sides.',
      it: 'Tensione irrisolta tra entrambe le parti.',
      de: 'Ungelöste Spannung zwischen beiden Seiten.',
      fr: 'Tension non résolue entre les deux parties.',
      es: 'Tensión no resuelta entre ambas partes.',
    }),
    biggestGap: localized(language, {
      pl: 'Każda strona inaczej interpretuje motywy drugiej.',
      en: "Each side interprets the other's motives differently.",
      it: 'Ciascuna parte interpreta diversamente i motivi dell\'altra.',
      de: 'Jede Seite interpretiert die Motive der anderen anders.',
      fr: 'Chaque partie interprète différemment les motivations de l\'autre.',
      es: 'Cada parte interpreta de forma diferente los motivos de la otra.',
    }),
    intentGap: localized(language, {
      pl: 'Różne intencje stojące za tymi samymi działaniami',
      en: 'Different intentions behind the same actions',
      it: 'Intenzioni diverse dietro le stesse azioni',
      de: 'Unterschiedliche Absichten hinter denselben Handlungen',
      fr: 'Intentions différentes derrière les mêmes actions',
      es: 'Intenciones diferentes detrás de las mismas acciones',
    }),
    trustGap: localized(language, {
      pl: 'Różne przekonania o zaufaniu i rzetelności',
      en: 'Different beliefs about trust and reliability',
      it: 'Credenze diverse sulla fiducia e l\'affidabilità',
      de: 'Unterschiedliche Überzeugungen über Vertrauen und Zuverlässigkeit',
      fr: 'Croyances différentes sur la confiance et la fiabilité',
      es: 'Creencias diferentes sobre la confianza y la fiabilidad',
    }),
  };
}

export function finalSummaryTexts(language: string): {
  title: string;
  coreLabel: string;
  resolvedLabel: string;
  unresolvedLabel: string;
  actionsLabel: string;
  noneRecorded: string;
  allAddressed: string;
  seeTranscript: string;
  deadlock: string;
} {
  return {
    title: localized(language, {
      pl: 'Podsumowanie końcowe',
      en: 'Final summary',
      it: 'Riepilogo finale',
      de: 'Abschlusszusammenfassung',
      fr: 'Résumé final',
      es: 'Resumen final',
    }),
    coreLabel: localized(language, {
      pl: 'Sedno',
      en: 'Core',
      it: 'Nucleo',
      de: 'Kern',
      fr: 'Cœur',
      es: 'Núcleo',
    }),
    resolvedLabel: localized(language, {
      pl: 'Rozwiązane luki',
      en: 'Resolved gaps',
      it: 'Lacune risolte',
      de: 'Gelöste Lücken',
      fr: 'Écarts résolus',
      es: 'Brechas resueltas',
    }),
    unresolvedLabel: localized(language, {
      pl: 'Nierozwiązane luki',
      en: 'Unresolved gaps',
      it: 'Lacune irrisolte',
      de: 'Ungelöste Lücken',
      fr: 'Écarts non résolus',
      es: 'Brechas no resueltas',
    }),
    actionsLabel: localized(language, {
      pl: 'Działania: 3 zobowiązania na 7 dni',
      en: 'Actions: 3 commitments each for 7 days',
      it: 'Azioni: 3 impegni ciascuno per 7 giorni',
      de: 'Maßnahmen: 3 Verpflichtungen jeweils für 7 Tage',
      fr: 'Actions : 3 engagements chacun pour 7 jours',
      es: 'Acciones: 3 compromisos cada uno durante 7 días',
    }),
    noneRecorded: localized(language, {
      pl: 'Brak.',
      en: 'None recorded.',
      it: 'Nessuna registrata.',
      de: 'Keine verzeichnet.',
      fr: 'Aucune enregistrée.',
      es: 'Ninguna registrada.',
    }),
    allAddressed: localized(language, {
      pl: 'Wszystkie luki omówione.',
      en: 'All gaps addressed.',
      it: 'Tutte le lacune affrontate.',
      de: 'Alle Lücken besprochen.',
      fr: 'Tous les écarts abordés.',
      es: 'Todas las brechas abordadas.',
    }),
    seeTranscript: localized(language, {
      pl: 'Patrz rozmowa',
      en: 'See transcript',
      it: 'Vedi trascrizione',
      de: 'Siehe Transkript',
      fr: 'Voir la transcription',
      es: 'Ver transcripción',
    }),
    deadlock: localized(language, {
      pl: 'impas (nie rozwiązana w pełni)',
      en: 'deadlock (not fully resolved)',
      it: 'stallo (non risolto completamente)',
      de: 'Stillstand (nicht vollständig gelöst)',
      fr: 'impasse (pas entièrement résolu)',
      es: 'punto muerto (no resuelto por completo)',
    }),
  };
}

export function answerAckTexts(language: string): {
  yourAnswer: string;
  stayOnGap: (gap: string) => string;
  questionWas: (q: string) => string;
  attack: string;
  vague: string;
  partnerAnswered: string;
} {
  return {
    yourAnswer: localized(language, {
      pl: 'twoja odpowiedź',
      en: 'your answer',
      it: 'la tua risposta',
      de: 'deine Antwort',
      fr: 'ta réponse',
      es: 'tu respuesta',
    }),
    stayOnGap: (gap: string) =>
      localized(language, {
        pl: `Trzymaj się luki: «${gap}».`,
        en: `Stay on gap: «${gap}».`,
        it: `Resta sulla lacuna: «${gap}».`,
        de: `Bleib bei der Lücke: «${gap}».`,
        fr: `Reste sur l'écart : «${gap} ».`,
        es: `Mantente en la brecha: «${gap}».`,
      }),
    questionWas: (q: string) =>
      localized(language, {
        pl: `Pytanie brzmiało: «${q}».`,
        en: `Question was: «${q}».`,
        it: `La domanda era: «${q}».`,
        de: `Die Frage lautete: «${q}».`,
        fr: `La question était : «${q} ».`,
        es: `La pregunta era: «${q}».`,
      }),
    attack: localized(language, {
      pl: 'brzmi jak atak. Fakt + twoja część.',
      en: 'sounds like an attack. Fact + your part.',
      it: 'suona come un attacco. Fatto + la tua parte.',
      de: 'klingt wie ein Angriff. Fakt + dein Anteil.',
      fr: 'sonne comme une attaque. Fait + ta part.',
      es: 'suena como un ataque. Hecho + tu parte.',
    }),
    vague: localized(language, {
      pl: 'za mało konkretu. Co dokładnie?',
      en: 'too vague. What exactly?',
      it: 'troppo vago. Cosa esattamente?',
      de: 'zu vage. Was genau?',
      fr: 'trop vague. Quoi exactement ?',
      es: 'demasiado vago. ¿Qué exactamente?',
    }),
    partnerAnswered: localized(language, {
      pl: 'Partner też odpowiedział — jaka prawda w jego/jej słowach jest słuszna?',
      en: 'Partner answered — what truth in their words is fair?',
      it: 'Il partner ha risposto — quale verità nelle sue parole è giusta?',
      de: 'Partner hat geantwortet — welche Wahrheit in seinen Worten ist fair?',
      fr: 'Le partenaire a répondu — quelle vérité dans ses mots est juste ?',
      es: 'El partner respondió — ¿qué verdad en sus palabras es justa?',
    }),
  };
}

export function summarySectionPrompts(
  language: string,
  gapSection: string
): Record<string, string> {
  return {
    mid_summary: localized(language, {
      pl: `Podsumowanie w trakcie sesji. Cytuj konkretne momenty z rozmowy. Sekcje: sedno, postęp, mocne strony.${gapSection}`,
      en: `Mid-session summary. Quote specific moments from transcript. Sections: core dispute, progress, strengths.${gapSection}`,
      it: `Riepilogo a metà sessione. Cita momenti specifici dalla trascrizione. Sezioni: nucleo, progressi, punti di forza.${gapSection}`,
      de: `Zusammenfassung während der Sitzung. Zitiere konkrete Momente aus dem Transkript. Abschnitte: Kern, Fortschritt, Stärken.${gapSection}`,
      fr: `Résumé en cours de session. Citez des moments précis de la transcription. Sections : cœur, progrès, forces.${gapSection}`,
      es: `Resumen a mitad de sesión. Cita momentos concretos de la transcripción. Secciones: núcleo, progreso, fortalezas.${gapSection}`,
    }),
    final_summary: localized(language, {
      pl: `FINALNE podsumowanie. Cytuj ustalenia z rozmowy. Sekcje: sedno, ustalenia, mocne/słabe strony, 3-5 działań.${gapSection}`,
      en: `FINAL summary. Quote agreements from transcript. Sections: dispute core, agreements, strengths, weaknesses, 3-5 concrete actions each.${gapSection}`,
      it: `Riepilogo FINALE. Cita accordi dalla trascrizione. Sezioni: nucleo, accordi, punti forti/deboli, 3-5 azioni concrete ciascuno.${gapSection}`,
      de: `FINALE Zusammenfassung. Zitiere Vereinbarungen aus dem Transkript. Abschnitte: Kern, Vereinbarungen, Stärken/Schwächen, 3-5 konkrete Maßnahmen jeweils.${gapSection}`,
      fr: `Résumé FINAL. Citez les accords de la transcription. Sections : cœur, accords, forces/faiblesses, 3-5 actions concrètes chacun.${gapSection}`,
      es: `Resumen FINAL. Cita acuerdos de la transcripción. Secciones: núcleo, acuerdos, fortalezas/debilidades, 3-5 acciones concretas cada uno.${gapSection}`,
    }),
    extension_check: localized(language, {
      pl: 'Po rundzie dodatkowej — czy spór rozstrzygnięty? Krótko.',
      en: 'After extension — is dispute resolved? Short, blunt.',
      it: 'Dopo il round aggiuntivo — il conflitto è risolto? Brevemente.',
      de: 'Nach der Zusatzrunde — ist der Streit gelöst? Kurz.',
      fr: 'Après la ronde supplémentaire — le conflit est-il résolu ? Bref.',
      es: 'Tras la ronda adicional — ¿está resuelto el conflicto? Breve.',
    }),
    proposed_solution: localized(language, {
      pl: 'JEDNO konkretne rozwiązanie z CAŁEJ rozmowy: działania + weryfikacja za 7 dni.',
      en: 'ONE concrete resolution from FULL conversation: actions + 7-day check.',
      it: 'UNA risoluzione concreta da TUTTA la conversazione: azioni + verifica a 7 giorni.',
      de: 'EINE konkrete Lösung aus dem GESAMTEN Gespräch: Maßnahmen + 7-Tage-Check.',
      fr: 'UNE résolution concrète de TOUTE la conversation : actions + vérification à 7 jours.',
      es: 'UNA resolución concreta de TODA la conversación: acciones + verificación a 7 días.',
    }),
  };
}

export function summaryFallbackTexts(
  language: string,
  ctx: string,
  gapSection: string
): Record<string, string> {
  return {
    mid_summary: localized(language, {
      pl: `W trakcie sesji\n\nSedno: ${ctx || 'Jest postęp.'}${gapSection}`,
      en: `Mid-session\n\nCore: ${ctx || 'Progress made.'}${gapSection}`,
      it: `A metà sessione\n\nNucleo: ${ctx || 'Progressi fatti.'}${gapSection}`,
      de: `Während der Sitzung\n\nKern: ${ctx || 'Fortschritt gemacht.'}${gapSection}`,
      fr: `En cours de session\n\nCœur : ${ctx || 'Progrès réalisés.'}${gapSection}`,
      es: `A mitad de sesión\n\nNúcleo: ${ctx || 'Hay progreso.'}${gapSection}`,
    }),
    extension_check: localized(language, {
      pl: 'Po rundzie dodatkowej — czy spór rozstrzygnięty?',
      en: 'After extension — is the dispute resolved?',
      it: 'Dopo il round aggiuntivo — il conflitto è risolto?',
      de: 'Nach der Zusatzrunde — ist der Streit gelöst?',
      fr: 'Après la ronde supplémentaire — le conflit est-il résolu ?',
      es: 'Tras la ronda adicional — ¿está resuelto el conflicto?',
    }),
    proposed_solution: localized(language, {
      pl: `Propozycja:\n1) Jedno działanie dziennie przez 7 dni\n2) Weryfikacja za tydzień`,
      en: `Proposal:\n1) Daily action each for 7 days\n2) Check in 7 days`,
      it: `Proposta:\n1) Un'azione al giorno per 7 giorni\n2) Verifica tra 7 giorni`,
      de: `Vorschlag:\n1) Tägliche Aktion jeweils für 7 Tage\n2) Check-in in 7 Tagen`,
      fr: `Proposition :\n1) Une action quotidienne chacun pendant 7 jours\n2) Vérification dans 7 jours`,
      es: `Propuesta:\n1) Una acción diaria cada uno durante 7 días\n2) Verificación en 7 días`,
    }),
  };
}

export function unresolvedGapsLabel(language: string): string {
  return localized(language, {
    pl: 'Nierozwiązane luki:',
    en: 'Unresolved gaps:',
    it: 'Lacune irrisolte:',
    de: 'Ungelöste Lücken:',
    fr: 'Écarts non résolus :',
    es: 'Brechas no resueltas:',
  });
}

export function buildBrainSystemPrompt(language: string): string {
  const lang = openAiLanguageLabel(language);
  const directive = openAiLanguageDirective(language);
  return `You are a tough couple mediator and logic judge — NOT a neutral chatbot or question generator.
Analyze the FULL conversation transcript. Return JSON only:
{
  "partnerAAnswered": boolean,
  "partnerBAnswered": boolean,
  "evasionDetected": boolean,
  "evasionReason": "string",
  "activeGapResolved": boolean,
  "gapResolveConfidence": 0-100,
  "gapResolveReason": "string",
  "newGapDetected": boolean,
  "newGap": { "id": "snake_case_id", "description": "one sentence" } | null,
  "readyForResponsibility": boolean,
  "responsibilityComplete": boolean,
  "repairComplete": boolean,
  "readyForMidSummary": boolean,
  "conversationFinished": boolean,
  "question": "string"
}

EVALUATION RULES (evaluate last round if both partners answered):
- partnerAAnswered/partnerBAnswered=false if answer dodges, changes topic, is one sentence without substance, or doesn't address the question (e.g. "bo tak wyszło", "to nieprawda").
- evasionDetected=true if either partner evaded — do NOT treat as answered.
- activeGapResolved=true ONLY when BOTH stated concrete positions, addressed partner's arguments, AND it's clear WHY they see differently. gapResolveConfidence>=75 required. NEVER resolve based on round count alone.
- newGapDetected=true ONLY with clear evidence of a NEW perception difference not in identifiedGaps.
- readyForResponsibility=true ONLY when all gaps resolved AND both understand each other's stance AND no new misunderstandings visible.
- responsibilityComplete=true when responsibility phase fully explored (not after fixed question count).
- repairComplete=true when concrete repair commitments discussed.
- readyForMidSummary=true ONLY when first major problem was explained AND conversation genuinely shifted — NOT automatic.
- conversationFinished=true ONLY when: no open gaps, responsibilityComplete, repairComplete, no new conflicts.

QUESTION RULES:
- MAX 2 sentences. Prefer 1 sentence.
- MUST quote or reference SPECIFIC partner words from transcript.
- MUST point to a SPECIFIC contradiction — never generic "how do you feel", "what do you mean", "expand your answer".
- If evasionDetected: demand direct answer, cite their evasive words.
- If partner changed their story: call it out with both quotes.
- Detect: contradictions, avoidance, version changes, unanswered questions, topic shifts, manipulation.
- question MUST serve a DIFFERENT purpose than any previousMediatorQuestions.
- Language: ${lang}

${directive}`;
}

export function openingSummaryOpenAiRules(language: string): string {
  const lang = openAiLanguageLabel(language);
  return `Rules: 2-4 gaps, ids like intent_gap/trust_gap, all resolved=false. Language: ${lang}.

${openAiLanguageDirective(language)}`;
}

export function buildAlternativeProposalMessage(language: string): string {
  return localized(language, {
    pl: `Rozumiem. Skoro ta propozycja nie daje wam jeszcze poczucia domknięcia, nie ma sensu na siłę uznawać sporu za rozwiązany.\n\nMoja alternatywna propozycja:\n\nNa dziś zatrzymajcie rozmowę bez dalszego przekonywania się.\nZróbcie coś neutralnego razem albo dajcie sobie krótką przerwę.\nWróćcie do tematu później, kiedy emocje będą niższe.\n\nNajważniejsze ustalenie na teraz:\nnie musicie mieć identycznej wersji wydarzeń, żeby potraktować swoje emocje poważnie.`,
    en: `I understand. If this proposal does not yet give you a sense of closure, there is no point in forcing the dispute to be "resolved."\n\nMy alternative proposal:\n\nFor today, pause the conversation without trying to convince each other further.\nDo something neutral together or take a short break.\nCome back to the topic later, when emotions are lower.\n\nThe most important agreement for now:\nyou do not need identical versions of events to take each other's emotions seriously.`,
    it: `Capisco. Se questa proposta non vi dà ancora un senso di chiusura, non ha senso forzare il conflitto come "risolto".\n\nLa mia proposta alternativa:\n\nPer oggi, mettete in pausa la conversazione senza cercare di convincervi a vicenda.\nFate qualcosa di neutro insieme o prendetevi una breve pausa.\nTornate all'argomento più tardi, quando le emozioni saranno più basse.\n\nL'accordo più importante per ora:\nnon avete bisogno di versioni identiche degli eventi per prendere sul serio le emozioni dell'altro.`,
    de: `Ich verstehe. Wenn dieser Vorschlag euch noch kein Gefühl des Abschlusses gibt, macht es keinen Sinn, den Streit gewaltsam als "gelöst" zu betrachten.\n\nMein alternativer Vorschlag:\n\nPausiert heute das Gespräch, ohne euch weiter überzeugen zu wollen.\nMacht etwas Neutrales zusammen oder nehmt euch eine kurze Pause.\nKehrt später zum Thema zurück, wenn die Emotionen niedriger sind.\n\nDie wichtigste Vereinbarung für jetzt:\nIhr braucht keine identischen Versionen der Ereignisse, um die Emotionen des anderen ernst zu nehmen.`,
    fr: `Je comprends. Si cette proposition ne vous donne pas encore un sentiment de clôture, il est inutile de forcer le conflit à être "résolu".\n\nMa proposition alternative :\n\nPour aujourd'hui, mettez la conversation en pause sans essayer de vous convaincre davantage.\nFaites quelque chose de neutre ensemble ou prenez une courte pause.\nRevenez au sujet plus tard, quand les émotions seront plus basses.\n\nL'accord le plus important pour l'instant :\nvous n'avez pas besoin de versions identiques des événements pour prendre au sérieux les émotions de l'autre.`,
    es: `Entiendo. Si esta propuesta aún no os da sensación de cierre, no tiene sentido forzar el conflicto como "resuelto".\n\nMi propuesta alternativa:\n\nPor hoy, pausad la conversación sin intentar convenceros más.\nHaced algo neutral juntos o tomad un descanso breve.\nVolved al tema más tarde, cuando las emociones sean más bajas.\n\nEl acuerdo más importante por ahora:\nno necesitáis versiones idénticas de los hechos para tomar en serio las emociones del otro.`,
  });
}

export function buildProposalAcceptedFinalMessage(language: string): string {
  return localized(language, {
    pl: `Mediacja zakończona.\n\nUstaliliście zasadę na przyszłość i oboje zaakceptowaliście propozycję mediatora.\nWróćcie do tej zasady przy następnej trudnej rozmowie.`,
    en: `Mediation complete.\n\nYou agreed on a rule for the future and both accepted the mediator's proposal.\nReturn to this rule in your next difficult conversation.`,
    it: `Mediazione completata.\n\nAvete concordato una regola per il futuro e entrambi avete accettato la proposta del mediatore.\nTornate a questa regola nella prossima conversazione difficile.`,
    de: `Mediation abgeschlossen.\n\nIhr habt eine Regel für die Zukunft vereinbart und beide den Vorschlag des Mediators akzeptiert.\nKehrt bei eurem nächsten schwierigen Gespräch zu dieser Regel zurück.`,
    fr: `Médiation terminée.\n\nVous avez convenu d'une règle pour l'avenir et accepté tous les deux la proposition du médiateur.\nRevenez à cette règle lors de votre prochaine conversation difficile.`,
    es: `Mediación completada.\n\nHabéis acordado una regla para el futuro y ambos aceptasteis la propuesta del mediador.\nVolved a esta regla en vuestra próxima conversación difícil.`,
  });
}
