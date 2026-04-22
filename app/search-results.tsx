// Powered by OnSpace.AI — SearchResultsScreen
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { SearchBar, ContactListItem, SectionHeader, EmptyState } from '@/components';
import { searchByNumber, searchByName } from '@/services/lookupService';
import { saveToContacts } from '@/utils/contactUtils';
import { saveSearch } from '@/utils/historyStorage';
import { LookupResultGroup } from '@/types';

const PAGE_SIZE = 15;

export default function SearchResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ query: string; mode: string }>();

  const [query, setQuery] = useState(params.query ?? '');
  const [mode] = useState<'number' | 'name'>(
    params.mode === 'number' ? 'number' : 'name'
  );
  const [results, setResults] = useState<LookupResultGroup[]>([]);
  const [displayed, setDisplayed] = useState<LookupResultGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res =
        mode === 'number'
          ? await searchByNumber(q)
          : await searchByName(q);
      setResults(res);
      setDisplayed(res.slice(0, PAGE_SIZE));
      setPage(1);
      // Auto-save to search history
      if (q.trim()) {
        saveSearch({ query: q.trim(), type: mode, resultCount: res.length });
      }
    } catch {
      setError('حدث خطأ أثناء البحث. يُرجى المحاولة مجدداً.');
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    performSearch(query);
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(text);
    }, 300);
  };

  const loadMore = useCallback(() => {
    if (isLoadingMore) return;
    const nextPage = page + 1;
    const nextItems = results.slice(0, nextPage * PAGE_SIZE);
    if (nextItems.length <= displayed.length) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayed(nextItems);
      setPage(nextPage);
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, page, results, displayed.length]);

  const handleItemPress = (item: LookupResultGroup) => {
    router.push({
      pathname: '/contact-details',
      params: { id: item.id, phone: item.phoneNumber },
    });
  };

  const handleSave = (item: LookupResultGroup) => {
    saveToContacts(item.topLabel, item.phoneNumber);
  };

  const renderItem = useCallback(
    ({ item, index }: { item: LookupResultGroup; index: number }) => (
      <ContactListItem
        item={item}
        isFirst={index === 0}
        onPress={handleItemPress}
        onSave={handleSave}
      />
    ),
    []
  );

  const keyExtractor = useCallback((item: LookupResultGroup) => item.id, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="arrow-forward" size={22} color={Colors.textOnPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>نتائج البحث</Text>
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={14} color={Colors.textOnPrimary} />
            <Text style={styles.verifiedText}>CALLER ID</Text>
          </View>
        </View>

        {/* Inline search */}
        <SearchBar
          value={query}
          onChangeText={handleQueryChange}
          onSubmit={() => performSearch(query)}
          onClear={() => {
            setQuery('');
            setResults([]);
            setDisplayed([]);
          }}
        />
      </View>

      {/* Results count */}
      {!isLoading && !error ? (
        <View style={styles.resultsBanner}>
          <Text style={styles.resultsBannerText}>
            تم العثور على{' '}
            <Text style={styles.resultsBannerCount}>{results.length}</Text>{' '}
            نتيجة
          </Text>
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>
              {mode === 'number' ? 'بحث برقم' : 'بحث باسم'}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري البحث...</Text>
        </View>
      ) : error ? (
        <EmptyState
          icon="error-outline"
          title="حدث خطأ"
          description={error}
          actionLabel="إعادة المحاولة"
          onAction={() => performSearch(query)}
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon="search-off"
          title="لا توجد نتائج"
          description="لم يتم العثور على أي نتائج لهذا البحث"
          actionLabel="العودة"
          onAction={() => router.back()}
        />
      ) : (
        <FlatList
          data={displayed}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            results.length > 0 ? (
              <SectionHeader
                title="النتائج"
                subtitle={`${results.length} رقم موجود`}
              />
            ) : null
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : results.length > displayed.length ? (
              <Pressable
                onPress={loadMore}
                style={({ pressed }) => [styles.loadMoreBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.loadMoreText}>
                  عرض المزيد من النتائج ({results.length - displayed.length}+)...
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}

      {/* Premium banner */}
      {!isLoading && results.length > 0 ? (
        <View style={[styles.premiumBanner, { marginBottom: insets.bottom + Spacing.lg }]}>
          <MaterialIcons name="star" size={28} color="rgba(255,255,255,0.8)" />
          <View style={styles.premiumText}>
            <Text style={styles.premiumTitle}>اكشف المزيد من التفاصيل</Text>
            <Text style={styles.premiumSub}>احصل على عضوية بريميوم لمعرفة المزيد عن هذا الرقم</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semiBold,
    color: 'rgba(255,255,255,0.8)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  verifiedText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
    letterSpacing: 1,
  },
  resultsBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultsBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  resultsBannerCount: {
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  modeBadge: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  modeBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  listContent: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  loadingMore: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  loadMoreBtn: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semiBold,
  },
  premiumBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.md,
  },
  premiumText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  premiumTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
    textAlign: 'right',
  },
  premiumSub: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
    marginTop: 2,
  },
});
