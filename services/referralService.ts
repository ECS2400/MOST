import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReferralData {
  code: string;
  userId: string;
  referredUsers: string[];
  earnedMonths: number;
  createdAt: string;
}

const STORAGE_KEY = 'most_referral_data';
const ALL_REFERRALS_KEY = 'most_all_referrals';

function generateReferralCode(userId: string): string {
  const suffix = userId.substring(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `MOST${suffix}${random}`;
}

export async function getOrCreateReferralData(userId: string): Promise<ReferralData> {
  try {
    const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (stored) return JSON.parse(stored);
    const newData: ReferralData = {
      code: generateReferralCode(userId),
      userId,
      referredUsers: [],
      earnedMonths: 0,
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(newData));
    return newData;
  } catch {
    return {
      code: generateReferralCode(userId),
      userId,
      referredUsers: [],
      earnedMonths: 0,
      createdAt: new Date().toISOString(),
    };
  }
}

export async function applyReferralCode(
  code: string,
  newUserId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const stored = await AsyncStorage.getItem(ALL_REFERRALS_KEY);
    const allCodes: Record<string, string> = stored ? JSON.parse(stored) : {};
    const referrerId = allCodes[code.toUpperCase()];
    if (!referrerId) return { success: false, message: 'Nieprawidłowy kod polecający' };
    if (referrerId === newUserId) return { success: false, message: 'Nie możesz użyć własnego kodu' };
    const referrerData = await AsyncStorage.getItem(`${STORAGE_KEY}_${referrerId}`);
    if (!referrerData) return { success: false, message: 'Kod polecający wygasł' };
    const parsed: ReferralData = JSON.parse(referrerData);
    if (parsed.referredUsers.includes(newUserId)) {
      return { success: false, message: 'Ten kod został już użyty' };
    }
    parsed.referredUsers.push(newUserId);
    parsed.earnedMonths += 1;
    await AsyncStorage.setItem(`${STORAGE_KEY}_${referrerId}`, JSON.stringify(parsed));
    return { success: true, message: 'Kod polecający zastosowany! Oboje dostajecie 1 miesiąc Premium.' };
  } catch {
    return { success: false, message: 'Wystąpił błąd. Spróbuj ponownie.' };
  }
}

export async function registerReferralCode(code: string, userId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(ALL_REFERRALS_KEY);
    const allCodes: Record<string, string> = stored ? JSON.parse(stored) : {};
    allCodes[code.toUpperCase()] = userId;
    await AsyncStorage.setItem(ALL_REFERRALS_KEY, JSON.stringify(allCodes));
  } catch {}
}

export function getReferralShareMessage(code: string, language = 'pl'): string {
  const messages: Record<string, string> = {
    pl: `Używam Most — aplikacji dla par do rozwiązywania konfliktów. Dołącz ze mną i dostań 1 miesiąc Premium gratis! Mój kod: ${code}\nPobierz: https://most.app`,
    en: `I use Most — the couples conflict resolution app. Join me and get 1 month Premium free! My code: ${code}\nDownload: https://most.app`,
    it: `Uso Most — l'app per coppie per risolvere i conflitti. Unisciti a me e ottieni 1 mese Premium gratis! Il mio codice: ${code}\nScarica: https://most.app`,
    es: `Uso Most — la app para parejas para resolver conflictos. Únete y obtén 1 mes Premium gratis! Mi código: ${code}\nDescarga: https://most.app`,
    de: `Ich nutze Most — die App für Paare zur Konfliktlösung. Tritt bei und erhalte 1 Monat Premium gratis! Mein Code: ${code}\nHerunterladen: https://most.app`,
    fr: `J'utilise Most — l'application pour couples pour résoudre les conflits. Rejoins-moi et obtiens 1 mois Premium gratuit ! Mon code : ${code}\nTélécharger : https://most.app`,
  };
  return messages[language] ?? messages['pl'];
}
