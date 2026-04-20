// Powered by OnSpace.AI — HomeScreen
//
// Shown after first sync is complete. The manual "Sync" button is a resync
// action only — it never triggers the initial auto-sync.

import React, { useState, useCallback, useEffect } from 'react';
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
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { SearchBar, SectionHeader, EmptyState, SyncProgressModal } from '@/components';
import { getRecentSearches, clearHistory, removeHistoryItem } from '@/utils/historyStorage';
import { isPhoneQuery } from '@/utils/phoneUtils';
import { RecentSearch, SyncStats } from '@/types';
import { getLastSyncStats, getLastSyncAt } from '@/services/syncOrchestrator';
import { useContactSync } from '@/hooks/useContactSync';

type SearchMode = 'auto' | 'number' | 'name';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('auto');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [lastSyncLabel, setLastSyncLabel] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);

  // Manual resync only — never triggers initial sync
  const { progress, isSyncing, showModal, startSync, dismissModal } = useContactSync();

  useEffect(() => {
    loadData();
  }, []);

  // Refresh after a manual resync completes
  useEffect(() => {
    if (progress.status === 'done') {
      loadData();
    }
  }, [progress.status]);

  const loadData = async () => {
    const [recent, lastSyncAt, stats] = await Promise.all([
      getRecentSearches(10),
      getLastSyncAt(),
      getLastSyncStats(),
    ]);
    setRecentSearches(recent);
    setSyncStats(stats);
    if (lastSyncAt) {
      setLastSyncLabel(
        new Date(lastSyncAt).toLocaleDateString('ar-YE', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        })
      );
    }
  };

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    const detectedMode =
      searchMode === 'auto'
        ? isPhoneQuery(query) ? 'number' : 'name'
        : searchMode;
    router.push({ pathname: '/search-results', params: { query: query.trim(), mode: detectedMode } });
  }, [query, searchMode, router]);

  const handleRecentPress = (item: RecentSearch) => {
    setQuery(item.query);
    router.push({ pathname: '/search-results', params: { query: item.query, mode: item.type } });
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setRecentSearches([]);
  };

  const handleRemoveItem = async (id: string) => {
    await removeHistoryItem(id);
    setRecentSearches((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <View style={styles.root}>
      {/* Manual resync modal */}
      <SyncProgressModal
        visible={showModal}
        progress={progress}
        onClose={() => { dismissModal(); loadData(); }}
      />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.push('/moderation')}
            hitSlop={8}
            style={({ pressed }) => [styles.headerIcon, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="shield" size={22} color={Colors.textOnPrimary} />
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
                name={mode === 'auto' ? 'auto-fix-high' : mode === 'number' ? 'dialpad' : 'person-search'}
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

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sync status card */}
        <View style={styles.syncCard}>
          <View style={styles.syncCardInfo}>
            <MaterialIcons
              name={isSyncing ? 'sync' : 'cloud-done'}
              size={28}
              color={isSyncing ? Colors.warning : Colors.accent}
            />
            <View style={styles.syncCardText}>
              <Text style={styles.syncCardTitle}>
                {isSyncing ? 'جاري المزامنة...' : 'مزامنة جهات الاتصال'}
              </Text>
              <Text style={styles.syncCardSub}>
                {isSyncing
                  ? `${progress.uploaded} جهة تم رفعها`
                  : lastSyncLabel
                  ? `آخر مزامنة: ${lastSyncLabel}`
                  : 'لم تتم المزامنة بعد'}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => startSync(null)}
            disabled={isSyncing}
            style={({ pressed }) => [
              styles.syncBtn,
              isSyncing && styles.syncBtnDisabled,
              pressed && !isSyncing && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons name="refresh" size={16} color={Colors.textOnPrimary} />
            <Text style={styles.syncBtnText}>{isSyncing ? 'جاري...' : 'إعادة مزامنة'}</Text>
          </Pressable>
        </View>

        {/* Quick stats derived from last sync */}
        {syncStats ? (
          <View style={styles.statsRow}>
            {[
              { value: syncStats.totalRead.toLocaleString('ar'), label: 'جهة اتصال' },
              { value: syncStats.totalUploaded.toLocaleString('ar'), label: 'تم الرفع' },
              { value: syncStats.totalSkipped.toLocaleString('ar'), label: 'تم التخطي' },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.statsRow}>
            {[
              { icon: 'people' as const, value: '٢م+', label: 'رقم مسجل' },
              { icon: 'verified-user' as const, value: '٩٥٪', label: 'دقة التعرف' },
              { icon: 'update' as const, value: 'يومي', label: 'تحديث البيانات' },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                <MaterialIcons name={s.icon} size={20} color={Colors.primary} />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

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
                <MaterialIcons name="close" size={16} color={Colors.textMuted} />
              </Pressable>
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
              <View style={styles.recentContent}>
                <Text style={styles.recentQuery}>{item.query}</Text>
                {item.resultCount !== undefined ? (
                  <Text style={styles.recentCount}>{item.resultCount} نتيجة</Text>
                ) : null}
              </View>
            </Pressable>
          ))
        )}

        {/* Search tip */}
        <View style={styles.tipWrap}>
          <MaterialIcons name="lightbulb-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.tipText}>
            يمكنك البحث بالاسم الكامل أو جزء منه أو رقم الهاتف مباشرةً
          </Text>
        </View>
      </ScrollView>

      {/* Floating search button */}
      {query.trim().length > 0 ? (
        <Pressable
          onPress={handleSearch}
          style={({ pressed }) => [
            styles.fab,
            { bottom: insets.bottom + 24 },
            pressed && { transform: [{ scale: 0.93 }] },
          ]}
        >
          <MaterialIcons name="search" size={22} color={Colors.textOnPrimary} />
          <Text style={styles.fabText}>بحث</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  searchWrap: { marginHorizontal: Spacing.sm },
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
  modeTabActive: { backgroundColor: Colors.surface },
  modeTabText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FontWeight.medium,
  },
  modeTabTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },
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
  syncCardText: { flex: 1, alignItems: 'flex-end' },
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
  syncBtnDisabled: { backgroundColor: Colors.textMuted },
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
    width: 36, height: 36,
    borderRadius: Radius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  recentTypeNum: { backgroundColor: '#EEF0F8' },
  recentTypeName: { backgroundColor: '#EFF8F2' },
  recentContent: { flex: 1, alignItems: 'flex-end' },
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
    alignItems: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'right',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
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
