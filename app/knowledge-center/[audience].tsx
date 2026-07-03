import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  getKnowledgeArticles,
  getKnowledgeTopics,
  getKnowledgeImage,
  type KnowledgeAudience,
} from '@/data/knowledgeCenter';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useLanguage } from '@/hooks/useLanguage';

function ArticleRow({
  title,
  topic,
  content,
  imageIndex,
  expanded,
  onToggle,
}: {
  title: string;
  topic: string;
  content: string;
  imageIndex: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.articleCard,
        expanded && styles.articleCardExpanded,
        { opacity: pressed ? 0.95 : 1 },
      ]}
    >
      <View style={styles.articleHeader}>
        <View style={styles.articleHeaderText}>
          <View style={styles.topicPill}>
            <Text style={styles.topicPillText}>{topic}</Text>
          </View>
          <Text style={styles.articleTitle}>{title}</Text>
        </View>
        <MaterialIcons
          name={expanded ? 'expand-less' : 'expand-more'}
          size={24}
          color={Colors.primaryLight}
        />
      </View>

      {expanded ? (
        <View style={styles.articleBody}>
          <Image
            source={getKnowledgeImage(imageIndex)}
            style={styles.articleImage}
            contentFit="cover"
            transition={200}
          />
          <Text style={styles.articleContent}>{content}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function KnowledgeGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { audience: rawAudience } = useLocalSearchParams<{ audience: string }>();
  const audience: KnowledgeAudience = rawAudience === 'on' ? 'on' : 'ona';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string>('all');

  const topics = useMemo(() => getKnowledgeTopics(language), [language]);
  const articles = useMemo(
    () => getKnowledgeArticles(audience, language),
    [audience, language]
  );
  const filtered = useMemo(
    () =>
      topicFilter === 'all'
        ? articles
        : articles.filter((a) => a.topic === topicFilter),
    [articles, topicFilter]
  );

  const headerTitle =
    audience === 'on' ? t.knowledgeCenter.guideForHim : t.knowledgeCenter.guideForHer;
  const headerSub =
    audience === 'on' ? t.knowledgeCenter.guideSubHim : t.knowledgeCenter.guideSubHer;

  function toggleArticle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{headerTitle}</Text>
          <Text style={styles.subtitle}>{headerSub}</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.filtersWrap}>
            <Pressable
              onPress={() => setTopicFilter('all')}
              style={[styles.filterChip, topicFilter === 'all' && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  topicFilter === 'all' && styles.filterChipTextActive,
                ]}
              >
                {t.knowledgeCenter.filterAll} ({articles.length})
              </Text>
            </Pressable>
            {topics.map((topic) => {
              const count = articles.filter((a) => a.topic === topic).length;
              return (
                <Pressable
                  key={topic}
                  onPress={() => setTopicFilter(topic)}
                  style={[styles.filterChip, topicFilter === topic && styles.filterChipActive]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      topicFilter === topic && styles.filterChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {topic} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        }
        renderItem={({ item }) => (
          <ArticleRow
            title={item.title}
            topic={item.topic}
            content={item.content}
            imageIndex={item.imageIndex}
            expanded={expandedId === item.id}
            onToggle={() => toggleArticle(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    ...(Platform.OS === 'web'
      ? { maxWidth: 560, width: '100%', alignSelf: 'center' as const }
      : null),
  },
  filtersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    maxWidth: '100%',
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '25',
  },
  filterChipText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.primaryLight,
    fontFamily: Typography.fontFamily.semiBold,
  },
  separator: { height: 10 },
  articleCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  articleCardExpanded: {
    borderColor: Colors.primary + '45',
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  articleHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  topicPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '20',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  topicPillText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: Colors.primaryLight,
  },
  articleTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  articleBody: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  articleImage: {
    width: '100%',
    height: 140,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceElevated,
  },
  articleContent: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
