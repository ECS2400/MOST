import type { MappedAnalysisView } from '@/services/analysisViewMapper';
import type { Language } from '@/constants/i18n';
import { getSoloExtras } from '@/constants/i18n/soloExtras';
import { truncateAtWord } from '@/utils/textTruncate';
import { fmt } from '@/utils/i18nFormat';

const THERAPY_CLICHES =
  /Twoje uczucia są uzasadnione|To musi frustrować|To musi boleć|Dzięki za szczerość|Jestem po Twojej stronie|bez oceniania/i;

const GENERIC_LOOP_RE =
  /^Słucham\. Opowiedz co cię wkurza albo czego nie rozumiesz w jej reakcji/i;

const SMS_REQUEST_RE =
  /rozpisz|przygotuj.*(wiadomo|tekst|sms)|gotow[aą] wiadomo|daj (mi )?(tekst|wiadomo|sms)|napisz co (jej |mam )|wklej|wyślij/i;

const CHAT_PREFERENCE_RE =
  /pogadaj|porozmawia|najpierw (pogad|porozmaw)|chc[eę] pogad|chce pogad|nie chc[eę] sms|bez sms/i;

const OPINION_REQUEST_RE =
  /co (o tym )?sądzisz|co myślisz|twoja opinia|jak byś|co byś zrobił|pomóż mi (zrozum|ogarn)/i;

const ROBOT_RE = /robot|szablon|autentyczn|nie brzmi|sztuczn|korpo|gpt|wygenerow|nie działa|nie dzila/i;

const REPEAT_FRUSTRATION_RE =
  /napisalem|napisałem|napisałam|juz to napisa|już to napisa|powtarzasz|to samo|czemu nie dzia|nie słuchasz|nie rozumiesz o co chodzi/i;

export function isRoboticCoachReply(text: string): boolean {
  const t = text.trim();
  return (
    /W kontekście wcześniejszej analizy/i.test(t) ||
    /^Słyszę:\s*«/.test(t) ||
    THERAPY_CLICHES.test(t) ||
    /Mamy już sporo jasności/i.test(t)
  );
}

export function isGenericLoopReply(text: string): boolean {
  return GENERIC_LOOP_RE.test(text.trim());
}

