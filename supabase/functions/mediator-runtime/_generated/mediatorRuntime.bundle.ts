// @ts-nocheck — generated bundle; types checked at source via Node tests.


// services/mediatorEngine/edge/errors.ts
var MEDIATOR_RUNTIME_ERROR_CODES = {
  MALFORMED_JSON: "malformed_json",
  MISSING_MEDIATION_ID: "missing_mediation_id",
  MISSING_SESSION_ID: "missing_session_id",
  UNSUPPORTED_ENGINE_VERSION: "unsupported_engine_version",
  MISSING_OPENAI_API_KEY: "missing_openai_api_key",
  INTERNAL_ERROR: "internal_error"
};
function createMediatorRuntimeError(code, message) {
  return {
    ok: false,
    error: { code, message }
  };
}
function mediatorRuntimeErrorStatus(code) {
  switch (code) {
    case MEDIATOR_RUNTIME_ERROR_CODES.MALFORMED_JSON:
    case MEDIATOR_RUNTIME_ERROR_CODES.MISSING_MEDIATION_ID:
    case MEDIATOR_RUNTIME_ERROR_CODES.MISSING_SESSION_ID:
    case MEDIATOR_RUNTIME_ERROR_CODES.UNSUPPORTED_ENGINE_VERSION:
      return 400;
    case MEDIATOR_RUNTIME_ERROR_CODES.MISSING_OPENAI_API_KEY:
      return 503;
    default:
      return 500;
  }
}

// services/mediatorEngine/constitution/config/l1Limits.ts
var L1_LIMITS = {
  minMessageLength: 1,
  maxMessageLength: 1200,
  maxSentencesDefault: 4,
  maxQuestionsDefault: 2,
  minRepeatedSentenceLength: 8
};

// services/mediatorEngine/constitution/rules/createViolation.ts
function createViolation(ruleId, matchedText) {
  return { ruleId, matchedText };
}

// services/mediatorEngine/constitution/lib/safeIntervention.ts
function getInterventionContent(intervention) {
  if (!intervention || typeof intervention !== "object") return null;
  const content = intervention.content;
  if (!content || typeof content !== "object") return null;
  return content;
}
function getPrimaryMessage(intervention) {
  const content = getInterventionContent(intervention);
  const message = content?.primaryMessage;
  return typeof message === "string" ? message : "";
}
function getSecondaryMessage(intervention) {
  const content = getInterventionContent(intervention);
  const message = content?.secondaryMessage;
  return typeof message === "string" ? message : void 0;
}
function getExpectedEffect(intervention) {
  if (!intervention || typeof intervention !== "object") return null;
  const effect = intervention.expectedEffect;
  if (!effect || typeof effect !== "object") return null;
  return effect;
}
function getInterventionSignature(intervention) {
  if (!intervention || typeof intervention !== "object") return "";
  const signature = intervention.signature;
  return typeof signature === "string" ? signature : "";
}
function getInterventionCoreFields(intervention) {
  if (!intervention || typeof intervention !== "object") {
    return { strategy: null, type: null, goal: null, intent: null };
  }
  const record = intervention;
  return {
    strategy: typeof record.strategy === "string" ? record.strategy : null,
    type: typeof record.type === "string" ? record.type : null,
    goal: typeof record.goal === "string" ? record.goal : null,
    intent: typeof record.intent === "string" ? record.intent : null
  };
}
function combineInterventionTextSafe(intervention) {
  return [getPrimaryMessage(intervention), getSecondaryMessage(intervention)].filter(Boolean).join(" ");
}
function getObservableSignals(effect) {
  if (!effect || !Array.isArray(effect.observableSignals)) return [];
  return effect.observableSignals.filter((signal) => typeof signal === "string");
}

// services/mediatorEngine/constitution/rules/validateDuplicateIntervention.ts
var RULE_ID = "l1.duplicate_intervention";
function validateDuplicateIntervention(ctx) {
  const signature = getInterventionSignature(ctx.intervention);
  if (signature && ctx.recentInterventionSignatures.includes(signature)) {
    return createViolation(RULE_ID, signature);
  }
  return null;
}

// services/mediatorEngine/constitution/lib/textMetrics.ts
function combineInterventionText(primaryMessage, secondaryMessage) {
  return [primaryMessage, secondaryMessage].filter(Boolean).join(" ");
}
function countSentences(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/[.!?]+/).filter((part) => part.trim().length > 0).length;
}
function countQuestions(text) {
  return (text.match(/\?/g) ?? []).length;
}
function countExclamationMarks(text) {
  return (text.match(/!/g) ?? []).length;
}
function findRepeatedSentence(text, minLength) {
  const sentences = text.split(/[.!?]+/).map((part) => part.trim().toLowerCase()).filter((part) => part.length >= minLength);
  const seen = /* @__PURE__ */ new Set();
  for (const sentence of sentences) {
    if (seen.has(sentence)) return sentence;
    seen.add(sentence);
  }
  return null;
}

// services/mediatorEngine/constitution/rules/validateDuplicateText.ts
var RULE_ID2 = "l1.duplicate_text";
function validateDuplicateText(ctx) {
  const primaryMessage = getPrimaryMessage(ctx.intervention);
  const secondaryMessage = getSecondaryMessage(ctx.intervention);
  if (secondaryMessage && primaryMessage.trim() === secondaryMessage.trim()) {
    return createViolation(RULE_ID2, primaryMessage.trim());
  }
  const combined = combineInterventionText(primaryMessage, secondaryMessage);
  const repeated = findRepeatedSentence(combined, ctx.limits.minRepeatedSentenceLength);
  if (repeated) {
    return createViolation(RULE_ID2, repeated);
  }
  return null;
}

// services/mediatorEngine/constitution/rules/validateExpectedEffect.ts
var RULE_ID3 = "l1.expected_effect";
function validateExpectedEffect(ctx) {
  const effect = getExpectedEffect(ctx.intervention);
  if (!effect) return null;
  const missing = [];
  if (typeof effect.id !== "string" || !effect.id.trim()) missing.push("id");
  if (typeof effect.description !== "string" || !effect.description.trim()) {
    missing.push("description");
  }
  if (!getObservableSignals(effect).some((signal) => signal.trim().length > 0)) {
    missing.push("observableSignals");
  }
  if (!effect.targetParticipant) missing.push("targetParticipant");
  if (!effect.verificationMethod) missing.push("verificationMethod");
  if (!effect.successCriteria || typeof effect.successCriteria !== "object") {
    missing.push("successCriteria");
  } else if (!effect.successCriteria.type) {
    missing.push("successCriteria.type");
  }
  if (effect.timeHorizon !== 1 && effect.timeHorizon !== 2) missing.push("timeHorizon");
  if (missing.length === 0) return null;
  return createViolation(RULE_ID3, missing.join(", "));
}

// services/mediatorEngine/constitution/lib/vocabularies.ts
var VALID_THERAPEUTIC_GOALS = [
  "SAFE_OPENING",
  "EMOTION_NAMING",
  "EMOTION_UNDERSTANDING",
  "EMOTION_ACKNOWLEDGMENT",
  "NEED_NAMING",
  "PERSPECTIVE_SHARING",
  "REFRAME",
  "AGREEMENT",
  "FUTURE_PLAN",
  "CLOSURE"
];
var VALID_THERAPEUTIC_INTENTS = [
  "increase_emotional_safety",
  "reduce_defensiveness",
  "help_name_emotion",
  "help_explain_emotion",
  "help_partner_feel_heard",
  "help_see_other_perspective",
  "help_name_need",
  "reduce_blame_cycle",
  "restore_trust_in_process",
  "consolidate_breakthrough",
  "prepare_shared_agreement",
  "define_future_coping_plan",
  "close_with_dignity",
  "correct_misunderstanding",
  "invite_pause_and_breathe",
  "acknowledge_exhaustion"
];

// services/mediatorEngine/constitution/rules/validateGoal.ts
var RULE_ID4 = "l1.goal";
function validateGoal(ctx) {
  const { goal } = getInterventionCoreFields(ctx.intervention);
  if (!goal) return null;
  if (VALID_THERAPEUTIC_GOALS.includes(goal)) return null;
  return createViolation(RULE_ID4, goal);
}

// services/mediatorEngine/constitution/rules/validateIntent.ts
var RULE_ID5 = "l1.intent";
function validateIntent(ctx) {
  const { intent } = getInterventionCoreFields(ctx.intervention);
  if (!intent) return null;
  if (VALID_THERAPEUTIC_INTENTS.includes(intent)) return null;
  return createViolation(RULE_ID5, intent);
}

// services/mediatorEngine/constitution/rules/validateMessageLength.ts
var RULE_ID6 = "l1.message_length";
function validateMessageLength(ctx) {
  const text = combineInterventionTextSafe(ctx.intervention);
  if (text.length <= ctx.limits.maxMessageLength) return null;
  return createViolation(
    RULE_ID6,
    `${text.length} chars (max ${ctx.limits.maxMessageLength})`
  );
}

// services/mediatorEngine/constitution/rules/validateNonEmptyMessage.ts
var RULE_ID7 = "l1.non_empty_message";
function validateNonEmptyMessage(ctx) {
  const text = getPrimaryMessage(ctx.intervention).trim();
  if (text.length >= ctx.limits.minMessageLength) return null;
  return createViolation(RULE_ID7, text || "(empty)");
}

// services/mediatorEngine/constitution/rules/validateQuestionCount.ts
var RULE_ID8 = "l1.question_count";
function validateQuestionCount(ctx) {
  const text = combineInterventionTextSafe(ctx.intervention);
  const questions = countQuestions(text);
  if (questions <= ctx.limits.maxQuestionsDefault) return null;
  return createViolation(
    RULE_ID8,
    `${questions} questions (max ${ctx.limits.maxQuestionsDefault})`
  );
}

// services/mediatorEngine/constitution/rules/validateRequiredFields.ts
var RULE_ID9 = "l1.required_fields";
function validateRequiredFields(ctx) {
  const intervention = ctx.intervention;
  const missing = [];
  if (!intervention || typeof intervention !== "object") {
    return createViolation(RULE_ID9, "intervention");
  }
  const record = intervention;
  if (typeof record.id !== "string" || !record.id.trim()) missing.push("id");
  if (!record.type) missing.push("type");
  if (!record.target) missing.push("target");
  if (!record.visibility) missing.push("visibility");
  const content = getInterventionContent(intervention);
  if (!content) missing.push("content");
  else if (content.primaryMessage === void 0) missing.push("content.primaryMessage");
  const core = getInterventionCoreFields(intervention);
  if (!core.goal) missing.push("goal");
  if (!core.intent) missing.push("intent");
  if (!core.strategy) missing.push("strategy");
  if (record.rationale === void 0) missing.push("rationale");
  if (!record.expectedEffect) missing.push("expectedEffect");
  if (!getInterventionSignature(intervention).trim()) missing.push("signature");
  if (typeof record.generatedAt !== "string" || !record.generatedAt.trim()) {
    missing.push("generatedAt");
  }
  if (missing.length === 0) return null;
  return createViolation(RULE_ID9, missing.join(", "));
}

// services/mediatorEngine/constitution/rules/validateSentenceCount.ts
var RULE_ID10 = "l1.sentence_count";
function validateSentenceCount(ctx) {
  const text = combineInterventionTextSafe(ctx.intervention);
  const sentences = countSentences(text);
  if (sentences <= ctx.limits.maxSentencesDefault) return null;
  return createViolation(
    RULE_ID10,
    `${sentences} sentences (max ${ctx.limits.maxSentencesDefault})`
  );
}

// services/mediatorEngine/constitution/config/personalityLimits.ts
var PERSONALITY_PROFILE_LIMITS = {
  gentle_guide: { maxSentences: 2, maxQuestions: 1, maxExclamationMarks: 0 },
  steady_mediator: { maxSentences: 3, maxQuestions: 2, maxExclamationMarks: 1 },
  warm_facilitator: { maxSentences: 4, maxQuestions: 2, maxExclamationMarks: 1 },
  calm_anchor: { maxSentences: 2, maxQuestions: 1, maxExclamationMarks: 0 }
};

// services/mediatorEngine/constitution/rules/validateSessionPersonality.ts
var RULE_ID11 = "l1.session_personality";
function validateSessionPersonality(ctx) {
  if (!ctx.sessionPersonality) return null;
  const limits = PERSONALITY_PROFILE_LIMITS[ctx.sessionPersonality.profile];
  const text = combineInterventionTextSafe(ctx.intervention);
  const sentences = countSentences(text);
  if (sentences > limits.maxSentences) {
    return createViolation(
      RULE_ID11,
      `${sentences} sentences (max ${limits.maxSentences} for ${ctx.sessionPersonality.profile})`
    );
  }
  const questions = countQuestions(text);
  if (questions > limits.maxQuestions) {
    return createViolation(
      RULE_ID11,
      `${questions} questions (max ${limits.maxQuestions} for ${ctx.sessionPersonality.profile})`
    );
  }
  const exclamations = countExclamationMarks(text);
  if (exclamations > limits.maxExclamationMarks) {
    return createViolation(
      RULE_ID11,
      `${exclamations} exclamation marks (max ${limits.maxExclamationMarks} for ${ctx.sessionPersonality.profile})`
    );
  }
  return null;
}

// services/mediatorEngine/constitution/config/strategyInterventionMap.ts
var STRATEGY_INTERVENTION_COMPATIBILITY = {
  build_safety: [
    "welcome_open",
    "validate",
    "deescalate",
    "pause_session",
    "safety_response",
    "reflect"
  ],
  reduce_tension: [
    "deescalate",
    "validate",
    "reflect",
    "pause_session",
    "redirect_blame",
    "reframe"
  ],
  validate_emotions: ["validate", "reflect", "mirror", "choice_emotion"],
  deepen_emotions: ["open_deepen", "reflect", "mirror", "choice_emotion", "invite_reflection"],
  transition_to_needs: ["choice_need", "open_deepen", "reflect", "reframe", "remind_goal"],
  increase_mutual_understanding: [
    "reflect",
    "mirror",
    "reframe",
    "open_deepen",
    "invite_reflection"
  ],
  stop_escalation: [
    "deescalate",
    "redirect_blame",
    "pause_session",
    "propose_rule"
  ],
  prepare_agreement: [
    "propose_rule",
    "confirm_agreement",
    "propose_future_plan",
    "summarize_close",
    "remind_goal"
  ],
  close_topic: ["summarize_close", "confirm_agreement", "celebrate_breakthrough", "remind_goal"],
  recover_misinterpretation: ["recover_acknowledge", "reflect", "validate", "reframe"],
  hold_space: ["validate", "reflect", "pause_session"],
  consolidate_progress: [
    "celebrate_breakthrough",
    "validate",
    "summarize_close",
    "reflect",
    "confirm_agreement"
  ]
};

// services/mediatorEngine/constitution/rules/validateStrategyInterventionType.ts
var RULE_ID12 = "l1.strategy_intervention_type";
function validateStrategyInterventionType(ctx) {
  const { strategy, type } = getInterventionCoreFields(ctx.intervention);
  if (!strategy || !type) return null;
  const allowed = STRATEGY_INTERVENTION_COMPATIBILITY[strategy];
  if (!allowed) return createViolation(RULE_ID12, `${strategy} \u2192 ${type}`);
  if (allowed.includes(type)) return null;
  return createViolation(RULE_ID12, `${strategy} \u2192 ${type}`);
}

// services/mediatorEngine/constitution/rules/index.ts
var CONSTITUTION_L1_RULES = [
  {
    ruleId: "l1.required_fields",
    articleRef: "Art. 14",
    defaultSeverity: "block",
    validate: validateRequiredFields
  },
  {
    ruleId: "l1.non_empty_message",
    articleRef: "Art. 3",
    defaultSeverity: "block",
    validate: validateNonEmptyMessage
  },
  {
    ruleId: "l1.message_length",
    articleRef: "Art. 4",
    defaultSeverity: "block",
    validate: validateMessageLength
  },
  {
    ruleId: "l1.duplicate_text",
    articleRef: "Art. 5",
    defaultSeverity: "block",
    validate: validateDuplicateText
  },
  {
    ruleId: "l1.duplicate_intervention",
    articleRef: "Art. 6",
    defaultSeverity: "block",
    validate: validateDuplicateIntervention
  },
  {
    ruleId: "l1.question_count",
    articleRef: "Art. 7",
    defaultSeverity: "block",
    validate: validateQuestionCount
  },
  {
    ruleId: "l1.sentence_count",
    articleRef: "Art. 8",
    defaultSeverity: "block",
    validate: validateSentenceCount
  },
  {
    ruleId: "l1.expected_effect",
    articleRef: "Art. 9",
    defaultSeverity: "block",
    validate: validateExpectedEffect
  },
  {
    ruleId: "l1.intent",
    articleRef: "Art. 10",
    defaultSeverity: "block",
    validate: validateIntent
  },
  {
    ruleId: "l1.goal",
    articleRef: "Art. 11",
    defaultSeverity: "block",
    validate: validateGoal
  },
  {
    ruleId: "l1.strategy_intervention_type",
    articleRef: "Art. 12",
    defaultSeverity: "block",
    validate: validateStrategyInterventionType
  },
  {
    ruleId: "l1.session_personality",
    articleRef: "Art. 13",
    defaultSeverity: "warn",
    validate: validateSessionPersonality
  }
];

// services/mediatorEngine/constitution/rules/types.ts
function finalizeViolationFromRegistry(draft, rule) {
  return {
    ruleId: draft.ruleId,
    articleRef: rule.articleRef,
    severity: rule.defaultSeverity,
    confidence: 100,
    matchedText: draft.matchedText
  };
}
function applyRuleSeverity(violation, applicableRules) {
  const override = applicableRules.find((rule) => rule.ruleId === violation.ruleId);
  if (!override) return violation;
  return { ...violation, severity: override.severity, articleRef: override.articleRef };
}

// services/mediatorEngine/constitution/validateConstitution.ts
function buildL1Context(input) {
  return {
    intervention: input.intervention,
    turnNumber: input.turnNumber,
    attemptNumber: input.attemptNumber,
    sessionPersonality: input.sessionPersonality ?? null,
    recentInterventionSignatures: input.recentInterventionSignatures ?? [],
    limits: L1_LIMITS
  };
}
function validateConstitution(input) {
  const ctx = buildL1Context(input);
  const requiredFieldsRule = CONSTITUTION_L1_RULES.find(
    (rule) => rule.ruleId === "l1.required_fields"
  );
  const violations = CONSTITUTION_L1_RULES.flatMap((rule) => {
    try {
      const draft = rule.validate(ctx);
      if (!draft) return [];
      const finalized = finalizeViolationFromRegistry(draft, rule);
      return [applyRuleSeverity(finalized, input.applicableRules)];
    } catch (error) {
      const fallbackRule = requiredFieldsRule ?? rule;
      const draft = createViolation(
        "l1.required_fields",
        `rule ${rule.ruleId} threw: ${String(error)}`
      );
      const finalized = finalizeViolationFromRegistry(draft, fallbackRule);
      return [applyRuleSeverity(finalized, input.applicableRules)];
    }
  });
  const hasBlockingViolation = violations.some((violation) => violation.severity === "block");
  return {
    compliant: !hasBlockingViolation,
    violations,
    attemptNumber: input.attemptNumber,
    fallbackUsed: false,
    validatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    validatorLayer: "deterministic"
  };
}

// services/mediatorEngine/decision/lib/buildDecisionRationale.ts
function buildDecisionRationale(context) {
  const parts = [];
  if (context.safetyActive) {
    parts.push("mode=safety");
  }
  if (context.goalTransitionBlocked) {
    parts.push("goal_transition=blocked");
  } else {
    parts.push(`goal_transition=${context.goalTransition ?? "stay"}`);
  }
  if (context.usedRecommended && context.recommended) {
    parts.push(`intervention=recommended:${context.recommended}`);
  } else if (context.fallbackUsed) {
    parts.push(`intervention=fallback:${context.selectedInterventionType}`);
  } else {
    parts.push(`intervention=${context.selectedInterventionType}`);
  }
  parts.push(`intent=${context.intent}`);
  parts.push(`strategy=${context.strategy}`);
  return parts.join("; ");
}

// services/mediatorEngine/decision/config/interventionFallbacks.ts
var SAFE_FALLBACK_INTERVENTION_ORDER = [
  "reflect",
  "validate",
  "deescalate",
  "pause_session",
  "welcome_open",
  "mirror",
  "reframe",
  "redirect_blame",
  "remind_goal",
  "invite_reflection",
  "recover_acknowledge",
  "propose_rule",
  "confirm_agreement",
  "summarize_close",
  "safety_response"
];
var SAFETY_FALLBACK_INTERVENTION_ORDER = [
  "safety_response",
  "pause_session",
  "deescalate"
];
var DEFAULT_ALLOWED_INTERVENTIONS = [
  "reflect",
  "validate",
  "deescalate"
];
var DEFAULT_SAFETY_ALLOWED_INTERVENTIONS = SAFETY_FALLBACK_INTERVENTION_ORDER;

// services/mediatorEngine/decision/lib/isAllowedIntervention.ts
function isAllowedIntervention(type, allowed) {
  return allowed.includes(type);
}

// services/mediatorEngine/decision/lib/isForbiddenIntervention.ts
function isForbiddenIntervention(type, forbidden) {
  return forbidden.includes(type);
}

// services/mediatorEngine/decision/lib/chooseInterventionType.ts
function normalizeInterventionTypes(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => typeof entry === "string");
}
function permittedTypes(allowed, forbidden) {
  return allowed.filter((type) => !isForbiddenIntervention(type, forbidden));
}
function pickFromFallbackOrder(order, permitted) {
  for (const candidate of order) {
    if (permitted.includes(candidate)) return candidate;
  }
  return null;
}
function safetyTypesInPermitted(permitted) {
  const safetySet = new Set(SAFETY_FALLBACK_INTERVENTION_ORDER);
  return permitted.filter((type) => safetySet.has(type));
}
function continuityAvoidTypes(continuity, safetyMode) {
  if (!continuity || safetyMode) return [];
  return continuity.suggestedAvoidTypes ?? [];
}
function continuityPreferTypes(continuity, safetyMode) {
  if (!continuity || safetyMode) return [];
  return continuity.suggestedPreferTypes ?? [];
}
function shouldAvoidForContinuity(type, avoid, safetyMode) {
  if (safetyMode && SAFETY_FALLBACK_INTERVENTION_ORDER.includes(type)) {
    return false;
  }
  return avoid.includes(type);
}
function pickWithContinuityAwareness(order, permitted, avoid, prefer, safetyMode) {
  for (const candidate of prefer) {
    if (permitted.includes(candidate) && !shouldAvoidForContinuity(candidate, avoid, safetyMode)) {
      return candidate;
    }
  }
  for (const candidate of order) {
    if (permitted.includes(candidate) && !shouldAvoidForContinuity(candidate, avoid, safetyMode)) {
      return candidate;
    }
  }
  return pickFromFallbackOrder(order, permitted);
}
function filterByStrategyCompatibility(permitted, strategy, forbidden) {
  if (!strategy) return permitted;
  const compatible = STRATEGY_INTERVENTION_COMPATIBILITY[strategy];
  if (!compatible?.length) return permitted;
  const compatibleSet = new Set(compatible);
  const filtered = permitted.filter((type) => compatibleSet.has(type));
  if (filtered.length > 0) return filtered;
  return compatible.filter((type) => !isForbiddenIntervention(type, forbidden));
}
function pickLastResortNonForbidden(forbidden, allowed, fallbackOrder) {
  const allowedNotForbidden = permittedTypes(allowed, forbidden);
  if (allowedNotForbidden.length > 0) return allowedNotForbidden[0];
  const fallbackNotForbidden = fallbackOrder.filter(
    (type) => !isForbiddenIntervention(type, forbidden)
  );
  const fromFallback = pickFromFallbackOrder(fallbackOrder, fallbackNotForbidden);
  if (fromFallback) return fromFallback;
  const defaultNotForbidden = permittedTypes(
    [...DEFAULT_ALLOWED_INTERVENTIONS, ...SAFE_FALLBACK_INTERVENTION_ORDER],
    forbidden
  );
  return defaultNotForbidden[0] ?? "deescalate";
}
function chooseInterventionType(priority, overrideRecommended, safetyMode = false, primaryStrategy, continuity) {
  const allowedRaw = normalizeInterventionTypes(priority?.allowedInterventionTypes);
  const allowed = allowedRaw.length > 0 ? allowedRaw : safetyMode ? [...DEFAULT_SAFETY_ALLOWED_INTERVENTIONS] : [...DEFAULT_ALLOWED_INTERVENTIONS];
  const forbidden = normalizeInterventionTypes(priority?.forbiddenInterventionTypes);
  const permitted = filterByStrategyCompatibility(
    permittedTypes(allowed, forbidden),
    safetyMode ? "build_safety" : primaryStrategy,
    forbidden
  );
  const fallbackOrder = safetyMode ? SAFETY_FALLBACK_INTERVENTION_ORDER : SAFE_FALLBACK_INTERVENTION_ORDER;
  const avoid = continuityAvoidTypes(continuity, safetyMode);
  const prefer = continuityPreferTypes(continuity, safetyMode);
  const recommended = overrideRecommended ?? (typeof priority?.recommendedInterventionType === "string" ? priority.recommendedInterventionType : void 0);
  if (recommended && isAllowedIntervention(recommended, permitted) && !isForbiddenIntervention(recommended, forbidden) && !shouldAvoidForContinuity(recommended, avoid, safetyMode)) {
    return {
      selectedInterventionType: recommended,
      usedRecommended: true,
      fallbackUsed: false
    };
  }
  const fromFallback = pickWithContinuityAwareness(
    fallbackOrder,
    permitted,
    avoid,
    prefer,
    safetyMode
  );
  if (fromFallback) {
    return {
      selectedInterventionType: fromFallback,
      usedRecommended: false,
      fallbackUsed: true
    };
  }
  if (safetyMode) {
    const safetyPermitted = safetyTypesInPermitted(permitted);
    const safetyPick = pickFromFallbackOrder(SAFETY_FALLBACK_INTERVENTION_ORDER, safetyPermitted);
    if (safetyPick) {
      return {
        selectedInterventionType: safetyPick,
        usedRecommended: false,
        fallbackUsed: true
      };
    }
    return {
      selectedInterventionType: "deescalate",
      usedRecommended: false,
      fallbackUsed: true
    };
  }
  const lastResort = pickLastResortNonForbidden(forbidden, allowed, fallbackOrder);
  return {
    selectedInterventionType: lastResort,
    usedRecommended: false,
    fallbackUsed: lastResort !== recommended
  };
}

// services/mediatorEngine/decision/config/interventionIntents.ts
var INTERVENTION_DEFAULT_INTENT = {
  welcome_open: "increase_emotional_safety",
  choice_emotion: "help_name_emotion",
  choice_need: "help_name_need",
  open_deepen: "help_explain_emotion",
  validate: "help_partner_feel_heard",
  reflect: "help_partner_feel_heard",
  mirror: "help_see_other_perspective",
  reframe: "help_see_other_perspective",
  propose_rule: "prepare_shared_agreement",
  propose_future_plan: "define_future_coping_plan",
  celebrate_breakthrough: "consolidate_breakthrough",
  deescalate: "reduce_defensiveness",
  redirect_blame: "reduce_blame_cycle",
  gentle_redirect_evasion: "reduce_defensiveness",
  pause_session: "invite_pause_and_breathe",
  remind_goal: "restore_trust_in_process",
  invite_reflection: "help_explain_emotion",
  summarize_close: "close_with_dignity",
  confirm_agreement: "prepare_shared_agreement",
  safety_response: "increase_emotional_safety",
  recover_acknowledge: "correct_misunderstanding"
};

// services/mediatorEngine/decision/config/strategyIntents.ts
var STRATEGY_DEFAULT_INTENT = {
  build_safety: "increase_emotional_safety",
  reduce_tension: "reduce_defensiveness",
  validate_emotions: "help_partner_feel_heard",
  deepen_emotions: "help_explain_emotion",
  transition_to_needs: "help_name_need",
  increase_mutual_understanding: "help_see_other_perspective",
  stop_escalation: "reduce_blame_cycle",
  prepare_agreement: "prepare_shared_agreement",
  close_topic: "close_with_dignity",
  recover_misinterpretation: "correct_misunderstanding",
  hold_space: "acknowledge_exhaustion",
  consolidate_progress: "consolidate_breakthrough"
};

// services/mediatorEngine/decision/lib/chooseIntent.ts
var GOAL_DEFAULT_INTENT = {
  SAFE_OPENING: "increase_emotional_safety",
  EMOTION_NAMING: "help_name_emotion",
  EMOTION_UNDERSTANDING: "help_explain_emotion",
  EMOTION_ACKNOWLEDGMENT: "help_partner_feel_heard",
  NEED_NAMING: "help_name_need",
  PERSPECTIVE_SHARING: "help_see_other_perspective",
  REFRAME: "help_see_other_perspective",
  AGREEMENT: "prepare_shared_agreement",
  FUTURE_PLAN: "define_future_coping_plan",
  CLOSURE: "close_with_dignity"
};
function chooseIntent(input) {
  if (input.safetyActive) {
    if (input.selectedInterventionType === "pause_session") {
      return "invite_pause_and_breathe";
    }
    return "increase_emotional_safety";
  }
  const fromIntervention = INTERVENTION_DEFAULT_INTENT[input.selectedInterventionType];
  if (fromIntervention) return fromIntervention;
  const fromStrategy = STRATEGY_DEFAULT_INTENT[input.primaryStrategy];
  if (fromStrategy) return fromStrategy;
  const fromGoal = GOAL_DEFAULT_INTENT[input.currentGoal];
  if (fromGoal) return fromGoal;
  return "increase_emotional_safety";
}

// services/mediatorEngine/decision/config/goalTransitionRules.ts
function mapSuggestedGoalTransition(suggested) {
  switch (suggested) {
    case "prepare_advance":
      return "advance";
    case "regress":
      return "regress";
    case "stay":
      return "stay";
    default:
      return "stay";
  }
}
function isGoalTransitionBlocked(input) {
  return input.safetyPreempted || input.conversationModeSafety || input.safetyBlockGoalTransitions || input.priorityPreemptsGoalTransition;
}

// services/mediatorEngine/decision/lib/chooseGoalTransition.ts
function isSafetyActive(input) {
  return input.safety?.preempted === true || input.priority?.conversationMode === "SAFETY";
}
function chooseGoalTransition(input) {
  const blocked = isGoalTransitionBlocked({
    safetyPreempted: input.safety?.preempted === true,
    safetyBlockGoalTransitions: input.safety?.blockGoalTransitions === true,
    priorityPreemptsGoalTransition: input.priority?.preemptsGoalTransition === true,
    conversationModeSafety: input.priority?.conversationMode === "SAFETY"
  });
  if (blocked || isSafetyActive(input)) {
    return "stay";
  }
  return mapSuggestedGoalTransition(input.strategy?.suggestedGoalTransition);
}
function isSafetyDecisionMode(input) {
  return isSafetyActive(input);
}

