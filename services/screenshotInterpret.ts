import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { callEdge, EDGE } from '@/services/supabase';
import type { Language } from '@/constants/i18n';
import {
  MAX_SCREENSHOTS,
  SCREENSHOT_BATCH_SIZE,
  chunkArray,
} from '@/constants/screenshots';

export interface ChatSpeaker {
  id: string;
  label: string;
  sampleMessages: string[];
  positionHint: string;
}

export interface ExtractChatResult {
  chatTranscript: string;
  speakers: ChatSpeaker[];
  needsUserChoice: boolean;
}

export interface StructuredFormResult {
  whatHappened: string;
  whatAngered: string;
  howFelt: string;
  whatNeeded: string;
  whatToSay: string;
  pastedText: string;
}

type ExtractEdgeResponse = {
  chatTranscript?: string;
  speakers?: ChatSpeaker[];
  needsUserChoice?: boolean;
};

let availabilityCache: boolean | null = null;

export async function isScreenshotInterpretAvailable(forceRefresh = false): Promise<boolean> {
  if (!forceRefresh && availabilityCache !== null) return availabilityCache;

  try {
    const result = await callEdge<{ ok?: boolean }>(EDGE.screenshotInterpret, { ping: true });
    availabilityCache = result.ok === true;
  } catch {
    availabilityCache = false;
  }

  return availabilityCache;
}

export async function compressScreenshotToBase64(uri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  if (manipulated.base64) return manipulated.base64;

  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function normalizeSpeakerKey(speaker: ChatSpeaker): string {
  return speaker.label.trim().toLowerCase() || speaker.id;
}

function mergeSpeakers(existing: ChatSpeaker[], incoming: ChatSpeaker[]): ChatSpeaker[] {
  const map = new Map<string, ChatSpeaker>();

  for (const speaker of [...existing, ...incoming]) {
    const key = normalizeSpeakerKey(speaker);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        ...speaker,
        sampleMessages: [...speaker.sampleMessages],
      });
      continue;
    }

    const sampleMessages = [...prev.sampleMessages, ...speaker.sampleMessages]
      .filter((msg, idx, arr) => arr.indexOf(msg) === idx)
      .slice(0, 4);

    map.set(key, {
      ...prev,
      sampleMessages,
      positionHint:
        prev.positionHint !== 'unknown' ? prev.positionHint : speaker.positionHint,
    });
  }

  return Array.from(map.values());
}

async function extractChatBatch(
  images: { base64: string; mimeType: string }[],
  language: Language,
  batchIndex: number,
  batchTotal: number
): Promise<ExtractEdgeResponse> {
  return callEdge<ExtractEdgeResponse>(EDGE.screenshotInterpret, {
    mode: 'extract',
    language,
    images,
    batchIndex,
    batchTotal,
  });
}

async function extractChatBatchFromUrls(
  imageUrls: string[],
  language: Language,
  batchIndex: number,
  batchTotal: number
): Promise<ExtractEdgeResponse> {
  return callEdge<ExtractEdgeResponse>(EDGE.screenshotInterpret, {
    mode: 'extract',
    language,
    imageUrls,
    batchIndex,
    batchTotal,
  });
}

async function extractBatched<T>(
  items: T[],
  language: Language,
  runBatch: (batch: T[], batchIndex: number, batchTotal: number) => Promise<ExtractEdgeResponse>
): Promise<ExtractChatResult> {
  const limited = items.slice(0, MAX_SCREENSHOTS);
  if (limited.length === 0) {
    return { chatTranscript: '', speakers: [], needsUserChoice: false };
  }

  const batches = chunkArray(limited, SCREENSHOT_BATCH_SIZE);
  let chatTranscript = '';
  let speakers: ChatSpeaker[] = [];

  for (let i = 0; i < batches.length; i++) {
    const result = await runBatch(batches[i], i, batches.length);
    const part = result.chatTranscript?.trim() || '';
    if (part) {
      chatTranscript = chatTranscript ? `${chatTranscript}\n${part}` : part;
    }
    speakers = mergeSpeakers(speakers, result.speakers || []);
  }

  return {
    chatTranscript,
    speakers,
    needsUserChoice: speakers.length > 1,
  };
}

export async function extractChatFromScreenshots(
  uris: string[],
  language: Language
): Promise<ExtractChatResult> {
  return extractBatched(uris, language, async (batch, batchIndex, batchTotal) => {
    const images: { base64: string; mimeType: string }[] = [];
    for (const uri of batch) {
      const base64 = await compressScreenshotToBase64(uri);
      if (base64) images.push({ base64, mimeType: 'image/jpeg' });
    }
    return extractChatBatch(images, language, batchIndex, batchTotal);
  });
}

export async function extractChatFromUrls(
  imageUrls: string[],
  language: Language
): Promise<ExtractChatResult> {
  return extractBatched(imageUrls, language, (batch, batchIndex, batchTotal) =>
    extractChatBatchFromUrls(batch, language, batchIndex, batchTotal)
  );
}

export async function structureChatToForm(
  chatTranscript: string,
  language: Language,
  userSpeakerId: string,
  userDisplayName?: string
): Promise<StructuredFormResult> {
  const result = await callEdge<StructuredFormResult>(EDGE.screenshotInterpret, {
    mode: 'structure',
    language,
    chatTranscript,
    userSpeakerId,
    userDisplayName: userDisplayName?.trim() || undefined,
  });

  return {
    whatHappened: result.whatHappened || '',
    whatAngered: result.whatAngered || '',
    howFelt: result.howFelt || '',
    whatNeeded: result.whatNeeded || '',
    whatToSay: result.whatToSay || '',
    pastedText: result.pastedText || chatTranscript,
  };
}

export function applyStructuredForm(
  form: StructuredFormResult,
  setters: {
    setWhatHappened: (v: string) => void;
    setWhatAngered: (v: string) => void;
    setHowFelt: (v: string) => void;
    setWhatNeeded: (v: string) => void;
    setWhatToSay: (v: string) => void;
    setPastedText: (v: string) => void;
  }
): void {
  if (form.whatHappened) setters.setWhatHappened(form.whatHappened);
  if (form.whatAngered) setters.setWhatAngered(form.whatAngered);
  if (form.howFelt) setters.setHowFelt(form.howFelt);
  if (form.whatNeeded) setters.setWhatNeeded(form.whatNeeded);
  if (form.whatToSay) setters.setWhatToSay(form.whatToSay);
  if (form.pastedText) setters.setPastedText(form.pastedText);
}

/** Solo flow: build situation text from structured chat analysis. */
export function buildSoloSituationFromForm(form: StructuredFormResult): string {
  const parts = [
    form.whatHappened,
    form.whatAngered,
    form.howFelt,
  ].filter((p) => p.trim());

  if (parts.length > 0) return parts.join(' ');

  return form.pastedText.trim().substring(0, 500);
}
