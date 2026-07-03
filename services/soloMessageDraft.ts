/** Mapowanie emocji (rzeczownik) → poprawna forma w zdaniu „Czuję …”. */
const EMOTION_PHRASE: Record<string, string> = {
  złość: 'złość',
  smutek: 'smutek',
  zagubienie: 'zagubienie',
  rozczarowanie: 'rozczarowanie',
  lęk: 'lęk',
  frustracja: 'frustrację',
  zranienie: 'się zraniony/a',
  'poczucie bycia nieważnym': 'się nieważny/a',
  'poczucie bycia pominiętym': 'się pominięty/a',
  'napięcie emocjonalne': 'napięcie',
};

/** Mapowanie potrzeb → dopełniacz po „potrzebuję”. */
const NEED_GENITIVE: Record<string, string> = {
  bliskości: 'bliskości',
  bliskość: 'bliskości',
  rozmowy: 'rozmowy',
  rozmowa: 'rozmowy',
  przytulenia: 'przytulenia',
  przytulenie: 'przytulenia',
  przestrzeni: 'przestrzeni',
  przestrzeń: 'przestrzeni',
  kompromisu: 'kompromisu',
  kompromis: 'kompromisu',
  zrozumienia: 'zrozumienia',
  zrozumienie: 'zrozumienia',
  szacunku: 'szacunku',
  szacunek: 'szacunku',
};

export function stripChipLabel(chip: string): string {
  return chip
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/\uFE0F/g, '')
    .trim();
}

function normalizeKey(label: string): string {
  return label.toLowerCase().trim();
}

/** „Złość” → „złość”; „się zły” dla przymiotników gdy trzeba. */
export function emotionToFeelingPhrase(emotionLabel: string): string {
  const key = normalizeKey(stripChipLabel(emotionLabel));
  if (EMOTION_PHRASE[key]) return EMOTION_PHRASE[key];
  if (key.endsWith('ość')) return key.replace(/ość$/, 'ość'); // złość etc.
  if (key.endsWith('enie')) return key;
  return 'się niespokojny/a';
}

export function needToGenitive(needLabel: string): string {
  const key = normalizeKey(stripChipLabel(needLabel));
  if (NEED_GENITIVE[key]) return NEED_GENITIVE[key];
  if (key.endsWith('ść')) return key + 'i'; // bliskość → bliskości heuristic
  if (key.endsWith('a')) return key.slice(0, -1) + 'y'; // rozmowa → rozmowy rough
  return key || 'rozmowy';
}

export function buildSoloMessageDraft(
  emotions: string[],
  needs: string[]
): string {
  const primaryEmotion = emotions[0];
  const primaryNeed = needs[0];

  const feeling = primaryEmotion
    ? emotionToFeelingPhrase(primaryEmotion).startsWith('się ')
      ? `Czuję ${emotionToFeelingPhrase(primaryEmotion)}`
      : `Czuję ${emotionToFeelingPhrase(primaryEmotion)}`
    : 'Czuję się niespokojny/a';

  const needPart = primaryNeed
    ? `i potrzebuję ${needToGenitive(primaryNeed)}`
    : 'i potrzebuję rozmowy';

  return `Chcę z Tobą porozmawiać o czymś ważnym. ${feeling} ${needPart}. Czy możemy to omówić spokojnie?`;
}
