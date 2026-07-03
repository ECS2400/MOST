import * as FileSystem from 'expo-file-system';
import { supabase } from '@/services/supabase';

const SCREENSHOT_BUCKET = 'mediation-screenshots';
const UPLOAD_TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function readImageBytes(uri: string): Promise<ArrayBuffer> {
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64ToArrayBuffer(base64);
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Nie udało się odczytać wybranego zdjęcia');
  }
  return response.arrayBuffer();
}

export async function uploadMediationScreenshot(
  userId: string,
  mediationId: string,
  uri: string,
  index: number,
  mimeType = 'image/jpeg'
): Promise<string> {
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/${mediationId}/${index}.${ext}`;

  const bytes = await withTimeout(
    readImageBytes(uri),
    UPLOAD_TIMEOUT_MS,
    'Przekroczono czas oczekiwania na odczyt zdjęcia'
  );

  const { error: uploadError } = await withTimeout(
    supabase.storage.from(SCREENSHOT_BUCKET).upload(path, bytes, {
      upsert: true,
      contentType: mimeType,
    }),
    UPLOAD_TIMEOUT_MS,
    'Przekroczono czas oczekiwania na przesłanie zdjęcia'
  );

  if (uploadError) {
    const msg = uploadError.message?.toLowerCase() || '';
    if (msg.includes('bucket') || msg.includes('not found')) {
      throw new Error(
        'Bucket „mediation-screenshots” nie istnieje w Supabase Storage. Utwórz publiczny bucket.'
      );
    }
    throw new Error(uploadError.message || 'Nie udało się przesłać zrzutu ekranu');
  }

  const { data } = supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Nie udało się uzyskać adresu URL zrzutu ekranu');
  }

  return data.publicUrl;
}
