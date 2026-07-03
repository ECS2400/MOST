import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register, loginWithGoogle } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleRegister() {
    setError('');
    setInfo('');
    if (!name.trim()) { setError('Podaj swoje imię'); return; }
    if (!email.trim()) { setError('Podaj adres email'); return; }
    if (password.length < 6) { setError('Hasło musi mieć min. 6 znaków'); return; }
    setLoading(true);
    try {
      const { needsEmailConfirmation } = await register(name.trim(), email.trim(), password);
      if (needsEmailConfirmation) {
        setInfo('Sprawdź skrzynkę e-mail i kliknij link potwierdzający, aby dokończyć rejestrację.');
        return;
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setInfo('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Nie udało się zalogować przez Google');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { marginBottom: Spacing.lg }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.logoRow}>
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientMid]}
            style={styles.logoCircle}
          >
            <Text style={styles.logoText}>M</Text>
          </LinearGradient>
          <Text style={styles.appName}>{t.app.name}</Text>
        </View>

        <Text style={styles.title}>{t.auth.registerTitle}</Text>
        <Text style={styles.sub}>{t.auth.registerSub}</Text>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {info ? (
          <View style={styles.infoBox}>
            <MaterialIcons name="mail-outline" size={16} color={Colors.primaryLight} />
            <Text style={styles.infoText}>{info}</Text>
          </View>
        ) : null}

        <Input
          label={t.auth.name}
          value={name}
          onChangeText={setName}
          placeholder="Twoje imię"
        />
        <Input
          label={t.auth.email}
          value={email}
          onChangeText={setEmail}
          placeholder="twoj@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label={t.auth.password}
          value={password}
          onChangeText={setPassword}
          placeholder="Min. 6 znaków"
          secureTextEntry
        />

        <Button
          title={t.auth.registerBtn}
          onPress={handleRegister}
          loading={loading}
          fullWidth
          size="lg"
          style={{ marginTop: Spacing.sm }}
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t.auth.orWith}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title={t.auth.withGoogle}
          onPress={handleGoogle}
          loading={googleLoading}
          variant="outline"
          fullWidth
          size="lg"
        />

        <Pressable onPress={() => router.replace('/auth/login')} style={styles.switchLink}>
          <Text style={styles.switchText}>
            {t.auth.hasAccount}{' '}
            <Text style={styles.switchLinkText}>{t.auth.login}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { paddingHorizontal: Spacing.xl, maxWidth: 480, width: '100%', alignSelf: 'center', flexGrow: 1 },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: '#fff',
  },
  appName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error + '15',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.primaryLight,
    flex: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  switchLink: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  switchText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },
  switchLinkText: {
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primaryLight,
  },
});
