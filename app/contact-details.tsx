// Powered by OnSpace.AI — ContactDetailsScreen
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { Avatar, FrequencyBadge } from '@/components';
import { searchByNumber, reportName } from '@/services/lookupService';
import { callNumber, sendMessageByWhatsApp, sendSMS } from '@/utils/contactUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { hideNumber, hideName } from '@/utils/moderationStorage';
import { formatPhoneDisplay } from '@/utils/phoneUtils';
import { LookupResultGroup } from '@/types';

type ReportReason = 'abusive' | 'wrong_name' | 'spam' | 'other';

export default function ContactDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const params = useLocalSearchParams<{ id: string; phone: string }>();

  const [group, setGroup] = useState<LookupResultGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<string>('');
  const [reportReason, setReportReason] = useState<ReportReason>('wrong_name');
  const [reportNote, setReportNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.phone]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const results = await searchByNumber(params.phone ?? '');
      if (results.length > 0) {
        setGroup(results[0]);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleReport = useCallback((labelName: string) => {
    setReportTarget(labelName);
    setReportReason('wrong_name');
    setReportNote('');
    setShowReportModal(true);
  }, []);

  const submitReport = useCallback(async () => {
    if (!group) return;
    setIsSubmitting(true);
    try {
      await reportName({
        phoneNumber: group.phoneNumber,
        labelName: reportTarget,
        reason: reportReason,
        reporterNote: reportNote || undefined,
        timestamp: new Date().toISOString(),
      });
      setShowReportModal(false);
      showAlert('تم الإبلاغ', 'شكراً لمساهمتك في تحسين البيانات');
    } catch {
      showAlert('خطأ', 'تعذّر إرسال البلاغ. يُرجى المحاولة مجدداً.');
    } finally {
      setIsSubmitting(false);
    }
  }, [group, reportTarget, reportReason, reportNote]);

  const handleHideNumber = useCallback(async () => {
    if (!group) return;
    showAlert(
      'إخفاء هذا الرقم',
      'هل تريد إخفاء هذا الرقم من نتائجك؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إخفاء',
          style: 'destructive',
          onPress: async () => {
            await hideNumber(group.phoneNumber);
            showAlert('تم', 'تم إخفاء الرقم من نتائجك المحلية');
            router.back();
          },
        },
      ]
    );
  }, [group]);

  const handleHideName = useCallback(async (name: string) => {
    if (!group) return;
    await hideName(group.phoneNumber, name);
    showAlert('تم', `تم إخفاء الاسم "${name}" من نتائجك`);
  }, [group]);

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>لم يتم العثور على البيانات</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>العودة</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="arrow-forward" size={22} color={Colors.textOnPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>تفاصيل الرقم</Text>
          <Pressable
            onPress={handleHideNumber}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="visibility-off" size={20} color={Colors.textOnPrimary} />
          </Pressable>
        </View>

        {/* Avatar + top name */}
        <View style={styles.profileSection}>
          <Avatar
            initials={group.topLabel.substring(0, 2)}
            size={80}
            isAbusive={group.isAbusive}
            isTop
          />
          <Text style={styles.topName}>{group.topLabel}</Text>
          <Text style={styles.phoneDisplay}>{formatPhoneDisplay(group.phoneNumber)}</Text>
          {group.isAbusive ? (
            <View style={styles.abusiveBanner}>
              <MaterialIcons name="warning" size={14} color="#FF8A80" />
              <Text style={styles.abusiveBannerText}>رقم مُبلَّغ عنه كمزعج</Text>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{group.totalOccurrences}</Text>
              <Text style={styles.statLbl}>إجمالي الإبلاغات</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{group.uniqueContributors}</Text>
              <Text style={styles.statLbl}>مساهمون مختلفون</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{group.labels.length}</Text>
              <Text style={styles.statLbl}>أسماء مرتبطة</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxxl }}
      >
        {/* Quick actions */}
        <View style={styles.quickActions}>
          <Pressable
            onPress={() => callNumber(group.phoneNumber)}
            style={({ pressed }) => [styles.qaBtn, styles.qaBtnCall, pressed && { opacity: 0.8 }]}
          >
            <MaterialIcons name="call" size={20} color={Colors.textOnPrimary} />
            <Text style={styles.qaBtnText}>اتصال</Text>
          </Pressable>
          <Pressable
            onPress={() => sendMessageByWhatsApp(group.phoneNumber)}
            style={({ pressed }) => [styles.qaBtn, styles.qaBtnWa, pressed && { opacity: 0.8 }]}
          >
            <MaterialCommunityIcons name="whatsapp" size={22} color={Colors.textOnPrimary} />
            <Text style={styles.qaBtnText}>واتساب</Text>
          </Pressable>
          <Pressable
            onPress={() => sendSMS(group.phoneNumber)}
            style={({ pressed }) => [styles.qaBtn, styles.qaBtnSave, pressed && { opacity: 0.8 }]}
          >
            <MaterialIcons name="sms" size={20} color={Colors.primary} />
            <Text style={[styles.qaBtnText, { color: Colors.primary }]}>رسالة</Text>
          </Pressable>
        </View>

        {/* All labels */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>جميع الأسماء المرتبطة</Text>
            <Text style={styles.sectionSub}>مرتبة حسب الأكثر إبلاغاً</Text>
          </View>

          {group.labels.map((label, idx) => (
            <View key={label.name} style={styles.labelRow}>
              <View style={styles.labelActions}>
                <Pressable
                  onPress={() => handleReport(label.name)}
                  hitSlop={6}
                  style={({ pressed }) => [styles.labelAction, pressed && { opacity: 0.5 }]}
                >
                  <MaterialIcons name="flag" size={16} color={Colors.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => handleHideName(label.name)}
                  hitSlop={6}
                  style={({ pressed }) => [styles.labelAction, pressed && { opacity: 0.5 }]}
                >
                  <MaterialIcons name="visibility-off" size={16} color={Colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.labelContent}>
                <View style={styles.labelNameRow}>
                  <FrequencyBadge count={label.count} isTop={idx === 0} compact />
                  <Text style={[styles.labelName, idx === 0 && styles.labelNameTop]}>
                    {label.name}
                  </Text>
                </View>
                <Text style={styles.labelConf}>
                  ثقة: {Math.round(label.confidenceScore * 100)}٪
                </Text>
                {label.lastSeenAt ? (
                  <Text style={styles.labelDate}>
                    آخر ظهور: {new Date(label.lastSeenAt).toLocaleDateString('ar-YE')}
                  </Text>
                ) : null}
                <View style={styles.freqBar}>
                  <View
                    style={[
                      styles.freqFill,
                      { width: `${Math.round(label.confidenceScore * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Report section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الإبلاغ والتحكم</Text>
          <Pressable
            onPress={() => handleReport(group.topLabel)}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="flag" size={20} color={Colors.error} />
            <Text style={styles.actionRowText}>الإبلاغ عن الاسم الرئيسي</Text>
          </Pressable>
          <Pressable
            onPress={handleHideNumber}
            style={({ pressed }) => [styles.actionRow, styles.actionRowLast, pressed && { opacity: 0.7 }]}
          >
            <MaterialIcons name="visibility-off" size={20} color={Colors.textSecondary} />
            <Text style={styles.actionRowText}>إخفاء هذا الرقم نهائياً</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowReportModal(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>الإبلاغ عن: {reportTarget}</Text>

            {(
              [
                { value: 'wrong_name', label: 'اسم خاطئ' },
                { value: 'abusive', label: 'محتوى مسيء' },
                { value: 'spam', label: 'رقم إزعاج' },
                { value: 'other', label: 'سبب آخر' },
              ] as { value: ReportReason; label: string }[]
            ).map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setReportReason(r.value)}
                style={[styles.reasonRow, reportReason === r.value && styles.reasonRowActive]}
              >
                <MaterialIcons
                  name={reportReason === r.value ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={20}
                  color={reportReason === r.value ? Colors.primary : Colors.textMuted}
                />
                <Text style={styles.reasonText}>{r.label}</Text>
              </Pressable>
            ))}

            <TextInput
              value={reportNote}
              onChangeText={setReportNote}
              placeholder="ملاحظة إضافية (اختياري)"
              style={styles.noteInput}
              textAlign="right"
              multiline
            />

            <Pressable
              onPress={submitReport}
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <Text style={styles.submitBtnText}>إرسال البلاغ</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => setShowReportModal(false)}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>إلغاء</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  backLink: { padding: Spacing.md },
  backLinkText: {
    fontSize: FontSize.base,
    color: Colors.primary,
    fontWeight: FontWeight.semiBold,
  },
  header: {
    backgroundColor: Colors.primary,
  },
  headerTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  topName: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extraBold,
    color: Colors.textOnPrimary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  phoneDisplay: {
    fontSize: FontSize.lg,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  abusiveBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(211,47,47,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(211,47,47,0.4)',
  },
  abusiveBannerText: {
    fontSize: FontSize.sm,
    color: '#FF8A80',
    fontWeight: FontWeight.semiBold,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  statLbl: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  body: {
    flex: 1,
    marginTop: -Spacing.md,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    backgroundColor: Colors.background,
  },
  quickActions: {
    flexDirection: 'row-reverse',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  qaBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    gap: 4,
    ...Shadow.sm,
  },
  qaBtnCall: { backgroundColor: Colors.accent },
  qaBtnWa: { backgroundColor: '#25D366' },
  qaBtnSave: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  qaBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionTitleRow: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'right',
    padding: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  labelActions: {
    flexDirection: 'column',
    gap: 6,
  },
  labelAction: {
    padding: 4,
  },
  labelContent: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  labelNameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  labelName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  labelNameTop: {
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  labelConf: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  labelDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  freqBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  freqFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  actionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  actionRowLast: { borderBottomWidth: 0 },
  actionRowText: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    gap: Spacing.sm,
    ...Shadow.lg,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  reasonRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reasonRowActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EEF0FF',
  },
  reasonText: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    minHeight: 72,
    backgroundColor: Colors.inputBg,
    marginTop: Spacing.xs,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  cancelBtnText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
});
