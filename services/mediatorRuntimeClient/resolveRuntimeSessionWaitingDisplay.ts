import type { Language } from '@/constants/i18n';
import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';

export type RuntimeWaitingDisplayKind =
  | 'none'
  | 'waiting_host'
  | 'waiting_partner'
  | 'waiting_both'
  | 'waiting_continue_decision'
  | 'waiting_extension_decision'
  | 'waiting_proposal_decision'
  | 'waiting_safety_acknowledgment'
  | 'ready_to_advance'
  | 'finished';

export interface RuntimeWaitingDisplay {
  kind: RuntimeWaitingDisplayKind;
  label: string;
  source: 'runtime' | 'legacy';
}

interface RuntimeWaitingLabelSet {
  waitingHost: string;
  waitingPartner: string;
  waitingBoth: string;
  waitingYourTurn: string;
  waitingContinueDecision: string;
  waitingExtensionDecision: string;
  waitingProposalDecision: string;
  waitingProposalPartner: string;
  waitingSafetyAcknowledgment: string;
  readyToAdvance: string;
  finished: string;
}

const RUNTIME_WAITING_LABELS: Record<Language, RuntimeWaitingLabelSet> = {
  pl: {
    waitingHost: 'Czekam na odpowiedź hosta',
    waitingPartner: 'Czekam na odpowiedź partnera',
    waitingBoth: 'Oboje odpowiedzcie na bieżące pytanie',
    waitingYourTurn: 'Partner odpowiedział — Twoja kolej',
    waitingContinueDecision: 'Czekam na decyzję o kontynuacji',
    waitingExtensionDecision: 'Czekam na decyzję o rozszerzeniu',
    waitingProposalDecision: 'Czekam na akceptację propozycji',
    waitingProposalPartner: 'Partner zaakceptował — Twoja decyzja',
    waitingSafetyAcknowledgment: 'Sesja wstrzymana ze względów bezpieczeństwa',
    readyToAdvance: 'Mediator może przejść dalej',
    finished: 'Sesja zakończona',
  },
  en: {
    waitingHost: 'Waiting for host to answer',
    waitingPartner: 'Waiting for partner to answer',
    waitingBoth: 'Both of you — answer the current question',
    waitingYourTurn: 'Partner answered — your turn',
    waitingContinueDecision: 'Waiting for continue decision',
    waitingExtensionDecision: 'Waiting for extension decision',
    waitingProposalDecision: 'Waiting for proposal acceptance',
    waitingProposalPartner: 'Partner accepted — your decision',
    waitingSafetyAcknowledgment: 'Session paused for safety',
    readyToAdvance: 'Mediator can advance',
    finished: 'Session finished',
  },
  de: {
    waitingHost: 'Warte auf Antwort des Gastgebers',
    waitingPartner: 'Warte auf Antwort des Partners',
    waitingBoth: 'Beantwortet die aktuelle Frage — beide',
    waitingYourTurn: 'Partner hat geantwortet — du bist dran',
    waitingContinueDecision: 'Warte auf Entscheidung zur Fortsetzung',
    waitingExtensionDecision: 'Warte auf Entscheidung zur Erweiterung',
    waitingProposalDecision: 'Warte auf Annahme des Vorschlags',
    waitingProposalPartner: 'Partner hat zugestimmt — deine Entscheidung',
    waitingSafetyAcknowledgment: 'Sitzung aus Sicherheitsgründen pausiert',
    readyToAdvance: 'Mediator kann fortfahren',
    finished: 'Sitzung beendet',
  },
  fr: {
    waitingHost: 'En attente de la réponse de l\'hôte',
    waitingPartner: 'En attente de la réponse du partenaire',
    waitingBoth: 'Répondez tous les deux à la question en cours',
    waitingYourTurn: 'Le partenaire a répondu — à votre tour',
    waitingContinueDecision: 'En attente de la décision de continuer',
    waitingExtensionDecision: 'En attente de la décision d\'extension',
    waitingProposalDecision: 'En attente de l\'acceptation de la proposition',
    waitingProposalPartner: 'Le partenaire a accepté — à vous de décider',
    waitingSafetyAcknowledgment: 'Session en pause pour raisons de sécurité',
    readyToAdvance: 'Le médiateur peut avancer',
    finished: 'Session terminée',
  },
  es: {
    waitingHost: 'Esperando respuesta del anfitrión',
    waitingPartner: 'Esperando respuesta del compañero',
    waitingBoth: 'Responded ambos a la pregunta actual',
    waitingYourTurn: 'El compañero respondió — te toca a ti',
    waitingContinueDecision: 'Esperando decisión de continuar',
    waitingExtensionDecision: 'Esperando decisión de extensión',
    waitingProposalDecision: 'Esperando aceptación de la propuesta',
    waitingProposalPartner: 'El compañero aceptó — tu decisión',
    waitingSafetyAcknowledgment: 'Sesión en pausa por seguridad',
    readyToAdvance: 'El mediador puede avanzar',
    finished: 'Sesión finalizada',
  },
  it: {
    waitingHost: 'In attesa della risposta dell\'host',
    waitingPartner: 'In attesa della risposta del partner',
    waitingBoth: 'Rispondete entrambi alla domanda corrente',
    waitingYourTurn: 'Il partner ha risposto — tocca a te',
    waitingContinueDecision: 'In attesa della decisione di continuare',
    waitingExtensionDecision: 'In attesa della decisione di estensione',
    waitingProposalDecision: 'In attesa dell\'accettazione della proposta',
    waitingProposalPartner: 'Il partner ha accettato — tocca a te decidere',
    waitingSafetyAcknowledgment: 'Sessione in pausa per sicurezza',
    readyToAdvance: 'Il mediatore può procedere',
    finished: 'Sessione conclusa',
  },
};

