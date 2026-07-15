import type { ConflictCategory } from '@/constants/conflictCategories';

export interface CreateMediationInput {
  userId: string;
  coupleId?: string | null;
  conflictCategory: ConflictCategory;
  whatHappened: string;
  whatAngered: string;
  howFelt: string;
  whatNeeded: string;
  whatToSay: string;
  pastedText?: string | null;
  hasScreenshots: boolean;
}

export interface CreateMediationResult {
  id: string;
}

export class MediationPersistenceError extends Error {
  readonly stage: 'create_record' | 'update_screenshots' | 'append_ocr';
  readonly code?: string;

  constructor(
    stage: MediationPersistenceError['stage'],
    message: string,
    code?: string
  ) {
    super(message);
    this.name = 'MediationPersistenceError';
    this.stage = stage;
    this.code = code;
  }
}
