import { Stack } from 'expo-router';
import { SCREEN_BG } from '@/components/ui/CosmicBackground';

export default function MediationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: SCREEN_BG },
      }}
    >
      <Stack.Screen name="new" />
      <Stack.Screen name="analysis" />
      <Stack.Screen name="invite" />
      <Stack.Screen name="join" />
      <Stack.Screen name="partner-perspective" />
      <Stack.Screen name="live" />
      <Stack.Screen name="closure" />
      <Stack.Screen name="summary" />
    </Stack>
  );
}