// services/mediatorEngine/decision/resolve/buildDecisionOutput.ts
function resolvePrimaryStrategy(input) {
  const strategy = input.strategy?.primaryStrategy;
  if (typeof strategy === "string") return strategy;
  return "build_safety";
}
function resolveCurrentGoal(input) {
  return input.state?.currentGoal ?? "SAFE_OPENING";
}
function resolveSafetyRecommendedType(input) {
  const fromPriority = typeof input.priority?.recommendedInterventionType === "string" ? input.priority.recommendedInterventionType : void 0;
  const fromSafety = typeof input.safety?.recommendedInterventionType === "string" ? input.safety.recommendedInterventionType : void 0;
  return fromPriority ?? fromSafety ?? "safety_response";
}
function buildDecisionOutput(input) {
  const safetyActive = isSafetyDecisionMode(input);
  const primaryStrategy = safetyActive ? "build_safety" : resolvePrimaryStrategy(input);
  const currentGoal = resolveCurrentGoal(input);
  const interventionChoice = chooseInterventionType(
    input.priority,
    safetyActive ? resolveSafetyRecommendedType(input) : void 0,
    safetyActive,
    primaryStrategy,
    input.continuityContext
  );
  const goalTransition = chooseGoalTransition(input);
  const goalTransitionBlocked = isGoalTransitionBlocked({
    safetyPreempted: input.safety?.preempted === true,
    safetyBlockGoalTransitions: input.safety?.blockGoalTransitions === true,
    priorityPreemptsGoalTransition: input.priority?.preemptsGoalTransition === true,
    conversationModeSafety: input.priority?.conversationMode === "SAFETY"
  });
  const intent = chooseIntent({
    selectedInterventionType: interventionChoice.selectedInterventionType,
    primaryStrategy,
    currentGoal,
    safetyActive
  });
  const rationale = buildDecisionRationale({
    safetyActive,
    usedRecommended: interventionChoice.usedRecommended,
    recommended: input.priority?.recommendedInterventionType,
    selectedInterventionType: interventionChoice.selectedInterventionType,
    goalTransition,
    goalTransitionBlocked,
    fallbackUsed: interventionChoice.fallbackUsed,
    intent,
    strategy: primaryStrategy
  });
  return {
    selectedInterventionType: interventionChoice.selectedInterventionType,
    goalTransition,
    intent,
    strategy: primaryStrategy,
    rationale
  };
}
function createMinimalSafeDecisionOutput() {
  return {
    selectedInterventionType: "deescalate",
    goalTransition: "stay",
    intent: "increase_emotional_safety",
    strategy: "build_safety",
    rationale: "mode=fallback; goal_transition=stay; intervention=deescalate; intent=increase_emotional_safety; strategy=build_safety"
  };
}

// services/mediatorEngine/decision/makeDecision.ts
function makeDecision(input) {
  try {
    return buildDecisionOutput(input);
  } catch {
    return createMinimalSafeDecisionOutput();
  }
}

// services/mediatorEngine/_internal/skeletonDefaults.ts
var SKELETON_TIMESTAMP = "1970-01-01T00:00:00.000Z";
function skeletonConfidence(value) {
  return {
    value,
    confidence: 0,
    source: "heuristic",
    evidence: [],
    assessedAt: SKELETON_TIMESTAMP,
    stale: false
  };
}
function createEmptyEvidenceStore() {
  return {
    conclusions: {},
    indexByTurn: {},
    maxConclusions: 80
  };
}
function createEmptySessionMemory() {
  return {
    breakthroughs: [],
    confirmedEmotions: [],
    confirmedNeeds: [],
    recurringNeeds: [],
    interventionHistory: [],
    effectivePatterns: [],
    ineffectivePatterns: [],
    completedGoals: [],
    closedTopics: [],
    openTopics: [],
    recentInterventionTypes: [],
    askedInterventionSignatures: [],
    regressHistory: [],
    reflectionLog: []
  };
}
function resolveRequestLanguage(request) {
  return request.language ?? "en";
}
function createEmptyMediationState(request) {
  const evidenceStore = createEmptyEvidenceStore();
  return {
    meta: {
      schemaVersion: "2.3",
      sessionId: request.sessionId,
      mediationId: request.mediationId,
      language: resolveRequestLanguage(request),
      startedAt: SKELETON_TIMESTAMP,
      lastUpdatedAt: SKELETON_TIMESTAMP,
      currentTurnNumber: request.turnNumber
    },
    participants: {
      host: {
        profile: { userId: "", displayName: "Host", role: "host" },
        namedEmotion: null,
        emotionConfidence: 0,
        emotionExplanation: null,
        emotionValidated: false,
        emotionAcknowledgedByOther: false,
        namedNeed: null,
        needExplanation: null,
        needValidated: false,
        feelsHeard: false,
        feelsUnderstood: false,
        feelsRespected: false,
        lastMessageTone: "calm",
        consecutiveEvasiveAnswers: 0,
        consecutiveAccusatoryMessages: 0,
        lastStatementSummary: null
      },
      partner: {
        profile: { userId: "", displayName: "Partner", role: "partner" },
        namedEmotion: null,
        emotionConfidence: 0,
        emotionExplanation: null,
        emotionValidated: false,
        emotionAcknowledgedByOther: false,
        namedNeed: null,
        needExplanation: null,
        needValidated: false,
        feelsHeard: false,
        feelsUnderstood: false,
        feelsRespected: false,
        lastMessageTone: "calm",
        consecutiveEvasiveAnswers: 0,
        consecutiveAccusatoryMessages: 0,
        lastStatementSummary: null
      }
    },
    conflict: {
      surfaceTopic: null,
      surfaceTopicConfidence: 0,
      hypothesizedDeepThemes: [],
      confirmedDeepTheme: null,
      conflictSummary: "",
      preAnalysisContext: {
        hostEmotions: [],
        hostNeeds: [],
        partnerEmotions: [],
        partnerNeeds: [],
        keyTrigger: null
      }
    },
    dynamics: {
      mode: "NORMAL",
      emotionalTemperature: 0,
      temperatureTrend: "stable",
      breakthroughDetected: false,
      breakthroughQuote: null,
      breakthroughAt: null,
      blameLoopDetected: false,
      blameLoopCount: 0,
      escalationDetected: false,
      escalationLevel: 0,
      mutualUnderstandingScore: 0,
      agreementLevel: 0,
      lastStableGoal: "SAFE_OPENING",
      pauseSuggested: false,
      pauseAcceptedBy: []
    },
    memory: {
      askedQuestionSignatures: [],
      recentMediatorMoves: [],
      coveredTopics: [],
      factMemory: [],
      breakthroughHistory: [],
      regressHistory: []
    },
    currentGoal: "SAFE_OPENING",
    goals: [],
    sessionObjectives: null,
    pendingAction: null,
    agreements: {
      sharedRule: null,
      hostCommitment: null,
      partnerCommitment: null,
      futurePlan: null,
      acceptedByBoth: false
    },
    sessionOutcome: "in_progress",
    pace: {
      current: "normal",
      confidence: 0,
      reason: "",
      sinceTurn: 1,
      minTurnsBeforeChange: 2
    },
    load: {
      host: skeletonConfidence(0),
      partner: skeletonConfidence(0),
      overall: 0,
      trend: "stable",
      exhaustionDetected: skeletonConfidence(false),
      disengagementRisk: skeletonConfidence(false)
    },
    personality: {
      core: {
        calm: 50,
        warm: 50,
        structured: 50,
        neutral: 50,
        empathetic: 50,
        confident: 50
      },
      profile: "steady_mediator",
      adaptiveModifiers: {
        warmthBoost: 0,
        structureBoost: 0,
        lastAdjustedTurn: 0
      },
      immutableRuleRefs: []
    },
    recovery: null,
    activeStrategy: null,
    lastInterventionMeta: null,
    evidenceStore
  };
}
function createEmptySafetyOutput() {
  return {
    level: "none",
    preempted: false,
    signals: [],
    recommendedInterventionType: "welcome_open",
    blockGoalTransitions: false,
    blockStandardInterventions: false,
    allowedInterventionTypes: [],
    assessed: skeletonConfidence(false)
  };
}
function createEmptyReflectionOutput() {
  const readiness = {
    readyToAdvance: skeletonConfidence(false),
    needsMoreTime: skeletonConfidence(false),
    needsDifferentApproach: skeletonConfidence(false),
    signals: []
  };
  return {
    understoodPartners: skeletonConfidence(false),
    lastInterventionHelpful: skeletonConfidence(false),
    conversationMovedForward: skeletonConfidence(false),
    shouldChangeStrategy: false,
    repeatRisk: skeletonConfidence(false),
    drillDownRisk: skeletonConfidence(false),
    stuckRisk: skeletonConfidence(false),
    recommendedStrategyShift: "continue",
    reflectionNotes: "",
    expectedEffectEvaluation: null,
    partnerReadiness: { host: readiness, partner: readiness },
    strategyRecommendation: {
      preferStrategyChange: false,
      suggestedStrategy: null,
      reason: "",
      confidence: 0
    },
    paceRecommendation: { suggestedPace: null, reason: "" },
    loadRecommendation: { acknowledgeLoad: false, targetParticipant: null }
  };
}
function createEmptyStrategyOutput() {
  return {
    primaryStrategy: "build_safety",
    secondaryStrategy: null,
    therapeuticIntent: "increase_emotional_safety",
    confidence: 0,
    rationale: "",
    blockedStrategies: [],
    suggestedGoalTransition: "stay",
    strategyDurationHint: 1,
    alignmentWithGoal: "SAFE_OPENING",
    recoveryStrategy: null
  };
}
function createEmptyExplainability(turnNumber) {
  return {
    decisionExplanation: {
      turnNumber,
      timestamp: SKELETON_TIMESTAMP,
      decisionId: "skeleton-decision",
      outcome: {
        strategy: "build_safety",
        interventionType: "welcome_open",
        intent: "increase_emotional_safety",
        goalTransition: "stay",
        pace: "normal"
      },
      reasoning: [],
      constitutionArticleRefs: [],
      evidenceRefs: [],
      moduleInputs: {
        reflection: {
          lastInterventionHelpful: false,
          shouldChangeStrategy: false,
          recommendedStrategyShift: "continue",
          expectedEffectAchieved: null
        },
        priority: {
          conversationMode: "NORMAL",
          topSignalType: null,
          preemptsGoalTransition: false,
          recommendedInterventionType: "welcome_open"
        },
        strategy: {
          primaryStrategy: "build_safety",
          secondaryStrategy: null,
          suggestedGoalTransition: "stay",
          confidence: 0
        },
        readiness: { hostReadyToAdvance: false, partnerReadyToAdvance: false }
      },
      rejectedAlternatives: []
    },
    contributions: [],
    currentGoal: "SAFE_OPENING"
  };
}

// services/mediatorEngine/memory/continuity/detectRepeatedMove.ts
var REPEATED_MOVE_THRESHOLD = 3;
function detectRepeatedMove(recentInterventionTypes) {
  if (recentInterventionTypes.length < REPEATED_MOVE_THRESHOLD) {
    return { repeatedMoveDetected: false, repeatedMoveReason: null };
  }
  const head = recentInterventionTypes.slice(0, REPEATED_MOVE_THRESHOLD);
  const first = head[0];
  const allSame = head.every((type) => type === first);
  if (!allSame || typeof first !== "string") {
    return { repeatedMoveDetected: false, repeatedMoveReason: null };
  }
  return {
    repeatedMoveDetected: true,
    repeatedMoveReason: `${first} used ${REPEATED_MOVE_THRESHOLD} times in recent turns`
  };
}

// services/mediatorEngine/memory/continuity/detectStaleTopic.ts
function detectStaleTopic(memory, recentInterventionTypes, ineffectivePatterns) {
  const openTopics = Array.isArray(memory?.openTopics) ? memory.openTopics.filter((topic) => typeof topic === "string" && topic.length > 0) : [];
  if (openTopics.length === 0 || recentInterventionTypes.length < 2) {
    return { staleTopicDetected: false, staleTopicReason: null };
  }
  const dominantRecent = recentInterventionTypes[0];
  const repeatedOnTopic = typeof dominantRecent === "string" && recentInterventionTypes.filter((type) => type === dominantRecent).length >= 2 && ineffectivePatterns.includes(dominantRecent);
  if (!repeatedOnTopic) {
    return { staleTopicDetected: false, staleTopicReason: null };
  }
  return {
    staleTopicDetected: true,
    staleTopicReason: "Open topic unchanged while recent moves appear ineffective"
  };
}

// services/mediatorEngine/memory/continuity/scoreInterventionEffectiveness.ts
function lastTypeWithEffectiveness(memory, effective) {
  const history = Array.isArray(memory.interventionHistory) ? memory.interventionHistory : [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (entry?.effective === effective && typeof entry.type === "string") {
      return entry.type;
    }
  }
  return null;
}
function scoreInterventionEffectiveness(memory) {
  if (!memory) {
    return {
      effectivePatterns: [],
      ineffectivePatterns: [],
      lastEffectiveInterventionType: null,
      lastIneffectiveInterventionType: null
    };
  }
  const effectivePatterns = Array.isArray(memory.effectivePatterns) ? memory.effectivePatterns.filter((type) => typeof type === "string") : [];
  const ineffectivePatterns = Array.isArray(memory.ineffectivePatterns) ? memory.ineffectivePatterns.filter((type) => typeof type === "string") : [];
  return {
    effectivePatterns,
    ineffectivePatterns,
    lastEffectiveInterventionType: lastTypeWithEffectiveness(memory, true),
    lastIneffectiveInterventionType: lastTypeWithEffectiveness(memory, false)
  };
}

// services/mediatorEngine/memory/continuity/selectContinuityHint.ts
function selectContinuityHint(partial) {
  const lastIneffective = partial.lastIneffectiveInterventionType;
  if (lastIneffective && partial.suggestedAvoidTypes.includes(lastIneffective)) {
    if (lastIneffective === "reflect") {
      return "The last reflection appeared ineffective; prefer a validating or clarifying move.";
    }
    return `The last ${lastIneffective} move appeared ineffective; use a different angle.`;
  }
  if (partial.repeatedMoveDetected) {
    return "Do not repeat the previous mediator move. Use a different angle.";
  }
  if (partial.staleTopicDetected) {
    return "The current topic may be stuck; try a validating, reframing, or clarifying move.";
  }
  if (partial.suggestedPreferTypes.length > 0) {
    return "Build on what worked recently; vary tone while keeping the same therapeutic direction.";
  }
  return null;
}

// services/mediatorEngine/memory/continuity/summarizeRecentInterventions.ts
function summarizeRecentInterventions(memory) {
  const recentInterventionTypes = Array.isArray(memory?.recentInterventionTypes) ? memory.recentInterventionTypes.filter((type) => typeof type === "string") : [];
  const recentSignatures = Array.isArray(memory?.askedInterventionSignatures) ? memory.askedInterventionSignatures.filter(
    (sig) => typeof sig === "string"
  ) : [];
  return { recentInterventionTypes, recentSignatures };
}

// services/mediatorEngine/memory/continuity/buildContinuityContext.ts
var REPEATED_TYPE_THRESHOLD = 3;
function dedupeTypes(types) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const type of types) {
    if (!seen.has(type)) {
      seen.add(type);
      result.push(type);
    }
  }
  return result;
}
function countRecentType(recent, type) {
  return recent.filter((entry) => entry === type).length;
}
function buildSuggestedAvoidTypes(memory, recent, effectiveness, repeated, recommended) {
  const avoid = [];
  if (effectiveness.lastIneffectiveInterventionType && typeof effectiveness.lastIneffectiveInterventionType === "string") {
    avoid.push(effectiveness.lastIneffectiveInterventionType);
  }
  for (const type of effectiveness.ineffectivePatterns) {
    avoid.push(type);
  }
  if (repeated.repeatedMoveDetected && recent[0]) {
    avoid.push(recent[0]);
  }
  for (const type of recent) {
    if (countRecentType(recent, type) >= REPEATED_TYPE_THRESHOLD) {
      avoid.push(type);
    }
  }
  if (recommended && countRecentType(recent, recommended) >= 2) {
    const signatures = memory.askedInterventionSignatures ?? [];
    if (signatures.length > 0) {
      avoid.push(recommended);
    }
  }
  return dedupeTypes(avoid);
}
function buildSuggestedPreferTypes(effectiveness) {
  const prefer = [];
  if (effectiveness.lastEffectiveInterventionType) {
    prefer.push(effectiveness.lastEffectiveInterventionType);
  }
  for (const type of effectiveness.effectivePatterns) {
    prefer.push(type);
  }
  return dedupeTypes(prefer);
}
function computeConfidence(repeated, stale, effectiveness) {
  let score = 0;
  if (repeated.repeatedMoveDetected) score += 40;
  if (stale.staleTopicDetected) score += 20;
  if (effectiveness.lastIneffectiveInterventionType) score += 25;
  if (effectiveness.lastEffectiveInterventionType) score += 15;
  return Math.min(100, score);
}
function buildContinuityContext(input) {
  const normalizedInput = input && typeof input === "object" && "sessionMemory" in input ? input : { sessionMemory: input };
  const memory = normalizedInput.sessionMemory ?? createEmptySessionMemory();
  const { recentInterventionTypes, recentSignatures } = summarizeRecentInterventions(memory);
  const effectiveness = scoreInterventionEffectiveness(memory);
  const repeated = detectRepeatedMove(recentInterventionTypes);
  const stale = detectStaleTopic(memory, recentInterventionTypes, effectiveness.ineffectivePatterns);
  const suggestedAvoidTypes = buildSuggestedAvoidTypes(
    memory,
    recentInterventionTypes,
    effectiveness,
    repeated,
    normalizedInput.recommendedInterventionType
  );
  const suggestedPreferTypes = buildSuggestedPreferTypes(effectiveness);
  const partial = {
    repeatedMoveDetected: repeated.repeatedMoveDetected,
    staleTopicDetected: stale.staleTopicDetected,
    lastIneffectiveInterventionType: effectiveness.lastIneffectiveInterventionType,
    suggestedAvoidTypes,
    suggestedPreferTypes
  };
  return {
    recentInterventionTypes,
    recentSignatures,
    effectivePatterns: effectiveness.effectivePatterns,
    ineffectivePatterns: effectiveness.ineffectivePatterns,
    repeatedMoveDetected: repeated.repeatedMoveDetected,
    repeatedMoveReason: repeated.repeatedMoveReason,
    staleTopicDetected: stale.staleTopicDetected,
    staleTopicReason: stale.staleTopicReason,
    lastEffectiveInterventionType: effectiveness.lastEffectiveInterventionType,
    lastIneffectiveInterventionType: effectiveness.lastIneffectiveInterventionType,
    suggestedAvoidTypes,
    suggestedPreferTypes,
    continuityHint: selectContinuityHint(partial),
    confidence: computeConfidence(repeated, stale, effectiveness)
  };
}

// services/mediatorEngine/intervention/config/doNotRepeatBefore.ts
var DO_NOT_REPEAT_BEFORE_OFFSET = {
  celebrate_breakthrough: 8,
  pause_session: 6,
  deescalate: 4,
  validate: 2,
  reflect: 2
};
var DEFAULT_DO_NOT_REPEAT_OFFSET = 0;

// services/mediatorEngine/intervention/lib/buildDoNotRepeatBefore.ts
function buildDoNotRepeatBefore(type, turnNumber) {
  const offset = DO_NOT_REPEAT_BEFORE_OFFSET[type] ?? DEFAULT_DO_NOT_REPEAT_OFFSET;
  return turnNumber + offset;
}

// services/mediatorEngine/intervention/config/defaultExpectedEffects.ts
var DEFAULT_TEMPLATE = {
  description: "Participant responds constructively to the mediator move.",
  observableSignals: ["participant_response", "tone_shift"],
  targetParticipant: "both",
  verificationMethod: "next_message",
  successCriteria: { type: "check_confirmed", threshold: 0, confidenceRequired: 60 },
  timeHorizon: 1
};
var EXPECTED_EFFECT_TEMPLATES = {
  welcome_open: {
    description: "Both participants engage with the opening frame.",
    observableSignals: ["engagement", "calm_tone"]
  },
  choice_emotion: {
    description: "Participant selects or names an emotion.",
    observableSignals: ["emotion_named"],
    verificationMethod: "checklist_delta"
  },
  choice_need: {
    description: "Participant selects or names a need.",
    observableSignals: ["need_named"],
    verificationMethod: "checklist_delta"
  },
  open_deepen: {
    description: "Participant shares deeper emotional content.",
    observableSignals: ["deeper_share"],
    timeHorizon: 2
  },
  validate: {
    description: "Participant feels acknowledged after validation.",
    observableSignals: ["acknowledgment", "calmer_tone"]
  },
  reflect: {
    description: "Participant confirms the reflection is accurate.",
    observableSignals: ["confirmation"]
  },
  mirror: {
    description: "Participant recognizes their perspective mirrored back.",
    observableSignals: ["recognition"]
  },
  reframe: {
    description: "Participant considers an alternative framing.",
    observableSignals: ["perspective_shift"],
    timeHorizon: 2
  },
  propose_rule: {
    description: "Participants accept or discuss a shared rule.",
    observableSignals: ["rule_discussion"]
  },
  propose_future_plan: {
    description: "Participants engage with a future coping plan.",
    observableSignals: ["plan_discussion"],
    timeHorizon: 2
  },
  celebrate_breakthrough: {
    description: "Breakthrough moment is acknowledged by both partners.",
    observableSignals: ["mutual_acknowledgment"]
  },
  deescalate: {
    description: "Emotional intensity decreases after de-escalation.",
    observableSignals: ["lower_intensity", "calmer_tone"]
  },
  redirect_blame: {
    description: "Blame cycle softens after redirect.",
    observableSignals: ["less_blame", "self_focus"]
  },
  gentle_redirect_evasion: {
    description: "Participant returns to the therapeutic thread.",
    observableSignals: ["return_to_topic"]
  },
  pause_session: {
    description: "Participants accept or benefit from a pause.",
    observableSignals: ["pause_acceptance"]
  },
  remind_goal: {
    description: "Participants re-orient to the current therapeutic goal.",
    observableSignals: ["goal_reference"]
  },
  invite_reflection: {
    description: "Participant reflects on their experience.",
    observableSignals: ["reflective_response"],
    timeHorizon: 2
  },
  summarize_close: {
    description: "Participants accept the session summary.",
    observableSignals: ["summary_acceptance"]
  },
  confirm_agreement: {
    description: "Both participants confirm the agreement.",
    observableSignals: ["agreement_confirmed"]
  },
  safety_response: {
    description: "Immediate safety concern is stabilized.",
    observableSignals: ["distress_reduced", "engagement_restored"],
    targetParticipant: "both",
    successCriteria: { type: "tone_shift", threshold: 1, confidenceRequired: 70 }
  },
  recover_acknowledge: {
    description: "Misinterpretation is acknowledged and trust restored.",
    observableSignals: ["correction_accepted"]
  }
};
function mergeTemplate(type, targetParticipant) {
  const overrides = EXPECTED_EFFECT_TEMPLATES[type] ?? {};
  return {
    ...DEFAULT_TEMPLATE,
    ...overrides,
    targetParticipant: overrides.targetParticipant ?? targetParticipant,
    successCriteria: overrides.successCriteria ?? DEFAULT_TEMPLATE.successCriteria,
    observableSignals: overrides.observableSignals ?? DEFAULT_TEMPLATE.observableSignals
  };
}
function expectedEffectTemplateForType(type, targetParticipant = "both") {
  const template = mergeTemplate(type, targetParticipant);
  return {
    id: `effect-${type}-v1`,
    ...template
  };
}

// services/mediatorEngine/intervention/lib/buildExpectedEffect.ts
function buildExpectedEffect(type, targetParticipant = "both") {
  return expectedEffectTemplateForType(type, targetParticipant);
}

// services/mediatorEngine/intervention/config/libraryPatternIds.ts
var LIBRARY_PATTERN_IDS = {
  welcome_open: "welcome_open_v1",
  choice_emotion: "choice_emotion_v1",
  choice_need: "choice_need_v1",
  open_deepen: "open_deepen_v1",
  validate: "validate_v1",
  reflect: "reflect_v1",
  mirror: "mirror_v1",
  reframe: "reframe_v1",
  propose_rule: "propose_rule_v1",
  propose_future_plan: "propose_future_plan_v1",
  celebrate_breakthrough: "celebrate_breakthrough_v1",
  deescalate: "deescalate_v1",
  redirect_blame: "redirect_blame_v1",
  gentle_redirect_evasion: "gentle_redirect_evasion_v1",
  pause_session: "pause_session_v1",
  remind_goal: "remind_goal_v1",
  invite_reflection: "invite_reflection_v1",
  summarize_close: "summarize_close_v1",
  confirm_agreement: "confirm_agreement_v1",
  safety_response: "safety_response_v1",
  recover_acknowledge: "recover_acknowledge_v1"
};

// services/mediatorEngine/intervention/lib/buildLibraryPatternId.ts
function buildLibraryPatternId(type) {
  return LIBRARY_PATTERN_IDS[type] ?? `${type}_v1`;
}

// services/mediatorEngine/intervention/config/defaultRationales.ts
var RATIONALE_FROM_DECISION = "generated from decision";
var RATIONALE_FROM_SAFETY_OVERRIDE = "generated from safety override";
var SAFETY_OVERRIDE_INTERVENTION_TYPES = /* @__PURE__ */ new Set([
  "safety_response",
  "pause_session"
]);

// services/mediatorEngine/intervention/lib/buildRationale.ts
function buildRationale(input) {
  if (input.strategy === "build_safety" && SAFETY_OVERRIDE_INTERVENTION_TYPES.has(input.type)) {
    return RATIONALE_FROM_SAFETY_OVERRIDE;
  }
  return RATIONALE_FROM_DECISION;
}

// services/mediatorEngine/intervention/lib/buildSignature.ts
function buildSignature(input) {
  return `${input.type}|${input.goal}|${input.target}|${input.strategy}`;
}

