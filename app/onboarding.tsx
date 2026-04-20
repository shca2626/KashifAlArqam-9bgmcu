// Powered by OnSpace.AI — Onboarding screen
//
// First-run only. Explains what will be synced, collects the user's own phone
// number for contributor provenance, requests contacts permission, then starts
// the initial sync automatically. Navigates to /home when done.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { STORAGE_KEYS } from '@/constants/config';
import { SyncProgressModal } from '@/components';
import { useContactSync } from '@/hooks/useContactSync';

const SYNC_FIELDS = [
  { icon: 'person' as const, label: 'الاسم الأول والأخير والأوسط' },
  { icon: 'phone' as const, label: 'أرقام الهاتف لكل جهة اتصال' },
  { icon: 'business' as const, label: 'الشركة والمسمى الوظيفي' },
  { icon: 'email' as const, label: 'عناوين البريد الإلكتروني' },
  { icon: 'home' as const, label: 'العناوين والتواريخ' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'consent' | 'phone'>('consent');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const { progress, isSyncing, showModal, startSync, dismissModal } = useContactSync();

  // After sync completes (done, error, or permission_denied), navigate home
  const prevStatus = React.useRef(progress.status);
  React.useEffect(() => {
    const terminalStatuses = ['done', 'error', 'permission_denied'];
    if (
      terminalStatuses.includes(progress.status) &&
      !terminalStatuses.includes(prevStatus.current)
    ) {
      // Give user 1.5s to read the result before closing
      setTimeout(() => {
        dismissModal();
        router.replace('/home');
      }, 1500);
    }
    prevStatus.current = progress.status;
  }, [progress.status]);

  const handleConsent = () => {
    setStep('phone');
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.permissionsAsked, 'true');
    await AsyncStorage.setItem(STORAGE_KEYS.contactSyncEnabled, 'false');
    router.replace('/home');
  };

  const validatePhone = (val: string): boolean => {
    const digits = val.replace(/\D/g, '');
    if (digits.length < 7) {
      setPhoneError('يرجى إدخال رقم هاتف صحيح (7 أرقام على الأقل)');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleStartSync = () => {
    if (!validatePhone(phone)) return;
    const normalized = phone.replace(/\D/g, '');
    startSync(normalized);
  };

  const handleSkipPhone = () => {
    // Allow sync without phone number (contributor remains anonymous)
    startSync(null);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Sync progress modal — shown automatically when sync starts */}
        <SyncProgressModal
          visible={showModal}
          progress={progress}
          onClose={() => {
            dismissModal();
            router.replace('/home');
          }}
        />

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.iconHeader}>
            <MaterialIcons
              name={step === 'consent' ? 'sync' : 'phone-android'}
              size={36}
              color={Colors.textOnPrimary}
            />
          </View>
          <Text style={styles.headerTitle}>
            {step === 'consent' ? 'مرحباً بك في كاشف الأرقام' : 'رقمك الخاص'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {step === 'consent'
              ? 'ساعدنا في بناء قاعدة بيانات الأرقام اليمنية عن طريق مشاركة جهات اتصالك'
              : 'أدخل رقم هاتفك لربط مساهمتك — يساعدنا في التحقق من صحة البيانات'}
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'consent' ? (
            <>
              {/* What will be synced */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>البيانات التي ستتم مزامنتها</Text>
                {SYNC_FIELDS.map((f) => (
                  <View key={f.label} style={styles.fieldRow}>
                    <MaterialIcons name={f.icon} size={18} color={Colors.primary} />
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                  </View>
                ))}
              </View>

              {/* Privacy guarantees */}
              <View style={[styles.card, styles.privacyCard]}>
                <MaterialIcons name="lock" size={20} color={Colors.accent} />
                <Text style={styles.privacyText}>
                  تُرفع البيانات مجهولة الهوية ومشفرة. لن يتم ربطها بهويتك الشخصية. يمكنك
                  تعطيل المزامنة في أي وقت من إعدادات التطبيق.
                </Text>
              </View>

              {/* Auto-sync notice */}
              <View style={[styles.card, styles.autoCard]}>
                <MaterialIcons name="bolt" size={20} color={Colors.warning} />
                <Text style={styles.autoText}>
                  بعد الموافقة وإدخال رقمك، ستبدأ المزامنة الأولى تلقائياً — لن تحتاج للضغط
                  على أي زر.
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* Phone number input */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>رقم هاتفك</Text>
                <Text style={styles.cardDesc}>
                  لن يُشارك رقمك مع أي طرف ثالث. يُستخدم فقط لضمان جودة البيانات المرفوعة.
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (phoneError) setPhoneError('');
                  }}
                  placeholder="مثال: 0771234567"
                  keyboardType="phone-pad"
                  style={[styles.phoneInput, phoneError ? styles.phoneInputError : null]}
                  textAlign="right"
                  maxLength={15}
                  accessibilityLabel="رقم هاتفك"
                />
                {phoneError ? (
                  <Text style={styles.errorText}>{phoneError}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={handleSkipPhone}
                style={({ pressed }) => [styles.skipPhoneBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.skipPhoneBtnText}>تخطي — مزامنة بدون رقم</Text>
              </Pressable>
            </>
          )}
        </ScrollView>

        {/* ── Footer actions ─────────────────────────────────────────────── */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
          {step === 'consent' ? (
            <>
              <Pressable
                onPress={handleConsent}
                style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.88 }]}
              >
                <MaterialIcons name="arrow-forward" size={20} color={Colors.textOnPrimary} />
                <Text style={styles.btnPrimaryText}>موافق، المتابعة</Text>
              </Pressable>
              <Pressable
                onPress={handleSkip}
                style={({ pressed }) => [styles.btnSkip, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.btnSkipText}>تخطي الآن — استخدام بدون مزامنة</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleStartSync}
              disabled={isSyncing}
              style={({ pressed }) => [
                styles.btnPrimary,
                isSyncing && styles.btnDisabled,
                pressed && !isSyncing && { opacity: 0.88 },
              ]}
            >
              {isSyncing ? (
                <ActivityIndicator color={Colors.textOnPrimary} size="small" />
              ) : (
                <MaterialIcons name="sync" size={20} color={Colors.textOnPrimary} />
              )}
              <Text style={styles.btnPrimaryText}>
                {isSyncing ? 'جاري المزامنة...' : 'بدء المزامنة'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    alignItems: 'center',
  },
  iconHeader: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  headerSubtitle: {
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: -Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  cardDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  fieldRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  privacyCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: '#F1FFF5',
    borderColor: '#C8EDD5',
  },
  privacyText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.accentDark,
    textAlign: 'right',
    lineHeight: 20,
  },
  autoCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
  },
  autoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#7A5C00',
    textAlign: 'right',
    lineHeight: 20,
  },
  phoneInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    backgroundColor: Colors.inputBg,
    textAlign: 'right',
    letterSpacing: 1,
  },
  phoneInputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    textAlign: 'right',
  },
  skipPhoneBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipPhoneBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  footer: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.md,
  },
  btnDisabled: { backgroundColor: Colors.textMuted },
  btnPrimaryText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  btnSkip: { alignItems: 'center', paddingVertical: Spacing.md },
  btnSkipText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
});
