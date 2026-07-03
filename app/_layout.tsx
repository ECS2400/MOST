import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { PurchasesProvider } from '@/contexts/PurchasesContext';
import { CoupleProvider } from '@/contexts/CoupleContext';
import { DisputeProvider } from '@/contexts/DisputeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AchievementProvider } from '@/contexts/AchievementContext';
import { Colors } from '@/constants/theme';
import { CosmicBackground, SCREEN_BG, SCREEN_BG_SOLID } from '@/components/ui/CosmicBackground';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
      <AuthProvider>
        <PurchasesProvider>
        <AchievementProvider>
        <CoupleProvider>
          <DisputeProvider>
            <View style={{ flex: 1, backgroundColor: Colors.background }}>
              <CosmicBackground />
              <View style={{ flex: 1 }} pointerEvents="box-none">
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: SCREEN_BG },
                  }}
                >
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" options={{ contentStyle: { backgroundColor: SCREEN_BG_SOLID } }} />
              <Stack.Screen name="auth/login" options={{ contentStyle: { backgroundColor: SCREEN_BG_SOLID } }} />
              <Stack.Screen name="auth/register" options={{ contentStyle: { backgroundColor: SCREEN_BG_SOLID } }} />
              <Stack.Screen name="auth/callback" options={{ contentStyle: { backgroundColor: SCREEN_BG_SOLID } }} />
              <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: SCREEN_BG_SOLID } }} />
              <Stack.Screen name="couple/connect" />
              <Stack.Screen name="mediation" />
              <Stack.Screen name="dispute/new" />
              <Stack.Screen name="dispute/[id]" />
              <Stack.Screen name="dispute/history" />
              <Stack.Screen name="premium" />
              <Stack.Screen name="achievements" />
              <Stack.Screen name="settings/language" />
              <Stack.Screen name="settings/notifications" />
              <Stack.Screen name="settings/relationship" />
              <Stack.Screen name="solo-analysis" />
              <Stack.Screen name="solo-chat" />
              <Stack.Screen name="dispute-closure" />
              <Stack.Screen name="gratitude" />
              <Stack.Screen name="agreements" />
              <Stack.Screen name="knowledge-center/index" />
              <Stack.Screen name="knowledge-center/[audience]" />
            </Stack>
              </View>
            </View>
          </DisputeProvider>
        </CoupleProvider>
        </AchievementProvider>
        </PurchasesProvider>
      </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
