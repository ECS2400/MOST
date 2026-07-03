import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  editable?: boolean;
  maxLength?: number;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  editable = true,
  maxLength,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          multiline && styles.multilineWrapper,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={secureTextEntry && !showPassword}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          editable={editable}
          maxLength={maxLength}
          style={[
            styles.input,
            multiline && styles.multilineInput,
            !editable && styles.disabledInput,
            Platform.OS === 'web' && styles.inputWeb,
            inputStyle,
          ]}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <MaterialIcons name="error-outline" size={13} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceElevated,
  },
  inputError: {
    borderColor: Colors.error,
  },
  multilineWrapper: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    includeFontPadding: false,
  },
  inputWeb: {
    outlineStyle: 'solid',
    outlineWidth: 0,
    outlineColor: 'transparent',
    minWidth: 0,
    borderWidth: 0,
  },
  multilineInput: {
    height: undefined,
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  disabledInput: {
    color: Colors.textMuted,
  },
  eyeIcon: {
    paddingLeft: Spacing.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  errorText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.xs,
    color: Colors.error,
  },
});
