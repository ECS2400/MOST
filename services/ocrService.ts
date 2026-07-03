// Most App — OCR Screenshot Analysis Service
// In production: integrate with Google Cloud Vision API or AWS Textract
// Currently: mock analysis with realistic Polish couples conflict patterns

import * as ImagePicker from 'expo-image-picker';

export interface OCRResult {
  extractedText: string;
  analysis: {
    sentiment: 'tense' | 'neutral' | 'positive';
    keyTopics: string[];
    emotionIndicators: string[];
    conflictLevel: 'low' | 'medium' | 'high';
    suggestedTitle: string;
  };
}

const MOCK_ANALYSES: OCRResult[] = [
  {
    extractedText:
      'Znów nie zrobiłeś zmywarki. Zawsze muszę to robić sama. Nie szanujesz mnie. Jesteś nieodpowiedzialny.',
    analysis: {
      sentiment: 'tense',
      keyTopics: ['obowiązki domowe', 'szacunek', 'odpowiedzialność'],
      emotionIndicators: ['frustracja', 'poczucie niedoceniania', 'zmęczenie'],
      conflictLevel: 'medium',
      suggestedTitle: 'Podział obowiązków domowych',
    },
  },
  {
    extractedText:
      'Nigdy nie masz dla mnie czasu. Cały czas jesteś na telefonie. Czuję się samotna nawet gdy jesteś obok.',
    analysis: {
      sentiment: 'tense',
      keyTopics: ['czas wspólny', 'telefon', 'bliskość emocjonalna'],
      emotionIndicators: ['samotność', 'poczucie odrzucenia', 'smutek'],
      conflictLevel: 'high',
      suggestedTitle: 'Czas wspólny i uwaga',
    },
  },
  {
    extractedText:
      'Wydałeś znowu bez pytania. To nasze wspólne pieniądze. Musimy ustalić zasady.',
    analysis: {
      sentiment: 'tense',
      keyTopics: ['finanse', 'wspólne decyzje', 'granice'],
      emotionIndicators: ['złość', 'brak zaufania', 'potrzeba kontroli'],
      conflictLevel: 'medium',
      suggestedTitle: 'Zarządzanie wspólnymi finansami',
    },
  },
  {
    extractedText:
      'Rozmawialiśmy o wyjeździe ale zmieniłeś plany bez uprzedzenia. Nie liczyłeś się ze mną.',
    analysis: {
      sentiment: 'tense',
      keyTopics: ['planowanie', 'komunikacja', 'wzajemny szacunek'],
      emotionIndicators: ['rozczarowanie', 'poczucie lekceważenia'],
      conflictLevel: 'low',
      suggestedTitle: 'Komunikacja i wspólne plany',
    },
  },
];

export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

export async function pickScreenshot(): Promise<string | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
    base64: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

export async function takeScreenshot(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

// Analyze image with OCR
// In production: send imageUri to Google Vision API
export async function analyzeScreenshot(imageUri: string): Promise<OCRResult> {
  // Simulate API call delay
  await new Promise((r) => setTimeout(r, 2200));

  // Mock: return random analysis based on image URI hash
  const hash = imageUri.length % MOCK_ANALYSES.length;
  return MOCK_ANALYSES[hash];
}

export function getSentimentLabel(sentiment: OCRResult['analysis']['sentiment']): string {
  const map: Record<string, string> = {
    tense: 'Napięta',
    neutral: 'Neutralna',
    positive: 'Pozytywna',
  };
  return map[sentiment] || 'Nieznana';
}

export function getConflictLevelLabel(level: OCRResult['analysis']['conflictLevel']): string {
  const map: Record<string, string> = {
    low: 'Niski',
    medium: 'Średni',
    high: 'Wysoki',
  };
  return map[level] || 'Nieznany';
}

export function getConflictLevelColor(level: OCRResult['analysis']['conflictLevel']): string {
  const map: Record<string, string> = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
  };
  return map[level] || '#6B5E8A';
}
