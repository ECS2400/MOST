export interface SoloExtrasBundle {
  report: {
    resultHeroSub: string;
    yourSituation: string;
    aiNote: string;
    summary: string;
    howYouMightFeel: string;
    yourNeeds: string;
    whatHurtMost: string;
    whatCouldImprove: string;
    doingWell: string;
    suggestedPhrase: string;
    otherSide: string;
    partnerHypothesis: string;
    possibleEmotions: string;
    possibleNeeds: string;
    startCoach: string;
  };
  chat: {
    title: string;
    messagesCount: string;
    inputPlaceholder: string;
    noSessionError: string;
    messageLimitError: string;
    coachReplyError: string;
    endConfirmTitle: string;
    endConfirmMessage: string;
    endConfirm: string;
    endA11y: string;
    openingDefault: string;
    openingParty: string;
    openingIgnored: string;
    openingWithContext: string;
    openingClosing: string;
    offlineCoachReply: string;
  };
  errors: {
    purchaseFailed: string;
    analyzeFailed: string;
    screenshotAnalyzed: string;
    securePayment: string;
    premiumLink: string;
    analyzePrepareFailed: string;
    sayTip: string;
  };
  formLabels: {
    whatHappened: string;
    howIFelt: string;
    whatINeed: string;
  };
  conversationTips: string[];
  funFact: {
    label: string;
    onlyYouSee: string;
    expand: string;
    minimize: string;
    close: string;
  };
  mapperDefaults: {
    situationSummary: string;
    emotionsExplanation: string;
    needsExplanation: string;
    doingWellLead: string;
    doingWellDetail: string;
    perspectiveGapLead: string;
    perspectiveGapDetail: string;
    partnerEmotions: string[];
    partnerNeeds: string[];
    sayTip: string;
  };
}