export function polishCasual(text: string): string {
  return text
    .replace(/\s*—\s*/g, '. ')
    .replace(/\s*–\s*/g, ', ')
    .replace(/\*\*/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

export function detectChatMode(messages: { role: string; content: string }[]): boolean {
  const userText = userBlob(messages);
  if (SMS_REQUEST_RE.test(userText)) return false;
  if (CHAT_PREFERENCE_RE.test(userText)) return true;
  return true;
}

export function userWantsSms(userMessage: string): boolean {
  return SMS_REQUEST_RE.test(userMessage.trim().toLowerCase());
}

function userBlob(messages: { role: string; content: string }[]): string {
  return messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ')
    .toLowerCase();
}

function lastCoachContent(messages: { role: string; content: string }[]): string {
  const coaches = messages.filter((m) => m.role === 'coach');
  return coaches[coaches.length - 1]?.content || '';
}

function substantiveUserVent(messages: { role: string; content: string }[]): string {
  const vents = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content.trim())
    .filter((c) => c.length > 40);
  return vents[vents.length - 1] || '';
}

export function buildOpeningCoachMessage(view: MappedAnalysisView, lang: Language = 'pl'): string {
  const chat = getSoloExtras(lang).chat;
  const hint = truncateAtWord(
    (view.situationSummary || view.keyTrigger || '').trim(),
    100
  );
  if (hint) {
    return polishCasual(`${fmt(chat.openingWithContext, { hint })} ${chat.openingClosing}`);
  }
  return polishCasual(`${chat.openingDefault} ${chat.openingClosing}`);
}

function quoteSms(text: string): string {
  return `„${text}"`;
}

function buildSmsDrafts(view: MappedAnalysisView, withApology = false): string {
  const party = /imprez/i.test(view.situationSummary);
  const sorry = withApology ? 'Przepraszam jeśli to brzmi ostro, ale muszę to powiedzieć: ' : '';

  const mild = party
    ? `${sorry}Hej. Wiem że chciałaś się odciąć, ale jak poszłaś na imprezę a ja zostałem z synem, poczułem się pominięty. Porozmawiajmy o tym spokojnie, zależy mi na nas.`
    : `${sorry}Hej. To co się wydarzyło, zostawiło we mnie smutek. Nie chcę awantury, chcę żebyś usłyszała jak się czuję.`;

  const firm = party
    ? `${sorry}Zależy mi na nas, ale w tamtym momencie poczułem się zraniony. Potrzebuję żebyś to usłyszała, nie żeby to było zbywane.`
    : `${sorry}Zależy mi na tobie, ale poczułem się zraniony. Potrzebuję rozmowy, nie bagatelizowania.`;

  return polishCasual(
    `Dobra, masz gotowca:\n\nŁagodna: ${quoteSms(mild)}\n\nStanowcza: ${quoteSms(firm)}\n\nKtóra bliżej? Mogę skrócić albo złagodzić.`
  );
}

function buildRepeatAckReply(
  blob: string,
  vent: string,
  view: MappedAnalysisView
): string {
  if (/imprez|picie|pić|alkohol|dojrz|rodzin/i.test(blob)) {
    return polishCasual(
      `Sorki, masz rację, już to opisałeś. Rozumiem: dla ciebie rodzina > impreza, a ona poszła pić i to cię wkurza bo czujesz że to niedojrzałe. Moim zdaniem tu nie chodzi o zakaz imprez, tylko o to że zostałeś sam z odpowiedzialnością. Ona pewnie słyszy kontrolę, ty słyszysz brak wsparcia. Jak byś to powiedział jej jednym zdaniem bez oskarżeń?`
    );
  }
  if (/zrozum|co czuje|usłysz/i.test(blob)) {
    return polishCasual(
      `Masz rację, powtarzam się. Chcesz żeby zrozumiała co czujesz, a nie żebyś mówił to samo w kółko. Spróbuj: "kiedy poszłaś a ja został z dzieckiem, poczułem się pominięty i niedoceniony". Konkret zamiast "zawsze/nigdy". Pasuje?`
    );
  }
  const trigger =
    truncateAtWord(view.keyTrigger || '', 100) ||
    truncateAtWord(view.situationSummary || '', 80) ||
    '';
  return polishCasual(
    `Sorki za zapętlę. ${trigger ? `Widzę że ${trigger.charAt(0).toLowerCase() + trigger.slice(1)} ` : ''}${vent ? `I to co napisałeś ma sens. ` : ''}Powiedz mi jeszcze raz jednym zdaniem: czego od niej teraz potrzebujesz?`
  );
}

function buildContextualChatReply(
  userMessage: string,
  messages: { role: string; content: string }[],
  view: MappedAnalysisView,
  quizGoal?: string
): string {
  const t = userMessage.trim().toLowerCase();
  const blob = userBlob(messages);
  const vent = substantiveUserVent(messages);
  const lastCoach = lastCoachContent(messages);
  const trigger =
    truncateAtWord(view.keyTrigger || '', 120) ||
    truncateAtWord(view.situationSummary || '', 100) ||
    '';

  if (/czemu nie dzia|nie dzila/i.test(t)) {
    return polishCasual(
      `Sorki, wygląda że się zawiesiłem. Już ogarniam. ${/imprez|picie|dojrz/.test(blob) ? 'Rozumiem: impreza i picie zamiast rodziny to dla ciebie niedojrzałe i zostajesz sam z domem. ' : ''}Moim zdaniem warto zacząć od jednego zdania do niej bez oskarżeń. Chcesz żebym pomógł je ułożyć?`
    );
  }

  if (REPEAT_FRUSTRATION_RE.test(t) || ROBOT_RE.test(t)) {
    return buildRepeatAckReply(blob, vent, view);
  }

  if (OPINION_REQUEST_RE.test(t)) {
    return polishCasual(
      `Moim zdaniem masz rację że to nie jest drobna sprawa. ${trigger ? `${trigger} ` : ''}Jak ona bagatelizuje, to nie chodzi o samą imprezę, tylko że czujesz się sam z problemem. Ja bym zaczął od jednej konkretnej prośby, np. "potrzebuję żebyś usłyszała że poczułem się pominięty".`
    );
  }

  if (/imprez|picie|pić|alkohol|dojrz|rodzin.*imprez|przekład/i.test(t) || /imprez|picie|dojrz/.test(blob)) {
    return polishCasual(
      `No widzę o co chodzi. Dla ciebie to oczywiste: rodzina przed imprezą, a ona poszła pić i to wygląda na niedojrzałe. Z jej strony pewnie brzmi jak "zabraniasz mi życia". Tu nie chodzi o zakaz, tylko o to że zostałeś sam z domem/dzieckiem. Jak by wyglądał kompromis który by ci pasował? Np. impreza ale po ustaleniu kto z dzieckiem?`
    );
  }

  if (/bagateliz|ogranicz|nie bierze tego/i.test(t) || /bagateliz|ogranicz/.test(blob)) {
    return polishCasual(
      `No i masz. Mówisz o ważnym, a ona to zrzuca na "ograniczasz mnie". Wkurzające, bo ty mówisz o relacji. Może ona broni wolności, ty bronisz bliskości. Co byś chciał żeby zrozumiała jako pierwsze?`
    );
  }

  if (/zrozum|usłysz|co czuje|nie rozumie/.test(t) || /zrozum|co czuje/.test(blob)) {
    return polishCasual(
      `Jasne, chodzi o to żeby usłyszała co czujesz, nie żebyś wygrywał kłótnię. ${quizGoal ? `Twój cel: ${quizGoal}. ` : ''}Spróbuj jednym zdaniem: "kiedy poszłaś na imprezę a ja zostałem z synem, poczułem się pominięty". Bez "zawsze" i "nigdy". Co myślisz?`
    );
  }

  if (vent && t.length < 30 && lastCoach.includes('Słucham')) {
    return buildRepeatAckReply(blob, vent, view);
  }

  if (vent) {
    return buildRepeatAckReply(blob, vent, view);
  }

  return polishCasual(
    `Spoko. ${trigger ? `Pamiętam kontekst: ${trigger.charAt(0).toLowerCase() + trigger.slice(1)} ` : ''}Opowiedz co cię najbardziej wkurza w jej reakcji, albo napisz "co o tym sądzisz" jak chcesz moją opinię.`
  );
}

/** Offline fallback gdy edge / OpenAI niedostępne. */
export function buildCoachReply(
  userMessage: string,
  messages: { role: string; content: string }[],
  view: MappedAnalysisView,
  quizGoal?: string
): string {
  const wantsApologySms = /przepros.*(ode mnie|od mnie)/i.test(userMessage.toLowerCase());

  if (userWantsSms(userMessage) || wantsApologySms) {
    return buildSmsDrafts(view, wantsApologySms);
  }

  return buildContextualChatReply(userMessage, messages, view, quizGoal);
}

export function isDuplicateCoachReply(
  reply: string,
  messages: { role: string; content: string }[]
): boolean {
  const last = lastCoachContent(messages);
  if (!last) return false;
  return polishCasual(reply) === polishCasual(last);
}

export function isStaleEdgeReply(
  reply: string,
  messages: { role: string; content: string }[]
): boolean {
  return isGenericLoopReply(reply) || isDuplicateCoachReply(reply, messages);
}
