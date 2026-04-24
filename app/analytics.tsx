// Powered by OnSpace.AI — Analytics (Owner-only page, unlocked via secret tap)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { getSupabaseClient } from '@/template';

const OWNER_UNLOCK_KEY = '@kashif_owner_unlocked';

interface Stats {
  totalPhoneRecords: number;
  uniquePhones: number;
  abusiveCount: number;
  totalReports: number;
  totalContributors: number;
  totalContacts: number;
  totalImportJobs: number;
  avgConfidence: number;
  topNames: { name: string; count: number }[];
  recentReports: { phone_number: string; label_name: string; reason: string; created_at: string }[];
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      checkOwnerAccess();
    }, [])
  );

  const checkOwnerAccess = async () => {
    const val = await AsyncStorage.getItem(OWNER_UNLOCK_KEY);
    if (val === 'true') {
      setIsOwner(true);
      fetchStats();
    } else {
      setIsOwner(false);
      setIsLoading(false);
    }
  };

  const fetchStats = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      const [
        phoneRecordsRes,
        uniquePhonesRes,
        abusiveRes,
        reportsRes,
        contributorsRes,
        contactsRes,
        importJobsRes,
        avgConfRes,
        topNamesRes,
        recentReportsRes,
      ] = await Promise.all([
        supabase.from('phone_records').select('id', { count: 'exact', head: true }),
        supabase.from('phone_records').select('phone_number', { count: 'exact', head: true }),
        supabase.from('phone_records').select('id', { count: 'exact', head: true }).eq('is_abusive', true),
        supabase.from('name_reports').select('id', { count: 'exact', head: true }),
        supabase.from('contributors').select('id', { count: 'exact', head: true }),
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        supabase.from('import_jobs').select('id', { count: 'exact', head: true }),
        supabase.from('phone_records').select('confidence_score').limit(1000),
        supabase
          .from('phone_records')
          .select('name, occurrence_count')
          .order('occurrence_count', { ascending: false })
          .limit(5),
        supabase
          .from('name_reports')
          .select('phone_number, label_name, reason, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const scores = avgConfRes.data?.map((r) => r.confidence_score) ?? [];
      const avg = scores.length > 0
        ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
        : 0;

      setStats({
        totalPhoneRecords: phoneRecordsRes.count ?? 0,
        uniquePhones: uniquePhonesRes.count ?? 0,
        abusiveCount: abusiveRes.count ?? 0,
        totalReports: reportsRes.count ?? 0,
        totalContributors: contributorsRes.count ?? 0,
        totalContacts: contactsRes.count ?? 0,
        totalImportJobs: importJobsRes.count ?? 0,
        avgConfidence: Math.round(avg * 100),
        topNames: (topNamesRes.data ?? []).map((r: any) => ({
          name: r.name,
          count: r.occurrence_count,
        })),
        recentReports: recentReportsRes.data ?? [],
      });
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleLockOwner = async () => {
    await AsyncStorage.removeItem(OWNER_UNLOCK_KEY);
    router.back();
  };

  // ── Not owner ──
  if (isOwner === false) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <MaterialIcons name="lock" size={64} color={Colors.textMuted} />
        <Text style={styles.lockedTitle}>وصول مقيّد</Text>
        <Text style={styles.lockedDesc}>هذه الصفحة متاحة لمدير التطبيق فقط</Text>
        <Pressable onPress={() => router.back()} style={styles.backPressable}>
          <Text style={styles.backPressableText}>العودة</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          onPress={handleLockOwner}
          hitSlop={8}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="lock" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
        <Text style={styles.headerTitle}>لوحة الإحصائيات</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="arrow-forward" size={22} color={Colors.textOnPrimary} />
        </Pressable>
      </View>

      {/* ── Owner badge ── */}
      <View style={styles.ownerBadge}>
        <MaterialIcons name="admin-panel-settings" size={14} color={Colors.accent} />
        <Text style={styles.ownerBadgeText}>وضع المدير — هذه البيانات سرية</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل الإحصائيات...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchStats(true)}
              tintColor={Colors.primary}
            />
          }
        >
          {/* ── KPI Grid ── */}
          <View style={styles.kpiGrid}>
            <KpiCard icon="storage" label="سجلات الهاتف" value={fmt(stats?.totalPhoneRecords)} color={Colors.primary} />
            <KpiCard icon="phone" label="أرقام فريدة" value={fmt(stats?.uniquePhones)} color="#1976D2" />
            <KpiCard icon="group" label="المساهمون" value={fmt(stats?.totalContributors)} color={Colors.accent} />
            <KpiCard icon="contacts" label="جهات مستوردة" value={fmt(stats?.totalContacts)} color="#7B1FA2" />
            <KpiCard icon="report" label="البلاغات" value={fmt(stats?.totalReports)} color={Colors.warning} />
            <KpiCard icon="block" label="أرقام مسيئة" value={fmt(stats?.abusiveCount)} color={Colors.error} />
          </View>

          {/* ── Confidence & Jobs ── */}
          <View style={styles.sectionLabel}>
            <Text style={styles.sectionLabelText}>مؤشرات الجودة</Text>
          </View>
          <View style={styles.card}>
            <MetricRow
              icon="verified"
              label="متوسط درجة الثقة"
              value={`${stats?.avgConfidence ?? 0}٪`}
              color={Colors.accent}
            />
            <View style={styles.divider} />
            <MetricRow
              icon="upload"
              label="عمليات الاستيراد"
              value={fmt(stats?.totalImportJobs)}
              color={Colors.primary}
            />
          </View>

          {/* ── Top names ── */}
          {(stats?.topNames ?? []).length > 0 ? (
            <>
              <View style={styles.sectionLabel}>
                <Text style={styles.sectionLabelText}>الأسماء الأكثر تكراراً</Text>
              </View>
              <View style={styles.card}>
                {stats!.topNames.map((item, i) => (
                  <View key={i} style={[styles.rankRow, i === stats!.topNames.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={styles.rankCount}>{item.count.toLocaleString('ar')}</Text>
                    <Text style={styles.rankName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>#{i + 1}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* ── Recent reports ── */}
          {(stats?.recentReports ?? []).length > 0 ? (
            <>
              <View style={styles.sectionLabel}>
                <Text style={styles.sectionLabelText}>آخر البلاغات</Text>
              </View>
              <View style={styles.card}>
                {stats!.recentReports.map((r, i) => (
                  <View
                    key={i}
                    style={[styles.reportRow, i === stats!.recentReports.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <Text style={styles.reportDate}>
                      {new Date(r.created_at).toLocaleDateString('ar-YE')}
                    </Text>
                    <View style={styles.reportInfo}>
                      <Text style={styles.reportPhone}>{r.phone_number}</Text>
                      <Text style={styles.reportLabel}>{r.label_name} · {r.reason}</Text>
                    </View>
                    <MaterialIcons name="report" size={18} color={Colors.warning} />
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Refresh hint */}
          <Text style={styles.refreshHint}>اسحب للأسفل لتحديث الإحصائيات</Text>
        </ScrollView>
      )}
    </View>
  );
}

function KpiCard({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <MaterialIcons name={icon} size={24} color={color} />
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function MetricRow({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <View style={styles.metricInfo}>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <MaterialIcons name={icon} size={20} color={color} />
    </View>
  );
}

function fmt(n?: number): string {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}ك`;
  return n.toLocaleString('ar');
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  header: {
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textOnPrimary },
  ownerBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#F1FFF5',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#C8EDD5',
  },
  ownerBadgeText: { fontSize: FontSize.xs, color: Colors.accentDark, fontWeight: FontWeight.semiBold },
  scroll: { padding: Spacing.lg, gap: Spacing.xs },
  // KPI
  kpiGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm },
  kpiCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    width: '31%',
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  kpiValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold },
  kpiLabel: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
  // Sections
  sectionLabel: {
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  sectionLabelText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  divider: { height: 1, backgroundColor: Colors.divider, marginHorizontal: Spacing.lg },
  // metric row
  metricRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  metricInfo: { flex: 1, alignItems: 'flex-end' },
  metricLabel: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textPrimary, textAlign: 'right' },
  metricValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  // rank row
  rankRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary },
  rankName: { flex: 1, fontSize: FontSize.base, color: Colors.textPrimary, textAlign: 'right', fontWeight: FontWeight.medium },
  rankCount: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.semiBold },
  // report row
  reportRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  reportInfo: { flex: 1, alignItems: 'flex-end' },
  reportPhone: { fontSize: FontSize.base, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  reportLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  reportDate: { fontSize: FontSize.xs, color: Colors.textMuted },
  // locked
  lockedTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  lockedDesc: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center' },
  backPressable: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  backPressableText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textOnPrimary },
  // misc
  loadingText: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.sm },
  refreshHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
