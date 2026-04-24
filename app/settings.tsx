// Powered by OnSpace.AI — Settings Screen (sync + moderation + app info)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { SyncProgressModal } from '@/components';
import { useContactSync } from '@/hooks/useContactSync';
import { useModeration } from '@/hooks/useModeration';
import { getLastSyncAt } from '@/services/contactSyncService';
import { STORAGE_KEYS, APP_CONFIG } from '@/constants/config';
import { clearHistory } from '@/utils/historyStorage';
import { useAlert } from '@/template';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  const [contactSyncEnabled, setContactSyncEnabled] = useState(false);
  const [lastSyncLabel, setLastSyncLabel] = useState<string | null>(null);

  const { progress, isSyncing, showModal, startSync, dismissModal } = useContactSync();
  const { prefs, updatePref } = useModeration();

  useFocusEffect(
    useCallback(() => {
      loadState();
    }, [])
  );

  useEffect(() => {
    if (progress.status === 'done') {
      loadState();
    }
  }, [progress.status]);

  const loadState = async () => {
    const [syncVal, lastSync] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.contactSyncEnabled),
      getLastSyncAt(),
    ]);
    setContactSyncEnabled(syncVal === 'true');
    if (lastSync) {
      setLastSyncLabel(
        new Date(lastSync).toLocaleDateString('ar-YE', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    }
  };

  const handleClearHistory = () => {
    showAlert(
      'مسح سجل البحث',
      'هل تريد حذف كل عمليات البحث السابقة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            showAlert('تم', 'تم مسح سجل البحث');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SyncProgressModal visible={showModal} progress={progress} onClose={dismissModal} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="arrow-forward" size={22} color={Colors.textOnPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>الإعدادات</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ──── Sync Section ──── */}
        <View style={styles.sectionLabel}>
          <MaterialIcons name="sync" size={16} color={Colors.textMuted} />
          <Text style={styles.sectionLabelText}>مزامنة جهات الاتصال</Text>
        </View>

        <View style={styles.card}>
          {/* Sync status row */}
          <View style={styles.syncStatusRow}>
            <View style={[styles.syncStatusDot, contactSyncEnabled ? styles.dotActive : styles.dotInactive]} />
            <View style={styles.syncStatusText}>
              <Text style={styles.syncStatusTitle}>
                {contactSyncEnabled ? 'المزامنة مفعّلة' : 'لم تتم المزامنة بعد'}
              </Text>
              {lastSyncLabel ? (
                <Text style={styles.syncStatusSub}>آخر مزامنة: {lastSyncLabel}</Text>
              ) : (
                <Text style={styles.syncStatusSub}>شارك جهات اتصالك لبناء قاعدة بيانات مشتركة</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Sync CTA */}
          <Pressable
            onPress={startSync}
            disabled={isSyncing}
            style={({ pressed }) => [styles.syncBtn, isSyncing && styles.syncBtnDisabled, pressed && !isSyncing && { opacity: 0.8 }]}
          >
            <MaterialIcons name="cloud-upload" size={20} color={Colors.textOnPrimary} />
            <Text style={styles.syncBtnText}>
              {isSyncing ? 'جاري المزامنة...' : contactSyncEnabled ? 'إعادة المزامنة' : 'مزامنة جهات الاتصال'}
            </Text>
          </Pressable>

          <Text style={styles.syncHint}>
            تُرفع البيانات بشكل مجهول الهوية لتحسين نتائج البحث لجميع المستخدمين
          </Text>
        </View>

        {/* ──── Import guide ──── */}
        <View style={styles.sectionLabel}>
          <MaterialIcons name="upload-file" size={16} color={Colors.textMuted} />
          <Text style={styles.sectionLabelText}>استيراد من ملف (للويب)</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.importNote}>
            إذا لم تعمل المزامنة التلقائية في المتصفح، استورد ملف VCF أو CSV:
          </Text>
          {IMPORT_STEPS.map((step, i) => (
            <View key={i} style={styles.importStep}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ──── Moderation ──── */}
        <View style={styles.sectionLabel}>
          <MaterialIcons name="tune" size={16} color={Colors.textMuted} />
          <Text style={styles.sectionLabelText}>تصفية النتائج</Text>
        </View>

        <View style={styles.card}>
          <ToggleRow
            label="إخفاء الأرقام المزعجة تلقائياً"
            desc="يُخفي الأرقام المُبلَّغ عنها من نتائج البحث"
            value={prefs.hideAbusiveAuto}
            onChange={(v) => updatePref('hideAbusiveAuto', v)}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="تفعيل الفلترة الشخصية"
            desc="يُطبّق قائمة الإخفاء الخاصة بك على النتائج"
            value={prefs.filterEnabled}
            onChange={(v) => updatePref('filterEnabled', v)}
            isLast
          />
        </View>

        <Pressable
          onPress={() => router.push('/moderation')}
          style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
        >
          <MaterialIcons name="arrow-back-ios" size={16} color={Colors.primary} />
          <Text style={styles.linkRowText}>إدارة القائمة المخفية</Text>
          <MaterialIcons name="visibility-off" size={20} color={Colors.primary} />
        </Pressable>

        {/* ──── Data & Privacy ──── */}
        <View style={styles.sectionLabel}>
          <MaterialIcons name="security" size={16} color={Colors.textMuted} />
          <Text style={styles.sectionLabelText}>البيانات والخصوصية</Text>
        </View>

        <View style={styles.card}>
          <Pressable
            onPress={handleClearHistory}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="arrow-back-ios" size={14} color={Colors.error} />
            <Text style={[styles.actionRowText, { color: Colors.error }]}>مسح سجل البحث</Text>
            <MaterialIcons name="history" size={20} color={Colors.error} />
          </Pressable>
        </View>

        {/* ──── About ──── */}
        <View style={styles.sectionLabel}>
          <MaterialIcons name="info-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.sectionLabelText}>عن التطبيق</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutValue}>{APP_CONFIG.version}</Text>
            <Text style={styles.aboutLabel}>الإصدار</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutValue}>اليمن 🇾🇪</Text>
            <Text style={styles.aboutLabel}>التغطية</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutValue}>مجتمعية</Text>
            <Text style={styles.aboutLabel}>قاعدة البيانات</Text>
          </View>
        </View>

        {/* Privacy note */}
        <View style={styles.privacyBox}>
          <MaterialIcons name="lock" size={18} color={Colors.accent} />
          <Text style={styles.privacyText}>
            لا يتم جمع أي بيانات شخصية. جميع المعلومات المُرسلة مجهولة الهوية تماماً وتُستخدم فقط لتحسين جودة نتائج البحث.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
  isLast = false,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, isLast && { borderBottomWidth: 0 }]}>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.primaryLight }}
        thumbColor={value ? Colors.primary : Colors.textMuted}
      />
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const IMPORT_STEPS = [
  { title: 'أندرويد (Google)', desc: 'contacts.google.com ← تصدير ← ملف VCF' },
  { title: 'آيفون (iCloud)', desc: 'icloud.com/contacts ← إعدادات ← تصدير VCard' },
  { title: 'ارفع الملف', desc: 'اضغط "مزامنة" واختر ملف VCF أو CSV' },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  scroll: {
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  sectionLabel: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  sectionLabelText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.lg,
  },
  // sync
  syncStatusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  syncStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: { backgroundColor: Colors.accent },
  dotInactive: { backgroundColor: Colors.textMuted },
  syncStatusText: { flex: 1, alignItems: 'flex-end' },
  syncStatusTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  syncStatusSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 18,
  },
  syncBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    ...Shadow.sm,
  },
  syncBtnDisabled: { backgroundColor: Colors.textMuted },
  syncBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  syncHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    lineHeight: 18,
  },
  // import
  importNote: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  importStep: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textOnPrimary },
  stepContent: { flex: 1, alignItems: 'flex-end' },
  stepTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary, textAlign: 'right' },
  stepDesc: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', marginTop: 2, lineHeight: 17 },
  // toggles
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
  toggleInfo: { flex: 1, alignItems: 'flex-end' },
  toggleLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  toggleDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 3,
    lineHeight: 17,
  },
  // link / action rows
  linkRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: Spacing.xs,
    ...Shadow.sm,
  },
  linkRowText: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  actionRowText: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    textAlign: 'right',
  },
  // about
  aboutRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  aboutLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  aboutValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
  },
  // privacy
  privacyBox: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: '#F1FFF5',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#C8EDD5',
    marginTop: Spacing.lg,
  },
  privacyText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.accentDark,
    textAlign: 'right',
    lineHeight: 20,
  },
});
