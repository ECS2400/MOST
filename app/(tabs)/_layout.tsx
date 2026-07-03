import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <Tabs
      sceneContainerStyle={{ backgroundColor: Colors.background }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
          paddingHorizontal: 16,
        },
        tabBarActiveTintColor: Colors.primaryLight,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: Typography.fontFamily.medium,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.dispute?.activeDisputes ? 'Spory' : 'Spory',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialIcons
              name={focused ? 'forum' : 'chat-bubble-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="partner"
        options={{
          title: t.couple?.partner || 'Partner',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialIcons
              name={focused ? 'favorite' : 'favorite-border'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.profile?.title || 'Profil',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialIcons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
