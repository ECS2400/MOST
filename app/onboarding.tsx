import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  FlatList,
  Pressable,
  type ViewToken,
  type ListRenderItem,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

const ONBOARDING_KEY = '@most/onboarding_seen';

type Slide = {
  image: number;
  title: string;
  sub: string;
};

const viewabilityConfig = { viewAreaCoveragePercentThreshold: 60 };

export default function Onboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const activeIndexRef = useRef(0);

  const slides = useMemo<Slide[]>(
    () => [
      {
        image: require('@/assets/images/onboarding1.png'),
        title: t.onboarding.slide1Title,
        sub: t.onboarding.slide1Sub,
      },
      {
        image: require('@/assets/images/onboarding2.png'),
        title: t.onboarding.slide2Title,
        sub: t.onboarding.slide2Sub,
      },
      {
        image: require('@/assets/images/onboarding3.png'),
        title: t.onboarding.slide3Title,
        sub: t.onboarding.slide3Sub,
      },
    ],
    [t],
  );

  const slideHeight = height * 0.65;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const index = viewableItems[0]?.index;
      if (index != null) {
        activeIndexRef.current = index;
        setActiveIndex(index);
      }
    },
  ).current;

  useEffect(() => {
    listRef.current?.scrollToIndex({ index: activeIndexRef.current, animated: false });
  }, [width]);

  const handleNext = useCallback(async () => {
    if (activeIndex < slides.length - 1) {
      const next = activeIndex + 1;
      activeIndexRef.current = next;
      setActiveIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
      return;
    }
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace(user ? '/(tabs)' : '/auth/register');
  }, [activeIndex, router, user]);

  const renderSlide: ListRenderItem<Slide> = useCallback(
    ({ item }) => (
      <View style={[styles.slide, { width, height: slideHeight }]}>
        <Image
          source={item.image}
          style={{ width, height: slideHeight }}
          contentFit="cover"
          contentPosition="center"
          transition={0}
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={['transparent', Colors.background]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>
    ),
    [width, slideHeight],
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={slides}
        key={width}
        horizontal
        pagingEnabled
        bounces={false}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index, animated: false });
          }, 50);
        }}
        style={{ width, height: slideHeight }}
        renderItem={renderSlide}
        keyExtractor={(_, index) => String(index)}
      />

      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.textBlock} key={activeIndex}>
          <Text style={styles.title}>{slides[activeIndex].title}</Text>
          <Text style={styles.sub}>{slides[activeIndex].sub}</Text>
        </View>

        <Button
          title={activeIndex === slides.length - 1 ? t.onboarding.begin : t.common.next}
          onPress={handleNext}
          fullWidth
          size="lg"
        />

        <Pressable
          onPress={() => router.replace('/auth/login')}
          style={styles.loginLink}
          hitSlop={{ top: 8, bottom: 8 }}
        >
          <Text style={styles.loginText}>{t.onboarding.login}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'flex-end',
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primaryLight,
  },
  textBlock: {
    gap: 8,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size['3xl'],
    color: Colors.textPrimary,
    lineHeight: 38,
  },
  sub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  loginText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },
});
