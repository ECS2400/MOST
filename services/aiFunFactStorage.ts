import AsyncStorage from '@react-native-async-storage/async-storage';

const prefix = 'most_funfacts_dismissed_';

function key(scope: string): string {
  return `${prefix}${scope}`;
}

export async function loadDismissedFunFacts(scope: string): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(key(scope));
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export async function dismissFunFact(scope: string, factId: string): Promise<void> {
  const set = await loadDismissedFunFacts(scope);
  set.add(factId);
  await AsyncStorage.setItem(key(scope), JSON.stringify([...set]));
}
