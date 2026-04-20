// Powered by OnSpace.AI — HomeScreen with real contact sync
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { SearchBar, SectionHeader, EmptyState, SyncProgressModal } from '@/components';
import { getRecentSearches, clearHistory, removeHistoryItem } from '@/utils/historyStorage';
import { isPhoneQuery } from '@/utils/phoneUtils';
import { RecentSearch } from '@/types';
import { STORAGE_KEYS } from '@/constants/config';
import { useContactSync } from '@/hooks/useContactSync';
import { getLastSyncAt } from '@/services/contactSyncService';

type SearchMode = 'auto' | 'number' | 'name';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('auto');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [contactSyncEnabled, setContactSyncEnabled] = useState(false);
  const [lastSyncLabel, setLastSyncLabel] = useState<string | null>(null);

  const { progress, isSyncing, showModal, startSync, dismissModal } = useContactSync();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [recent, syncVal, lastSync] = await Promise.all([
      getRecentSearches(10),
      AsyncStorage.getItem(STORAGE_KEYS.contactSyncEnabled),
      getLastSyncAt(),
    ]);
    setRecentSearches(recent);
    setContactSyncEnabled(syncVal === 'true');
    if (lastSync) {
      setLastSyncLabel(
        new Date(lastSync).toLocaleDateString('ar-YE', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    }
  };

  useEffect(() => {
    if (progress.status === 'done') {
      loadData();
    }
  }, [progress.status]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    const detectedMode =
      searchMode === 'auto'
        ? isPhoneQuery(query)
          ? 'number'
          : 'name'
        : searchMode;
    router.push({
      pathname: '/search-results',
      params: { query: query.trim(), mode: detectedMode },
    });
  }, [query, searchMode, router]);

  const handleRecentPress = (item: RecentSearch) => {
    setQuery(item.query);
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

  const handleSyncPress = () => {
    startSync();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Sync Progress Modal */}
      <SyncProgressModal
        visible={showModal}
        progress={progress}
        onClose={dismissModal}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.push('/moderation')}
            hitSlop={8}
            style={({ pressed }) => [styles.headerIcon, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="tune" size={22} color={Colors.textOnPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>كاشف الارقام</Text>
          <View style={styles.headerIcon} />
        </View>

        <Text style={styles.headerSub}>ابحث عن أي رقم أو اسم في اليمن</Text>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onSubmit={handleSearch}
            onClear={() => setQuery('')}
          />
        </View>

        {/* Search mode tabs */}
        <View style={styles.modeTabs}>
          {(['auto', 'number', 'name'] as SearchMode[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setSearchMode(mode)}
              style={[styles.modeTab, searchMode === mode && styles.modeTabActive]}
            >
              <MaterialIcons
                name={mode === 'auto' ? 'auto-awesome' : mode === 'number' ? 'dialpad' : 'person-search'}
                size={14}
                color={searchMode === mode ? Colors.primary : 'rgba(255,255,255,0.8)'}
              />
              <Text style={[styles.modeTabText, searchMode === mode && styles.modeTabTextActive]}>
                {mode === 'auto' ? 'تلقائي' : mode === 'number' ? 'رقم' : 'اسم'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Sync contacts card */}
        <View style={styles.syncCard}>
          <View style={styles.syncCardInfo}>
            <MaterialIcons
              name={contactSyncEnabled ? 'sync' : 'group-add'}
              size={28}
              color={Colors.primary}
            />
            <View style={styles.syncCardText}>
              <Text style={styles.syncCardTitle}>
                {contactSyncEnabled ? 'مزامنة جهات الاتصال' : 'ساهم في تحسين البيانات'}
              </Text>
              <Text style={styles.syncCardSub}>
                {contactSyncEnabled
                  ? lastSyncLabel
                    ? `آخر مزامنة: ${lastSyncLabel}`
                    : 'لم تتم المزامنة بعد'
                  : 'شارك جهات اتصالك لمساعدة الآخرين'}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={handleSyncPress}
            disabled={isSyncing}
            style={({ pressed }) => [
              styles.syncBtn,
              isSyncing && styles.syncBtnDisabled,
              pressed && !isSyncing && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons name="cloud-upload" size={16} color={Colors.textOnPrimary} />
            <Text style={styles.syncBtnText}>{isSyncing ? 'جاري...' : 'مزامنة'}</Text>
          </Pressable>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <MaterialIcons name={s.icon} size={22} color={Colors.primary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent searches */}
        <SectionHeader
          title="البحث الأخير"
          subtitle={recentSearches.length > 0 ? `${recentSearches.length} عملية` : undefined}
          actionLabel={recentSearches.length > 0 ? 'مسح الكل' : undefined}
          onAction={handleClearHistory}
        />

        {recentSearches.length === 0 ? (
          <EmptyState
            icon="history"
            title="لا يوجد بحث سابق"
            description="ستظهر هنا عمليات البحث الأخيرة"
          />
        ) : (
          recentSearches.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleRecentPress(item)}
              style={({ pressed }) => [styles.recentItem, pressed && { opacity: 0.75 }]}
            >
              <Pressable
                onPress={() => handleRemoveItem(item.id)}
                hitSlop={8}
                style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.5 }]}
              >
                <MaterialIcons name="close" size={14} color={Colors.textMuted} />
              </Pressable>

              <View style={styles.recentContent}>
                <Text style={styles.recentQuery}>{item.query}</Text>
                {item.resultCount !== undefined ? (
                  <Text style={styles.recentCount}>{item.resultCount} نتيجة</Text>
                ) : null}
              </View>

              <View
                style={[
                  styles.recentTypeIcon,
                  item.type === 'number' ? styles.recentTypeNum : styles.recentTypeName,
                ]}
              >
                <MaterialIcons
                  name={item.type === 'number' ? 'dialpad' : 'person'}
                  size={16}
                  color={item.type === 'number' ? Colors.primary : Colors.accent}
                />
              </View>
            </Pressable>
          ))
        )}

        {/* Tip */}
        <View style={styles.tipWrap}>
          <MaterialIcons name="lightbulb-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.tipText}>
            يمكنك البحث بالاسم الكامل أو جزء منه أو رقم الهاتف مباشرةً
          </Text>
        </View>
      </ScrollView>

      {/* Search FAB */}
      {query.trim().length > 0 ? (
        <Pressable
          onPress={handleSearch}
          style={({ pressed }) => [
            styles.fab,
            { bottom: insets.bottom + 24 },
            pressed && { transform: [{ scale: 0.93 }] },
          ]}
        >
          <MaterialIcons name="search" size={24} color={Colors.textOnPrimary} />
          <Text style={styles.fabText}>بحث</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const STATS = [
  { icon: 'people' as const, value: '٢م+', label: 'رقم مسجل' },
  { icon: 'verified-user' as const, value: '٩٥٪', label: 'دقة التعرف' },
  { icon: 'update' as const, value: 'يومي', label: 'تحديث البيانات' },
];

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  headerTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  searchWrap: {
    marginHorizontal: Spacing.sm,
  },
  modeTabs: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modeTab: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modeTabActive: {
    backgroundColor: Colors.surface,
  },
  modeTabText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FontWeight.medium,
  },
  modeTabTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  body: {
    flex: 1,
    marginTop: -Spacing.lg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    backgroundColor: Colors.background,
  },
  syncCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  syncCardInfo: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  syncCardText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  syncCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  syncCardSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  syncBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  syncBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
  syncBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  recentItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  recentTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentTypeNum: {
    backgroundColor: '#EEF0F8',
  },
  recentTypeName: {
    backgroundColor: '#EFF8F2',
  },
  recentContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  recentQuery: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  recentCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  removeBtn: {
    padding: 4,
  },
  tipWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxxl,
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'right',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    ...Shadow.lg,
  },
  fabText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
});