const REPLY_KINDS: ReadonlySet<RuntimeWaitingDisplayKind> = new Set([
  'waiting_host',
  'waiting_partner',
  'waiting_both',
]);

function labelsFor(lang: Language): RuntimeWaitingLabelSet {
  return RUNTIME_WAITING_LABELS[lang] ?? RUNTIME_WAITING_LABELS.en;
}

function legacyDisplay(legacyLabel: string): RuntimeWaitingDisplay {
  return {
    kind: legacyLabel.trim() ? 'waiting_both' : 'none',
    label: legacyLabel,
    source: 'legacy',
  };
}

function runtimeDisplay(
  kind: RuntimeWaitingDisplayKind,
  label: string
): RuntimeWaitingDisplay {
  return { kind, label, source: 'runtime' };
}

/** Maps runtimeSession.pending (+ lifecycle) to a waiting display kind. */
export function mapRuntimeSessionToWaitingKind(
  runtimeSession: RuntimeSession
): RuntimeWaitingDisplayKind {
  const { pending, session, decision } = runtimeSession;

  if (session.stage === 'safety_hold' || session.outcome === 'safety_stopped') {
    return 'waiting_safety_acknowledgment';
  }

  if (
    session.outcome === 'resolved' ||
    session.outcome === 'closed_without_agreement' ||
    session.outcome === 'paused'
  ) {
    return 'finished';
  }

  switch (pending.awaiting) {
    case 'host_reply':
      return 'waiting_host';
    case 'partner_reply':
      return 'waiting_partner';
    case 'both_replies':
      return 'waiting_both';
    case 'continue_decision':
      return 'waiting_continue_decision';
    case 'extension_decision':
      return 'waiting_extension_decision';
    case 'proposal_decision':
      return 'waiting_proposal_decision';
    case 'safety_acknowledgment':
      return 'waiting_safety_acknowledgment';
    case 'nothing':
      return decision.mayAutoAdvance ? 'ready_to_advance' : 'none';
    default:
      return 'none';
  }
}

function resolveReplyLabel(
  kind: RuntimeWaitingDisplayKind,
  lang: Language,
  isCurrentUserHost: boolean
): string {
  const labels = labelsFor(lang);

  if (kind === 'waiting_both') {
    return labels.waitingBoth;
  }

  if (kind === 'waiting_host') {
    return isCurrentUserHost ? labels.waitingYourTurn : labels.waitingHost;
  }

  if (kind === 'waiting_partner') {
    return isCurrentUserHost ? labels.waitingPartner : labels.waitingYourTurn;
  }

  return labels.waitingBoth;
}