// services/mediatorEngine/intervention/factory/createIntervention.ts
var INTERVENTION_PLACEHOLDER_MESSAGE = "[INTERVENTION_PLACEHOLDER]";
function placeholderContent() {
  return {
    primaryMessage: INTERVENTION_PLACEHOLDER_MESSAGE,
    secondaryMessage: void 0
  };
}
function buildInterventionId(turnNumber, type, signature) {
  return `intervention-${turnNumber}-${type}-${signature.replace(/\|/g, "-")}`;
}
function createIntervention(params) {
  const signature = buildSignature({
    type: params.type,
    goal: params.goal,
    target: params.target,
    strategy: params.strategy
  });
  return {
    id: buildInterventionId(params.turnNumber, params.type, signature),
    type: params.type,
    target: params.target,
    visibility: "public",
    content: placeholderContent(),
    goal: params.goal,
    intent: params.intent,
    strategy: params.strategy,
    rationale: buildRationale({ type: params.type, strategy: params.strategy }),
    expectedEffect: buildExpectedEffect(params.type, params.target),
    libraryPatternId: buildLibraryPatternId(params.type),
    doNotRepeatBefore: buildDoNotRepeatBefore(params.type, params.turnNumber),
    signature,
    generatedAt: params.generatedAt
  };
}
function normalizeTurnNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 1;
}
function normalizeTarget(value) {
  if (value === "host" || value === "partner" || value === "both") return value;
  return "both";
}
function normalizeInterventionInput(input) {
  const turnNumber = normalizeTurnNumber(input.turnNumber);
  const type = typeof input.decision?.selectedInterventionType === "string" ? input.decision.selectedInterventionType : "reflect";
  const goal = typeof input.intent?.goal === "string" ? input.intent.goal : typeof input.state?.currentGoal === "string" ? input.state.currentGoal : "SAFE_OPENING";
  const intent = typeof input.intent?.intent === "string" ? input.intent.intent : typeof input.decision?.intent === "string" ? input.decision.intent : "increase_emotional_safety";
  const strategy = typeof input.decision?.strategy === "string" ? input.decision.strategy : typeof input.intent?.strategy === "string" ? input.intent.strategy : "build_safety";
  const target = normalizeTarget(input.intent?.targetParticipant);
  return {
    turnNumber,
    type,
    target,
    goal,
    intent,
    strategy,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// services/mediatorEngine/intervention/builder/buildIntervention.ts
function buildIntervention(input) {
  const params = normalizeInterventionInput(input);
  return createIntervention(params);
}
function createMinimalIntervention(turnNumber = 1) {
  return createIntervention({
    turnNumber,
    type: "reflect",
    target: "both",
    goal: "SAFE_OPENING",
    intent: "increase_emotional_safety",
    strategy: "build_safety",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}

// services/mediatorEngine/intervention/generateIntervention.ts
function generateIntervention(input) {
  try {
    return buildIntervention(input);
  } catch {
    const turnNumber = typeof input?.turnNumber === "number" && Number.isFinite(input.turnNumber) ? input.turnNumber : 1;
    return createMinimalIntervention(turnNumber);
  }
}

// services/mediatorEngine/memory/config/memoryLimits.ts
var SESSION_MEMORY_LIMITS = {
  maxBreakthroughs: 20,
  maxInterventionHistory: 50,
  maxRecentInterventionTypes: 10,
  maxAskedSignatures: 30,
  maxReflectionLog: 30,
  maxClosedTopics: 20,
  maxOpenTopics: 20,
  maxRegressHistory: 20,
  maxEffectivePatterns: 15,
  maxIneffectivePatterns: 15,
  maxConfirmedEmotions: 20,
  maxConfirmedNeeds: 20,
  maxRecurringNeeds: 10
};

// services/mediatorEngine/memory/lib/listHelpers.ts
function appendLimited(list, item, max) {
  const next = [...list, item];
  if (next.length <= max) return next;
  return next.slice(next.length - max);
}
function prependLimited(list, item, max) {
  const next = [item, ...list.filter((entry) => entry !== item)];
  if (next.length <= max) return next;
  return next.slice(0, max);
}
function dedupeAppendLimited(list, item, max) {
  const without = list.filter((entry) => entry !== item);
  return appendLimited(without, item, max);
}

// services/mediatorEngine/memory/collect/collectBreakthroughMemory.ts
function breakthroughKey(record) {
  return `${record.turnNumber}:${record.type}:${record.participant}`;
}
function buildSourceEventId(event, turnNumber) {
  const eventTurn = typeof event.turnNumber === "number" ? event.turnNumber : turnNumber;
  const participant = event.participant === "partner" ? "partner" : "host";
  const detectedAt = typeof event.detectedAt === "string" ? event.detectedAt : "unknown";
  return `breakthrough:${eventTurn}:${participant}:${event.type}:${detectedAt}`;
}
function mapBreakthroughEvent(event, turnNumber) {
  if (!event || typeof event.type !== "string") return null;
  return {
    type: event.type,
    confidence: typeof event.confidence === "number" ? event.confidence : 0,
    turnNumber: typeof event.turnNumber === "number" ? event.turnNumber : turnNumber,
    participant: event.participant === "partner" ? "partner" : "host",
    sourceEventId: buildSourceEventId(event, turnNumber),
    evidenceRefIds: []
  };
}
function collectBreakthroughMemory(memory, input) {
  const { state, turnNumber } = input;
  const existingKeys = new Set(memory.breakthroughs.map(breakthroughKey));
  let breakthroughs = [...memory.breakthroughs];
  const history = state?.memory?.breakthroughHistory;
  if (Array.isArray(history)) {
    for (const event of history) {
      const record = mapBreakthroughEvent(event, turnNumber);
      if (!record) continue;
      const key = breakthroughKey(record);
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      breakthroughs = appendLimited(breakthroughs, record, SESSION_MEMORY_LIMITS.maxBreakthroughs);
    }
  }
  if (state?.dynamics?.breakthroughDetected === true) {
    const record = {
      type: "other",
      confidence: 70,
      turnNumber,
      participant: "host",
      sourceEventId: `dynamics:${turnNumber}`,
      evidenceRefIds: []
    };
    const key = breakthroughKey(record);
    if (!existingKeys.has(key)) {
      breakthroughs = appendLimited(breakthroughs, record, SESSION_MEMORY_LIMITS.maxBreakthroughs);
    }
  }
  return {
    ...memory,
    breakthroughs
  };
}

// services/mediatorEngine/memory/collect/collectGoalMemory.ts
function asGoalStates(state) {
  return Array.isArray(state?.goals) ? state.goals : [];
}
function completedGoalsFromState(state) {
  return asGoalStates(state).filter((goalState) => goalState?.status === "completed" && typeof goalState.goal === "string").map((goalState) => goalState.goal);
}
function closedTopicsFromState(state) {
  const closed = /* @__PURE__ */ new Set();
  for (const goalState of asGoalStates(state)) {
    if (goalState?.status === "completed" || goalState?.status === "skipped" || goalState?.status === "blocked") {
      if (typeof goalState.goal === "string") closed.add(goalState.goal);
    }
  }
  const objectives = state?.sessionObjectives?.objectives;
  if (Array.isArray(objectives)) {
    for (const objective of objectives) {
      if (objective?.status === "achieved" || objective?.status === "abandoned") {
        if (typeof objective.id === "string") closed.add(objective.id);
      }
    }
  }
  return [...closed];
}
function openTopicsFromState(state) {
  const open = /* @__PURE__ */ new Set();
  const surfaceTopic = state?.conflict?.surfaceTopic;
  if (typeof surfaceTopic === "string" && surfaceTopic.length > 0) {
    open.add(surfaceTopic);
  }
  const deepTheme = state?.conflict?.confirmedDeepTheme;
  if (typeof deepTheme === "string" && deepTheme.length > 0) {
    open.add(deepTheme);
  }
  const covered = state?.memory?.coveredTopics;
  if (Array.isArray(covered)) {
    for (const topic of covered) {
      if (typeof topic === "string" && topic.length > 0) open.add(topic);
    }
  }
  for (const goalState of asGoalStates(state)) {
    if (goalState?.status === "in_progress" || goalState?.status === "pending") {
      if (typeof goalState.goal === "string") open.add(goalState.goal);
    }
  }
  return [...open];
}
function mergeLimitedTopics(existing, incoming, max) {
  let merged = [...existing];
  for (const topic of incoming) {
    merged = dedupeAppendLimited(merged, topic, max);
  }
  return merged.slice(-max);
}
function collectConfirmedEmotions(memory, state) {
  const entries = [...memory.confirmedEmotions];
  const participants = [
    { role: "host", participant: state?.participants?.host },
    { role: "partner", participant: state?.participants?.partner }
  ];
  for (const { role, participant } of participants) {
    if (!participant?.emotionValidated || !participant.namedEmotion) continue;
    const exists = entries.some(
      (entry) => entry.participant === role && entry.value === participant.namedEmotion
    );
    if (exists) continue;
    entries.push({
      participant: role,
      value: participant.namedEmotion,
      confidence: typeof participant.emotionConfidence === "number" ? participant.emotionConfidence : 0,
      source: "user_signal",
      evidence: [],
      assessedAt: state?.meta?.lastUpdatedAt ?? "1970-01-01T00:00:00.000Z",
      stale: false
    });
  }
  return entries.slice(-SESSION_MEMORY_LIMITS.maxConfirmedEmotions);
}
function collectConfirmedNeeds(memory, state) {
  const entries = [...memory.confirmedNeeds];
  const participants = [
    { role: "host", participant: state?.participants?.host },
    { role: "partner", participant: state?.participants?.partner }
  ];
  for (const { role, participant } of participants) {
    if (!participant?.needValidated || !participant.namedNeed) continue;
    const exists = entries.some(
      (entry) => entry.participant === role && entry.value === participant.namedNeed
    );
    if (exists) continue;
    entries.push({
      participant: role,
      value: participant.namedNeed,
      confidence: 0,
      source: "user_signal",
      evidence: [],
      assessedAt: state?.meta?.lastUpdatedAt ?? "1970-01-01T00:00:00.000Z",
      stale: false
    });
  }
  return entries.slice(-SESSION_MEMORY_LIMITS.maxConfirmedNeeds);
}
function deriveRecurringNeeds(confirmedNeeds) {
  const counts = /* @__PURE__ */ new Map();
  for (const entry of confirmedNeeds) {
    if (!entry?.value) continue;
    counts.set(entry.value, (counts.get(entry.value) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count >= 2).map(([need]) => need).slice(-SESSION_MEMORY_LIMITS.maxRecurringNeeds);
}
function mergeRegressHistory(memory, state) {
  const incoming = Array.isArray(state?.memory?.regressHistory) ? state.memory.regressHistory : [];
  let merged = [...memory.regressHistory];
  for (const transition of incoming) {
    if (!transition || typeof transition.turnNumber !== "number") continue;
    const duplicate = merged.some(
      (existing) => existing.turnNumber === transition.turnNumber && existing.fromGoal === transition.fromGoal && existing.toGoal === transition.toGoal
    );
    if (duplicate) continue;
    merged = appendLimited(merged, transition, SESSION_MEMORY_LIMITS.maxRegressHistory);
  }
  return merged;
}
function collectGoalMemory(memory, input) {
  const { state } = input;
  const confirmedEmotions = collectConfirmedEmotions(memory, state);
  const confirmedNeeds = collectConfirmedNeeds(memory, state);
  return {
    ...memory,
    completedGoals: completedGoalsFromState(state),
    closedTopics: mergeLimitedTopics(
      memory.closedTopics,
      closedTopicsFromState(state),
      SESSION_MEMORY_LIMITS.maxClosedTopics
    ),
    openTopics: mergeLimitedTopics(
      memory.openTopics,
      openTopicsFromState(state),
      SESSION_MEMORY_LIMITS.maxOpenTopics
    ),
    regressHistory: mergeRegressHistory(memory, state),
    confirmedEmotions,
    confirmedNeeds,
    recurringNeeds: deriveRecurringNeeds(confirmedNeeds)
  };
}

// services/mediatorEngine/memory/lib/complianceSummary.ts
function summarizeComplianceResult(compliance) {
  const violations = Array.isArray(compliance.violations) ? compliance.violations : [];
  return {
    compliant: compliance.compliant === true,
    violationCount: violations.length,
    blockingViolationCount: violations.filter((violation) => violation.severity === "block").length,
    fallbackUsed: compliance.fallbackUsed === true,
    attemptNumber: typeof compliance.attemptNumber === "number" ? compliance.attemptNumber : 1
  };
}

// services/mediatorEngine/memory/collect/collectInterventionMemory.ts
function inferEffectiveness(reflection) {
  const helpful = reflection?.lastInterventionHelpful;
  if (!helpful || typeof helpful.value !== "boolean") {
    return { effective: null, confidence: typeof helpful?.confidence === "number" ? helpful.confidence : 0 };
  }
  return {
    effective: helpful.value,
    confidence: typeof helpful.confidence === "number" ? helpful.confidence : 0
  };
}
function buildInterventionHistoryEntry(input) {
  const { intervention, reflection, complianceResult, turnNumber } = input;
  const { effective, confidence } = inferEffectiveness(reflection);
  return {
    interventionId: typeof intervention?.id === "string" ? intervention.id : "unknown-intervention",
    turnNumber,
    type: intervention?.type ?? "reflect",
    goal: intervention?.goal ?? "SAFE_OPENING",
    intent: intervention?.intent ?? "increase_emotional_safety",
    strategy: intervention?.strategy ?? "build_safety",
    expectedEffectId: typeof intervention?.expectedEffect?.id === "string" ? intervention.expectedEffect.id : "unknown-effect",
    signature: typeof intervention?.signature === "string" ? intervention.signature : "unknown",
    compliance: summarizeComplianceResult(complianceResult),
    effective,
    confidence
  };
}
function updatePatternLists(memory, interventionType, effective) {
  if (effective === true) {
    return {
      effectivePatterns: appendLimited(
        memory.effectivePatterns,
        interventionType,
        SESSION_MEMORY_LIMITS.maxEffectivePatterns
      ),
      ineffectivePatterns: memory.ineffectivePatterns
    };
  }
  if (effective === false) {
    return {
      effectivePatterns: memory.effectivePatterns,
      ineffectivePatterns: appendLimited(
        memory.ineffectivePatterns,
        interventionType,
        SESSION_MEMORY_LIMITS.maxIneffectivePatterns
      )
    };
  }
  return {
    effectivePatterns: memory.effectivePatterns,
    ineffectivePatterns: memory.ineffectivePatterns
  };
}
function collectInterventionMemory(memory, input) {
  const entry = buildInterventionHistoryEntry(input);
  const patterns = updatePatternLists(memory, entry.type, entry.effective);
  return {
    ...memory,
    ...patterns,
    interventionHistory: appendLimited(
      memory.interventionHistory,
      entry,
      SESSION_MEMORY_LIMITS.maxInterventionHistory
    ),
    recentInterventionTypes: prependLimited(
      memory.recentInterventionTypes,
      entry.type,
      SESSION_MEMORY_LIMITS.maxRecentInterventionTypes
    ),
    askedInterventionSignatures: dedupeAppendLimited(
      memory.askedInterventionSignatures,
      entry.signature,
      SESSION_MEMORY_LIMITS.maxAskedSignatures
    )
  };
}

// services/mediatorEngine/memory/collect/collectReflectionMemory.ts
function boolOrNull(value) {
  return typeof value === "boolean" ? value : null;
}
function scoreOrZero(value) {
  return typeof value === "number" ? value : 0;
}
function buildReflectionLogEntry(input) {
  const { reflection, turnNumber } = input;
  return {
    turnNumber,
    lastInterventionHelpful: boolOrNull(reflection?.lastInterventionHelpful?.value),
    lastInterventionHelpfulConfidence: scoreOrZero(reflection?.lastInterventionHelpful?.confidence),
    conversationMovedForward: boolOrNull(reflection?.conversationMovedForward?.value),
    conversationMovedForwardConfidence: scoreOrZero(reflection?.conversationMovedForward?.confidence),
    shouldChangeStrategy: reflection?.shouldChangeStrategy === true,
    recommendedStrategyShift: reflection?.recommendedStrategyShift ?? "continue",
    expectedEffectEvaluation: reflection?.expectedEffectEvaluation ?? null
  };
}
function collectReflectionMemory(memory, input) {
  const entry = buildReflectionLogEntry(input);
  return {
    ...memory,
    reflectionLog: appendLimited(
      memory.reflectionLog,
      entry,
      SESSION_MEMORY_LIMITS.maxReflectionLog
    )
  };
}

// services/mediatorEngine/memory/lib/normalizeMemory.ts
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function sanitizeBreakthroughRecord(value) {
  if (!value || typeof value !== "object") return null;
  const record = value;
  if (typeof record.type !== "string") return null;
  const evidenceRefIds = Array.isArray(record.evidenceRefIds) ? record.evidenceRefIds.filter((id) => typeof id === "string") : [];
  return {
    type: record.type,
    confidence: typeof record.confidence === "number" ? record.confidence : 0,
    turnNumber: typeof record.turnNumber === "number" ? record.turnNumber : 0,
    participant: record.participant === "partner" ? "partner" : "host",
    sourceEventId: typeof record.sourceEventId === "string" ? record.sourceEventId : null,
    evidenceRefIds
  };
}
function sanitizeBreakthroughs(value) {
  return asArray(value).map((entry) => sanitizeBreakthroughRecord(entry)).filter((entry) => entry !== null);
}
function normalizeMemory(memory) {
  const empty = createEmptySessionMemory();
  if (!memory || typeof memory !== "object") return empty;
  return {
    breakthroughs: sanitizeBreakthroughs(memory.breakthroughs),
    confirmedEmotions: asArray(memory.confirmedEmotions),
    confirmedNeeds: asArray(memory.confirmedNeeds),
    recurringNeeds: asArray(memory.recurringNeeds),
    interventionHistory: asArray(memory.interventionHistory),
    effectivePatterns: asArray(memory.effectivePatterns),
    ineffectivePatterns: asArray(memory.ineffectivePatterns),
    completedGoals: asArray(memory.completedGoals),
    closedTopics: asArray(memory.closedTopics),
    openTopics: asArray(memory.openTopics),
    recentInterventionTypes: asArray(memory.recentInterventionTypes),
    askedInterventionSignatures: asArray(memory.askedInterventionSignatures),
    regressHistory: asArray(memory.regressHistory),
    reflectionLog: asArray(memory.reflectionLog)
  };
}

// services/mediatorEngine/memory/update/buildSessionMemoryUpdate.ts
function buildSessionMemoryUpdate(input) {
  let memory = normalizeMemory(input.previousMemory);
  memory = collectInterventionMemory(memory, input);
  memory = collectReflectionMemory(memory, input);
  memory = collectGoalMemory(memory, input);
  memory = collectBreakthroughMemory(memory, input);
  return memory;
}

// services/mediatorEngine/memory/updateSessionMemory.ts
function updateSessionMemory(input) {
  try {
    return buildSessionMemoryUpdate(input);
  } catch {
    return normalizeMemory(input.previousMemory ?? createEmptySessionMemory());
  }
}

// services/mediatorEngine/metrics/recordMetrics.ts
function recordMetrics(input) {
  void input;
  return { recorded: false };
}

// services/mediatorEngine/priority/config/strategyInterventions.ts
var PRIORITY_STRATEGY_INTERVENTIONS = {
  build_safety: ["welcome_open", "validate", "deescalate", "pause_session", "safety_response", "reflect"],
  reduce_tension: ["deescalate", "validate", "reflect", "pause_session", "redirect_blame", "reframe"],
  validate_emotions: ["validate", "reflect", "mirror", "choice_emotion"],
  deepen_emotions: ["open_deepen", "reflect", "mirror", "choice_emotion", "invite_reflection"],
  transition_to_needs: ["choice_need", "open_deepen", "reflect", "reframe", "remind_goal"],
  increase_mutual_understanding: ["reflect", "mirror", "reframe", "open_deepen", "invite_reflection"],
  stop_escalation: ["deescalate", "redirect_blame", "pause_session", "propose_rule"],
  prepare_agreement: ["propose_rule", "confirm_agreement", "propose_future_plan", "summarize_close", "remind_goal"],
  close_topic: ["summarize_close", "confirm_agreement", "celebrate_breakthrough", "remind_goal"],
  recover_misinterpretation: ["recover_acknowledge", "reflect", "validate", "reframe"],
  hold_space: ["validate", "reflect", "pause_session"],
  consolidate_progress: ["celebrate_breakthrough", "validate", "summarize_close", "reflect", "confirm_agreement"]
};
var ALL_INTERVENTION_TYPES = [
  "welcome_open",
  "choice_emotion",
  "choice_need",
  "open_deepen",
  "validate",
  "reflect",
  "mirror",
  "reframe",
  "propose_rule",
  "propose_future_plan",
  "celebrate_breakthrough",
  "deescalate",
  "redirect_blame",
  "gentle_redirect_evasion",
  "pause_session",
  "remind_goal",
  "invite_reflection",
  "summarize_close",
  "confirm_agreement",
  "safety_response",
  "recover_acknowledge"
];
var SAFETY_INTERVENTIONS = [
  "safety_response",
  "pause_session",
  "deescalate"
];
var ESCALATION_INTERVENTIONS = [
  "deescalate",
  "pause_session",
  "validate",
  "reflect",
  "redirect_blame",
  "propose_rule"
];
var ESCALATION_FORBIDDEN = [
  "celebrate_breakthrough",
  "open_deepen",
  "choice_emotion",
  "choice_need"
];
var BLAME_LOOP_INTERVENTIONS = [
  "redirect_blame",
  "deescalate",
  "reflect",
  "reframe",
  "propose_rule"
];
var BREAKTHROUGH_INTERVENTIONS = [
  "celebrate_breakthrough",
  "validate",
  "reflect",
  "summarize_close",
  "confirm_agreement"
];
var EXHAUSTION_INTERVENTIONS = [
  "pause_session",
  "validate",
  "reflect",
  "invite_reflection"
];
function primaryInterventionForStrategy(strategy) {
  return PRIORITY_STRATEGY_INTERVENTIONS[strategy][0] ?? "reflect";
}
function allowedInterventionsForStrategy(strategy) {
  return [...PRIORITY_STRATEGY_INTERVENTIONS[strategy] ?? ["reflect"]];
}

// services/mediatorEngine/priority/config/priorityRanks.ts
var PRIORITY_RANKS = {
  safety: 0,
  escalation: 1,
  recovery: 2,
  blame_loop: 3,
  breakthrough: 4,
  exhaustion: 5,
  stuck: 5,
  readiness: 6,
  evasion: 6,
  default_strategy: 7
};
var ESCALATION_LEVEL_THRESHOLD = 1;
var BLAME_LOOP_COUNT_THRESHOLD = 1;
var READINESS_CONFIDENCE_THRESHOLD = 70;

// services/mediatorEngine/priority/lib/confidence.ts
var TIMESTAMP = "1970-01-01T00:00:00.000Z";
function activeSignalConfidence(confidence, evidence = []) {
  return {
    value: true,
    confidence,
    source: "heuristic",
    evidence,
    assessedAt: TIMESTAMP,
    stale: false
  };
}
function readConfidenceScore(field, fallback = 0) {
  if (!field || typeof field !== "object") return fallback;
  return typeof field.confidence === "number" ? field.confidence : fallback;
}
function readConfidenceBoolean(field, fallback = false) {
  if (!field || typeof field !== "object") return fallback;
  return typeof field.value === "boolean" ? field.value : fallback;
}

// services/mediatorEngine/priority/signals/collectDefaultStrategySignal.ts
var collectDefaultStrategySignal = {
  type: "default_strategy",
  collect(ctx) {
    const strategy = ctx.input.strategy?.primaryStrategy ?? "build_safety";
    const confidence = ctx.input.strategy?.confidence ?? 50;
    return {
      type: "default_strategy",
      priority: PRIORITY_RANKS.default_strategy,
      confidence: activeSignalConfidence(confidence),
      reason: `Default strategy fallback (${strategy})`,
      recommendedInterventionType: primaryInterventionForStrategy(strategy)
    };
  }
};

// services/mediatorEngine/priority/resolve/buildPriorityOutput.ts
function intersectAllowed(base, allowed) {
  const allowedSet = new Set(allowed);
  const intersection = base.filter((type) => allowedSet.has(type));
  return intersection.length > 0 ? intersection : [...allowed];
}
function ensureDisjointConstraints(allowed, forbidden) {
  const forbiddenSet = new Set(forbidden);
  return {
    allowedInterventionTypes: allowed.filter((type) => !forbiddenSet.has(type)),
    forbiddenInterventionTypes: forbidden
  };
}
function computeForbidden(allowed) {
  const allowedSet = new Set(allowed);
  return ALL_INTERVENTION_TYPES.filter((type) => !allowedSet.has(type));
}
function conversationModeForSignal(type) {
  switch (type) {
    case "safety":
      return "SAFETY";
    case "escalation":
      return "DE_ESCALATING";
    case "blame_loop":
      return "REDIRECTING";
    case "breakthrough":
      return "BREAKTHROUGH";
    default:
      return "NORMAL";
  }
}
function blocksGoalTransition(top, input) {
  if (input.safety?.blockGoalTransitions) return true;
  switch (top.type) {
    case "safety":
    case "escalation":
    case "recovery":
    case "blame_loop":
    case "exhaustion":
      return true;
    case "breakthrough":
    case "readiness":
    case "default_strategy":
      return false;
    default:
      return false;
  }
}
function resolveAllowedInterventions(top, input) {
  const strategyAllowed = allowedInterventionsForStrategy(
    input.strategy?.primaryStrategy ?? "build_safety"
  );
  switch (top.type) {
    case "safety": {
      const safetyAllowed = input.safety?.allowedInterventionTypes ?? [];
      if (safetyAllowed.length > 0) {
        return intersectAllowed(strategyAllowed, safetyAllowed);
      }
      return intersectAllowed(strategyAllowed, SAFETY_INTERVENTIONS);
    }
    case "escalation": {
      const escalationForbidden = new Set(ESCALATION_FORBIDDEN);
      return [.../* @__PURE__ */ new Set([...ESCALATION_INTERVENTIONS, ...strategyAllowed])].filter(
        (type) => !escalationForbidden.has(type)
      );
    }
    case "recovery":
      return [.../* @__PURE__ */ new Set(["recover_acknowledge", "reflect", "validate", "reframe", ...strategyAllowed])];
    case "blame_loop":
      return [.../* @__PURE__ */ new Set([...BLAME_LOOP_INTERVENTIONS, ...strategyAllowed])];
    case "breakthrough":
      return intersectAllowed(strategyAllowed, BREAKTHROUGH_INTERVENTIONS);
    case "exhaustion":
      return intersectAllowed(strategyAllowed, EXHAUSTION_INTERVENTIONS);
    default:
      return strategyAllowed;
  }
}
function resolveForbiddenInterventions(top, allowed, input) {
  const forbidden = computeForbidden(allowed);
  if (top.type === "escalation") {
    return [.../* @__PURE__ */ new Set([...forbidden, ...ESCALATION_FORBIDDEN])];
  }
  if (top.type === "safety" && input.safety?.blockStandardInterventions) {
    return ALL_INTERVENTION_TYPES.filter(
      (type) => !SAFETY_INTERVENTIONS.includes(type) && !allowed.includes(type)
    );
  }
  return forbidden;
}
function buildPriorityOutput(signals, input) {
  const resolvedSignals = signals.length > 0 ? signals : (() => {
    const fallback = collectDefaultStrategySignal.collect({ input });
    return fallback ? [fallback] : [];
  })();
  const activeSignals = resolvedSignals.map((signal) => ({
    type: signal.type,
    priority: signal.priority,
    confidence: signal.confidence,
    reason: signal.reason,
    recommendedInterventionType: signal.recommendedInterventionType
  }));
  const top = resolvedSignals[0] ?? {
    type: "default_strategy",
    priority: 7,
    confidence: activeSignalConfidence(50),
    reason: "Empty fallback",
    recommendedInterventionType: "reflect"
  };
  const rawAllowed = resolveAllowedInterventions(top, input);
  const rawForbidden = resolveForbiddenInterventions(top, rawAllowed, input);
  const { allowedInterventionTypes, forbiddenInterventionTypes } = ensureDisjointConstraints(
    rawAllowed,
    rawForbidden
  );
  return {
    activeSignals,
    conversationMode: conversationModeForSignal(top.type),
    allowedInterventionTypes,
    forbiddenInterventionTypes,
    preemptsGoalTransition: blocksGoalTransition(top, input),
    recommendedInterventionType: top.recommendedInterventionType
  };
}
var MINIMAL_SAFE_ALLOWED = ["reflect", "validate", "deescalate"];
function createMinimalSafePriorityOutput(input) {
  const recommended = input.strategy?.primaryStrategy === "build_safety" ? "welcome_open" : "reflect";
  const allowedInterventionTypes = [...MINIMAL_SAFE_ALLOWED];
  const allowedSet = new Set(allowedInterventionTypes);
  return {
    activeSignals: [
      {
        type: "default_strategy",
        priority: 7,
        confidence: activeSignalConfidence(50),
        reason: "Minimal safe fallback",
        recommendedInterventionType: recommended
      }
    ],
    conversationMode: "NORMAL",
    allowedInterventionTypes,
    forbiddenInterventionTypes: ALL_INTERVENTION_TYPES.filter((type) => !allowedSet.has(type)),
    preemptsGoalTransition: false,
    recommendedInterventionType: recommended
  };
}

// services/mediatorEngine/priority/lib/safeState.ts
function getDynamics(state) {
  if (!state || typeof state !== "object") return null;
  const dynamics = state.dynamics;
  if (!dynamics || typeof dynamics !== "object") return null;
  return dynamics;
}
function getLoad(state) {
  if (!state || typeof state !== "object") return null;
  const load = state.load;
  if (!load || typeof load !== "object") return null;
  return load;
}
function getRecovery(state) {
  if (!state || typeof state !== "object") return null;
  const recovery = state.recovery;
  if (!recovery || typeof recovery !== "object") return null;
  return recovery;
}
function getEscalationLevel(state) {
  const dynamics = getDynamics(state);
  return typeof dynamics?.escalationLevel === "number" ? dynamics.escalationLevel : 0;
}
function isEscalationDetected(state) {
  return getDynamics(state)?.escalationDetected === true;
}
function getBlameLoopMetrics(state) {
  const dynamics = getDynamics(state);
  return {
    detected: dynamics?.blameLoopDetected === true,
    count: typeof dynamics?.blameLoopCount === "number" ? dynamics.blameLoopCount : 0
  };
}
function isBreakthroughDetected(state) {
  return getDynamics(state)?.breakthroughDetected === true;
}

// services/mediatorEngine/priority/signals/collectBlameLoopSignal.ts
var collectBlameLoopSignal = {
  type: "blame_loop",
  collect(ctx) {
    const { detected, count } = getBlameLoopMetrics(ctx.input.state);
    if (!detected && count < BLAME_LOOP_COUNT_THRESHOLD) return null;
    return {
      type: "blame_loop",
      priority: PRIORITY_RANKS.blame_loop,
      confidence: activeSignalConfidence(75 + Math.min(count * 5, 20)),
      reason: `Blame loop detected (count ${count})`,
      recommendedInterventionType: BLAME_LOOP_INTERVENTIONS[0]
    };
  }
};

// services/mediatorEngine/priority/signals/collectBreakthroughSignal.ts
var collectBreakthroughSignal = {
  type: "breakthrough",
  collect(ctx) {
    if (!isBreakthroughDetected(ctx.input.state)) return null;
    const strategy = ctx.input.strategy?.primaryStrategy;
    const recommended = strategy === "consolidate_progress" ? "celebrate_breakthrough" : BREAKTHROUGH_INTERVENTIONS[0];
    return {
      type: "breakthrough",
      priority: PRIORITY_RANKS.breakthrough,
      confidence: activeSignalConfidence(80),
      reason: "Breakthrough detected in conversation dynamics",
      recommendedInterventionType: recommended
    };
  }
};

// services/mediatorEngine/priority/signals/collectEscalationSignal.ts
var collectEscalationSignal = {
  type: "escalation",
  collect(ctx) {
    const { state, reflection } = ctx.input;
    const level = getEscalationLevel(state);
    const detected = isEscalationDetected(state) || level >= ESCALATION_LEVEL_THRESHOLD;
    const stuckRisk = reflection?.stuckRisk?.value === true;
    if (!detected && !stuckRisk) return null;
    const confidence = Math.max(
      detected ? 70 + Math.min(level * 10, 25) : 0,
      reflection?.stuckRisk?.confidence ?? 0
    );
    return {
      type: "escalation",
      priority: PRIORITY_RANKS.escalation,
      confidence: activeSignalConfidence(confidence),
      reason: detected ? `Escalation detected (level ${level})` : "Reflection reports stuck conversation risk",
      recommendedInterventionType: ESCALATION_INTERVENTIONS[0]
    };
  }
};

// services/mediatorEngine/priority/signals/collectExhaustionSignal.ts
var collectExhaustionSignal = {
  type: "exhaustion",
  collect(ctx) {
    const load = getLoad(ctx.input.state);
    const reflectionLoad = ctx.input.reflection?.loadRecommendation?.acknowledgeLoad === true;
    const exhausted = readConfidenceBoolean(load?.exhaustionDetected, false);
    const disengaged = readConfidenceBoolean(load?.disengagementRisk, false);
    if (!exhausted && !disengaged && !reflectionLoad) return null;
    const confidence = Math.max(
      readConfidenceScore(load?.exhaustionDetected, 0),
      readConfidenceScore(load?.disengagementRisk, 0),
      reflectionLoad ? 70 : 0
    );
    return {
      type: "exhaustion",
      priority: PRIORITY_RANKS.exhaustion,
      confidence: activeSignalConfidence(confidence),
      reason: exhausted ? "Emotional exhaustion detected" : disengaged ? "Disengagement risk detected" : "Reflection recommends acknowledging load",
      recommendedInterventionType: EXHAUSTION_INTERVENTIONS[0]
    };
  }
};

// services/mediatorEngine/priority/signals/collectReadinessSignal.ts
var collectReadinessSignal = {
  type: "readiness",
  collect(ctx) {
    const { reflection, strategy } = ctx.input;
    if (!reflection) return null;
    const hostReady = readConfidenceBoolean(reflection.partnerReadiness?.host?.readyToAdvance, false);
    const partnerReady = readConfidenceBoolean(
      reflection.partnerReadiness?.partner?.readyToAdvance,
      false
    );
    const movedForward = readConfidenceBoolean(reflection.conversationMovedForward, false);
    const hostConfidence = readConfidenceScore(reflection.partnerReadiness?.host?.readyToAdvance, 0);
    const partnerConfidence = readConfidenceScore(
      reflection.partnerReadiness?.partner?.readyToAdvance,
      0
    );
    const progressConfidence = Math.max(hostConfidence, partnerConfidence);
    const ready = hostReady && partnerReady && progressConfidence >= READINESS_CONFIDENCE_THRESHOLD || movedForward && readConfidenceScore(reflection.conversationMovedForward, 0) >= READINESS_CONFIDENCE_THRESHOLD;
    if (!ready) return null;
    return {
      type: "readiness",
      priority: PRIORITY_RANKS.readiness,
      confidence: activeSignalConfidence(Math.max(progressConfidence, 70)),
      reason: hostReady && partnerReady ? "Both partners ready to advance" : "Conversation moved forward with confidence",
      recommendedInterventionType: primaryInterventionForStrategy(strategy.primaryStrategy)
    };
  }
};

// services/mediatorEngine/priority/signals/collectRecoverySignal.ts
var collectRecoverySignal = {
  type: "recovery",
  collect(ctx) {
    const recovery = getRecovery(ctx.input.state);
    if (!recovery?.active) return null;
    return {
      type: "recovery",
      priority: PRIORITY_RANKS.recovery,
      confidence: activeSignalConfidence(recovery.confidence, [recovery.triggerQuote]),
      reason: `Recovery active (${recovery.trigger})`,
      recommendedInterventionType: "recover_acknowledge"
    };
  }
};

// services/mediatorEngine/priority/signals/collectSafetySignal.ts
var collectSafetySignal = {
  type: "safety",
  collect(ctx) {
    const safety = ctx.input.safety;
    if (!safety) return null;
    const active = safety.preempted || safety.level !== "none" || safety.signals.length > 0 || safety.assessed?.value === true;
    if (!active) return null;
    const confidence = Math.max(
      readConfidenceScore(safety.assessed, 80),
      ...safety.signals.map((signal) => signal.confidence),
      safety.level === "L3_stop" ? 95 : safety.level === "L2_pause" ? 85 : 70
    );
    const recommended = safety.recommendedInterventionType && SAFETY_INTERVENTIONS.includes(safety.recommendedInterventionType) ? safety.recommendedInterventionType : "safety_response";
    return {
      type: "safety",
      priority: PRIORITY_RANKS.safety,
      confidence: activeSignalConfidence(confidence, safety.signals.map((s) => s.evidenceRef)),
      reason: safety.preempted ? "Safety layer preempted standard pipeline" : `Safety level ${safety.level}`,
      recommendedInterventionType: recommended
    };
  }
};

// services/mediatorEngine/priority/signals/index.ts
var PRIORITY_SIGNAL_COLLECTORS = [
  collectSafetySignal,
  collectEscalationSignal,
  collectRecoverySignal,
  collectBlameLoopSignal,
  collectBreakthroughSignal,
  collectExhaustionSignal,
  collectReadinessSignal,
  collectDefaultStrategySignal
];
function collectPrioritySignals(ctx) {
  const signals = [];
  for (const collector of PRIORITY_SIGNAL_COLLECTORS) {
    try {
      const draft = collector.collect(ctx);
      if (draft) signals.push(draft);
    } catch {
    }
  }
  return signals.sort((a, b) => a.priority - b.priority);
}

// services/mediatorEngine/priority/resolvePriority.ts
function resolvePriority(input) {
  try {
    const signals = collectPrioritySignals({ input });
    return buildPriorityOutput(signals, input);
  } catch {
    try {
      return buildPriorityOutput([], input);
    } catch {
      return createMinimalSafePriorityOutput(input);
    }
  }
}

// services/mediatorEngine/reflection/config/reflectionThresholds.ts
var REFLECTION_THRESHOLDS = {
  /** Minimum confidence when structural signals fully align. */
  highConfidence: 85,
  /** Confidence when structural signals partially align. */
  mediumConfidence: 65,
  /** Confidence when structural signals contradict expectations. */
  lowConfidence: 40,
  /** Turns after which an expected effect is considered stale. */
  expectedEffectStaleTurns: 2,
  /** Blame loop count treated as active for readiness blocking. */
  blameLoopActiveCount: 1,
  /** Escalation level treated as active for readiness blocking. */
  escalationActiveLevel: 1,
  /** Load score at or above which participants are considered exhausted. */
  loadExhaustionThreshold: 80
};

// services/mediatorEngine/reflection/lib/confidence.ts
function reflectionConfidence(value, confidence, evidence = []) {
  return {
    value,
    confidence,
    source: "heuristic",
    evidence,
    assessedAt: (/* @__PURE__ */ new Date()).toISOString(),
    stale: false
  };
}
function confidenceFromRatio(met, total) {
  if (total <= 0) return 0;
  const ratio = met / total;
  if (ratio >= 1) return 85;
  if (ratio >= 0.5) return 65;
  if (ratio > 0) return 50;
  return 40;
}

// services/mediatorEngine/reflection/evaluate/evaluateConversationProgress.ts
function evaluateConversationProgress(ctx) {
  const { transcriptMeta, turnAdvanced } = ctx;
  const hasNewNonEmptyMessages = transcriptMeta.nonEmptyMessageCount > 0;
  const moved = turnAdvanced && hasNewNonEmptyMessages;
  const evidence = [];
  if (turnAdvanced) evidence.push("turn-advanced");
  if (transcriptMeta.messageCount > 0) evidence.push(`messages:${transcriptMeta.messageCount}`);
  if (transcriptMeta.nonEmptyMessageCount > 0) {
    evidence.push(`non-empty:${transcriptMeta.nonEmptyMessageCount}`);
  }
  if (transcriptMeta.emptyMessageCount > 0 && transcriptMeta.nonEmptyMessageCount === 0) {
    evidence.push("empty-only");
  }
  const confidence = moved ? REFLECTION_THRESHOLDS.highConfidence : transcriptMeta.messageCount === 0 ? REFLECTION_THRESHOLDS.highConfidence : REFLECTION_THRESHOLDS.mediumConfidence;
  return {
    conversationMovedForward: reflectionConfidence(moved, confidence, evidence)
  };
}
function evaluateLastInterventionHelpful(ctx) {
  const { lastCompliance, safetyLevel, stateAfter } = ctx;
  const safetyEscalation = safetyLevel !== "none" || stateAfter.dynamics?.mode === "SAFETY";
  if (safetyEscalation) {
    return reflectionConfidence(false, REFLECTION_THRESHOLDS.highConfidence, [
      "safety-escalation"
    ]);
  }
  if (lastCompliance) {
    const blocked = !lastCompliance.compliant || lastCompliance.blockingViolationCount > 0;
    if (blocked) {
      return reflectionConfidence(false, REFLECTION_THRESHOLDS.highConfidence, [
        "non-compliant",
        `violations:${lastCompliance.violationCount}`
      ]);
    }
    return reflectionConfidence(true, REFLECTION_THRESHOLDS.highConfidence, ["compliant"]);
  }
  return reflectionConfidence(true, REFLECTION_THRESHOLDS.mediumConfidence, [
    "compliance-unknown-default-helpful"
  ]);
}

// services/mediatorEngine/reflection/evaluate/evaluateExpectedEffect.ts
var STRUCTURAL_SIGNAL_CHECKS = {
  participant_response: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  engagement: (ctx) => ctx.transcriptMeta.hasHostMessage && ctx.transcriptMeta.hasPartnerMessage,
  calm_tone: (ctx) => !ctx.stateAfter.dynamics?.escalationDetected,
  calmer_tone: (ctx) => {
    const before = ctx.stateBefore.dynamics?.escalationLevel ?? 0;
    const after = ctx.stateAfter.dynamics?.escalationLevel ?? 0;
    return after <= before;
  },
  acknowledgment: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  confirmation: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  recognition: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  emotion_named: (ctx) => !!ctx.stateAfter.participants?.host?.namedEmotion || !!ctx.stateAfter.participants?.partner?.namedEmotion,
  need_named: (ctx) => !!ctx.stateAfter.participants?.host?.namedNeed || !!ctx.stateAfter.participants?.partner?.namedNeed,
  deeper_share: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  perspective_shift: (ctx) => ctx.stateAfter.dynamics?.mutualUnderstandingScore > (ctx.stateBefore.dynamics?.mutualUnderstandingScore ?? 0),
  rule_discussion: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  plan_discussion: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  mutual_acknowledgment: (ctx) => ctx.transcriptMeta.hasHostMessage && ctx.transcriptMeta.hasPartnerMessage,
  lower_intensity: (ctx) => {
    const before = ctx.stateBefore.dynamics?.escalationLevel ?? 0;
    const after = ctx.stateAfter.dynamics?.escalationLevel ?? 0;
    return after < before;
  },
  less_blame: (ctx) => !ctx.stateAfter.dynamics?.blameLoopDetected,
  self_focus: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  return_to_topic: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  pause_accepted: (ctx) => (ctx.stateAfter.dynamics?.pauseAcceptedBy?.length ?? 0) > 0,
  goal_recall: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  reflection_engagement: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  closure_signal: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  agreement_signal: (ctx) => ctx.stateAfter.agreements?.acceptedByBoth === true,
  safety_acknowledgment: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  trust_restored: (ctx) => ctx.stateAfter.recovery !== null,
  tone_shift: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0
};
function checkSignal(signal, ctx) {
  const checker = STRUCTURAL_SIGNAL_CHECKS[signal];
  if (checker) return checker(ctx);
  return ctx.transcriptMeta.nonEmptyMessageCount > 0;
}
function evaluateExpectedEffect(ctx) {
  const effect = ctx.expectedEffect;
  if (!effect) return null;
  const signals = Array.isArray(effect.observableSignals) ? effect.observableSignals : [];
  if (signals.length === 0) {
    return {
      effectId: effect.id,
      achieved: false,
      confidence: REFLECTION_THRESHOLDS.lowConfidence,
      evidence: ["no-signals-defined"],
      partial: false
    };
  }
  const metSignals = [];
  const unmetSignals = [];
  for (const signal of signals) {
    if (typeof signal !== "string") continue;
    if (checkSignal(signal, ctx)) {
      metSignals.push(signal);
    } else {
      unmetSignals.push(signal);
    }
  }
  const achieved = metSignals.length === signals.length;
  const partial = metSignals.length > 0 && !achieved;
  const confidence = confidenceFromRatio(metSignals.length, signals.length);
  const evidence = metSignals.map((s) => `signal:${s}`);
  if (unmetSignals.length > 0) {
    evidence.push(`unmet:${unmetSignals.join(",")}`);
  }
  return {
    effectId: effect.id,
    achieved,
    confidence,
    evidence,
    partial
  };
}
function isExpectedEffectStale(ctx) {
  const meta = ctx.stateAfter.lastInterventionMeta;
  if (!meta || typeof meta.turnNumber !== "number") return false;
  const elapsed = ctx.turnNumber - meta.turnNumber;
  const horizon = meta.expectedEffect?.timeHorizon ?? 1;
  return elapsed > horizon + REFLECTION_THRESHOLDS.expectedEffectStaleTurns - 1;
}
function hasRepeatedIneffectivePattern(ctx) {
  if (ctx.recentIneffectiveTypes.includes(ctx.lastInterventionType)) return true;
  const prev = ctx.previousReflection;
  if (prev?.lastInterventionHelpful?.value === false && prev.shouldChangeStrategy === true) {
    return true;
  }
  return false;
}

// services/mediatorEngine/reflection/evaluate/evaluateReadiness.ts
function isEscalationActive(ctx) {
  return ctx.stateAfter.dynamics?.escalationDetected === true || (ctx.stateAfter.dynamics?.escalationLevel ?? 0) >= REFLECTION_THRESHOLDS.escalationActiveLevel;
}
function isBlameLoopActive(ctx) {
  return ctx.stateAfter.dynamics?.blameLoopDetected === true || (ctx.stateAfter.dynamics?.blameLoopCount ?? 0) >= REFLECTION_THRESHOLDS.blameLoopActiveCount;
}
function isLoadExhausted(ctx) {
  const hostLoad = ctx.stateAfter.load?.host?.value ?? 0;
  const partnerLoad = ctx.stateAfter.load?.partner?.value ?? 0;
  const exhaustion = ctx.stateAfter.load?.exhaustionDetected?.value === true;
  return exhaustion || hostLoad >= REFLECTION_THRESHOLDS.loadExhaustionThreshold || partnerLoad >= REFLECTION_THRESHOLDS.loadExhaustionThreshold;
}
function evaluateParticipantReadiness(ctx, conversationMovedForward, role) {
  const signals = [];
  const escalation = isEscalationActive(ctx);
  const blameLoop = isBlameLoopActive(ctx);
  const loadExhausted = isLoadExhausted(ctx);
  if (conversationMovedForward) signals.push("conversation-moved");
  if (escalation) signals.push("escalation-active");
  if (blameLoop) signals.push("blame-loop-active");
  if (loadExhausted) signals.push("load-exhausted");
  const ready = conversationMovedForward && !escalation && !blameLoop && !loadExhausted;
  const needsMoreTime = !ready;
  const needsDifferentApproach = blameLoop || escalation || loadExhausted;
  const confidence = ready ? REFLECTION_THRESHOLDS.highConfidence : needsDifferentApproach ? REFLECTION_THRESHOLDS.highConfidence : REFLECTION_THRESHOLDS.mediumConfidence;
  return {
    readyToAdvance: reflectionConfidence(ready, confidence, [`${role}:${ready ? "ready" : "not-ready"}`]),
    needsMoreTime: reflectionConfidence(needsMoreTime, confidence, signals),
    needsDifferentApproach: reflectionConfidence(
      needsDifferentApproach,
      confidence,
      needsDifferentApproach ? signals : []
    ),
    signals
  };
}
function evaluateReadiness(ctx, conversationMovedForward) {
  return {
    host: evaluateParticipantReadiness(ctx, conversationMovedForward, "host"),
    partner: evaluateParticipantReadiness(ctx, conversationMovedForward, "partner")
  };
}

// services/mediatorEngine/reflection/evaluate/evaluateStrategyShift.ts
function evaluateShouldChangeStrategy(input) {
  const { ctx, lastInterventionHelpful, conversationMovedForward, expectedEffectEvaluation } = input;
  if (!lastInterventionHelpful) return true;
  if (!conversationMovedForward) return true;
  if (isExpectedEffectStale(ctx)) return true;
  if (hasRepeatedIneffectivePattern(ctx)) return true;
  if (ctx.stateAfter.dynamics?.blameLoopDetected === true) return true;
  if (ctx.stateAfter.dynamics?.escalationDetected === true) return true;
  if (expectedEffectEvaluation?.achieved === false && expectedEffectEvaluation.partial === false) {
    return true;
  }
  return false;
}
function evaluateRecommendedStrategyShift(ctx, shouldChangeStrategy, lastInterventionHelpful) {
  const safetyActive = ctx.safetyLevel !== "none" || ctx.stateAfter.dynamics?.mode === "SAFETY";
  if (safetyActive) return "pause";
  if (ctx.stateAfter.dynamics?.breakthroughDetected === true) return "consolidate";
  if (ctx.stateAfter.recovery !== null) return "recover";
  const escalation = ctx.stateAfter.dynamics?.escalationDetected === true || (ctx.stateAfter.dynamics?.escalationLevel ?? 0) > 0;
  const blameLoop = ctx.stateAfter.dynamics?.blameLoopDetected === true;
  if (blameLoop || escalation && shouldChangeStrategy) return "deescalate";
  const loadExhausted = ctx.stateAfter.load?.exhaustionDetected?.value === true;
  if (loadExhausted) return "slow_down";
  if (!lastInterventionHelpful && shouldChangeStrategy) return "recover";
  if (!shouldChangeStrategy) return "continue";
  if (!lastInterventionHelpful) return "recover";
  return "slow_down";
}
function evaluateStrategyShift(input) {
  const shouldChangeStrategy = evaluateShouldChangeStrategy(input);
  const recommendedStrategyShift = evaluateRecommendedStrategyShift(
    input.ctx,
    shouldChangeStrategy,
    input.lastInterventionHelpful
  );
  return { shouldChangeStrategy, recommendedStrategyShift };
}

// services/mediatorEngine/reflection/evaluate/buildReflectionOutput.ts
function buildRiskFlags(ctx, shouldChangeStrategy, conversationMovedForward) {
  const repeatRisk = ctx.recentIneffectiveTypes.includes(ctx.lastInterventionType);
  const stuckRisk = !conversationMovedForward && shouldChangeStrategy;
  const drillDownRisk = ctx.stateAfter.dynamics?.blameLoopDetected === true || (ctx.stateAfter.dynamics?.escalationLevel ?? 0) > 2;
  return {
    repeatRisk: reflectionConfidence(
      repeatRisk,
      repeatRisk ? REFLECTION_THRESHOLDS.highConfidence : REFLECTION_THRESHOLDS.mediumConfidence,
      repeatRisk ? ["repeated-ineffective-type"] : []
    ),
    stuckRisk: reflectionConfidence(
      stuckRisk,
      stuckRisk ? REFLECTION_THRESHOLDS.highConfidence : REFLECTION_THRESHOLDS.mediumConfidence,
      stuckRisk ? ["stuck-no-progress"] : []
    ),
    drillDownRisk: reflectionConfidence(
      drillDownRisk,
      drillDownRisk ? REFLECTION_THRESHOLDS.highConfidence : REFLECTION_THRESHOLDS.lowConfidence,
      drillDownRisk ? ["high-escalation-or-blame"] : []
    )
  };
}
function buildReflectionNotes(shouldChangeStrategy, recommendedShift, movedForward, helpful) {
  const parts = [];
  parts.push(`helpful=${helpful}`);
  parts.push(`moved=${movedForward}`);
  if (shouldChangeStrategy) parts.push(`shift=${recommendedShift}`);
  return parts.join("; ");
}
function buildReflectionOutput(ctx) {
  const base = createEmptyReflectionOutput();
  const progress = evaluateConversationProgress(ctx);
  const lastInterventionHelpful = evaluateLastInterventionHelpful(ctx);
  const conversationMovedForward = progress.conversationMovedForward;
  const expectedEffectEvaluation = evaluateExpectedEffect(ctx);
  const partnerReadiness = evaluateReadiness(ctx, conversationMovedForward.value);
  const strategy = evaluateStrategyShift({
    ctx,
    lastInterventionHelpful: lastInterventionHelpful.value,
    conversationMovedForward: conversationMovedForward.value,
    expectedEffectEvaluation
  });
  const risks = buildRiskFlags(
    ctx,
    strategy.shouldChangeStrategy,
    conversationMovedForward.value
  );
  const bothReady = partnerReadiness.host.readyToAdvance.value && partnerReadiness.partner.readyToAdvance.value;
  return {
    ...base,
    understoodPartners: reflectionConfidence(
      bothReady,
      bothReady ? REFLECTION_THRESHOLDS.highConfidence : REFLECTION_THRESHOLDS.mediumConfidence,
      bothReady ? ["both-ready"] : ["readiness-pending"]
    ),
    lastInterventionHelpful,
    conversationMovedForward,
    shouldChangeStrategy: strategy.shouldChangeStrategy,
    repeatRisk: risks.repeatRisk,
    drillDownRisk: risks.drillDownRisk,
    stuckRisk: risks.stuckRisk,
    recommendedStrategyShift: strategy.recommendedStrategyShift,
    reflectionNotes: buildReflectionNotes(
      strategy.shouldChangeStrategy,
      strategy.recommendedStrategyShift,
      conversationMovedForward.value,
      lastInterventionHelpful.value
    ),
    expectedEffectEvaluation,
    partnerReadiness,
    strategyRecommendation: {
      preferStrategyChange: strategy.shouldChangeStrategy,
      suggestedStrategy: strategy.shouldChangeStrategy ? ctx.stateAfter.activeStrategy?.primary ?? null : null,
      reason: strategy.shouldChangeStrategy ? `L1 shift: ${strategy.recommendedStrategyShift}` : "",
      confidence: strategy.shouldChangeStrategy ? REFLECTION_THRESHOLDS.highConfidence : REFLECTION_THRESHOLDS.mediumConfidence
    },
    paceRecommendation: {
      suggestedPace: strategy.recommendedStrategyShift === "slow_down" || strategy.recommendedStrategyShift === "pause" ? "slow" : strategy.recommendedStrategyShift === "consolidate" ? "normal" : null,
      reason: strategy.recommendedStrategyShift === "slow_down" ? "load-or-stall-detected" : strategy.recommendedStrategyShift === "pause" ? "safety-active" : ""
    },
    loadRecommendation: {
      acknowledgeLoad: ctx.stateAfter.load?.exhaustionDetected?.value === true,
      targetParticipant: (ctx.stateAfter.load?.host?.value ?? 0) >= (ctx.stateAfter.load?.partner?.value ?? 0) ? "host" : "partner"
    }
  };
}

// services/mediatorEngine/reflection/lib/safeReflectionInput.ts
function isEmptyMessageContent(content) {
  return typeof content !== "string" || content.trim().length === 0;
}
function safeTranscriptDelta(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => !!entry && typeof entry === "object");
}
function extractTranscriptMetadata(transcriptDelta, turnNumber) {
  const messages = safeTranscriptDelta(transcriptDelta);
  let emptyMessageCount = 0;
  let hasHostMessage = false;
  let hasPartnerMessage = false;
  const messageIds = [];
  for (const message of messages) {
    if (typeof message.id === "string" && message.id.length > 0) {
      messageIds.push(message.id);
    }
    if (isEmptyMessageContent(message.content)) {
      emptyMessageCount += 1;
    }
    if (message.authorRole === "host") hasHostMessage = true;
    if (message.authorRole === "partner") hasPartnerMessage = true;
  }
  const messageCount = messages.length;
  return {
    turnNumber,
    messageCount,
    emptyMessageCount,
    nonEmptyMessageCount: messageCount - emptyMessageCount,
    hasHostMessage,
    hasPartnerMessage,
    messageIds
  };
}
function normalizeState(value) {
  if (!value || typeof value !== "object") {
    return createEmptyMediationState({
      mediationId: "reflection-fallback",
      sessionId: "reflection-fallback",
      trigger: "partner_message",
      turnNumber: 1,
      mediationState: null,
      transcriptDelta: [],
      engineVersion: "v2.3"
    });
  }
  return value;
}
function normalizeTurnNumber2(input) {
  if (typeof input.turnNumber === "number" && input.turnNumber > 0) {
    return input.turnNumber;
  }
  const afterTurn = input.stateAfter?.meta?.currentTurnNumber;
  if (typeof afterTurn === "number" && afterTurn > 0) return afterTurn;
  return 1;
}
function normalizeSafetyLevel(input, stateAfter) {
  if (input.safetyLevel === "L1_gentle" || input.safetyLevel === "L2_pause" || input.safetyLevel === "L3_stop") {
    return input.safetyLevel;
  }
  if (stateAfter.dynamics?.mode === "SAFETY") return "L2_pause";
  return "none";
}
function normalizeInterventionType(input) {
  const type = input.lastIntervention?.type;
  if (typeof type === "string" && type.length > 0) return type;
  return "welcome_open";
}
function normalizeExpectedEffect(stateAfter) {
  const effect = stateAfter.lastInterventionMeta?.expectedEffect;
  if (!effect || typeof effect !== "object") return null;
  if (typeof effect.id !== "string") return null;
  return effect;
}
function safeReflectionInput(input) {
  const raw = input && typeof input === "object" ? input : {};
  const stateBefore = normalizeState(raw.stateBefore);
  const stateAfter = normalizeState(raw.stateAfter);
  const turnNumber = normalizeTurnNumber2(raw);
  const transcriptMeta = extractTranscriptMetadata(raw.transcriptDelta, turnNumber);
  const beforeTurn = typeof stateBefore.meta?.currentTurnNumber === "number" ? stateBefore.meta.currentTurnNumber : 0;
  const afterTurn = typeof stateAfter.meta?.currentTurnNumber === "number" ? stateAfter.meta.currentTurnNumber : turnNumber;
  return {
    turnNumber,
    stateBefore,
    stateAfter,
    lastInterventionType: normalizeInterventionType(raw),
    transcriptMeta,
    turnAdvanced: afterTurn > beforeTurn,
    previousReflection: raw.previousReflection ?? null,
    lastCompliance: raw.lastComplianceResult ?? null,
    safetyLevel: normalizeSafetyLevel(raw, stateAfter),
    recentIneffectiveTypes: Array.isArray(raw.recentIneffectiveTypes) ? raw.recentIneffectiveTypes.filter((t) => typeof t === "string") : [],
    expectedEffect: normalizeExpectedEffect(stateAfter)
  };
}

// services/mediatorEngine/reflection/runReflection.ts
function runReflection(input) {
  try {
    const ctx = safeReflectionInput(input);
    return buildReflectionOutput(ctx);
  } catch {
    return createEmptyReflectionOutput();
  }
}

// services/mediatorEngine/safety/config/safetyLevels.ts
var SAFETY_LEVEL_RANK = {
  none: 0,
  L1_gentle: 1,
  L2_pause: 2,
  L3_stop: 3
};
var SAFETY_LEVEL_POLICIES = {
  L3_stop: {
    preempted: true,
    blockGoalTransitions: true,
    blockStandardInterventions: true,
    recommendedInterventionType: "safety_response",
    allowedInterventionTypes: ["safety_response", "pause_session"]
  },
  L2_pause: {
    preempted: true,
    blockGoalTransitions: true,
    blockStandardInterventions: true,
    recommendedInterventionType: "pause_session",
    allowedInterventionTypes: ["pause_session", "safety_response", "deescalate"]
  },
  L1_gentle: {
    preempted: false,
    blockGoalTransitions: true,
    blockStandardInterventions: false,
    recommendedInterventionType: "deescalate",
    allowedInterventionTypes: ["deescalate", "validate", "reflect", "pause_session"]
  }
};
function maxSafetyLevel(levels) {
  if (levels.length === 0) return "none";
  return levels.reduce(
    (max, level) => SAFETY_LEVEL_RANK[level] > SAFETY_LEVEL_RANK[max] ? level : max
  );
}
function resolveSignalLevel(_category, patternLevel) {
  return patternLevel;
}

// services/mediatorEngine/safety/rules/detectAbuseDisclosure.ts
var ABUSE_DISCLOSURE_PATTERNS = [
  {
    id: "abuse-disclosure-001",
    category: "abuse_disclosure",
    level: "L2_pause",
    confidence: 87,
    phrases: [
      "abuses me",
      "he hits me",
      "she hits me",
      "domestic violence",
      "being abused",
      "bije mnie",
      "jestem bite",
      "przemoc domowa"
    ],
    regexSources: ["\\b(abus(e|es|ed|ing)|hit(s|ting)?)\\s+me\\b"]
  }
];

// services/mediatorEngine/safety/rules/detectChildSafety.ts
var CHILD_SAFETY_PATTERNS = [
  {
    id: "child-safety-001",
    category: "child_safety",
    level: "L3_stop",
    confidence: 94,
    phrases: [
      "child is being abused",
      "my child is being hurt",
      "hurting my child",
      "child abuse",
      "abusing my kids",
      "krzywdzi moje dziecko",
      "przemoc wobec dziecka"
    ],
    regexSources: ["\\babus(e|ing)\\s+(my\\s+)?(child|kid|children)\\b"]
  }
];

// services/mediatorEngine/safety/rules/detectCoercionControl.ts
var COERCION_CONTROL_PATTERNS = [
  {
    id: "coercion-control-001",
    category: "coercion_control",
    level: "L2_pause",
    confidence: 86,
    phrases: [
      "won't let me leave",
      "controls everything",
      "forced me to",
      "trapped in this relationship",
      "nie pozwala mi wyj\u015B\u0107",
      "kontroluje wszystko",
      "zmusi\u0142 mnie"
    ],
    regexSources: [
      "\\b(control(s|led|ling)?\\s+everything|won.?t\\s+let\\s+me\\s+leave)\\b"
    ]
  }
];

// services/mediatorEngine/safety/rules/detectImmediateDanger.ts
var IMMEDIATE_DANGER_PATTERNS = [
  {
    id: "immediate-danger-001",
    category: "immediate_danger",
    level: "L3_stop",
    confidence: 93,
    phrases: [
      "immediate danger",
      "in danger right now",
      "happening right now",
      "help me now",
      "need help now",
      "bezpo\u015Brednie zagro\u017Cenie",
      "dzieje si\u0119 teraz"
    ],
    regexSources: ["\\bemergency\\b", "\\b(help|save)\\s+me\\s+now\\b"]
  }
];

// services/mediatorEngine/safety/rules/detectSelfHarm.ts
var SELF_HARM_PATTERNS = [
  {
    id: "self-harm-001",
    category: "self_harm",
    level: "L2_pause",
    confidence: 88,
    phrases: [
      "cut myself",
      "hurt myself",
      "self harm",
      "self-harm",
      "harm myself",
      "rani\u0119 si\u0119",
      "skrzywdzi\u0107 siebie"
    ],
    regexSources: ["\\b(cut|hurt|harm)\\s+myself\\b"]
  }
];

// services/mediatorEngine/safety/rules/detectSevereDistress.ts
var SEVERE_DISTRESS_STRONG_PATTERNS = [
  {
    id: "severe-distress-strong-001",
    category: "severe_distress",
    level: "L2_pause",
    confidence: 84,
    phrases: [
      "can't go on",
      "breaking down completely",
      "falling apart completely",
      "cannot do this anymore",
      "completely overwhelmed",
      "nie dam rady",
      "ca\u0142kowicie si\u0119 rozpada"
    ],
    regexSources: ["\\b(can.?t|cannot)\\s+(go\\s+on|take\\s+(this|it|anymore))\\b"]
  }
];
var SEVERE_DISTRESS_MILD_PATTERNS = [
  {
    id: "severe-distress-mild-001",
    category: "severe_distress",
    level: "L1_gentle",
    confidence: 65,
    phrases: [
      "feel overwhelmed",
      "very upset",
      "stressed out",
      "really struggling",
      "jestem przyt\u0142oczony",
      "bardzo zdenerwowany"
    ]
  }
];
var SEVERE_DISTRESS_PATTERNS = [
  ...SEVERE_DISTRESS_STRONG_PATTERNS,
  ...SEVERE_DISTRESS_MILD_PATTERNS
];

// services/mediatorEngine/safety/rules/detectSuicide.ts
var SUICIDE_PATTERNS = [
  {
    id: "suicide-explicit-001",
    category: "suicide",
    level: "L3_stop",
    confidence: 95,
    phrases: [
      "kill myself",
      "want to die",
      "end my life",
      "commit suicide",
      "take my own life",
      "suicidal",
      "chc\u0119 si\u0119 zabi\u0107",
      "pope\u0142ni\u0119 samob\xF3jstwo"
    ],
    regexSources: ["\\bkill\\s+myself\\b", "\\bsuicid(e|al)\\b"]
  }
];

// services/mediatorEngine/safety/rules/detectViolenceThreat.ts
var VIOLENCE_THREAT_PATTERNS = [
  {
    id: "violence-threat-001",
    category: "violence_threat",
    level: "L3_stop",
    confidence: 92,
    phrases: [
      "will kill you",
      "going to kill you",
      "i will hurt you",
      "going to attack",
      "zabij\u0119 ci\u0119",
      "ci\u0119 zabij\u0119",
      "zrobi\u0119 ci krzywd\u0119"
    ],
    regexSources: [
      "\\b(will|going\\s+to|gonna)\\s+(kill|hurt|attack)\\s+(you|him|her|them)\\b"
    ]
  }
];

// services/mediatorEngine/safety/rules/index.ts
var ALL_SAFETY_PATTERNS = [
  ...SUICIDE_PATTERNS,
  ...IMMEDIATE_DANGER_PATTERNS,
  ...CHILD_SAFETY_PATTERNS,
  ...VIOLENCE_THREAT_PATTERNS,
  ...SELF_HARM_PATTERNS,
  ...ABUSE_DISCLOSURE_PATTERNS,
  ...COERCION_CONTROL_PATTERNS,
  ...SEVERE_DISTRESS_PATTERNS
];

// services/mediatorEngine/safety/lib/buildSafetyOutput.ts
function levelFromSignals(signals) {
  if (signals.length === 0) return "none";
  const patternLevelById = new Map(ALL_SAFETY_PATTERNS.map((p) => [p.id, p.level]));
  const levels = signals.map((signal) => {
    const patternLevel = patternLevelById.get(signal.matchedPatternId) ?? "L2_pause";
    return resolveSignalLevel(signal.category, patternLevel);
  });
  return maxSafetyLevel(levels);
}
function buildAssessed(level, signals) {
  const active = level !== "none";
  const maxConfidence = signals.reduce((max, s) => Math.max(max, s.confidence), 0);
  const confidence = active ? Math.max(maxConfidence, level === "L3_stop" ? 95 : level === "L2_pause" ? 85 : 70) : 0;
  return {
    ...skeletonConfidence(active),
    confidence,
    evidence: signals.map((s) => s.evidenceRef).slice(0, 3)
  };
}
function buildSafetyOutput(signals) {
  const level = levelFromSignals(signals);
  if (level === "none") {
    return {
      level: "none",
      preempted: false,
      signals: [],
      recommendedInterventionType: "welcome_open",
      blockGoalTransitions: false,
      blockStandardInterventions: false,
      allowedInterventionTypes: [],
      assessed: buildAssessed("none", [])
    };
  }
  const policy = SAFETY_LEVEL_POLICIES[level];
  return {
    level,
    preempted: policy.preempted,
    signals,
    recommendedInterventionType: policy.recommendedInterventionType,
    blockGoalTransitions: policy.blockGoalTransitions,
    blockStandardInterventions: policy.blockStandardInterventions,
    allowedInterventionTypes: [...policy.allowedInterventionTypes],
    assessed: buildAssessed(level, signals)
  };
}

// services/mediatorEngine/safety/lib/safeSafetyInput.ts
function safeTranscriptDelta2(value) {
  if (!Array.isArray(value)) return [];
  const messages = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry;
    const content = typeof record.content === "string" ? record.content : "";
    if (content.trim().length === 0) continue;
    messages.push({
      id: typeof record.id === "string" ? record.id : `msg-${messages.length + 1}`,
      content,
      turnNumber: typeof record.turnNumber === "number" && record.turnNumber > 0 ? record.turnNumber : 1,
      authorRole: typeof record.authorRole === "string" ? record.authorRole : "unknown"
    });
  }
  return messages;
}
function normalizeState2(value) {
  if (!value || typeof value !== "object") {
    return createEmptyMediationState({
      mediationId: "safety-fallback",
      sessionId: "safety-fallback",
      trigger: "partner_message",
      turnNumber: 1,
      mediationState: null,
      transcriptDelta: [],
      engineVersion: "v2.3"
    });
  }
  return value;
}
function safeSafetyInput(input) {
  const raw = input && typeof input === "object" ? input : {};
  const state = normalizeState2(raw.state);
  const turnNumber = typeof raw.turnNumber === "number" && raw.turnNumber > 0 ? raw.turnNumber : 1;
  return {
    turnNumber,
    messages: safeTranscriptDelta2(raw.transcriptDelta),
    stateSafetyMode: state.dynamics?.mode === "SAFETY"
  };
}

// services/mediatorEngine/safety/lib/matchPattern.ts
function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}
function matchSafetyPattern(content, pattern) {
  const normalized = normalizeText(content);
  for (const source of pattern.regexSources ?? []) {
    try {
      const regex = new RegExp(source, "i");
      if (regex.test(content)) {
        return { pattern, detectionLayer: "regex" };
      }
    } catch {
    }
  }
  for (const phrase of pattern.phrases) {
    if (normalized.includes(normalizeText(phrase))) {
      return { pattern, detectionLayer: "heuristic" };
    }
  }
  return null;
}

// services/mediatorEngine/safety/lib/scanTranscript.ts
function buildEvidenceRef(patternId, messageId) {
  return `${patternId}:${messageId ?? "state"}`;
}
function createSignal(match, messageId, turnNumber, detectedAt) {
  if (!match) return null;
  const { pattern, detectionLayer } = match;
  return {
    category: pattern.category,
    confidence: pattern.confidence,
    matchedPatternId: pattern.id,
    messageId,
    evidenceRef: buildEvidenceRef(pattern.id, messageId),
    detectedAt,
    turnNumber,
    detectionLayer
  };
}
function scanTranscriptMessages(messages, defaultTurnNumber) {
  const detectedAt = (/* @__PURE__ */ new Date()).toISOString();
  const signals = [];
  const seen = /* @__PURE__ */ new Set();
  for (const message of messages) {
    for (const pattern of ALL_SAFETY_PATTERNS) {
      const match = matchSafetyPattern(message.content, pattern);
      if (!match) continue;
      const dedupeKey = `${match.pattern.id}:${message.id}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const signal = createSignal(
        match,
        message.id,
        message.turnNumber ?? defaultTurnNumber,
        detectedAt
      );
      if (signal) signals.push(signal);
    }
  }
  return signals;
}
function scanStateSafetyMode(stateSafetyMode, turnNumber) {
  if (!stateSafetyMode) return [];
  const detectedAt = (/* @__PURE__ */ new Date()).toISOString();
  return [
    {
      category: "severe_distress",
      confidence: 80,
      matchedPatternId: "state-safety-mode",
      messageId: null,
      evidenceRef: "state-safety-mode:state",
      detectedAt,
      turnNumber,
      detectionLayer: "heuristic"
    }
  ];
}

// services/mediatorEngine/safety/evaluateSafety.ts
function evaluateSafety(input) {
  try {
    const ctx = safeSafetyInput(input);
    const transcriptSignals = scanTranscriptMessages(ctx.messages, ctx.turnNumber);
    const stateSignals = scanStateSafetyMode(ctx.stateSafetyMode, ctx.turnNumber);
    return buildSafetyOutput([...transcriptSignals, ...stateSignals]);
  } catch {
    return createEmptySafetyOutput();
  }
}

// services/mediatorEngine/strategy/config/strategyPriorities.ts
var STRATEGY_CONFIDENCE = {
  safety: 90,
  recovery: 88,
  escalation: 85,
  exhaustion: 82,
  breakthrough: 80,
  goalDefault: 68,
  fallback: 45
};
var STRATEGY_DURATION_HINT = {
  SAFETY: 1,
  RECOVERY: 2,
  ESCALATION: 1,
  EXHAUSTION: 2,
  BREAKTHROUGH: 1,
  GOAL_DEFAULT: 2,
  fallback: 1
};
var SAFETY_BLOCKED_STRATEGIES = [
  "deepen_emotions",
  "transition_to_needs",
  "prepare_agreement",
  "close_topic"
];
var ESCALATION_BLOCKED_STRATEGIES = [
  "deepen_emotions",
  "transition_to_needs",
  "prepare_agreement"
];
var EXHAUSTION_BLOCKED_STRATEGIES = [
  "deepen_emotions",
  "stop_escalation",
  "prepare_agreement"
];

// services/mediatorEngine/strategy/lib/buildStrategyReason.ts
function buildStrategyReason(input) {
  const parts = [
    `priority=${input.priority.toLowerCase()}`,
    `reason=${input.reasonKey}`,
    `primary=${input.primaryStrategy}`,
    `intent=${input.therapeuticIntent}`,
    `goal_transition=${input.suggestedGoalTransition}`
  ];
  if (input.secondaryStrategy) {
    parts.push(`secondary=${input.secondaryStrategy}`);
  }
  return parts.join("; ");
}

// services/mediatorEngine/strategy/lib/safeStrategyInput.ts
function readBool(field, fallback = false) {
  if (!field || typeof field !== "object") return fallback;
  return typeof field.value === "boolean" ? field.value : fallback;
}
function normalizeGoal(value) {
  const goals = [
    "SAFE_OPENING",
    "EMOTION_NAMING",
    "EMOTION_UNDERSTANDING",
    "EMOTION_ACKNOWLEDGMENT",
    "NEED_NAMING",
    "PERSPECTIVE_SHARING",
    "REFRAME",
    "AGREEMENT",
    "FUTURE_PLAN",
    "CLOSURE"
  ];
  if (typeof value === "string" && goals.includes(value)) {
    return value;
  }
  return "SAFE_OPENING";
}
function normalizeSafetyLevel2(safety) {
  const level = safety?.level;
  if (level === "L1_gentle" || level === "L2_pause" || level === "L3_stop") return level;
  return "none";
}
function isSafetyActive2(safety) {
  const level = normalizeSafetyLevel2(safety);
  if (level !== "none") return true;
  if (safety?.preempted === true) return true;
  return false;
}
function getPreviousPrimaryStrategy(memory) {
  const history = Array.isArray(memory.interventionHistory) ? memory.interventionHistory : [];
  const last = history.at(-1);
  return typeof last?.strategy === "string" ? last.strategy : null;
}
function defaultLoad() {
  return {
    host: { value: 0, confidence: 0, source: "heuristic", evidence: [], assessedAt: "", stale: false },
    partner: { value: 0, confidence: 0, source: "heuristic", evidence: [], assessedAt: "", stale: false },
    overall: 0,
    trend: "stable",
    exhaustionDetected: { value: false, confidence: 0, source: "heuristic", evidence: [], assessedAt: "", stale: false },
    disengagementRisk: { value: false, confidence: 0, source: "heuristic", evidence: [], assessedAt: "", stale: false }
  };
}
function defaultDynamics() {
  const base = { value: false, confidence: 0, source: "heuristic", evidence: [], assessedAt: "", stale: false };
  return {
    temperature: { ...base, value: 0 },
    escalation: base,
    blameLoop: base,
    breakthrough: { ...base, value: null },
    evasion: base,
    mutualUnderstanding: { ...base, value: 0 }
  };
}
function safeStrategyInput(input) {
  const raw = input && typeof input === "object" ? input : {};
  const state = raw.state && typeof raw.state === "object" ? raw.state : {};
  const reflection = raw.reflection && typeof raw.reflection === "object" ? raw.reflection : {};
  const safety = raw.safety && typeof raw.safety === "object" ? raw.safety : null;
  const load = state.load && typeof state.load === "object" ? state.load : defaultLoad();
  const dynamics = state.dynamics && typeof state.dynamics === "object" ? state.dynamics : defaultDynamics();
  const recovery = state.recovery && typeof state.recovery === "object" ? state.recovery : null;
  const sessionMemory = state.sessionMemory && typeof state.sessionMemory === "object" ? state.sessionMemory : createEmptySessionMemory();
  const reflectionShift = typeof reflection.recommendedStrategyShift === "string" ? reflection.recommendedStrategyShift : "continue";
  const pauseRecommended = reflectionShift === "pause";
  const escalationActive = readBool(dynamics.escalation);
  const blameLoopActive = readBool(dynamics.blameLoop);
  const exhaustionActive = readBool(load.exhaustionDetected);
  const breakthroughActive = dynamics.breakthrough?.value != null || reflectionShift === "consolidate";
  const recoveryActive = recovery?.active === true || reflectionShift === "recover";
  const safetyActive = isSafetyActive2(safety);
  const hostReady = readBool(reflection.partnerReadiness?.host?.readyToAdvance);
  const partnerReady = readBool(reflection.partnerReadiness?.partner?.readyToAdvance);
  return {
    turnNumber: typeof raw.turnNumber === "number" && raw.turnNumber > 0 ? raw.turnNumber : 1,
    currentGoal: normalizeGoal(state.currentGoal),
    pace: state.pace === "slow" || state.pace === "fast" ? state.pace : "normal",
    load,
    dynamics,
    recovery,
    sessionMemory,
    reflection,
    safety,
    safetyActive,
    recoveryActive,
    escalationActive,
    blameLoopActive,
    exhaustionActive,
    breakthroughActive,
    reflectionShift,
    pauseRecommended,
    bothReady: hostReady && partnerReady,
    previousPrimaryStrategy: getPreviousPrimaryStrategy(sessionMemory)
  };
}
function isGoalAdvanceBlocked(ctx) {
  return ctx.safetyActive || ctx.recoveryActive || ctx.escalationActive || ctx.blameLoopActive || ctx.exhaustionActive || ctx.pauseRecommended || ctx.reflectionShift === "slow_down" || ctx.reflectionShift === "deescalate";
}

// services/mediatorEngine/strategy/lib/chooseGoalTransition.ts
function chooseGoalTransition2(ctx, priority) {
  if (isGoalAdvanceBlocked(ctx)) {
    return "stay";
  }
  if (priority === "BREAKTHROUGH" && ctx.bothReady) {
    return "prepare_advance";
  }
  if (ctx.bothReady) {
    return "prepare_advance";
  }
  return "stay";
}

// services/mediatorEngine/strategy/config/goalStrategyMap.ts
var GOAL_STRATEGY_MAP = {
  SAFE_OPENING: "build_safety",
  EMOTION_NAMING: "validate_emotions",
  EMOTION_UNDERSTANDING: "deepen_emotions",
  EMOTION_ACKNOWLEDGMENT: "increase_mutual_understanding",
  NEED_NAMING: "transition_to_needs",
  PERSPECTIVE_SHARING: "increase_mutual_understanding",
  REFRAME: "increase_mutual_understanding",
  AGREEMENT: "prepare_agreement",
  FUTURE_PLAN: "prepare_agreement",
  CLOSURE: "close_topic"
};
function strategyForGoal(goal) {
  if (typeof goal === "string" && goal in GOAL_STRATEGY_MAP) {
    return GOAL_STRATEGY_MAP[goal];
  }
  return "build_safety";
}

// services/mediatorEngine/strategy/lib/choosePrimaryStrategy.ts
function choosePrimaryStrategy(ctx) {
  if (ctx.safetyActive) {
    return {
      primaryStrategy: "build_safety",
      priority: "SAFETY",
      reasonKey: "safety"
    };
  }
  if (ctx.recoveryActive) {
    return {
      primaryStrategy: "recover_misinterpretation",
      priority: "RECOVERY",
      reasonKey: "recovery"
    };
  }
  if (ctx.escalationActive || ctx.blameLoopActive || ctx.reflectionShift === "deescalate") {
    const primaryStrategy = ctx.blameLoopActive || ctx.reflectionShift === "deescalate" ? "stop_escalation" : "reduce_tension";
    return {
      primaryStrategy,
      priority: "ESCALATION",
      reasonKey: ctx.blameLoopActive ? "blame-loop" : "escalation"
    };
  }
  if (ctx.exhaustionActive || ctx.reflectionShift === "slow_down" || ctx.pauseRecommended) {
    return {
      primaryStrategy: "hold_space",
      priority: "EXHAUSTION",
      reasonKey: ctx.pauseRecommended ? "pause-recommended" : "exhaustion"
    };
  }
  if (ctx.breakthroughActive) {
    return {
      primaryStrategy: "consolidate_progress",
      priority: "BREAKTHROUGH",
      reasonKey: "breakthrough"
    };
  }
  return {
    primaryStrategy: strategyForGoal(ctx.currentGoal),
    priority: "GOAL_DEFAULT",
    reasonKey: `goal:${ctx.currentGoal}`
  };
}

// services/mediatorEngine/strategy/lib/chooseSecondaryStrategy.ts
var COMPATIBLE_SECONDARIES = {
  build_safety: ["validate_emotions", "hold_space"],
  reduce_tension: ["validate_emotions", "build_safety"],
  stop_escalation: ["validate_emotions", "build_safety"],
  validate_emotions: ["build_safety", "hold_space"],
  deepen_emotions: ["validate_emotions"],
  consolidate_progress: ["validate_emotions"],
  hold_space: ["build_safety"],
  transition_to_needs: ["validate_emotions"],
  increase_mutual_understanding: ["validate_emotions"],
  prepare_agreement: ["validate_emotions"],
  close_topic: ["validate_emotions"],
  recover_misinterpretation: ["hold_space"]
};
function isCompatible(primary, secondary) {
  if (primary === secondary) return false;
  const allowed = COMPATIBLE_SECONDARIES[primary];
  return allowed ? allowed.includes(secondary) : false;
}
function chooseSecondaryStrategy(ctx, primaryStrategy, priority) {
  if (priority === "ESCALATION") {
    if (ctx.blameLoopActive) return "build_safety";
    return "validate_emotions";
  }
  if (priority === "BREAKTHROUGH") {
    return "validate_emotions";
  }
  if (priority === "SAFETY" || priority === "RECOVERY" || priority === "EXHAUSTION") {
    return null;
  }
  const previous = ctx.previousPrimaryStrategy;
  if (previous && isCompatible(primaryStrategy, previous)) {
    return previous;
  }
  const defaults = COMPATIBLE_SECONDARIES[primaryStrategy];
  return defaults?.[0] ?? null;
}

// services/mediatorEngine/strategy/config/strategyIntents.ts
var STRATEGY_INTENT_MAP = {
  build_safety: "increase_emotional_safety",
  reduce_tension: "reduce_defensiveness",
  validate_emotions: "help_partner_feel_heard",
  deepen_emotions: "help_explain_emotion",
  transition_to_needs: "help_name_need",
  increase_mutual_understanding: "help_see_other_perspective",
  stop_escalation: "reduce_blame_cycle",
  prepare_agreement: "prepare_shared_agreement",
  close_topic: "close_with_dignity",
  recover_misinterpretation: "correct_misunderstanding",
  hold_space: "acknowledge_exhaustion",
  consolidate_progress: "consolidate_breakthrough"
};
var PRIORITY_INTENT_OVERRIDES = {
  safety: "increase_emotional_safety",
  recovery: "correct_misunderstanding",
  escalation: "reduce_defensiveness",
  blame: "reduce_blame_cycle",
  exhaustion: "acknowledge_exhaustion",
  breakthrough: "consolidate_breakthrough"
};
function intentForStrategy(strategy, priorityKey) {
  if (priorityKey && PRIORITY_INTENT_OVERRIDES[priorityKey]) {
    return PRIORITY_INTENT_OVERRIDES[priorityKey];
  }
  return STRATEGY_INTENT_MAP[strategy] ?? "increase_emotional_safety";
}

// services/mediatorEngine/strategy/lib/chooseTherapeuticIntent.ts
function intentOverrideKey(ctx, priority) {
  switch (priority) {
    case "SAFETY":
      return "safety";
    case "RECOVERY":
      return "recovery";
    case "ESCALATION":
      return ctx.blameLoopActive ? "blame" : "escalation";
    case "EXHAUSTION":
      return "exhaustion";
    case "BREAKTHROUGH":
      return "breakthrough";
    default:
      return void 0;
  }
}
function chooseTherapeuticIntent(ctx, primaryStrategy, priority) {
  const overrideKey = intentOverrideKey(ctx, priority);
  return intentForStrategy(primaryStrategy, overrideKey);
}

// services/mediatorEngine/strategy/lib/confidence.ts
function confidenceForPriority(priority) {
  switch (priority) {
    case "SAFETY":
      return STRATEGY_CONFIDENCE.safety;
    case "RECOVERY":
      return STRATEGY_CONFIDENCE.recovery;
    case "ESCALATION":
      return STRATEGY_CONFIDENCE.escalation;
    case "EXHAUSTION":
      return STRATEGY_CONFIDENCE.exhaustion;
    case "BREAKTHROUGH":
      return STRATEGY_CONFIDENCE.breakthrough;
    case "GOAL_DEFAULT":
      return STRATEGY_CONFIDENCE.goalDefault;
    default:
      return STRATEGY_CONFIDENCE.fallback;
  }
}

// services/mediatorEngine/strategy/recovery/buildRecoveryStrategy.ts
function buildRecoveryStrategy(ctx) {
  if (!ctx.recoveryActive) return null;
  const trigger = ctx.recovery?.trigger ?? "implicit_correction";
  const attempt = typeof ctx.recovery?.recoveryAttempt === "number" ? ctx.recovery.recoveryAttempt : 1;
  if (attempt > 2) {
    return {
      trigger,
      primaryStrategy: "recover_misinterpretation",
      primaryIntent: "restore_trust_in_process",
      maxAttempts: 2,
      fallbackStrategy: "hold_space",
      revertCheckStatuses: ["likely", "confirmed"]
    };
  }
  return {
    trigger,
    primaryStrategy: "recover_misinterpretation",
    primaryIntent: "correct_misunderstanding",
    maxAttempts: 2,
    fallbackStrategy: "hold_space",
    revertCheckStatuses: ["likely", "confirmed"]
  };
}

// services/mediatorEngine/strategy/resolve/buildStrategyOutput.ts
function blockedStrategiesForPriority(priority) {
  switch (priority) {
    case "SAFETY":
      return [...SAFETY_BLOCKED_STRATEGIES];
    case "ESCALATION":
      return [...ESCALATION_BLOCKED_STRATEGIES];
    case "EXHAUSTION":
      return [...EXHAUSTION_BLOCKED_STRATEGIES];
    default:
      return [];
  }
}
function buildStrategyOutput(ctx) {
  const base = createEmptyStrategyOutput();
  const choice = choosePrimaryStrategy(ctx);
  const secondaryStrategy = chooseSecondaryStrategy(ctx, choice.primaryStrategy, choice.priority);
  const therapeuticIntent = chooseTherapeuticIntent(ctx, choice.primaryStrategy, choice.priority);
  const suggestedGoalTransition = chooseGoalTransition2(ctx, choice.priority);
  const recoveryStrategy = buildRecoveryStrategy(ctx);
  const rationale = buildStrategyReason({
    priority: choice.priority,
    reasonKey: choice.reasonKey,
    primaryStrategy: choice.primaryStrategy,
    secondaryStrategy,
    therapeuticIntent,
    suggestedGoalTransition: suggestedGoalTransition ?? "stay"
  });
  return {
    ...base,
    primaryStrategy: choice.primaryStrategy,
    secondaryStrategy,
    therapeuticIntent,
    confidence: confidenceForPriority(choice.priority),
    rationale,
    blockedStrategies: blockedStrategiesForPriority(choice.priority),
    suggestedGoalTransition,
    strategyDurationHint: STRATEGY_DURATION_HINT[choice.priority],
    alignmentWithGoal: ctx.currentGoal,
    recoveryStrategy
  };
}

// services/mediatorEngine/strategy/selectStrategy.ts
function selectStrategy(input) {
  try {
    const ctx = safeStrategyInput(input);
    return buildStrategyOutput(ctx);
  } catch {
    return createEmptyStrategyOutput();
  }
}

// services/mediatorEngine/stateAnalyzer/factory/createInitialMediationState.ts
function createInitialMediationState(input) {
  const turnNumber = typeof input.turnNumber === "number" ? input.turnNumber : 1;
  const mediationId = input.mediationId ?? "initial-mediation";
  const sessionId = input.sessionId ?? "initial-session";
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const evidenceStore = createEmptyEvidenceStore();
  return {
    meta: {
      schemaVersion: "2.3",
      sessionId,
      mediationId,
      language: input.language ?? "en",
      startedAt,
      lastUpdatedAt: startedAt,
      currentTurnNumber: turnNumber
    },
    participants: {
      host: {
        profile: { userId: "", displayName: "Host", role: "host" },
        namedEmotion: null,
        emotionConfidence: 0,
        emotionExplanation: null,
        emotionValidated: false,
        emotionAcknowledgedByOther: false,
        namedNeed: null,
        needExplanation: null,
        needValidated: false,
        feelsHeard: false,
        feelsUnderstood: false,
        feelsRespected: false,
        lastMessageTone: "calm",
        consecutiveEvasiveAnswers: 0,
        consecutiveAccusatoryMessages: 0,
        lastStatementSummary: null
      },
      partner: {
        profile: { userId: "", displayName: "Partner", role: "partner" },
        namedEmotion: null,
        emotionConfidence: 0,
        emotionExplanation: null,
        emotionValidated: false,
        emotionAcknowledgedByOther: false,
        namedNeed: null,
        needExplanation: null,
        needValidated: false,
        feelsHeard: false,
        feelsUnderstood: false,
        feelsRespected: false,
        lastMessageTone: "calm",
        consecutiveEvasiveAnswers: 0,
        consecutiveAccusatoryMessages: 0,
        lastStatementSummary: null
      }
    },
    conflict: {
      surfaceTopic: null,
      surfaceTopicConfidence: 0,
      hypothesizedDeepThemes: [],
      confirmedDeepTheme: null,
      conflictSummary: "",
      preAnalysisContext: {
        hostEmotions: [],
        hostNeeds: [],
        partnerEmotions: [],
        partnerNeeds: [],
        keyTrigger: null
      }
    },
    dynamics: {
      mode: "NORMAL",
      emotionalTemperature: 0,
      temperatureTrend: "stable",
      breakthroughDetected: false,
      breakthroughQuote: null,
      breakthroughAt: null,
      blameLoopDetected: false,
      blameLoopCount: 0,
      escalationDetected: false,
      escalationLevel: 0,
      mutualUnderstandingScore: 0,
      agreementLevel: 0,
      lastStableGoal: "SAFE_OPENING",
      pauseSuggested: false,
      pauseAcceptedBy: []
    },
    memory: {
      askedQuestionSignatures: [],
      recentMediatorMoves: [],
      coveredTopics: [],
      factMemory: [],
      breakthroughHistory: [],
      regressHistory: []
    },
    currentGoal: "SAFE_OPENING",
    goals: [],
    sessionObjectives: null,
    pendingAction: null,
    agreements: {
      sharedRule: null,
      hostCommitment: null,
      partnerCommitment: null,
      futurePlan: null,
      acceptedByBoth: false
    },
    sessionOutcome: "in_progress",
    pace: {
      current: "normal",
      confidence: 0,
      reason: "",
      sinceTurn: turnNumber,
      minTurnsBeforeChange: 2
    },
    load: {
      host: {
        value: 0,
        confidence: 0,
        source: "heuristic",
        evidence: [],
        assessedAt: startedAt,
        stale: false
      },
      partner: {
        value: 0,
        confidence: 0,
        source: "heuristic",
        evidence: [],
        assessedAt: startedAt,
        stale: false
      },
      overall: 0,
      trend: "stable",
      exhaustionDetected: {
        value: false,
        confidence: 0,
        source: "heuristic",
        evidence: [],
        assessedAt: startedAt,
        stale: false
      },
      disengagementRisk: {
        value: false,
        confidence: 0,
        source: "heuristic",
        evidence: [],
        assessedAt: startedAt,
        stale: false
      }
    },
    personality: {
      core: {
        calm: 50,
        warm: 50,
        structured: 50,
        neutral: 50,
        empathetic: 50,
        confident: 50
      },
      profile: "steady_mediator",
      adaptiveModifiers: {
        warmthBoost: 0,
        structureBoost: 0,
        lastAdjustedTurn: 0
      },
      immutableRuleRefs: []
    },
    recovery: null,
    activeStrategy: null,
    lastInterventionMeta: null,
    evidenceStore
  };
}

// services/mediatorEngine/stateAnalyzer/config/stateAnalyzerLimits.ts
var STATE_ANALYZER_LIMITS = {
  maxConclusions: 80,
  /** Turns before confidence decay begins. */
  decayStartAfterTurns: 2,
  /** Confidence points removed per elapsed turn after decay starts. */
  decayPercentPerTurn: 5,
  /** Confidence below this marks the value stale. */
  staleConfidenceThreshold: 30,
  /** Decay factor reduction per turn for evidenced conclusions. */
  conclusionDecayFactorStep: 0.05
};
var TRANSCRIPT_METADATA_ANALYSIS_PREFIX = "transcript-metadata-turn-";
var TRANSCRIPT_METADATA_REDACTED_CONTENT = "[TRANSCRIPT_METADATA_REDACTED]";
var TRANSCRIPT_METADATA_CONCLUSION_VALUE = "transcript_metadata";

// services/mediatorEngine/stateAnalyzer/decay/decayConfidenceValue.ts
function decayTurns(turnsElapsed) {
  if (turnsElapsed <= 0) return 0;
  return Math.max(0, turnsElapsed - (STATE_ANALYZER_LIMITS.decayStartAfterTurns - 1));
}
function decayConfidenceValue(value, turnsElapsed) {
  if (value.stale || turnsElapsed <= 0) {
    return { next: value, decayApplied: false };
  }
  const applicableTurns = decayTurns(turnsElapsed);
  if (applicableTurns <= 0) {
    return { next: value, decayApplied: false };
  }
  const reduction = applicableTurns * STATE_ANALYZER_LIMITS.decayPercentPerTurn;
  const nextConfidence = Math.max(0, value.confidence - reduction);
  const stale = nextConfidence < STATE_ANALYZER_LIMITS.staleConfidenceThreshold;
  return {
    next: {
      ...value,
      confidence: nextConfidence,
      stale
    },
    decayApplied: reduction > 0
  };
}

// services/mediatorEngine/stateAnalyzer/decay/applyConfidenceDecay.ts
function decayConclusion(conclusion, turnsElapsed) {
  if (conclusion.stale || turnsElapsed <= 0) {
    return { next: conclusion, decayApplied: false };
  }
  const applicableTurns = Math.max(
    0,
    turnsElapsed - (STATE_ANALYZER_LIMITS.decayStartAfterTurns - 1)
  );
  if (applicableTurns <= 0) {
    return { next: conclusion, decayApplied: false };
  }
  const reduction = applicableTurns * STATE_ANALYZER_LIMITS.decayPercentPerTurn;
  const nextConfidence = Math.max(0, conclusion.confidence - reduction);
  const nextDecayFactor = Math.max(
    0,
    conclusion.decayFactor - applicableTurns * STATE_ANALYZER_LIMITS.conclusionDecayFactorStep
  );
  const stale = nextConfidence < STATE_ANALYZER_LIMITS.staleConfidenceThreshold;
  return {
    next: {
      ...conclusion,
      confidence: nextConfidence,
      decayFactor: nextDecayFactor,
      stale,
      requiresReconfirmation: stale || conclusion.requiresReconfirmation
    },
    decayApplied: reduction > 0
  };
}
function applyConfidenceDecay(state, turnsElapsed) {
  let decayEventsApplied = 0;
  const host = decayConfidenceValue(state.load.host, turnsElapsed);
  const partner = decayConfidenceValue(state.load.partner, turnsElapsed);
  const exhaustion = decayConfidenceValue(state.load.exhaustionDetected, turnsElapsed);
  const disengagement = decayConfidenceValue(state.load.disengagementRisk, turnsElapsed);
  decayEventsApplied += Number(host.decayApplied);
  decayEventsApplied += Number(partner.decayApplied);
  decayEventsApplied += Number(exhaustion.decayApplied);
  decayEventsApplied += Number(disengagement.decayApplied);
  const conclusions = {};
  for (const [analysisId, conclusion] of Object.entries(state.evidenceStore?.conclusions ?? {})) {
    const decayed = decayConclusion(conclusion, turnsElapsed);
    conclusions[analysisId] = decayed.next;
    decayEventsApplied += Number(decayed.decayApplied);
  }
  return {
    state: {
      ...state,
      load: {
        ...state.load,
        host: host.next,
        partner: partner.next,
        exhaustionDetected: exhaustion.next,
        disengagementRisk: disengagement.next
      },
      evidenceStore: {
        ...state.evidenceStore,
        conclusions
      }
    },
    decayEventsApplied
  };
}

// services/mediatorEngine/stateAnalyzer/lib/safeTranscript.ts
function safeTranscriptDelta3(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => {
    return !!entry && typeof entry === "object";
  });
}
function isEmptyMessageContent2(content) {
  return typeof content !== "string" || content.trim().length === 0;
}

// services/mediatorEngine/stateAnalyzer/transcript/extractTranscriptMetadata.ts
function normalizeRole(value) {
  if (value === "host" || value === "partner" || value === "mediator") return value;
  return null;
}
function extractTranscriptMetadata2(transcriptDelta, turnNumber) {
  const messages = safeTranscriptDelta3(transcriptDelta);
  let emptyMessageCount = 0;
  let hasHostMessage = false;
  let hasPartnerMessage = false;
  let lastSpeakerRole = null;
  let latestTimestamp = null;
  const messageIds = [];
  for (const message of messages) {
    if (typeof message.id === "string" && message.id.length > 0) {
      messageIds.push(message.id);
    }
    if (isEmptyMessageContent2(message.content)) {
      emptyMessageCount += 1;
    }
    const role = normalizeRole(message.authorRole);
    if (role === "host") hasHostMessage = true;
    if (role === "partner") hasPartnerMessage = true;
    if (role) lastSpeakerRole = role;
    if (typeof message.createdAt === "string" && message.createdAt.length > 0) {
      if (!latestTimestamp || message.createdAt > latestTimestamp) {
        latestTimestamp = message.createdAt;
      }
    }
  }
  return {
    turnNumber,
    messageCount: messages.length,
    emptyMessageCount,
    hasHostMessage,
    hasPartnerMessage,
    lastSpeakerRole,
    messageIds,
    latestTimestamp
  };
}
function toEvidenceItemMetadata(metadata) {
  return {
    turnNumber: metadata.turnNumber,
    messageCount: metadata.messageCount,
    emptyMessageCount: metadata.emptyMessageCount,
    hasHostMessage: metadata.hasHostMessage,
    hasPartnerMessage: metadata.hasPartnerMessage,
    lastSpeakerRole: metadata.lastSpeakerRole,
    messageIds: metadata.messageIds,
    latestTimestamp: metadata.latestTimestamp
  };
}

// services/mediatorEngine/stateAnalyzer/evidence/buildEvidenceStore.ts
function normalizeStore(existing) {
  if (!existing || typeof existing !== "object") {
    return createEmptyEvidenceStore();
  }
  return {
    conclusions: existing.conclusions ?? {},
    indexByTurn: existing.indexByTurn ?? {},
    maxConclusions: typeof existing.maxConclusions === "number" ? existing.maxConclusions : STATE_ANALYZER_LIMITS.maxConclusions
  };
}
function trimConclusions(store) {
  const ids = Object.keys(store.conclusions);
  if (ids.length <= store.maxConclusions) return store;
  const sorted = ids.sort((a, b) => {
    const turnA = store.conclusions[a]?.assessedAtTurn ?? 0;
    const turnB = store.conclusions[b]?.assessedAtTurn ?? 0;
    return turnA - turnB;
  });
  const removeCount = ids.length - store.maxConclusions;
  const toRemove = new Set(sorted.slice(0, removeCount));
  const conclusions = Object.fromEntries(
    Object.entries(store.conclusions).filter(([id]) => !toRemove.has(id))
  );
  return { ...store, conclusions };
}
function buildEvidenceStore(input) {
  const base = normalizeStore(input.existing);
  const analysisId = `${TRANSCRIPT_METADATA_ANALYSIS_PREFIX}${input.turnNumber}`;
  const structuredMetadata = toEvidenceItemMetadata(input.metadata);
  const evidenceItem = {
    id: `evidence-transcript-meta-${input.turnNumber}`,
    source: "transcript_metadata",
    content: TRANSCRIPT_METADATA_REDACTED_CONTENT,
    metadata: structuredMetadata,
    messageIds: input.metadata.messageIds,
    turnNumber: input.turnNumber,
    weight: 1,
    polarity: "neutral",
    detectedAt: input.detectedAt,
    stale: false
  };
  const conclusion = {
    analysisId,
    value: TRANSCRIPT_METADATA_CONCLUSION_VALUE,
    confidence: 100,
    confidenceMethod: "weighted_sum",
    evidence: [evidenceItem],
    derivedFrom: [],
    assessedAt: input.detectedAt,
    assessedAtTurn: input.turnNumber,
    stale: false,
    decayFactor: 1,
    requiresReconfirmation: false
  };
  const conclusions = {
    ...base.conclusions,
    [analysisId]: conclusion
  };
  const indexByTurn = {
    ...base.indexByTurn,
    [input.turnNumber]: [...base.indexByTurn[input.turnNumber] ?? [], analysisId].filter(
      (id, index, list) => list.indexOf(id) === index
    )
  };
  return trimConclusions({
    ...base,
    conclusions,
    indexByTurn
  });
}

// services/mediatorEngine/stateAnalyzer/update/updateMediationState.ts
function updateMediationState(state, input) {
  return {
    ...state,
    meta: {
      ...state.meta,
      currentTurnNumber: input.turnNumber,
      lastUpdatedAt: input.lastUpdatedAt
    }
  };
}

// services/mediatorEngine/stateAnalyzer/analyze/buildStateAnalyzerOutput.ts
function normalizeTurnNumber3(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 1;
}
function resolveBaseState(input) {
  if (input.mediationState && typeof input.mediationState === "object") {
    return input.mediationState;
  }
  return createInitialMediationState({ turnNumber: normalizeTurnNumber3(input.turnNumber) });
}
function buildStateAnalyzerOutput(input) {
  const turnNumber = normalizeTurnNumber3(input.turnNumber);
  const baseState = resolveBaseState(input);
  const previousTurn = baseState.meta?.currentTurnNumber ?? turnNumber;
  const turnsElapsed = Math.max(0, turnNumber - previousTurn);
  const lastUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const metadata = extractTranscriptMetadata2(input.transcriptDelta, turnNumber);
  const decayResult = applyConfidenceDecay(baseState, turnsElapsed);
  const metaUpdated = updateMediationState(decayResult.state, {
    turnNumber,
    lastUpdatedAt
  });
  const evidenceStore = buildEvidenceStore({
    existing: metaUpdated.evidenceStore,
    metadata,
    turnNumber,
    detectedAt: lastUpdatedAt
  });
  const updatedState = {
    ...metaUpdated,
    evidenceStore
  };
  return {
    updatedState,
    evidenceStore,
    dynamicsUpdated: false,
    participantFieldsUpdated: false,
    decayEventsApplied: decayResult.decayEventsApplied
  };
}
function createMinimalStateAnalyzerOutput(input) {
  const turnNumber = normalizeTurnNumber3(input.turnNumber);
  const state = createInitialMediationState({ turnNumber });
  return {
    updatedState: state,
    evidenceStore: state.evidenceStore,
    dynamicsUpdated: false,
    participantFieldsUpdated: false,
    decayEventsApplied: 0
  };
}

// services/mediatorEngine/stateAnalyzer/analyzeState.ts
function analyzeState(input) {
  try {
    return buildStateAnalyzerOutput(input);
  } catch {
    return createMinimalStateAnalyzerOutput(input);
  }
}

// services/mediatorEngine/orchestrator/orchestrateTurn.ts
function buildStrategyStateContext(state, sessionMemory) {
  const goalChecks = state.goals.flatMap((goal) => goal.checks);
  return {
    currentGoal: state.currentGoal,
    goalChecks,
    dynamics: {
      temperature: state.load.host,
      escalation: state.load.exhaustionDetected,
      blameLoop: state.load.disengagementRisk,
      breakthrough: { ...state.load.host, value: null },
      evasion: state.load.disengagementRisk,
      mutualUnderstanding: {
        value: state.dynamics.mutualUnderstandingScore,
        confidence: 0,
        source: "heuristic",
        evidence: [],
        assessedAt: state.meta.lastUpdatedAt,
        stale: false
      }
    },
    pace: state.pace.current,
    load: state.load,
    recovery: state.recovery,
    sessionPersonality: state.personality,
    sessionMemory,
    sessionObjectives: state.sessionObjectives
  };
}
function createPlaceholderLastIntervention(turnNumber) {
  return {
    id: "skeleton-last-intervention",
    type: "welcome_open",
    target: "both",
    visibility: "public",
    content: { primaryMessage: "" },
    goal: "SAFE_OPENING",
    rationale: "",
    expectedEffectSummary: "",
    doNotRepeatBefore: turnNumber
  };
}
function orchestrateTurn(input) {
  const { request } = input;
  const sessionMemory = input.sessionMemory ?? createEmptySessionMemory();
  const stateBefore = request.mediationState ?? createEmptyMediationState(request);
  const stateAnalyzerOutput = analyzeState({
    mediationState: stateBefore,
    transcriptDelta: request.transcriptDelta,
    turnNumber: request.turnNumber
  });
  let state = stateAnalyzerOutput.updatedState;
  if (request.language && state.meta.language !== request.language) {
    state = {
      ...state,
      meta: { ...state.meta, language: request.language }
    };
  }
  const safetyOutput = evaluateSafety({
    state,
    transcriptDelta: request.transcriptDelta,
    turnNumber: request.turnNumber
  });
  const reflectionOutput = runReflection({
    lastIntervention: createPlaceholderLastIntervention(request.turnNumber),
    stateBefore,
    stateAfter: state,
    transcriptDelta: request.transcriptDelta,
    goalChecksDelta: []
  });
  const strategyOutput = selectStrategy({
    state: buildStrategyStateContext(state, sessionMemory),
    reflection: reflectionOutput,
    safety: safetyOutput,
    turnNumber: request.turnNumber
  });
  const priorityOutput = resolvePriority({
    state,
    reflection: reflectionOutput,
    safety: safetyOutput,
    strategy: strategyOutput,
    turnNumber: request.turnNumber
  });
  const continuityContext = buildContinuityContext({
    sessionMemory,
    recommendedInterventionType: priorityOutput.recommendedInterventionType
  });
  const decisionOutput = makeDecision({
    state,
    reflection: reflectionOutput,
    strategy: strategyOutput,
    priority: priorityOutput,
    safety: safetyOutput,
    turnNumber: request.turnNumber,
    sessionMemory,
    continuityContext
  });
  const intervention = generateIntervention({
    state,
    intent: {
      intent: decisionOutput.intent,
      goal: state.currentGoal,
      strategy: decisionOutput.strategy,
      targetParticipant: "both",
      addressesCheckId: null,
      confidence: 0
    },
    decision: decisionOutput,
    turnNumber: request.turnNumber
  });
  const complianceResult = validateConstitution({
    intervention,
    applicableRules: [],
    turnNumber: request.turnNumber,
    attemptNumber: 1,
    recentInterventionSignatures: sessionMemory.askedInterventionSignatures ?? []
  });
  const updatedSessionMemory = updateSessionMemory({
    previousMemory: sessionMemory,
    state,
    intervention,
    reflection: reflectionOutput,
    complianceResult,
    turnNumber: request.turnNumber
  });
  recordMetrics({
    turnNumber: request.turnNumber,
    sessionId: request.sessionId,
    mediationId: request.mediationId,
    sessionMemory: updatedSessionMemory,
    complianceResult
  });
  return {
    mediationState: state,
    intervention,
    sessionMemory: updatedSessionMemory,
    evidenceStore: stateAnalyzerOutput.evidenceStore,
    explainability: createEmptyExplainability(request.turnNumber),
    complianceResult,
    engineVersion: request.engineVersion
  };
}

// services/mediatorEngine/promptComposer/metadata/buildPromptMetadata.ts
function buildPromptMetadata(input) {
  return {
    turnNumber: input.turnNumber,
    language: input.language,
    interventionType: input.interventionType,
    goal: input.goal,
    composedAt: (/* @__PURE__ */ new Date()).toISOString(),
    transcriptMessageCount: input.transcriptMessageCount
  };
}

// services/mediatorEngine/promptComposer/metadata/estimateTokens.ts
function estimateTokens(text) {
  if (typeof text !== "string" || text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}
function estimatePromptTokens(sections) {
  const combined = sections.filter(Boolean).join("\n");
  return estimateTokens(combined);
}

// services/mediatorEngine/promptComposer/sections/buildContextSummary.ts
function buildContextSummary(ctx) {
  const { currentGoal, priorityOutput, strategyOutput, turnNumber } = ctx;
  const mode = priorityOutput.conversationMode ?? "NORMAL";
  const strategy = strategyOutput.primaryStrategy ?? "build_safety";
  const goalTransition = ctx.decisionOutput.goalTransition ?? "stay";
  const parts = [
    `Turn ${turnNumber}.`,
    `Current goal: ${currentGoal}.`,
    `Conversation mode: ${mode}.`,
    `Strategy: ${strategy}.`,
    `Goal transition: ${goalTransition}.`
  ];
  const hint = ctx.continuityContext?.continuityHint;
  if (typeof hint === "string" && hint.length > 0) {
    parts.push(`Continuity: ${hint}`);
  }
  return parts.join(" ");
}

// services/mediatorEngine/llm/config/localizedMediatorTexts.ts
var LOCALIZED_NORMAL_TEXT = {
  en: "I hear that this is difficult for both of you. Let us take a moment and speak one at a time.",
  pl: "S\u0142ysz\u0119, \u017Ce to jest trudne dla was obojga. Zatrzymajmy si\u0119 na chwil\u0119 i m\xF3wcie po kolei.",
  es: "Escucho que esto es dif\xEDcil para ambos. Tomemos un momento y hablemos uno a la vez.",
  it: "Sento che questo momento \xE8 difficile per entrambi. Prendiamoci un momento e parliamo a turno.",
  de: "Ich h\xF6re, dass das f\xFCr Sie beide schwierig ist. Lassen Sie uns kurz innehalten und nacheinander sprechen.",
  fr: "J'entends que cela est difficile pour vous deux. Prenons un moment et parlons l'un apr\xE8s l'autre."
};
var LOCALIZED_SAFETY_TEXT = {
  en: "I want to pause here for safety. Please take a slow breath. We can stop and step back before continuing.",
  pl: "Chc\u0119 tu zrobi\u0107 pauz\u0119 ze wzgl\u0119du na bezpiecze\u0144stwo. We\u017Acie prosz\u0119 spokojny oddech. Mo\u017Cemy zatrzyma\u0107 rozmow\u0119 i wr\xF3ci\u0107 do niej dopiero wtedy, gdy b\u0119dzie spokojniej.",
  es: "Quiero hacer una pausa aqu\xED por seguridad. Por favor, respiren despacio. Podemos detener la conversaci\xF3n y retomarla cuando est\xE9n m\xE1s tranquilos.",
  it: "Voglio fare una pausa qui per sicurezza. Per favore, fate un respiro lento. Possiamo fermare la conversazione e riprenderla quando sar\xE0 pi\xF9 calmo.",
  de: "Ich m\xF6chte hier aus Sicherheitsgr\xFCnden eine Pause machen. Bitte atmet ruhig. Wir k\xF6nnen das Gespr\xE4ch stoppen und fortsetzen, wenn es ruhiger ist.",
  fr: "Je veux faire une pause ici pour la s\xE9curit\xE9. Prenez une respiration lente, s'il vous pla\xEEt. Nous pouvons arr\xEAter la conversation et la reprendre quand ce sera plus calme."
};
function localizedMediatorText(language, mode) {
  return mode === "safety" ? LOCALIZED_SAFETY_TEXT[language] : LOCALIZED_NORMAL_TEXT[language];
}
var SUPPORTED_MEDIATOR_LANGS = ["pl", "en", "es", "it", "de", "fr"];

// services/mediatorEngine/promptComposer/config/promptTemplates.ts
var SYSTEM_RULES_EN = [
  "You are an AI mediator for couples in conflict.",
  "Do not diagnose or provide medical or legal advice.",
  "Do not assign blame or determine who is right.",
  "Do not escalate conflict or moralize.",
  "Safety comes first \u2014 pause if partners show severe distress.",
  "Use calm, brief, respectful language.",
  "Respond with a single mediator utterance."
];
var SYSTEM_RULES_PL = [
  "Jeste\u015B mediatorem AI dla par w konflikcie.",
  "Nie diagnozujesz i nie udzielasz porad medycznych ani prawnych.",
  "Nie rozstrzygasz winy ani tego, kto ma racj\u0119.",
  "Nie eskalujesz konfliktu i nie moralizujesz.",
  "Bezpiecze\u0144stwo jest priorytetem \u2014 w razie silnego cierpienia proponuj pauz\u0119.",
  "U\u017Cywaj spokojnego, kr\xF3tkiego, szanuj\u0105cego j\u0119zyka.",
  "Odpowiedz jedn\u0105 wypowiedzi\u0105 mediatora."
];
var LANGUAGE_INSTRUCTION = {
  pl: "Write the mediator response in Polish.",
  en: "Write the mediator response in English.",
  es: "Write the mediator response in Spanish.",
  it: "Write the mediator response in Italian.",
  de: "Write the mediator response in German.",
  fr: "Write the mediator response in French."
};
function systemRulesForLanguage(language) {
  if (language === "pl") return SYSTEM_RULES_PL;
  return SYSTEM_RULES_EN;
}
function languageInstruction(language) {
  if (SUPPORTED_MEDIATOR_LANGS.includes(language)) {
    return LANGUAGE_INSTRUCTION[language];
  }
  return LANGUAGE_INSTRUCTION.en;
}
var CONSTITUTION_CONSTRAINTS = [
  "Follow mediator constitution: no blame, no diagnosis, no legal/medical advice.",
  "Keep one clear focus per message.",
  "At most one question unless intervention type explicitly allows more.",
  "Respect do-not-repeat constraints from the intervention plan."
];

// services/mediatorEngine/promptComposer/sections/buildSafetyEnvelope.ts
var L3_INSTRUCTIONS = [
  "Safety level L3: stop normal mediation immediately.",
  "Respond with a safety-first message \u2014 acknowledge distress, suggest pause.",
  "Do not deepen conflict or explore blame.",
  "Encourage reaching appropriate professional or emergency support without listing specific hotlines.",
  "Keep the message calm, brief, and non-judgmental."
];
var L2_INSTRUCTIONS = [
  "Safety level L2: pause normal mediation flow.",
  "Prioritize de-escalation and emotional safety over goal progress.",
  "Do not push for agreement or goal advancement.",
  "Suggest a pause or slow-down; validate distress without diagnosing."
];
var L1_INSTRUCTIONS = [
  "Safety level L1: proceed gently with extra care.",
  "Use slower pace and shorter messages.",
  "Monitor for escalation; avoid provocative framing."
];
function buildSafetyEnvelope(level) {
  if (level === "L3_stop") {
    return {
      active: true,
      level,
      instructions: [...L3_INSTRUCTIONS],
      allowNormalMediation: false
    };
  }
  if (level === "L2_pause") {
    return {
      active: true,
      level,
      instructions: [...L2_INSTRUCTIONS],
      allowNormalMediation: false
    };
  }
  if (level === "L1_gentle") {
    return {
      active: true,
      level,
      instructions: [...L1_INSTRUCTIONS],
      allowNormalMediation: true
    };
  }
  return {
    active: false,
    level: "none",
    instructions: [],
    allowNormalMediation: true
  };
}
function formatSafetyEnvelopeSection(envelope) {
  if (!envelope.active) return "Safety: none \u2014 normal mediation flow allowed.";
  return [
    `Safety level: ${envelope.level}`,
    `Allow normal mediation: ${envelope.allowNormalMediation ? "yes" : "no"}`,
    ...envelope.instructions
  ].join("\n");
}

// services/mediatorEngine/promptComposer/sections/buildDeveloperPrompt.ts
function complianceSummary(compliant, violationCount) {
  return `Compliance: ${compliant ? "passed" : "failed"} (${violationCount} violations, no matched text included).`;
}
function buildDeveloperPrompt(ctx, safetyEnvelope) {
  const { strategyOutput, priorityOutput, decisionOutput, intervention, complianceResult } = ctx;
  const lines = [
    "=== Pipeline constraints (deterministic \u2014 follow strictly) ===",
    `Primary strategy: ${strategyOutput.primaryStrategy ?? "build_safety"}`,
    `Therapeutic intent: ${strategyOutput.therapeuticIntent ?? decisionOutput.intent ?? "increase_emotional_safety"}`,
    `Conversation mode: ${priorityOutput.conversationMode ?? "NORMAL"}`,
    `Selected intervention type: ${decisionOutput.selectedInterventionType ?? intervention.type ?? "validate"}`,
    `Decision intent: ${decisionOutput.intent ?? "increase_emotional_safety"}`,
    `Goal transition: ${decisionOutput.goalTransition ?? "stay"}`,
    `Intervention type: ${intervention.type ?? "validate"}`,
    `Expected effect id: ${intervention.expectedEffect?.id ?? "unknown"}`,
    "",
    "=== Safety envelope ===",
    formatSafetyEnvelopeSection(safetyEnvelope),
    "",
    "=== Constitution constraints ===",
    ...CONSTITUTION_CONSTRAINTS,
    "",
    complianceSummary(
      complianceResult.compliant === true,
      Array.isArray(complianceResult.violations) ? complianceResult.violations.length : 0
    )
  ];
  return lines.join("\n");
}

// services/mediatorEngine/promptComposer/config/promptLimits.ts
var PROMPT_LIMITS = {
  maxTranscriptMessages: 8,
  maxMessageChars: 700,
  defaultMaxOutputTokens: 220,
  defaultTemperature: 0.4,
  safetyTemperature: 0.2,
  safetyMaxOutputTokens: 180
};

// services/mediatorEngine/promptComposer/sections/buildModelHints.ts
function buildModelHints(safetyLevel) {
  const isSafetyActive5 = safetyLevel === "L2_pause" || safetyLevel === "L3_stop";
  return {
    temperature: isSafetyActive5 ? PROMPT_LIMITS.safetyTemperature : PROMPT_LIMITS.defaultTemperature,
    maxOutputTokens: isSafetyActive5 ? PROMPT_LIMITS.safetyMaxOutputTokens : PROMPT_LIMITS.defaultMaxOutputTokens,
    style: "calm",
    responseFormat: "plain_text"
  };
}

// services/mediatorEngine/promptComposer/sections/buildSystemPrompt.ts
function buildSystemPrompt(language) {
  const rules = systemRulesForLanguage(language);
  const lines = [...rules, languageInstruction(language)];
  return lines.join("\n");
}

// services/mediatorEngine/promptComposer/config/allowedPromptFields.ts
var FORBIDDEN_PROMPT_FIELD_NAMES = [
  "sessionId",
  "mediationId",
  "userId",
  "evidenceStore",
  "EvidenceStore",
  "matchedText",
  "evidenceRef",
  "email",
  "phone",
  "token",
  "auth"
];
var FORBIDDEN_PROMPT_SUBSTRINGS = [
  '"evidenceStore"',
  '"sessionMemory"',
  'sessionMemory":{',
  'mediationState":{',
  '"matchedText"'
];
var USER_PROMPT_PROHIBITIONS = [
  "Do not mention pipeline, strategy engine, confidence scores, or JSON.",
  "Do not reference internal tests or system modules.",
  "Do not output JSON \u2014 write plain mediator speech only."
];

// services/mediatorEngine/promptComposer/transcript/formatTranscriptWindow.ts
var ROLE_LABEL = {
  host: "Host",
  partner: "Partner",
  mediator: "Mediator"
};
function formatTranscriptWindow(entries) {
  if (entries.length === 0) return "(no recent messages)";
  return entries.map((entry) => `${ROLE_LABEL[entry.authorRole]}: ${entry.content}`).join("\n");
}

// services/mediatorEngine/promptComposer/sections/buildUserPrompt.ts
function allowsMultipleQuestions(interventionType) {
  return interventionType === "choice_emotion" || interventionType === "choice_need";
}
function buildUserPrompt(ctx, contextSummary, transcriptEntries, safetyEnvelope) {
  const interventionType = ctx.intervention.type ?? ctx.decisionOutput.selectedInterventionType ?? "validate";
  const questionRule = allowsMultipleQuestions(interventionType) ? "You may offer a brief choice with up to two options." : "Ask at most one question.";
  const safetyNote = safetyEnvelope.allowNormalMediation ? "" : "Do NOT continue normal mediation \u2014 prioritize safety and pause.";
  const lines = [
    "=== Context ===",
    contextSummary,
    "",
    "=== Recent conversation ===",
    formatTranscriptWindow(transcriptEntries),
    "",
    "=== Task ===",
    "Generate one mediator message (1\u20134 sentences).",
    questionRule,
    safetyNote,
    "",
    "=== Prohibitions ===",
    ...USER_PROMPT_PROHIBITIONS
  ].filter(Boolean);
  return lines.join("\n");
}

// services/mediatorEngine/promptComposer/lib/redactPrivateFields.ts
function redactPrivateFields(text) {
  if (typeof text !== "string") return "";
  let result = text;
  result = result.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    "[REDACTED_EMAIL]"
  );
  result = result.replace(
    /\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{2,4}[\s-]?\d{2,4}\b/g,
    "[REDACTED_PHONE]"
  );
  return result.replace(/\s+/g, " ").trim();
}
function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

// services/mediatorEngine/promptComposer/transcript/sanitizeTranscriptWindow.ts
function normalizeRole2(value) {
  if (value === "host" || value === "partner" || value === "mediator") return value;
  return "mediator";
}
function truncateContent(content) {
  if (content.length <= PROMPT_LIMITS.maxMessageChars) return content;
  return `${content.slice(0, PROMPT_LIMITS.maxMessageChars - 3)}...`;
}
function sanitizeTranscriptWindow(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const recent = list.slice(-PROMPT_LIMITS.maxTranscriptMessages);
  return recent.filter((entry) => entry && typeof entry === "object").map((entry) => {
    const raw = typeof entry.content === "string" ? entry.content : "";
    const cleaned = truncateContent(normalizeWhitespace(redactPrivateFields(raw)));
    if (cleaned.length === 0) return null;
    return {
      authorRole: normalizeRole2(entry.authorRole),
      content: cleaned
    };
  }).filter((entry) => entry !== null);
}

// services/mediatorEngine/promptComposer/build/buildPromptComposerOutput.ts
function buildPromptSections(ctx) {
  const safetyLevel = ctx.safetyOutput?.level ?? "none";
  const safetyEnvelope = buildSafetyEnvelope(safetyLevel);
  const transcriptEntries = sanitizeTranscriptWindow(ctx.transcriptWindow);
  const contextSummary = buildContextSummary(ctx);
  return {
    systemPrompt: buildSystemPrompt(ctx.language),
    developerPrompt: buildDeveloperPrompt(ctx, safetyEnvelope),
    userPrompt: buildUserPrompt(ctx, contextSummary, transcriptEntries, safetyEnvelope),
    contextSummary
  };
}
function buildPromptComposerOutput(ctx) {
  const safetyLevel = ctx.safetyOutput?.level ?? "none";
  const safetyEnvelope = buildSafetyEnvelope(safetyLevel);
  const transcriptEntries = sanitizeTranscriptWindow(ctx.transcriptWindow);
  const sections = buildPromptSections(ctx);
  const tokenEstimate = estimatePromptTokens([
    sections.systemPrompt,
    sections.developerPrompt,
    sections.userPrompt
  ]);
  return {
    systemPrompt: sections.systemPrompt,
    developerPrompt: sections.developerPrompt,
    userPrompt: sections.userPrompt,
    contextSummary: sections.contextSummary,
    promptMetadata: buildPromptMetadata({
      turnNumber: ctx.turnNumber,
      language: ctx.language,
      interventionType: ctx.intervention.type ?? "validate",
      goal: ctx.currentGoal,
      transcriptMessageCount: transcriptEntries.length
    }),
    safetyEnvelope,
    tokenEstimate,
    modelHints: buildModelHints(safetyLevel)
  };
}

// services/mediatorEngine/promptComposer/lib/assertNoForbiddenPromptFields.ts
function forbiddenJsonFieldPattern(fieldName) {
  return new RegExp(`"${fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:`, "i");
}
function containsForbiddenJsonField(text, fieldName) {
  return forbiddenJsonFieldPattern(fieldName).test(text);
}
function assertNoForbiddenPromptFields(text) {
  for (const forbidden of FORBIDDEN_PROMPT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`Forbidden prompt content detected: ${forbidden}`);
    }
  }
  for (const field of FORBIDDEN_PROMPT_FIELD_NAMES) {
    if (containsForbiddenJsonField(text, field)) {
      throw new Error(`Forbidden prompt field detected: ${field}`);
    }
  }
}

// services/mediatorEngine/promptComposer/lib/safePromptInput.ts
var SUPPORTED_LANGUAGES = ["pl", "en", "it", "de", "fr", "es"];
var VALID_SAFETY_LEVELS = ["none", "L1_gentle", "L2_pause", "L3_stop"];
function normalizeLanguage(value) {
  if (typeof value === "string" && SUPPORTED_LANGUAGES.includes(value)) {
    return value;
  }
  return "en";
}
function normalizeSafetyLevel3(value) {
  if (typeof value === "string" && VALID_SAFETY_LEVELS.includes(value)) {
    return value;
  }
  return "none";
}
function safeFallbackLanguage(input) {
  if (!input || typeof input !== "object") return "en";
  const raw = input;
  const state = raw.mediationState && typeof raw.mediationState === "object" ? raw.mediationState : null;
  return normalizeLanguage(raw.language ?? state?.meta?.language);
}
function safeFallbackSafetyLevel(input) {
  if (!input || typeof input !== "object") return "none";
  const raw = input;
  const safety = raw.safetyOutput && typeof raw.safetyOutput === "object" ? raw.safetyOutput : null;
  return normalizeSafetyLevel3(safety?.level);
}
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}
function safePromptInput(input) {
  const raw = input && typeof input === "object" ? input : {};
  const state = raw.mediationState && typeof raw.mediationState === "object" ? raw.mediationState : {};
  return {
    turnNumber: typeof raw.turnNumber === "number" && raw.turnNumber > 0 ? raw.turnNumber : 1,
    language: normalizeLanguage(raw.language ?? state.meta?.language),
    currentGoal: typeof state.currentGoal === "string" ? state.currentGoal : "SAFE_OPENING",
    mediationState: state,
    sessionMemory: raw.sessionMemory && typeof raw.sessionMemory === "object" ? raw.sessionMemory : createEmptySessionMemory(),
    safetyOutput: raw.safetyOutput && typeof raw.safetyOutput === "object" ? raw.safetyOutput : null,
    reflectionOutput: raw.reflectionOutput && typeof raw.reflectionOutput === "object" ? raw.reflectionOutput : {},
    strategyOutput: raw.strategyOutput && typeof raw.strategyOutput === "object" ? raw.strategyOutput : {},
    priorityOutput: raw.priorityOutput && typeof raw.priorityOutput === "object" ? raw.priorityOutput : {},
    decisionOutput: raw.decisionOutput && typeof raw.decisionOutput === "object" ? raw.decisionOutput : {},
    intervention: raw.intervention && typeof raw.intervention === "object" ? raw.intervention : {},
    complianceResult: raw.complianceResult && typeof raw.complianceResult === "object" ? raw.complianceResult : { compliant: true, violations: [], attemptNumber: 1, fallbackUsed: false, validatedAt: "", validatorLayer: "deterministic" },
    transcriptWindow: safeArray(raw.transcriptWindow),
    continuityContext: raw.continuityContext && typeof raw.continuityContext === "object" ? raw.continuityContext : null
  };
}

// services/mediatorEngine/promptComposer/composePrompt.ts
function createFallbackOutput(language = "en", safetyLevel = "none") {
  const safetyEnvelope = buildSafetyEnvelope(safetyLevel);
  const isSafetyBlock = safetyLevel === "L2_pause" || safetyLevel === "L3_stop";
  const rules = systemRulesForLanguage(language);
  const systemPrompt = [...rules, languageInstruction(language)].join("\n");
  const userPrompt = [
    "Generate one calm, brief mediator message.",
    isSafetyBlock ? "Do NOT continue normal mediation \u2014 prioritize safety and pause." : "",
    ...USER_PROMPT_PROHIBITIONS
  ].filter(Boolean).join("\n");
  const developerPrompt = isSafetyBlock ? [
    "Fallback mode: use safe defaults. Primary strategy: build_safety.",
    "Safety fallback: follow the safety envelope \u2014 stop or pause normal mediation.",
    "",
    "=== Safety envelope ===",
    formatSafetyEnvelopeSection(safetyEnvelope)
  ].join("\n") : "Fallback mode: use safe defaults. Primary strategy: build_safety.";
  return {
    systemPrompt,
    developerPrompt,
    userPrompt,
    contextSummary: "Fallback context \u2014 minimal safe prompt.",
    promptMetadata: {
      turnNumber: 1,
      language,
      interventionType: "validate",
      goal: "SAFE_OPENING",
      composedAt: (/* @__PURE__ */ new Date()).toISOString(),
      transcriptMessageCount: 0
    },
    safetyEnvelope,
    tokenEstimate: Math.ceil((systemPrompt.length + userPrompt.length) / 4),
    modelHints: buildModelHints(safetyLevel)
  };
}
function composePrompt(input) {
  try {
    const ctx = safePromptInput(input);
    const output = buildPromptComposerOutput(ctx);
    const combined = [
      output.systemPrompt,
      output.developerPrompt,
      output.userPrompt,
      output.contextSummary
    ].join("\n");
    assertNoForbiddenPromptFields(combined);
    return output;
  } catch {
    return createFallbackOutput(safeFallbackLanguage(input), safeFallbackSafetyLevel(input));
  }
}

// services/mediatorEngine/llm/config/llmLimits.ts
var LLM_LIMITS = {
  maxReplyChars: 900,
  maxQuestions: 1,
  maxSentences: 4
};

// services/mediatorEngine/llm/config/forbiddenLlmOutput.ts
var FORBIDDEN_LLM_TERMS = [
  "pipeline",
  "confidence",
  "json",
  "strategy engine",
  "as an ai language model",
  "evidencestore",
  "sessionmemory",
  "promptcomposer",
  "constitution validator",
  "intervention engine",
  "decision engine",
  "priority engine",
  "reflection engine",
  "state analyzer"
];
var CONFLICT_ESCALATION_PHRASES = [
  "who is right",
  "who's right",
  "who is at fault",
  "kto ma racj\u0119",
  "kto jest winny",
  "decide who",
  "determine who"
];

// services/mediatorEngine/llm/config/safetyLanguagePatterns.ts
var SAFETY_WORDING_PATTERNS = {
  en: [/\bpause\b/i, /\bsafety\b/i, /\btake a break\b/i, /\bslow down\b/i, /\bstep back\b/i],
  pl: [/\bpauz/i, /\bbezpiecze/i, /\bprzerw/i, /\bspowoln/i, /\boddech/i, /\bspokojniej/i],
  es: [/\bpausa\b/i, /\bseguridad\b/i, /\brespir/i, /\bdetener\b/i],
  it: [/\bpausa\b/i, /\bsicurezza\b/i, /\brespir/i, /\bfermar/i],
  de: [/\bpause\b/i, /\bsicherheit\b/i, /\batmet\b/i, /\bstoppen\b/i],
  fr: [/\bpause\b/i, /\bsécurité\b/i, /\brespiration\b/i, /\barrêter\b/i]
};
function hasSafetyWordingForLanguage(text, language) {
  const patterns = SAFETY_WORDING_PATTERNS[language] ?? SAFETY_WORDING_PATTERNS.en;
  return patterns.some((pattern) => pattern.test(text));
}
var SAFETY_REQUIRED_PATTERNS_EN = SAFETY_WORDING_PATTERNS.en;
var SAFETY_REQUIRED_PATTERNS_PL = SAFETY_WORDING_PATTERNS.pl;

// services/mediatorEngine/llm/validate/validateSafetyReply.ts
function isSafetyLevelActive(level) {
  return level === "L2_pause" || level === "L3_stop";
}
function hasSafetyWording(text, language) {
  return hasSafetyWordingForLanguage(text, language);
}
function hasConflictEscalation(text) {
  const lower = text.toLowerCase();
  return CONFLICT_ESCALATION_PHRASES.some((phrase) => lower.includes(phrase.toLowerCase()));
}
function validateSafetyReply(text, safetyLevel, language) {
  if (!isSafetyLevelActive(safetyLevel)) {
    return { compliant: true, reasons: [] };
  }
  const reasons = [];
  if (!hasSafetyWording(text, language)) {
    reasons.push("Missing required safety/pause wording for L2/L3");
  }
  if (hasConflictEscalation(text)) {
    reasons.push("Encourages conflict escalation or blame");
  }
  const lower = text.toLowerCase();
  const normalMediationPhrases = [
    "let us explore",
    "let's explore",
    "what happened between",
    "move forward with the mediation",
    "kontynuujmy mediacj",
    "przeanalizujmy konflikt"
  ];
  if (normalMediationPhrases.some((phrase) => lower.includes(phrase))) {
    reasons.push("Continues normal mediation under safety level");
  }
  return { compliant: reasons.length === 0, reasons };
}
function findBlockedTerms(text) {
  const lower = text.toLowerCase();
  return FORBIDDEN_LLM_TERMS.filter((term) => lower.includes(term));
}
function countQuestions2(text) {
  const matches = text.match(/\?/g);
  return matches ? matches.length : 0;
}
function countSentences2(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const parts = trimmed.split(/[.!?]+/).filter((part) => part.trim().length > 0);
  return Math.max(parts.length, 1);
}

// services/mediatorEngine/llm/fallback/createFallbackMediatorReply.ts
function fallbackText(language, safetyLevel) {
  const mode = safetyLevel === "L2_pause" || safetyLevel === "L3_stop" ? "safety" : "normal";
  return localizedMediatorText(language, mode);
}
function createFallbackMediatorReply(language, safetyLevel, turnNumber, invalidReasons = []) {
  const text = fallbackText(language, safetyLevel);
  const questionCount = countQuestions2(text);
  const sentenceCount = countSentences2(text);
  const lengthChars = text.length;
  return {
    text,
    language,
    safetyLevel,
    source: "fallback",
    validation: {
      valid: true,
      reasons: invalidReasons.length > 0 ? [`Fallback used: ${invalidReasons.join("; ")}`] : [],
      blockedTermsFound: [],
      questionCount,
      sentenceCount,
      lengthChars,
      safetyCompliant: true
    },
    metadata: {
      turnNumber,
      providerId: "fallback",
      model: "fallback",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}

// services/mediatorEngine/runtime/lib/buildPromptComposerInputFromTurn.ts
function createPlaceholderLastIntervention2(turnNumber) {
  return {
    id: "runtime-last-intervention",
    type: "welcome_open",
    target: "both",
    visibility: "public",
    content: { primaryMessage: "" },
    goal: "SAFE_OPENING",
    rationale: "",
    expectedEffectSummary: "",
    doNotRepeatBefore: turnNumber
  };
}
function buildStrategyStateContext2(state, sessionMemory) {
  const goalChecks = state.goals.flatMap((goal) => goal.checks);
  return {
    currentGoal: state.currentGoal,
    goalChecks,
    dynamics: {
      temperature: state.load.host,
      escalation: state.load.exhaustionDetected,
      blameLoop: state.load.disengagementRisk,
      breakthrough: { ...state.load.host, value: null },
      evasion: state.load.disengagementRisk,
      mutualUnderstanding: {
        value: state.dynamics.mutualUnderstandingScore,
        confidence: 0,
        source: "heuristic",
        evidence: [],
        assessedAt: state.meta.lastUpdatedAt,
        stale: false
      }
    },
    pace: state.pace.current,
    load: state.load,
    recovery: state.recovery,
    sessionPersonality: state.personality,
    sessionMemory,
    sessionObjectives: state.sessionObjectives
  };
}
function buildPromptComposerInputFromTurn(request, sessionMemory, orchestrated, language) {
  const stateBefore = request.mediationState ?? createEmptyMediationState(request);
  const state = orchestrated.mediationState;
  const turnNumber = request.turnNumber;
  const safetyOutput = evaluateSafety({
    state,
    transcriptDelta: request.transcriptDelta,
    turnNumber
  });
  const reflectionOutput = runReflection({
    lastIntervention: createPlaceholderLastIntervention2(turnNumber),
    stateBefore,
    stateAfter: state,
    transcriptDelta: request.transcriptDelta,
    goalChecksDelta: []
  });
  const strategyOutput = selectStrategy({
    state: buildStrategyStateContext2(state, sessionMemory),
    reflection: reflectionOutput,
    safety: safetyOutput,
    turnNumber
  });
  const priorityOutput = resolvePriority({
    state,
    reflection: reflectionOutput,
    safety: safetyOutput,
    strategy: strategyOutput,
    turnNumber
  });
  const continuityContext = buildContinuityContext({
    sessionMemory,
    recommendedInterventionType: priorityOutput.recommendedInterventionType
  });
  const decisionOutput = makeDecision({
    state,
    reflection: reflectionOutput,
    strategy: strategyOutput,
    priority: priorityOutput,
    safety: safetyOutput,
    turnNumber,
    sessionMemory,
    continuityContext
  });
  return {
    mediationState: state,
    sessionMemory: orchestrated.sessionMemory,
    safetyOutput,
    reflectionOutput,
    strategyOutput,
    priorityOutput,
    decisionOutput,
    intervention: orchestrated.intervention,
    complianceResult: orchestrated.complianceResult,
    transcriptWindow: Array.isArray(request.transcriptDelta) ? request.transcriptDelta : [],
    language,
    turnNumber,
    continuityContext
  };
}

// services/mediatorEngine/llm/adapters/deterministicStubProvider.ts
function isSafetyActive3(safetyLevel) {
  return safetyLevel === "L2_pause" || safetyLevel === "L3_stop";
}
function stubText(language, safety) {
  const mode = safety ? "safety" : "normal";
  return localizedMediatorText(language, mode);
}
function createDeterministicStubProvider() {
  return {
    providerId: "deterministic-stub",
    async generateText(request) {
      const { safetyLevel, language } = request.metadata;
      const text = stubText(language, isSafetyActive3(safetyLevel));
      return {
        text,
        provider: "deterministic-stub",
        model: "stub-v1",
        latencyMs: 1,
        finishReason: "stop"
      };
    }
  };
}

// services/mediatorEngine/runtime/adapters/defaultRuntimeProvider.ts
function createDefaultRuntimeProvider() {
  return createDeterministicStubProvider();
}

// services/mediatorEngine/runtime/config/runtimeLimits.ts
var RUNTIME_LIMITS = {
  defaultMaxReplyAttempts: 2,
  engineVersion: "v2.3"
};

// services/mediatorEngine/runtime/lib/safeRuntimeInput.ts
var SUPPORTED_LANGUAGES2 = ["pl", "en", "it", "de", "fr", "es"];
function normalizeLanguage2(value, fallback = "en") {
  if (typeof value === "string" && SUPPORTED_LANGUAGES2.includes(value)) {
    return value;
  }
  return fallback;
}
function createFallbackTurnInput() {
  return {
    mediationId: "runtime-fallback-mediation",
    sessionId: "runtime-fallback-session",
    trigger: "session_start",
    turnNumber: 1,
    mediationState: null,
    transcriptDelta: [],
    engineVersion: "v2.3"
  };
}
function safeRuntimeInput(input) {
  const raw = input && typeof input === "object" ? input : {};
  const turnInput = raw.turnInput && typeof raw.turnInput === "object" ? raw.turnInput : createFallbackTurnInput();
  const stateLanguage = turnInput.mediationState && typeof turnInput.mediationState === "object" ? turnInput.mediationState.meta?.language : void 0;
  const language = normalizeLanguage2(raw.language ?? stateLanguage);
  return {
    turnInput,
    sessionMemory: raw.sessionMemory && typeof raw.sessionMemory === "object" ? raw.sessionMemory : createEmptySessionMemory(),
    llmProvider: raw.llmProvider && typeof raw.llmProvider === "object" && typeof raw.llmProvider.generateText === "function" ? raw.llmProvider : createDefaultRuntimeProvider(),
    maxReplyAttempts: typeof raw.maxReplyAttempts === "number" && raw.maxReplyAttempts > 0 ? raw.maxReplyAttempts : RUNTIME_LIMITS.defaultMaxReplyAttempts,
    language
  };
}

// services/mediatorEngine/llm/lib/buildLlmRequest.ts
function buildLlmRequest(ctx) {
  const output = ctx.promptComposerOutput;
  return {
    systemPrompt: output.systemPrompt,
    developerPrompt: output.developerPrompt,
    userPrompt: output.userPrompt,
    modelHints: output.modelHints,
    metadata: {
      turnNumber: ctx.turnNumber,
      language: ctx.language,
      safetyLevel: ctx.safetyLevel,
      interventionType: output.promptMetadata.interventionType,
      goal: output.promptMetadata.goal
    }
  };
}

// services/mediatorEngine/llm/fallback/createFallbackPromptOutput.ts
function createFallbackPromptOutput(language = "en", safetyLevel = "none") {
  const safetyEnvelope = buildSafetyEnvelope(safetyLevel);
  const rules = systemRulesForLanguage(language);
  return {
    systemPrompt: [...rules, languageInstruction(language)].join("\n"),
    developerPrompt: "Fallback prompt context.",
    userPrompt: "Generate one calm, brief mediator message.",
    contextSummary: "Fallback context.",
    promptMetadata: {
      turnNumber: 1,
      language,
      interventionType: "validate",
      goal: "SAFE_OPENING",
      composedAt: (/* @__PURE__ */ new Date()).toISOString(),
      transcriptMessageCount: 0
    },
    safetyEnvelope,
    tokenEstimate: 100,
    modelHints: buildModelHints(safetyLevel)
  };
}

// services/mediatorEngine/llm/lib/safeLlmInput.ts
var SUPPORTED_LANGUAGES3 = ["pl", "en", "it", "de", "fr", "es"];
var VALID_SAFETY_LEVELS2 = ["none", "L1_gentle", "L2_pause", "L3_stop"];
function normalizeLanguage3(value) {
  if (typeof value === "string" && SUPPORTED_LANGUAGES3.includes(value)) {
    return value;
  }
  return "en";
}
function normalizeSafetyLevel4(value) {
  if (typeof value === "string" && VALID_SAFETY_LEVELS2.includes(value)) {
    return value;
  }
  return "none";
}
function normalizeTurnNumber4(value) {
  return typeof value === "number" && value > 0 ? value : 1;
}
function normalizePromptOutput(value, language, safetyLevel) {
  if (value && typeof value === "object" && typeof value.systemPrompt === "string") {
    return value;
  }
  return createFallbackPromptOutput(language, safetyLevel);
}
function safeLlmInput(input) {
  const raw = input && typeof input === "object" ? input : {};
  const language = normalizeLanguage3(raw.language);
  const safetyLevel = normalizeSafetyLevel4(raw.safetyLevel);
  const turnNumber = normalizeTurnNumber4(raw.turnNumber);
  const promptComposerOutput = normalizePromptOutput(raw.promptComposerOutput, language, safetyLevel);
  const provider = raw.provider && typeof raw.provider === "object" && typeof raw.provider.generateText === "function" ? raw.provider : createMissingProviderStub();
  return {
    promptComposerOutput,
    provider,
    language,
    safetyLevel,
    turnNumber
  };
}
function createMissingProviderStub() {
  return {
    providerId: "missing-provider",
    async generateText() {
      throw new Error("No LLM provider configured");
    }
  };
}

// services/mediatorEngine/llm/parse/sanitizeLlmResponse.ts
function sanitizeLlmResponse(raw) {
  if (typeof raw !== "string") return "";
  let text = raw.trim();
  text = text.replace(/^```(?:json|text|markdown)?\s*\n?/i, "");
  text = text.replace(/\n?```\s*$/i, "");
  const jsonWrapperMatch = text.match(/^\{\s*"(?:text|reply|message|content)"\s*:\s*"([\s\S]*)"\s*\}$/);
  if (jsonWrapperMatch) {
    text = jsonWrapperMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n");
  }
  if (text.startsWith('"') && text.endsWith('"') || text.startsWith("'") && text.endsWith("'")) {
    text = text.slice(1, -1);
  }
  return text.replace(/\s+/g, " ").trim();
}

// services/mediatorEngine/llm/parse/parseLlmTextResponse.ts
function parseLlmTextResponse(raw) {
  return sanitizeLlmResponse(raw);
}

// services/mediatorEngine/llm/validate/validateDraftReply.ts
function validateDraftReply(text, language, safetyLevel) {
  const reasons = [];
  const trimmed = text.trim();
  const questionCount = countQuestions2(trimmed);
  const sentenceCount = countSentences2(trimmed);
  const lengthChars = trimmed.length;
  const blockedTermsFound = findBlockedTerms(trimmed);
  if (!trimmed) {
    reasons.push("Empty reply text");
  }
  if (lengthChars > LLM_LIMITS.maxReplyChars) {
    reasons.push(`Reply exceeds max length (${LLM_LIMITS.maxReplyChars} chars)`);
  }
  if (questionCount > LLM_LIMITS.maxQuestions) {
    reasons.push(`Too many questions (${questionCount} > ${LLM_LIMITS.maxQuestions})`);
  }
  if (sentenceCount > LLM_LIMITS.maxSentences) {
    reasons.push(`Too many sentences (${sentenceCount} > ${LLM_LIMITS.maxSentences})`);
  }
  if (blockedTermsFound.length > 0) {
    reasons.push(`Forbidden terms found: ${blockedTermsFound.join(", ")}`);
  }
  const safetyResult = validateSafetyReply(trimmed, safetyLevel, language);
  if (!safetyResult.compliant) {
    reasons.push(...safetyResult.reasons);
  }
  return {
    valid: reasons.length === 0,
    reasons,
    blockedTermsFound,
    questionCount,
    sentenceCount,
    lengthChars,
    safetyCompliant: safetyResult.compliant
  };
}

// services/mediatorEngine/llm/generateMediatorReply.ts
function resolveSource(providerId) {
  if (providerId === "deterministic-stub") return "stub";
  if (providerId === "fallback") return "fallback";
  return "llm";
}
function buildSuccessOutput(text, providerId, model, ctx, providerResponse, generatedAt) {
  const validation = validateDraftReply(text, ctx.language, ctx.safetyLevel);
  return {
    draftReply: {
      text,
      language: ctx.language,
      safetyLevel: ctx.safetyLevel,
      source: resolveSource(providerId),
      validation,
      metadata: {
        turnNumber: ctx.turnNumber,
        providerId,
        model,
        generatedAt
      }
    },
    providerResponse,
    fallbackUsed: false,
    generatedAt
  };
}
function buildFallbackOutput(ctx, reasons, providerResponse, generatedAt) {
  const at = generatedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  return {
    draftReply: createFallbackMediatorReply(ctx.language, ctx.safetyLevel, ctx.turnNumber, reasons),
    providerResponse,
    fallbackUsed: true,
    generatedAt: at
  };
}
async function generateMediatorReply(input) {
  const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const ctx = safeLlmInput(input);
    const request = buildLlmRequest(ctx);
    let providerResponse;
    try {
      providerResponse = await ctx.provider.generateText(request);
    } catch {
      return buildFallbackOutput(ctx, ["Provider error"], void 0, generatedAt);
    }
    const text = parseLlmTextResponse(providerResponse.text ?? "");
    if (!text.trim()) {
      return buildFallbackOutput(ctx, ["Empty provider response"], providerResponse, generatedAt);
    }
    const validation = validateDraftReply(text, ctx.language, ctx.safetyLevel);
    if (!validation.valid) {
      return buildFallbackOutput(ctx, validation.reasons, providerResponse, generatedAt);
    }
    return buildSuccessOutput(
      text,
      ctx.provider.providerId,
      providerResponse.model,
      ctx,
      providerResponse,
      generatedAt
    );
  } catch {
    const draftReply = createFallbackMediatorReply("en", "none", 1, ["Unexpected error"]);
    return {
      draftReply,
      fallbackUsed: true,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}

// services/mediatorEngine/responseValidator/fallback/buildValidatedFallback.ts
function buildValidatedFallback(language, safetyLevel, turnNumber, reasons = []) {
  return createFallbackMediatorReply(language, safetyLevel, turnNumber, reasons);
}

// services/mediatorEngine/responseValidator/config/responseValidationLimits.ts
var RESPONSE_VALIDATION_LIMITS = {
  maxReplyChars: 900,
  maxQuestions: 1,
  maxSentences: 4,
  defaultMaxAttempts: 2
};

// services/mediatorEngine/responseValidator/retry/buildRetryInstruction.ts
function buildRetryInstruction(blockingReasons) {
  const uniqueReasons = [...new Set(blockingReasons.filter(Boolean))];
  const reasonSummary = uniqueReasons.length > 0 ? uniqueReasons.join("; ") : "Reply failed post-LLM validation";
  return [
    "Rewrite the mediator reply.",
    `Fix these issues: ${reasonSummary}.`,
    `Use at most ${RESPONSE_VALIDATION_LIMITS.maxSentences} sentences and ${RESPONSE_VALIDATION_LIMITS.maxQuestions} question.`,
    `Stay under ${RESPONSE_VALIDATION_LIMITS.maxReplyChars} characters.`,
    "Write plain mediator speech only \u2014 no technical terms, JSON, or system references.",
    "Do not include conversation history or internal module names."
  ].join(" ");
}

// services/mediatorEngine/responseValidator/rules/validateDraftValidationFlag.ts
function validateDraftValidationFlag(ctx) {
  const passed = ctx.draftReply.validation?.valid !== false;
  return {
    ruleId: "draft_validation_flag",
    passed,
    severity: "block",
    reason: passed ? "Draft validation flag OK" : "Draft reply marked invalid by LLM bridge"
  };
}

// services/mediatorEngine/responseValidator/config/forbiddenResponseTerms.ts
var FORBIDDEN_RESPONSE_TERMS = [
  "pipeline",
  "confidence",
  "json",
  "strategy engine",
  "as an ai language model",
  "evidencestore",
  "sessionmemory",
  "promptcomposer",
  "constitution validator",
  "intervention engine",
  "decision engine",
  "priority engine",
  "reflection engine",
  "state analyzer"
];
var TECHNICAL_LEAKAGE_TERMS = [
  "sessionId",
  "sessionId:",
  "mediationId",
  "mediationId:",
  "evidenceStore",
  "sessionMemory",
  "providerResponse",
  "tokenUsage",
  '"sessionId"',
  '"mediationId"',
  '"evidenceStore"'
];
var NORMAL_MEDIATION_PHRASES = [
  "let us explore",
  "let's explore",
  "what happened between",
  "move forward with the mediation",
  "kontynuujmy mediacj",
  "przeanalizujmy konflikt"
];
var POLISH_MARKERS = /[ąćęłńśźż]/i;
var POLISH_COMMON_WORDS = /\b(słyszę|rozumiem|proszę|chcę|zatrzymaj|zatrzymajmy|spokojnie|po kolei|zatrzymajmy się|to trudne|rozmow|bezpiecze|pauz|oddech|trudne|oboje|mówcie|weźcie)\b/i;
var ENGLISH_COMMON_WORDS = /\b(I hear|I understand|please|let us|let's|let's pause|take your time|take a|moment|both of you|speak|pause|safety|breath|slow breath|one at a time|this is difficult)\b/i;
var ENGLISH_STRONG_MARKERS = /\b(I hear|I understand|both of you|let us speak|let's speak|one at a time|this is difficult|take your time)\b/i;
var SPANISH_COMMON_WORDS = /\b(escucho|entiendo|comprendo|entend|siento|ambos|momento|respir|difícil|pausa|seguridad|hablemos|tomemos|gracias|pueden|parece|importante|ustedes|escucha)\b/i;
var ITALIAN_COMMON_WORDS = /\b(sento|entrambi|momento|respir|difficile|pausa|sicurezza|parliamo|prendiamo)\b/i;
var GERMAN_COMMON_WORDS = /\b(höre|verstehe|verständlich|schwierig|moment|atmet|bitte|pause|sicherheit|sprechen|innehalten|gehört|lassen|wichtig|danke|können|merke)\b/i;
var FRENCH_COMMON_WORDS = /\b(entends|difficile|moment|respiration|sécurité|parlons|prenons|pause)\b/i;

// services/mediatorEngine/responseValidator/lib/termMatching.ts
function normalizeTextForPhraseMatch(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function isMultiWordTerm(term) {
  return term.trim().includes(" ");
}
function matchesSingleWordTerm(text, term) {
  const pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
  return pattern.test(text);
}
function matchesPhraseTerm(text, term) {
  return normalizeTextForPhraseMatch(text).includes(term.toLowerCase());
}
function findForbiddenTerms(text, terms) {
  if (typeof text !== "string" || text.length === 0) return [];
  const found = [];
  for (const term of terms) {
    const matched = isMultiWordTerm(term) ? matchesPhraseTerm(text, term) : matchesSingleWordTerm(text, term);
    if (matched) found.push(term);
  }
  return found;
}
function findTechnicalLeakageTerms(text, terms) {
  if (typeof text !== "string" || text.length === 0) return [];
  const found = [];
  for (const term of terms) {
    if (term.endsWith(":")) {
      const base = term.slice(0, -1);
      const pattern = new RegExp(`\\b${escapeRegex(base)}\\s*:`, "i");
      if (pattern.test(text)) found.push(term);
      continue;
    }
    if (term.startsWith('"')) {
      if (text.toLowerCase().includes(term.toLowerCase())) found.push(term);
      continue;
    }
    if (matchesSingleWordTerm(text, term)) found.push(term);
  }
  return found;
}

// services/mediatorEngine/responseValidator/rules/validateForbiddenTerms.ts
function validateForbiddenTerms(ctx) {
  const found = findForbiddenTerms(ctx.text, FORBIDDEN_RESPONSE_TERMS);
  const passed = found.length === 0;
  return {
    ruleId: "forbidden_terms",
    passed,
    severity: "block",
    reason: passed ? "No forbidden terms found" : `Forbidden terms found: ${found.join(", ")}`,
    metadata: { count: found.length }
  };
}

// services/mediatorEngine/responseValidator/lib/detectLanguageLite.ts
var SECONDARY_LANGS = ["es", "it", "de", "fr"];
function looksPolish(text) {
  return POLISH_MARKERS.test(text) || POLISH_COMMON_WORDS.test(text);
}
function looksEnglish(text) {
  return ENGLISH_COMMON_WORDS.test(text) && !POLISH_MARKERS.test(text);
}
function looksEnglishStrong(text) {
  return ENGLISH_STRONG_MARKERS.test(text) && !POLISH_MARKERS.test(text);
}
function looksSpanish(text) {
  return SPANISH_COMMON_WORDS.test(text);
}
function looksItalian(text) {
  return ITALIAN_COMMON_WORDS.test(text);
}
function looksGerman(text) {
  return GERMAN_COMMON_WORDS.test(text);
}
function looksFrench(text) {
  return FRENCH_COMMON_WORDS.test(text);
}
var LANGUAGE_DETECTORS = {
  pl: looksPolish,
  en: looksEnglish,
  es: looksSpanish,
  it: looksItalian,
  de: looksGerman,
  fr: looksFrench
};
function looksLikeWrongPrimaryLanguage(text, expected) {
  if (expected !== "pl" && looksPolish(text)) return true;
  if (expected !== "en" && looksEnglishStrong(text)) return true;
  return false;
}
function looksLikeWrongSecondaryLanguage(text, expected) {
  if (looksPolish(text)) return true;
  if (expected !== "en" && looksEnglishStrong(text)) return true;
  return false;
}
function detectLanguageLite(text, expectedLanguage) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { matchesExpected: false, severity: "block", reason: "Empty text for language check" };
  }
  const detector = LANGUAGE_DETECTORS[expectedLanguage];
  if (detector?.(trimmed)) {
    return { matchesExpected: true, severity: "none", reason: `${expectedLanguage} markers detected` };
  }
  if (expectedLanguage === "pl" || expectedLanguage === "en") {
    if (looksLikeWrongPrimaryLanguage(trimmed, expectedLanguage)) {
      return {
        matchesExpected: false,
        severity: "block",
        reason: `Expected ${expectedLanguage} reply but different language detected`
      };
    }
    return {
      matchesExpected: false,
      severity: "warn",
      reason: `Could not confirm ${expectedLanguage} phrasing`
    };
  }
  if (SECONDARY_LANGS.includes(expectedLanguage)) {
    if (looksLikeWrongSecondaryLanguage(trimmed, expectedLanguage)) {
      const wrongLang = looksPolish(trimmed) ? "Polish" : "English";
      return {
        matchesExpected: false,
        severity: "block",
        reason: `Expected ${expectedLanguage} reply but ${wrongLang} markers detected`
      };
    }
    return {
      matchesExpected: false,
      severity: "warn",
      reason: `Could not confirm ${expectedLanguage} phrasing`
    };
  }
  return { matchesExpected: true, severity: "none", reason: "Language check skipped for locale" };
}

// services/mediatorEngine/responseValidator/rules/validateLanguage.ts
function validateLanguage(ctx) {
  const result = detectLanguageLite(ctx.text, ctx.language);
  if (result.matchesExpected) {
    return {
      ruleId: "language_lite",
      passed: true,
      severity: "warn",
      reason: result.reason
    };
  }
  return {
    ruleId: "language_lite",
    passed: false,
    severity: result.severity === "block" ? "block" : "warn",
    reason: result.reason
  };
}

// services/mediatorEngine/responseValidator/lib/textMetrics.ts
function countQuestions3(text) {
  const matches = text.match(/\?/g);
  return matches ? matches.length : 0;
}
function countSentences3(text) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const parts = trimmed.split(/[.!?]+/).filter((part) => part.trim().length > 0);
  return Math.max(parts.length, 1);
}
function computeTextMetrics(text) {
  const trimmed = text.trim();
  return {
    lengthChars: trimmed.length,
    questionCount: countQuestions3(trimmed),
    sentenceCount: countSentences3(trimmed)
  };
}

// services/mediatorEngine/responseValidator/rules/validateLength.ts
function validateLength(ctx) {
  const { lengthChars } = computeTextMetrics(ctx.text);
  const passed = lengthChars <= RESPONSE_VALIDATION_LIMITS.maxReplyChars;
  return {
    ruleId: "max_length",
    passed,
    severity: "block",
    reason: passed ? `Reply length OK (${lengthChars} chars)` : `Reply exceeds max length (${lengthChars} > ${RESPONSE_VALIDATION_LIMITS.maxReplyChars})`,
    metadata: { lengthChars }
  };
}

// services/mediatorEngine/responseValidator/rules/validateNoTechnicalLeakage.ts
function validateNoTechnicalLeakage(ctx) {
  const found = findTechnicalLeakageTerms(ctx.text, TECHNICAL_LEAKAGE_TERMS);
  const passed = found.length === 0;
  return {
    ruleId: "no_technical_leakage",
    passed,
    severity: "block",
    reason: passed ? "No technical leakage detected" : `Technical leakage detected: ${found.join(", ")}`,
    metadata: { count: found.length }
  };
}

// services/mediatorEngine/responseValidator/rules/validateNonEmptyReply.ts
function validateNonEmptyReply(ctx) {
  const passed = ctx.text.trim().length > 0;
  return {
    ruleId: "non_empty",
    passed,
    severity: "block",
    reason: passed ? "Reply text is present" : "Reply text is empty"
  };
}

// services/mediatorEngine/responseValidator/rules/validateQuestions.ts
function validateQuestions(ctx) {
  const { questionCount } = computeTextMetrics(ctx.text);
  const passed = questionCount <= RESPONSE_VALIDATION_LIMITS.maxQuestions;
  return {
    ruleId: "max_questions",
    passed,
    severity: "block",
    reason: passed ? `Question count OK (${questionCount})` : `Too many questions (${questionCount} > ${RESPONSE_VALIDATION_LIMITS.maxQuestions})`,
    metadata: { questionCount }
  };
}

// services/mediatorEngine/responseValidator/rules/validateSafetyCompliance.ts
function isSafetyActive4(level) {
  return level === "L2_pause" || level === "L3_stop";
}
function hasSafetyWording2(text, language) {
  return hasSafetyWordingForLanguage(text, language);
}
function validateSafetyCompliance(ctx) {
  if (!isSafetyActive4(ctx.safetyLevel)) {
    return {
      ruleId: "safety_compliance",
      passed: true,
      severity: "block",
      reason: "Safety level does not require safety wording"
    };
  }
  const lower = ctx.text.toLowerCase();
  const reasons = [];
  if (!hasSafetyWording2(ctx.text, ctx.language)) {
    reasons.push("Missing required safety/pause wording for L2/L3");
  }
  if (NORMAL_MEDIATION_PHRASES.some((phrase) => lower.includes(phrase))) {
    reasons.push("Continues normal mediation under safety level");
  }
  const passed = reasons.length === 0;
  return {
    ruleId: "safety_compliance",
    passed,
    severity: "block",
    reason: passed ? "Safety compliance OK" : reasons.join("; ")
  };
}

// services/mediatorEngine/responseValidator/rules/validateSentences.ts
function validateSentences(ctx) {
  const { sentenceCount } = computeTextMetrics(ctx.text);
  const passed = sentenceCount <= RESPONSE_VALIDATION_LIMITS.maxSentences;
  return {
    ruleId: "max_sentences",
    passed,
    severity: "block",
    reason: passed ? `Sentence count OK (${sentenceCount})` : `Too many sentences (${sentenceCount} > ${RESPONSE_VALIDATION_LIMITS.maxSentences})`,
    metadata: { sentenceCount }
  };
}

// services/mediatorEngine/responseValidator/rules/index.ts
var RESPONSE_VALIDATION_RULES = [
  validateDraftValidationFlag,
  validateNonEmptyReply,
  validateLength,
  validateQuestions,
  validateSentences,
  validateForbiddenTerms,
  validateNoTechnicalLeakage,
  validateSafetyCompliance,
  validateLanguage
];
function runAllValidationRules(ctx) {
  return RESPONSE_VALIDATION_RULES.map((rule) => rule(ctx));
}

// services/mediatorEngine/responseValidator/resolve/buildResponseValidationResult.ts
function resolveAction(hasBlockingFailures, attemptNumber, maxAttempts) {
  if (!hasBlockingFailures) return "accept";
  if (attemptNumber < maxAttempts) return "retry";
  return "fallback";
}
function buildResponseValidationResult(ctx, ruleResults, validatedAt) {
  const blockingReasons = ruleResults.filter((r) => !r.passed && r.severity === "block").map((r) => r.reason);
  const warningReasons = ruleResults.filter((r) => !r.passed && r.severity === "warn").map((r) => r.reason);
  const hasBlockingFailures = blockingReasons.length > 0;
  const action = resolveAction(hasBlockingFailures, ctx.attemptNumber, ctx.maxAttempts);
  const valid = action === "accept";
  const retryInstruction = action === "retry" ? buildRetryInstruction(blockingReasons) : null;
  const fallbackReply = action === "fallback" ? buildValidatedFallback(ctx.language, ctx.safetyLevel, ctx.turnNumber, blockingReasons) : null;
  const validatedReply = action === "accept" ? ctx.draftReply : action === "fallback" ? fallbackReply : null;
  return {
    valid,
    action,
    ruleResults,
    blockingReasons,
    warningReasons,
    retryInstruction,
    fallbackReply,
    validatedReply,
    validatedAt
  };
}
function resolveResponseValidation(ctx, validatedAt = (/* @__PURE__ */ new Date()).toISOString()) {
  const ruleResults = runAllValidationRules(ctx);
  return buildResponseValidationResult(ctx, ruleResults, validatedAt);
}

// services/mediatorEngine/responseValidator/lib/safeResponseValidationInput.ts
var SUPPORTED_LANGUAGES4 = ["pl", "en", "it", "de", "fr", "es"];
var VALID_SAFETY_LEVELS3 = ["none", "L1_gentle", "L2_pause", "L3_stop"];
function normalizeLanguage4(value) {
  if (typeof value === "string" && SUPPORTED_LANGUAGES4.includes(value)) {
    return value;
  }
  return "en";
}
function normalizeSafetyLevel5(value) {
  if (typeof value === "string" && VALID_SAFETY_LEVELS3.includes(value)) {
    return value;
  }
  return "none";
}
function normalizeTurnNumber5(value) {
  return typeof value === "number" && value > 0 ? value : 1;
}
function normalizeAttemptNumber(value) {
  return typeof value === "number" && value > 0 ? value : 1;
}
function normalizeMaxAttempts(value) {
  return typeof value === "number" && value > 0 ? value : RESPONSE_VALIDATION_LIMITS.defaultMaxAttempts;
}
function createEmptyDraftReply(language, safetyLevel, turnNumber) {
  return {
    text: "",
    language,
    safetyLevel,
    source: "fallback",
    validation: {
      valid: false,
      reasons: ["Malformed draft reply input"],
      blockedTermsFound: [],
      questionCount: 0,
      sentenceCount: 0,
      lengthChars: 0,
      safetyCompliant: false
    },
    metadata: {
      turnNumber,
      providerId: "unknown",
      model: "unknown",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
function normalizeDraftReply(value, language, safetyLevel, turnNumber) {
  if (value && typeof value === "object" && typeof value.text === "string") {
    const draft = value;
    return {
      ...draft,
      language: normalizeLanguage4(draft.language ?? language),
      safetyLevel: normalizeSafetyLevel5(draft.safetyLevel ?? safetyLevel),
      validation: draft.validation && typeof draft.validation === "object" ? draft.validation : {
        valid: false,
        reasons: ["Missing draft validation"],
        blockedTermsFound: [],
        questionCount: 0,
        sentenceCount: 0,
        lengthChars: draft.text.length,
        safetyCompliant: false
      },
      metadata: draft.metadata && typeof draft.metadata === "object" ? draft.metadata : {
        turnNumber,
        providerId: "unknown",
        model: "unknown",
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
  }
  return createEmptyDraftReply(language, safetyLevel, turnNumber);
}
function normalizePromptOutput2(value, language, safetyLevel) {
  if (value && typeof value === "object" && typeof value.systemPrompt === "string") {
    return value;
  }
  return createFallbackPromptOutput(language, safetyLevel);
}
function safeResponseValidationInput(input) {
  const raw = input && typeof input === "object" ? input : {};
  const language = normalizeLanguage4(raw.language);
  const safetyLevel = normalizeSafetyLevel5(raw.safetyLevel);
  const turnNumber = normalizeTurnNumber5(raw.turnNumber);
  const attemptNumber = normalizeAttemptNumber(raw.attemptNumber);
  const maxAttempts = normalizeMaxAttempts(raw.maxAttempts);
  const draftReply = normalizeDraftReply(raw.draftReply, language, safetyLevel, turnNumber);
  const promptComposerOutput = normalizePromptOutput2(raw.promptComposerOutput, language, safetyLevel);
  return {
    text: typeof draftReply.text === "string" ? draftReply.text : "",
    draftReply,
    safetyLevel,
    language,
    turnNumber,
    attemptNumber,
    maxAttempts,
    promptComposerOutput
  };
}

// services/mediatorEngine/responseValidator/validateMediatorReply.ts
function validateMediatorReply(input) {
  const validatedAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const ctx = safeResponseValidationInput(input);
    return resolveResponseValidation(ctx, validatedAt);
  } catch {
    const fallbackReply = buildValidatedFallback("en", "none", 1, ["Unexpected validation error"]);
    return {
      valid: false,
      action: "fallback",
      ruleResults: [],
      blockingReasons: ["Unexpected validation error"],
      warningReasons: [],
      retryInstruction: null,
      fallbackReply,
      validatedReply: fallbackReply,
      validatedAt
    };
  }
}

// services/mediatorEngine/runtime/retry/runReplyRetryLoop.ts
async function runReplyRetryLoop(input) {
  const { promptComposerOutput, ctx, safetyLevel, turnNumber } = input;
  let retryCount = 0;
  let attemptNumber = 1;
  let llmOutput = null;
  let responseValidation = null;
  while (attemptNumber <= ctx.maxReplyAttempts) {
    llmOutput = await generateMediatorReply({
      promptComposerOutput,
      provider: ctx.llmProvider,
      language: ctx.language,
      safetyLevel,
      turnNumber
    });
    responseValidation = validateMediatorReply({
      draftReply: llmOutput.draftReply,
      promptComposerOutput,
      safetyLevel,
      language: ctx.language,
      turnNumber,
      attemptNumber,
      maxAttempts: ctx.maxReplyAttempts
    });
    if (responseValidation.action === "accept") {
      return {
        llmOutput,
        responseValidation,
        retryCount,
        fallbackUsed: llmOutput.fallbackUsed || false
      };
    }
    if (responseValidation.action === "fallback") {
      return {
        llmOutput,
        responseValidation,
        retryCount,
        fallbackUsed: true
      };
    }
    retryCount += 1;
    attemptNumber += 1;
  }
  const lastLlm = llmOutput ?? await generateMediatorReply({
    promptComposerOutput,
    provider: ctx.llmProvider,
    language: ctx.language,
    safetyLevel,
    turnNumber
  });
  const lastValidation = responseValidation ?? validateMediatorReply({
    draftReply: lastLlm.draftReply,
    promptComposerOutput,
    safetyLevel,
    language: ctx.language,
    turnNumber,
    attemptNumber: ctx.maxReplyAttempts,
    maxAttempts: ctx.maxReplyAttempts
  });
  return {
    llmOutput: lastLlm,
    responseValidation: lastValidation,
    retryCount,
    fallbackUsed: lastValidation.action === "fallback" || lastLlm.fallbackUsed
  };
}

// services/mediatorEngine/runtime/final/buildFinalMediatorMessage.ts
function buildFinalMediatorMessage(reply, validationAction, language, safetyLevel, turnNumber) {
  const resolved = reply ?? createFallbackMediatorReply(language, safetyLevel, turnNumber, ["Missing validated reply"]);
  const accepted = validationAction === "accept" || validationAction === "fallback";
  const text = resolved.text.trim() || createFallbackMediatorReply(language, safetyLevel, turnNumber).text;
  return {
    text,
    source: resolved.source,
    safetyLevel: resolved.safetyLevel ?? safetyLevel,
    language: resolved.language ?? language,
    turnNumber,
    accepted,
    validationAction
  };
}
function resolveFinalDraftReply(validation) {
  if (validation.action === "accept") return validation.validatedReply;
  if (validation.action === "fallback") return validation.fallbackReply ?? validation.validatedReply;
  return null;
}

// services/mediatorEngine/runtime/resolve/buildRuntimeOutput.ts
function buildRuntimeOutput(params) {
  const { ctx, orchestratedTurn, promptComposerOutput, retryResult, finalMediatorMessage, startedAt, completedAt } = params;
  const durationMs = Math.max(0, Date.parse(completedAt) - Date.parse(startedAt));
  const providerId = ctx.llmProvider.providerId;
  const runtimeMetadata = {
    engineVersion: orchestratedTurn.engineVersion ?? RUNTIME_LIMITS.engineVersion,
    turnNumber: ctx.turnInput.turnNumber,
    startedAt,
    completedAt,
    durationMs,
    providerId,
    retryCount: retryResult.retryCount
  };
  return {
    orchestratedTurn,
    promptComposerOutput,
    llmOutput: retryResult.llmOutput,
    responseValidation: retryResult.responseValidation,
    finalMediatorMessage,
    fallbackUsed: retryResult.fallbackUsed || retryResult.llmOutput.fallbackUsed,
    retryCount: retryResult.retryCount,
    runtimeMetadata
  };
}

// services/mediatorEngine/runtime/runMediatorEngineTurn.ts
async function runMediatorEngineTurn(input) {
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const ctx = safeRuntimeInput(input);
    const turnInput = {
      ...ctx.turnInput,
      language: ctx.language
    };
    const orchestratedTurn = orchestrateTurn({
      request: turnInput,
      sessionMemory: ctx.sessionMemory
    });
    const promptInput = buildPromptComposerInputFromTurn(
      turnInput,
      ctx.sessionMemory,
      orchestratedTurn,
      ctx.language
    );
    const safetyLevel = promptInput.safetyOutput?.level ?? "none";
    const promptComposerOutput = composePrompt(promptInput);
    const retryResult = await runReplyRetryLoop({
      promptComposerOutput,
      ctx,
      safetyLevel,
      turnNumber: ctx.turnInput.turnNumber
    });
    const finalDraft = resolveFinalDraftReply(retryResult.responseValidation);
    const complianceOk = orchestratedTurn.complianceResult.compliant;
    const validationAction = complianceOk ? retryResult.responseValidation.action : "fallback";
    const replyForFinal = complianceOk ? finalDraft : createFallbackMediatorReply(
      ctx.language,
      safetyLevel,
      ctx.turnInput.turnNumber,
      orchestratedTurn.complianceResult.violations.map((v) => v.ruleId)
    );
    const finalMediatorMessage = buildFinalMediatorMessage(
      replyForFinal,
      validationAction,
      ctx.language,
      safetyLevel,
      ctx.turnInput.turnNumber
    );
    const completedAt = (/* @__PURE__ */ new Date()).toISOString();
    return buildRuntimeOutput({
      ctx,
      orchestratedTurn,
      promptComposerOutput,
      retryResult,
      finalMediatorMessage,
      startedAt,
      completedAt
    });
  } catch {
    return buildEmergencyRuntimeOutput(input, startedAt);
  }
}
function buildEmergencyRuntimeOutput(input, startedAt) {
  const completedAt = (/* @__PURE__ */ new Date()).toISOString();
  const ctx = safeRuntimeInput(input);
  const fallbackReply = createFallbackMediatorReply(ctx.language, "none", ctx.turnInput.turnNumber);
  let orchestratedTurn;
  try {
    orchestratedTurn = orchestrateTurn({
      request: ctx.turnInput,
      sessionMemory: ctx.sessionMemory
    });
  } catch {
    orchestratedTurn = {
      mediationState: {},
      intervention: {},
      sessionMemory: ctx.sessionMemory,
      evidenceStore: {},
      explainability: {},
      complianceResult: {
        compliant: true,
        violations: [],
        attemptNumber: 1,
        fallbackUsed: false,
        validatedAt: completedAt,
        validatorLayer: "deterministic"
      },
      engineVersion: RUNTIME_LIMITS.engineVersion
    };
  }
  const promptComposerOutput = composePrompt(null);
  return buildRuntimeOutput({
    ctx,
    orchestratedTurn,
    promptComposerOutput,
    retryResult: {
      llmOutput: {
        draftReply: fallbackReply,
        fallbackUsed: true,
        generatedAt: completedAt
      },
      responseValidation: {
        valid: false,
        action: "fallback",
        ruleResults: [],
        blockingReasons: ["Unexpected runtime error"],
        warningReasons: [],
        retryInstruction: null,
        fallbackReply,
        validatedReply: fallbackReply,
        validatedAt: completedAt
      },
      retryCount: 0,
      fallbackUsed: true
    },
    finalMediatorMessage: buildFinalMediatorMessage(
      fallbackReply,
      "fallback",
      ctx.language,
      "none",
      ctx.turnInput.turnNumber
    ),
    startedAt,
    completedAt
  });
}

// services/mediatorEngine/llm/adapters/providerConfig.ts
var OPENAI_PROVIDER_DEFAULTS = {
  model: "gpt-4o-mini",
  endpoint: "https://api.openai.com/v1/chat/completions",
  timeoutMs: 3e4,
  providerId: "openai"
};
function resolveOpenAiProviderConfig(config = {}) {
  return {
    apiKey: config.apiKey,
    model: config.model ?? OPENAI_PROVIDER_DEFAULTS.model,
    endpoint: config.endpoint ?? OPENAI_PROVIDER_DEFAULTS.endpoint,
    timeoutMs: config.timeoutMs ?? OPENAI_PROVIDER_DEFAULTS.timeoutMs,
    fetchImpl: config.fetchImpl ?? fetch
  };
}

// services/mediatorEngine/llm/adapters/providerErrors.ts
var LlmProviderError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "LlmProviderError";
    this.code = code;
  }
};
var MissingLlmApiKeyError = class extends LlmProviderError {
  constructor() {
    super("missing_api_key", "OpenAI LLM provider requires an apiKey in config");
    this.name = "MissingLlmApiKeyError";
  }
};
var LlmProviderTimeoutError = class extends LlmProviderError {
  constructor(timeoutMs) {
    super("timeout", `OpenAI LLM provider request timed out after ${timeoutMs}ms`);
    this.name = "LlmProviderTimeoutError";
  }
};
var LlmProviderHttpError = class extends LlmProviderError {
  status;
  constructor(status, message) {
    super("http_error", message);
    this.name = "LlmProviderHttpError";
    this.status = status;
  }
};
var LlmProviderMalformedResponseError = class extends LlmProviderError {
  constructor(detail) {
    super("malformed_response", `OpenAI LLM provider malformed response: ${detail}`);
    this.name = "LlmProviderMalformedResponseError";
  }
};
var LlmProviderEmptyResponseError = class extends LlmProviderError {
  constructor() {
    super("empty_response", "OpenAI LLM provider returned empty output");
    this.name = "LlmProviderEmptyResponseError";
  }
};

// services/mediatorEngine/llm/adapters/openAiLlmProvider.ts
function buildRequestBody(request, model) {
  return {
    model,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "developer", content: request.developerPrompt },
      { role: "user", content: request.userPrompt }
    ],
    temperature: request.modelHints.temperature,
    max_tokens: request.modelHints.maxOutputTokens
  };
}
function mapFinishReason(value) {
  if (value === "stop") return "stop";
  if (value === "length") return "length";
  if (value === "error") return "error";
  return "unknown";
}
function parseOpenAiResponse(payload, model, latencyMs) {
  if (!payload || typeof payload !== "object") {
    throw new LlmProviderMalformedResponseError("response is not an object");
  }
  const body = payload;
  const choice = body.choices?.[0];
  if (!choice) {
    throw new LlmProviderMalformedResponseError("missing choices[0]");
  }
  const text = typeof choice.message?.content === "string" ? choice.message.content.trim() : "";
  if (!text) {
    throw new LlmProviderEmptyResponseError();
  }
  const usage = body.usage;
  const tokenUsage = usage && typeof usage.prompt_tokens === "number" && typeof usage.completion_tokens === "number" && typeof usage.total_tokens === "number" ? {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens
  } : void 0;
  return {
    text,
    provider: "openai",
    model,
    latencyMs,
    finishReason: mapFinishReason(choice.finish_reason),
    tokenUsage
  };
}
async function fetchWithTimeout(fetchImpl, url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new LlmProviderTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
function createOpenAiLlmProvider(config = {}) {
  const resolved = resolveOpenAiProviderConfig(config);
  return {
    providerId: OPENAI_PROVIDER_DEFAULTS.providerId,
    async generateText(request) {
      if (!resolved.apiKey || resolved.apiKey.trim().length === 0) {
        throw new MissingLlmApiKeyError();
      }
      const startedAt = Date.now();
      const body = buildRequestBody(request, resolved.model);
      const response = await fetchWithTimeout(
        resolved.fetchImpl,
        resolved.endpoint,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resolved.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        },
        resolved.timeoutMs
      );
      if (!response.ok) {
        throw new LlmProviderHttpError(
          response.status,
          `OpenAI LLM provider HTTP ${response.status}`
        );
      }
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new LlmProviderMalformedResponseError("invalid JSON body");
      }
      return parseOpenAiResponse(payload, resolved.model, Math.max(0, Date.now() - startedAt));
    }
  };
}

// services/mediatorEngine/edge/createEdgeLlmProvider.ts
function createEdgeLlmProvider(options) {
  if (options.llmProviderOverride) {
    return { ok: true, provider: options.llmProviderOverride };
  }
  const apiKey = options.env.openAiApiKey?.trim();
  if (!apiKey) {
    return { ok: false, reason: "missing_openai_api_key" };
  }
  const timeoutRaw = options.env.openAiTimeoutMs;
  const timeoutMs = timeoutRaw && Number.isFinite(Number(timeoutRaw)) ? Number(timeoutRaw) : 3e4;
  return {
    ok: true,
    provider: createOpenAiLlmProvider({
      apiKey,
      model: options.env.openAiModel?.trim() || "gpt-4o-mini",
      timeoutMs,
      fetchImpl: options.fetchImpl ?? fetch
    })
  };
}

// services/mediatorEngine/edge/request.ts
var SUPPORTED_LANGUAGES5 = ["pl", "en", "es", "it", "de", "fr"];
var SUPPORTED_TRIGGERS = [
  "session_start",
  "partner_message",
  "host_generate",
  "resume_after_pause"
];
function normalizeLanguage5(value) {
  if (typeof value === "string" && SUPPORTED_LANGUAGES5.includes(value)) {
    return value;
  }
  return "en";
}
function normalizeTrigger(value) {
  if (value === "host_message") return "host_generate";
  if (typeof value === "string" && SUPPORTED_TRIGGERS.includes(value)) {
    return value;
  }
  return "partner_message";
}
function normalizeTurnNumber6(value) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed >= 1) return parsed;
  }
  return 1;
}
function normalizeTranscriptDelta(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry) => !!entry && typeof entry === "object" && typeof entry.content === "string"
  );
}
function normalizeSessionMemory(value) {
  if (value && typeof value === "object") {
    return value;
  }
  return createEmptySessionMemory();
}
function parseMediatorRuntimeRequest(body) {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.MALFORMED_JSON,
        "Request body must be a JSON object"
      ).error,
      status: 400
    };
  }
  const raw = body;
  if (typeof raw.mediationId !== "string" || raw.mediationId.trim().length === 0) {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.MISSING_MEDIATION_ID,
        "mediationId is required"
      ).error,
      status: 400
    };
  }
  if (typeof raw.sessionId !== "string" || raw.sessionId.trim().length === 0) {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.MISSING_SESSION_ID,
        "sessionId is required"
      ).error,
      status: 400
    };
  }
  if (raw.engineVersion !== "v2.3") {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.UNSUPPORTED_ENGINE_VERSION,
        "Only engineVersion v2.3 is supported by mediator-runtime"
      ).error,
      status: 400
    };
  }
  const request = {
    mediationId: raw.mediationId.trim(),
    sessionId: raw.sessionId.trim(),
    turnNumber: normalizeTurnNumber6(raw.turnNumber),
    trigger: normalizeTrigger(raw.trigger),
    mediationState: raw.mediationState && typeof raw.mediationState === "object" ? raw.mediationState : null,
    sessionMemory: normalizeSessionMemory(raw.sessionMemory),
    transcriptDelta: normalizeTranscriptDelta(raw.transcriptDelta),
    language: normalizeLanguage5(raw.language),
    engineVersion: "v2.3"
  };
  return { ok: true, value: request };
}
function toOrchestrateTurnRequest(request) {
  return {
    mediationId: request.mediationId,
    sessionId: request.sessionId,
    trigger: request.trigger,
    turnNumber: request.turnNumber,
    mediationState: request.mediationState,
    transcriptDelta: request.transcriptDelta,
    engineVersion: "v2.3",
    language: request.language
  };
}

