// Powered by OnSpace.AI — PermissionsScreen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { STORAGE_KEYS } from '@/constants/config';

interface PermCard {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  optional: boolean;
  storageKey: string;
}

const PERMISSIONS: PermCard[] = [
  {
    icon: 'contacts',
    title: 'قراءة جهات الاتصال',
    description:
      'يتيح للتطبيق تحسين نتائج البحث باستخدام جهات اتصالك. لن يتم رفع أي بيانات تلقائياً — فقط بعد موافقتك الصريحة.',
    optional: true,
    storageKey: STORAGE_KEYS.contactSyncEnabled,
  },
];

export default function PermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [granted, setGranted] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const toggle = (key: string) => {
    setGranted((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      for (const perm of PERMISSIONS) {
        await AsyncStorage.setItem(
          perm.storageKey,
          granted[perm.storageKey] ? 'true' : 'false'
        );
      }
      await AsyncStorage.setItem(STORAGE_KEYS.permissionsAsked, 'true');
    } catch {
      // ignore
    }
    router.replace('/home');
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.permissionsAsked, 'true');
      for (const perm of PERMISSIONS) {
        await AsyncStorage.setItem(perm.storageKey, 'false');
      }
    } catch {
      // ignore
    }
    router.replace('/home');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconHeader}>
          <MaterialIcons name="security" size={36} color={Colors.textOnPrimary} />
        </View>
        <Text style={styles.headerTitle}>خصوصيتك تهمنا</Text>
        <Text style={styles.headerSubtitle}>
          كاشف الأرقام يعمل بالكامل بدون إذن جهات الاتصال. يمكنك تمكين المزامنة لاحقاً متى تشاء.
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <MaterialIcons name="info-outline" size={18} color={Colors.primary} />
          <Text style={styles.privacyText}>
            الوضع المحلي: يمكنك استخدام التطبيق للبحث فقط دون مشاركة أي بيانات.
          </Text>
        </View>

        {/* Permission cards */}
        {PERMISSIONS.map((perm) => (
          <Pressable
            key={perm.storageKey}
            onPress={() => toggle(perm.storageKey)}
            style={({ pressed }) => [
              styles.permCard,
              granted[perm.storageKey] && styles.permCardActive,
              pressed && { opacity: 0.88 },
            ]}
          >
            <View style={styles.permCardRow}>
              <View
                style={[
                  styles.checkBox,
                  granted[perm.storageKey] && styles.checkBoxActive,
                ]}
              >
                {granted[perm.storageKey] ? (
                  <MaterialIcons name="check" size={14} color={Colors.textOnPrimary} />
                ) : null}
              </View>
              <View style={styles.permContent}>
                <View style={styles.permTitleRow}>
                  <Text style={styles.permTitle}>{perm.title}</Text>
                  <View style={styles.optionalBadge}>
                    <Text style={styles.optionalText}>اختياري</Text>
                  </View>
                </View>
                <Text style={styles.permDesc}>{perm.description}</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {/* Warning note */}
        <View style={styles.warningNote}>
          <MaterialIcons name="verified-user" size={18} color={Colors.accent} />
          <Text style={styles.warningText}>
            لن يقوم التطبيق برفع جهات الاتصال تلقائياً عند التثبيت أو التشغيل. المزامنة تتطلب ضغط الزر يدوياً.
          </Text>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.btnPrimaryText}>متابعة</Text>
        </Pressable>
        <Pressable
          onPress={handleSkip}
          style={({ pressed }) => [styles.btnSkip, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.btnSkipText}>تخطي الآن</Text>
        </Pressable>
      </View>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    alignItems: 'center',
  },
  iconHeader: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  privacyNote: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  privacyText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
    textAlign: 'right',
    lineHeight: 20,
  },
  permCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  permCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F3FF',
  },
  permCardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkBoxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  permContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  permTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  permTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  optionalBadge: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  optionalText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  permDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  warningNote: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: '#F1FFF5',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#C8EDD5',
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.accent,
    textAlign: 'right',
    lineHeight: 20,
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
  btnPrimaryText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  btnSkip: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  btnSkipText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
});
