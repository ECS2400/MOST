export interface SoloQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  multi?: boolean;
}

export interface SoloQuizBundle {
  questions: SoloQuizQuestion[];
  contextLabels: Record<string, string>;
  contextHeader: string;
  progress: string;
  skipQuiz: string;
  nextDescribe: string;
}
