export interface ClosureSurveyQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface DateIdeaFallback {
  title: string;
  description: string;
  whyItFits: string;
  estimatedCost: string;
}

export interface ClosureBundle {
  survey: ClosureSurveyQuestion[];
  dateIdeaDefault: DateIdeaFallback;
  ui: {
    surveyTitle: string;
    dateIdeaTitle: string;
    dateIdeaTodayTitle: string;
    durationLabel: string;
    durationMinutes: string;
    budgetFree: string;
    budgetLow: string;
    shuffleDateIdea: string;
    questionProgress: string;
    loadingMediation: string;
    loadingDateIdea: string;
    whyItFits: string;
    cost: string;
    footerNote: string;
    finish: string;
    finishLive: string;
    errorPrep: string;
    errorSave: string;
    errorTitle: string;
    noSession: string;
  };
}
