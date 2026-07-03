// App root — auth & onboarding router
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';

const ONBOARDING_KEY = '@most/onboarding_seen';

export default function Index() {
  const { user, loading, isLoading } = useAuth();
  const { refreshCouple } = useCouple();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      refreshCouple(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setOnboardingSeen(null);
      return;
    }

    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setOnboardingSeen(value === 'true');
    });
  }, [user?.id]);

  if (loading || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  if (onboardingSeen === null) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!onboardingSeen) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
