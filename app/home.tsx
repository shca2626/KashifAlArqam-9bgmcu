// Powered by OnSpace.AI — HomeScreen: Search-focused mobile design
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Animated,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { getRecentSearches, clearHistory, removeHistoryItem } from '@/utils/historyStorage';
import { isPhoneQuery } from '@/utils/phoneUtils';
import { RecentSearch } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';

const { width } = Dimensions.get('window');

type SearchMode = 'auto' | 'number' | 'name';

const OWNER_UNLOCK_KEY = '@kashif_owner_unlocked';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('auto');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [ownerTaps, setOwnerTaps] = useState(0);
  const ownerTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputRef = useRef<TextInput>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadRecents();
    }, [])
  );

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.spring(fabAnim, {
      toValue: query.trim().length > 0 ? 1 : 0,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [query]);

  const loadRecents = async () => {
    const recent = await getRecentSearches(12);
    setRecentSearches(recent);
  };

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    inputRef.current?.blur();
    const detectedMode =
      searchMode === 'auto'
        ? isPhoneQuery(query) ? 'number' : 'name'
        : searchMode;
    router.push({
      pathname: '/search-results',
      params: { query: query.trim(), mode: detectedMode },
    });
  }, [query, searchMode, router]);

  const handleRecentPress = (item: RecentSearch) => {
    router.push({
      pathname: '/search-results',
      params: { query: item.query, mode: item.type },
    });
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setRecentSearches([]);
  };

  const handleRemoveItem = async (id: string) => {
    await removeHistoryItem(id);
    setRecentSearches((prev) => prev.filter((r) => r.id !== id));
  };

  // Secret owner unlock: tap version 7 times quickly
  const handleOwnerTap = async () => {
    if (ownerTapTimer.current) clearTimeout(ownerTapTimer.current);
    const next = ownerTaps + 1;
    setOwnerTaps(next);
    if (next >= 7) {
      setOwnerTaps(0);
      await AsyncStorage.setItem(OWNER_UNLOCK_KEY, 'true');
      router.push('/analytics');
    } else {
      ownerTapTimer.current = setTimeout(() => setOwnerTaps(0), 2000);
    }
  };

  const renderRecentItem = ({ item }: { item: RecentSearch }) => (
    <Pressable
      onPress={() => handleRecentPress(item)}
      style={({ pressed }) => [styles.recentItem, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.recentLeft}>
        <Pressable
          onPress={() => handleRemoveItem(item.id)}
          hitSlop={12}
          style={({ pressed }) => [pressed && { opacity: 0.5 }]}
        >
          <MaterialIcons name="close" size={14} color={Colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.recentCenter}>
        <Text style={styles.recentQuery} numberOfLines={1}>{item.query}</Text>
        {item.resultCount !== undefined ? (
          <Text style={styles.recentMeta}>{item.resultCount} نتيجة · {item.type === 'number' ? 'رقم' : 'اسم'}</Text>
        ) : null}
      </View>
      <View style={[styles.recentIcon, item.type === 'number' ? styles.recentIconNum : styles.recentIconName]}>
        <MaterialIcons
          name={item.type === 'number' ? 'dialpad' : 'person'}
          size={16}
          color={item.type === 'number' ? Colors.primary : Colors.accent}
        />
      </View>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ── */}
      <Animated.View
        style={[
          styles.header,
          { paddingTop: insets.top + Spacing.md, opacity: headerAnim },
        ]}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="settings" size={22} color={Colors.textOnPrimary} />
          </Pressable>

          <Pressable onPress={handleOwnerTap} style={styles.logoWrap}>
            <View style={styles.logoIcon}>
              <MaterialIcons name="search" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.logoText}>كاشف الأرقام</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/moderation')}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="tune" size={22} color={Colors.textOnPrimary} />
          </Pressable>
        </View>

        <Text style={styles.headerTagline}>ابحث عن أي رقم أو اسم في اليمن</Text>

        {/* ── Search Box ── */}
        <View style={styles.searchBox}>
          <Pressable
            onPress={handleSearch}
            style={({ pressed }) => [styles.searchActionBtn, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="search" size={22} color={Colors.primary} />
          </Pressable>

          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="ابحث برقم الهاتف أو الاسم..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            returnKeyType="search"
            textAlign="right"
            textAlignVertical="center"
          />

          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              style={styles.clearBtn}
            >
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* ── Mode pills ── */}
        <View style={styles.modePills}>
          {((['auto', 'number', 'name'] as SearchMode[])).map((m) => (
            <Pressable
              key={m}
              onPress={() => setSearchMode(m)}
              style={[styles.modePill, searchMode === m && styles.modePillActive]}
            >
              <MaterialIcons
                name={m === 'auto' ? 'auto-awesome' : m === 'number' ? 'dialpad' : 'person-search'}
                size={13}
                color={searchMode === m ? Colors.primary : 'rgba(255,255,255,0.75)'}
              />
              <Text style={[styles.modePillText, searchMode === m && styles.modePillTextActive]}>
                {m === 'auto' ? 'تلقائي' : m === 'number' ? 'رقم' : 'اسم'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* ── Body ── */}
      <View style={styles.body}>
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {recentSearches.length > 0 ? 'عمليات البحث الأخيرة' : 'ابدأ البحث'}
          </Text>
          {recentSearches.length > 0 ? (
            <Pressable onPress={handleClearHistory} hitSlop={8}>
              <Text style={styles.clearAllText}>مسح الكل</Text>
            </Pressable>
          ) : null}
        </View>

        {recentSearches.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="manage-search" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>لا يوجد بحث سابق</Text>
            <Text style={styles.emptyDesc}>
              اكتب رقم هاتف أو اسم في خانة البحث أعلاه
            </Text>
            <View style={styles.quickTips}>
              {QUICK_TIPS.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <MaterialIcons name={tip.icon} size={16} color={Colors.primary} />
                  <Text style={styles.tipText}>{tip.text}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            data={recentSearches}
            keyExtractor={(item) => item.id}
            renderItem={renderRecentItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      {/* ── Search FAB ── */}
      <Animated.View
        style={[
          styles.fab,
          {
            bottom: insets.bottom + 90,
            transform: [
              {
                translateY: fabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [80, 0],
                }),
              },
              { scale: fabAnim },
            ],
            opacity: fabAnim,
          },
        ]}
      >
        <Pressable
          onPress={handleSearch}
          style={({ pressed }) => [styles.fabBtn, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          <MaterialIcons name="search" size={22} color={Colors.textOnPrimary} />
          <Text style={styles.fabText}>بحث الآن</Text>
        </Pressable>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const QUICK_TIPS = [
  { icon: 'dialpad' as const, text: 'ابحث بالرقم: 777123456' },
  { icon: 'person' as const, text: 'ابحث بالاسم: محمد أحمد' },
  { icon: 'info-outline' as const, text: 'يمكنك كتابة جزء من الاسم' },
];

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // ── Header ──
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl + 8,
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.textOnPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
    letterSpacing: 0.3,
  },
  headerTagline: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  // ── Search box ──
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.textOnPrimary,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    height: 54,
    gap: Spacing.sm,
    ...Shadow.md,
  },
  searchActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  clearBtn: {
    padding: 4,
  },
  // ── Mode pills ──
  modePills: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  modePill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  modePillActive: {
    backgroundColor: Colors.textOnPrimary,
  },
  modePillText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FontWeight.medium,
  },
  modePillTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  // ── Body ──
  body: {
    flex: 1,
    marginTop: -16,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  clearAllText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: FontWeight.semiBold,
  },
  // ── Recent items ──
  recentItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  recentLeft: {
    width: 28,
    alignItems: 'center',
  },
  recentCenter: {
    flex: 1,
    alignItems: 'flex-end',
  },
  recentQuery: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  recentMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'right',
  },
  recentIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentIconNum: { backgroundColor: '#EEF0F8' },
  recentIconName: { backgroundColor: '#EFF8F2' },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.lg,
  },
  // ── Empty state ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.section,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  quickTips: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tipRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
    flex: 1,
  },
  // ── FAB ──
  fab: {
    position: 'absolute',
    alignSelf: 'center',
  },
  fabBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    ...Shadow.lg,
  },
  fabText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
});
