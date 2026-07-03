import { MAX_SCREENSHOTS } from '@/constants/screenshots';
import type { Language } from '@/constants/i18n';
import {
  compressScreenshotToBase64,
  extractChatFromUrls,
  isScreenshotInterpretAvailable,
} from '@/services/screenshotInterpret';
import { EDGE, callEdge, supabase } from '@/services/supabase';
import {
  ensureFeatureAllowed,
  incrementFeatureUsage,
} from '@/services/checkLimits';
import { FeatureLimitBlockedError } from '@/utils/paywallReason';
import {
  enrichOcrExtractionResult,
  type OcrExtractionResult,
} from '@/services/ocrShared';

export const OCR_UNAVAILABLE_TITLE = 'Analiza OCR będzie dostępna wkrótce';
export const OCR_UNAVAILABLE_NOTE =
  'Zrzuty ekranu są zapisywane. Tekst zostanie dodany ręcznie lub przez OCR w przyszłej wersji.';

export type {
  BubbleSide,
  OcrBubble,
  OcrBubbleSide,
  OcrChatSide,
  OcrExtractionResult,
  OcrMessage,
  OcrSpeaker,
  OcrSpeakerCluster,
  SpeakerClusterId,
} from '@/services/ocrShared';

export {
  buildLegacyClustersFromMessages,
  buildTranscriptFromClusterChoice,
  clusterIdsNeedingChoice,
  dedupeOcrMessages,
  enrichOcrExtractionResult,
  hasLowClusterConfidence,
  hasSingleHumanCluster,
  humanClustersWithSamples,
  sampleTextsForCluster,
} from '@/services/ocrShared';

type OcrAnalyzeResponse = Partial<OcrExtractionResult> & {
  error?: string;
};

export interface OcrUsageOptions {
  userId: string;
}

function normalizeOcrAnalyzeResponse(result: OcrAnalyzeResponse): OcrExtractionResult | null {
  if (result.error) return null;
  return enrichOcrExtractionResult(result);
}

async function callOcrAnalyzePrimary(
  imageUrls: string[],
  language: Language
): Promise<OcrExtractionResult | null> {
  const imageUrlsForOcr = imageUrls.slice(0, MAX_SCREENSHOTS);
  if (imageUrlsForOcr.length === 0) return null;

  const result = await callEdge<OcrAnalyzeResponse>(EDGE.ocrAnalyze, {
    imageUrls: imageUrlsForOcr,
    language,
  });

  return normalizeOcrAnalyzeResponse(result);
}

async function fallbackScreenshotInterpretOcr(
  imageUrls: string[],
  language: Language
): Promise<OcrExtractionResult | null> {
  try {
    const extracted = await extractChatFromUrls(imageUrls, language);
    const combinedText = extracted.chatTranscript.trim();
    if (!combinedText) return null;

    return enrichOcrExtractionResult({
      combinedText,
      texts: [combinedText],
      messages: [],
      bubbles: [],
      speakerClusters: [],
      needsUserSpeakerChoice: false,
    });
  } catch {
    return null;
  }
}

export async function isOcrAnalyzeAvailable(forceRefresh = false): Promise<boolean> {
  try {
    const result = await callEdge<{ ok?: boolean }>(EDGE.ocrAnalyze, { ping: true });
    if (result.ok === true) return true;
  } catch {
    // fall through to legacy availability check
  }

  return isScreenshotInterpretAvailable(forceRefresh);
}

export async function extractMediationChatFromUrls(
  imageUrls: string[],
  language: Language = 'pl',
  usage?: OcrUsageOptions
): Promise<OcrExtractionResult | null> {
  if (imageUrls.length === 0) return null;

  const limited = imageUrls.slice(0, MAX_SCREENSHOTS);

  try {
    if (usage) {
      await ensureFeatureAllowed('ocr_analyze', { userId: usage.userId });
    }

    const primary = await callOcrAnalyzePrimary(limited, language);
    if (primary?.combinedText) {
      if (usage) {
        const ocrSessionId = limited[0] ?? `ocr-${Date.now()}`;
        try {
          await incrementFeatureUsage('ocr_analyze', {
            userId: usage.userId,
            usageKey: ocrSessionId,
          });
        } catch (usageError) {
          console.warn('[mediationOcr] usage increment failed', usageError);
        }
      }
      return primary;
    }
  } catch (error) {
    if (error instanceof FeatureLimitBlockedError) {
      throw error;
    }
    // fall through to screenshot-interpret OCR fallback
  }

  return fallbackScreenshotInterpretOcr(limited, language);
}

export async function extractMediationChatFromScreenshotUris(
  uris: string[],
  language: Language = 'pl',
  usage?: OcrUsageOptions
): Promise<OcrExtractionResult | null> {
  const dataUrls: string[] = [];

  for (const uri of uris.slice(0, MAX_SCREENSHOTS)) {
    try {
      const base64 = await compressScreenshotToBase64(uri);
      if (base64) dataUrls.push(`data:image/jpeg;base64,${base64}`);
    } catch {
      // skip unreadable screenshot
    }
  }

  if (dataUrls.length === 0) return null;
  return extractMediationChatFromUrls(dataUrls, language, usage);
}

export async function analyzeMediationScreenshotUrls(
  imageUrls: string[],
  language: Language = 'pl',
  usage?: OcrUsageOptions
): Promise<string | null> {
  const result = await extractMediationChatFromUrls(imageUrls, language, usage);
  return result?.combinedText.trim() || null;
}

export async function appendOcrTextToMediation(
  mediationId: string,
  baseDescription: string,
  ocrText: string
): Promise<void> {
  const trimmedOcr = ocrText.trim();
  if (!trimmedOcr) return;

  const nextDescription = baseDescription.trim()
    ? `${baseDescription.trim()}\n\nTekst ze zrzutów ekranu:\n${trimmedOcr}`
    : `Tekst ze zrzutów ekranu:\n${trimmedOcr}`;

  const { error } = await supabase
    .from('mediations')
    .update({
      combined_description: nextDescription,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mediationId);

  if (error) {
    throw new Error(error.message || 'Nie udało się zapisać analizy OCR');
  }
}
