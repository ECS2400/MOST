# RevenueCat — konfiguracja MOST

## 1. Instalacja (lokalnie)

```bash
pnpm install
# lub: npm install
```

Pakiety: `react-native-purchases`, `react-native-purchases-ui`

## 2. Ważne: Expo Go vs development build

RevenueCat wymaga **natywnych modułów**. W **Expo Go** SDK nie działa — aplikacja używa fallbacku (mock zakupów lokalnych).

Zbuduj dev client:

```bash
npx expo prebuild
npx expo run:android
# lub: npx expo run:ios
```

## 3. RevenueCat Dashboard

1. **Project** → API Keys → skopiuj klucz testowy (już w `constants/revenueCatConfig.ts`)
2. **Entitlements** → utwórz: `MOST Pro`
3. **Products** (Google Play / App Store):
   - `monthly` — subskrypcja miesięczna
   - `yearly` — subskrypcja roczna
   - `lifetime` — zakup dożywotni
4. **Offerings** → Offering `default` (current):
   - Package `monthly` → produkt monthly
   - Package `yearly` → produkt yearly
   - Package `lifetime` → produkt lifetime
5. **Paywalls** → utwórz paywall przypisany do offering `default`
6. **Customer Center** → włącz w projekcie (Settings)

Identyfikatory pakietów muszą być dokładnie: `monthly`, `yearly`, `lifetime`.

## 4. Kod w aplikacji

| Plik | Rola |
|------|------|
| `constants/revenueCatConfig.ts` | API key, entitlement `MOST Pro`, package IDs |
| `services/revenueCatSdk.ts` | configure, getCustomerInfo, purchase, paywall, customer center |
| `contexts/PurchasesContext.tsx` | Init przy logowaniu, listener, sync z Supabase profile |
| `hooks/usePurchases.ts` | Hook dla ekranów |
| `app/premium.tsx` | Plany + paywall + customer center |

## 5. Sprawdzenie entitlement

```typescript
const info = await Purchases.getCustomerInfo();
const isPro = typeof info.entitlements.active['MOST Pro'] !== 'undefined';
```

W aplikacji: `usePurchases().isPremium` lub `usePurchasesContext().isMostPro`.

## 6. Paywall

Przycisk na ekranie Premium → `RevenueCatUI.presentPaywall()`.

## 7. Customer Center

Dla aktywnych subskrybentów → `RevenueCatUI.presentCustomerCenter()` (zarządzanie, anulowanie).
