import type { Language } from '@/constants/i18n';
import {
  analyzeMediationScreenshotUrls,
  appendOcrTextToMediation,
} from '@/services/mediationOcr';
import {
  MediationPersistenceError,
  type CreateMediationInput,
} from '@/services/mediationCreate.types';
import {
  buildCombinedDescription,
  createMediationRecord,
  resolveCombinedDescription,
  updateMediationScreenshots,
} from '@/services/mediationCreate';
import { uploadMediationScreenshot } from '@/services/mediationStorage';

export type MediationSubmitStage =
  | 'create_record'
  | 'upload_screenshots'
  | 'update_screenshots'
  | 'ocr'
  | 'complete';

export interface SubmitNewMediationInput {
  userId: string;
  coupleId: string;
  language: Language;
  whatHappened: string;
  whatAngered: string;
  howFelt: string;
  whatNeeded: string;
  whatToSay: string;
  pastedText?: string | null;
  screenshotUris: string[];
  hasDescription: boolean;
}

export interface SubmitNewMediationResult {
  mediationId: string;
}

export class MediationSubmitError extends Error {
  readonly stage: MediationSubmitStage;
  readonly code?: string;
  readonly status?: number;

  constructor(
    stage: MediationSubmitStage,
    message: string,
    options?: { code?: string; status?: number }
  ) {
    super(message);
    this.name = 'MediationSubmitError';
    this.stage = stage;
    this.code = options?.code;
    this.status = options?.status;
  }
}

export function logMediationSubmitDev(
  stage: MediationSubmitStage,
  details: Record<string, unknown>
): void {
  if (!__DEV__) return;
  console.warn('[mediationSubmit]', { stage, ...details });
}

function toCreateInput(input: SubmitNewMediationInput): CreateMediationInput {
  return {
    userId: input.userId,
    coupleId: input.coupleId,
    whatHappened: input.whatHappened,
    whatAngered: input.whatAngered,
    howFelt: input.howFelt,
    whatNeeded: input.whatNeeded,
    whatToSay: input.whatToSay,
    pastedText: input.pastedText,
    hasScreenshots: input.screenshotUris.length > 0,
  };
}

export async function submitNewMediation(
  input: SubmitNewMediationInput
): Promise<SubmitNewMediationResult> {
  const createInput = toCreateInput(input);
  const effectivePastedText = input.pastedText?.trim() || null;

  let mediationId: string;

  try {
    logMediationSubmitDev('create_record', { coupleId: input.coupleId });
    const mediation = await createMediationRecord(createInput);
    mediationId = mediation.id;
  } catch (error) {
    if (error instanceof MediationPersistenceError) {
      logMediationSubmitDev('create_record', {
        code: error.code,
        message: error.message,
      });
      throw new MediationSubmitError('create_record', error.message, {
        code: error.code,
      });
    }
    throw error;
  }

  const screenshotUrls: string[] = [];
  for (let i = 0; i < input.screenshotUris.length; i++) {
    try {
      logMediationSubmitDev('upload_screenshots', { index: i });
      const url = await uploadMediationScreenshot(
        input.userId,
        mediationId,
        input.screenshotUris[i],
        i
      );
      screenshotUrls.push(url);
    } catch (error) {
      logMediationSubmitDev('upload_screenshots', {
        index: i,
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    logMediationSubmitDev('update_screenshots', { count: screenshotUrls.length });
    await updateMediationScreenshots(mediationId, screenshotUrls);
  } catch (error) {
    if (error instanceof MediationPersistenceError) {
      logMediationSubmitDev('update_screenshots', {
        code: error.code,
        message: error.message,
      });
      throw new MediationSubmitError('update_screenshots', error.message, {
        code: error.code,
      });
    }
    throw error;
  }

  const baseDescription = resolveCombinedDescription({
    ...createInput,
    hasScreenshots: screenshotUrls.length > 0,
  });

  if (
    screenshotUrls.length > 0 &&
    !effectivePastedText &&
    !input.hasDescription
  ) {
    try {
      logMediationSubmitDev('ocr', { count: screenshotUrls.length });
      const ocrText = await analyzeMediationScreenshotUrls(
        screenshotUrls,
        input.language,
        { userId: input.userId }
      );
      if (ocrText) {
        await appendOcrTextToMediation(mediationId, baseDescription, ocrText);
      }
    } catch (error) {
      logMediationSubmitDev('ocr', {
        code: 'OCR_FAILED',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  logMediationSubmitDev('complete', { mediationId });
  return { mediationId };
}

export { buildCombinedDescription };