// services/mediatorEngine/edge/response.ts
function sanitizeResponseValidation(validation) {
  return {
    valid: validation.valid,
    action: validation.action,
    blockingReasons: [...validation.blockingReasons],
    warningReasons: [...validation.warningReasons],
    validatedAt: validation.validatedAt
  };
}
function buildMediatorRuntimeEdgeSuccess(output) {
  const { orchestratedTurn } = output;
  return {
    ok: true,
    engineVersion: "v2.3",
    finalMediatorMessage: output.finalMediatorMessage,
    mediationState: orchestratedTurn.mediationState,
    sessionMemory: orchestratedTurn.sessionMemory,
    intervention: orchestratedTurn.intervention,
    complianceResult: orchestratedTurn.complianceResult,
    responseValidation: sanitizeResponseValidation(output.responseValidation),
    runtimeMetadata: output.runtimeMetadata,
    fallbackUsed: output.fallbackUsed,
    retryCount: output.retryCount
  };
}

// services/mediatorEngine/edge/handleMediatorRuntimeTurn.ts
async function handleMediatorRuntimeTurn(body, options = {}) {
  const parsed = parseMediatorRuntimeRequest(body);
  if (!parsed.ok) {
    return parsed;
  }
  const providerResult = createEdgeLlmProvider({
    env: options.env ?? {},
    llmProviderOverride: options.llmProviderOverride,
    fetchImpl: options.fetchImpl
  });
  if (!providerResult.ok) {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.MISSING_OPENAI_API_KEY,
        "OPENAI_API_KEY is not configured for mediator-runtime"
      ).error,
      status: 503
    };
  }
  try {
    const runtimeOutput = await runMediatorEngineTurn({
      turnInput: toOrchestrateTurnRequest(parsed.value),
      sessionMemory: parsed.value.sessionMemory,
      language: parsed.value.language,
      llmProvider: providerResult.provider
    });
    return buildMediatorRuntimeEdgeSuccess(runtimeOutput);
  } catch {
    return {
      ok: false,
      error: createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.INTERNAL_ERROR,
        "Mediator runtime failed unexpectedly"
      ).error,
      status: 500
    };
  }
}

