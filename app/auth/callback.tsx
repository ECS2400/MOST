import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { createSessionFromUrl } from '@/utils/authRedirect';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function processUrl(url: string) {
      await createSessionFromUrl(url);
      if (mounted) router.replace('/(tabs)');
    }

    async function handleInitial() {
      try {
        const initialUrl =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : await Linking.getInitialURL();

        if (!initialUrl) {
          return;
        }

        await processUrl(initialUrl);
      } catch (e: unknown) {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : 'Nie udało się zalogować.';
        setError(message);
      }
    }

    const subscription = Linking.addEventListener('url', ({ url }) => {
      processUrl(url).catch((e: unknown) => {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : 'Nie udało się zalogować.';
        setError(message);
      });
    });

    const timeout = setTimeout(() => {
      if (mounted) {
        setError((current) => current ?? 'Nie znaleziono linku potwierdzającego.');
      }
    }, 10000);

    handleInitial();

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [router]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Błąd logowania</Text>
        <Text style={styles.message}>{error}</Text>
        <Button
          title="Wróć do logowania"
          onPress={() => router.replace('/auth/login')}
          fullWidth
          size="lg"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text style={styles.loadingText}>Logowanie…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  loadingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