function resolveLabelForKind(
  kind: RuntimeWaitingDisplayKind,
  lang: Language,
  isCurrentUserHost: boolean,
  runtimeSession?: RuntimeSession
): string {
  const labels = labelsFor(lang);

  if (REPLY_KINDS.has(kind)) {
    return resolveReplyLabel(kind, lang, isCurrentUserHost);
  }

  switch (kind) {
    case 'waiting_continue_decision':
      return labels.waitingContinueDecision;
    case 'waiting_extension_decision':
      return labels.waitingExtensionDecision;
    case 'waiting_proposal_decision': {
      if (runtimeSession) {
        const votes = runtimeSession.proposal.votes;
        const hostVote = votes.host;
        const partnerVote = votes.partner;
        if (isCurrentUserHost) {
          if (hostVote && !partnerVote) return labels.waitingProposalDecision;
          if (!hostVote && partnerVote) return labels.waitingProposalPartner;
        } else {
          if (partnerVote && !hostVote) return labels.waitingProposalDecision;
          if (hostVote && !partnerVote) return labels.waitingProposalPartner;
        }
      }
      return labels.waitingProposalDecision;
    }
    case 'waiting_safety_acknowledgment':
      return labels.waitingSafetyAcknowledgment;
    case 'ready_to_advance':
      return labels.readyToAdvance;
    case 'finished':
      return labels.finished;
    default:
      return '';
  }
}

/** Waiting-for-answer bar label — runtime pending when available, else legacy hint. */
export function resolveLiveWaitingAnswerDisplay(
  runtimeSession: RuntimeSession | null | undefined,
  legacyLabel: string,
  lang: Language,
  isCurrentUserHost: boolean
): RuntimeWaitingDisplay {
  if (!hasRuntimeSession(runtimeSession)) {
    return legacyDisplay(legacyLabel);
  }

  const kind = mapRuntimeSessionToWaitingKind(runtimeSession);
  if (!REPLY_KINDS.has(kind)) {
    return legacyDisplay(legacyLabel);
  }

  return runtimeDisplay(
    kind,
    resolveReplyLabel(kind, lang, isCurrentUserHost)
  );
}

/** Proposal waiting hint — runtime pending.proposal_decision when available. */
export function resolveLiveProposalWaitingDisplay(
  runtimeSession: RuntimeSession | null | undefined,
  legacyLabel: string,
  lang: Language,
  isCurrentUserHost: boolean
): RuntimeWaitingDisplay {
  if (!hasRuntimeSession(runtimeSession)) {
    return legacyDisplay(legacyLabel);
  }

  const kind = mapRuntimeSessionToWaitingKind(runtimeSession);
  if (kind !== 'waiting_proposal_decision') {
    return legacyDisplay(legacyLabel);
  }

  return runtimeDisplay(
    kind,
    resolveLabelForKind(kind, lang, isCurrentUserHost, runtimeSession)
  );
}

/** Continue / extension decision hint — runtime pending when available. */
export function resolveLiveContinueWaitingDisplay(
  runtimeSession: RuntimeSession | null | undefined,
  legacyLabel: string,
  lang: Language
): RuntimeWaitingDisplay {
  if (!hasRuntimeSession(runtimeSession)) {
    return legacyDisplay(legacyLabel);
  }

  const kind = mapRuntimeSessionToWaitingKind(runtimeSession);
  if (kind !== 'waiting_continue_decision' && kind !== 'waiting_extension_decision') {
    return legacyDisplay(legacyLabel);
  }

  return runtimeDisplay(kind, resolveLabelForKind(kind, lang, false));
}

/** Optional session-level status (finished / safety) for waiting surfaces. */
export function resolveLiveSessionWaitingStatusDisplay(
  runtimeSession: RuntimeSession | null | undefined,
  lang: Language
): RuntimeWaitingDisplay | null {
  if (!hasRuntimeSession(runtimeSession)) {
    return null;
  }

  const kind = mapRuntimeSessionToWaitingKind(runtimeSession);
  if (
    kind !== 'finished' &&
    kind !== 'waiting_safety_acknowledgment' &&
    kind !== 'ready_to_advance'
  ) {
    return null;
  }

  return runtimeDisplay(kind, resolveLabelForKind(kind, lang, false, runtimeSession));
}