// services/mediatorEngine/edge/cors.ts
var MEDIATOR_RUNTIME_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
function createMediatorRuntimeOptionsResponse() {
  return new Response("ok", { status: 200, headers: MEDIATOR_RUNTIME_CORS_HEADERS });
}

// services/mediatorEngine/edge/handleMediatorRuntimeHttp.ts
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...MEDIATOR_RUNTIME_CORS_HEADERS, "Content-Type": "application/json" }
  });
}
function readEdgeEnv() {
  return {
    openAiApiKey: Deno.env.get("OPENAI_API_KEY"),
    openAiModel: Deno.env.get("OPENAI_MODEL"),
    openAiTimeoutMs: Deno.env.get("OPENAI_TIMEOUT_MS")
  };
}
async function handleMediatorRuntimeHttpRequest(req) {
  if (req.method === "OPTIONS") {
    return createMediatorRuntimeOptionsResponse();
  }
  if (req.method !== "POST") {
    return jsonResponse(
      createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.MALFORMED_JSON,
        "Only POST is supported"
      ),
      405
    );
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      createMediatorRuntimeError(
        MEDIATOR_RUNTIME_ERROR_CODES.MALFORMED_JSON,
        "Request body must be valid JSON"
      ),
      400
    );
  }
  const result = await handleMediatorRuntimeTurn(body, { env: readEdgeEnv() });
  if ("status" in result && result.ok === false) {
    return jsonResponse(createMediatorRuntimeError(result.error.code, result.error.message), result.status);
  }
  if (result.ok === false) {
    return jsonResponse(result.error, mediatorRuntimeErrorStatus(result.error.code));
  }
  return jsonResponse(result, 200);
}
export {
  handleMediatorRuntimeHttpRequest
};
