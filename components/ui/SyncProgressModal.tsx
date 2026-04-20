// Powered by OnSpace.AI — Contact Sync Progress Modal
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { SyncProgress } from '@/services/syncOrchestrator';

interface SyncProgressModalProps {
  visible: boolean;
  progress: SyncProgress;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'جاري التهيئة...',
  requesting_permission: 'طلب إذن الوصول لجهات الاتصال...',
  permission_denied: 'تم رفض الإذن',
  reading_contacts: 'قراءة جهات الاتصال...',
  processing: 'معالجة البيانات...',
  uploading: 'حفظ البيانات في قاعدة البيانات...',
  done: 'اكتملت المزامنة!',
  error: 'حدث خطأ',
};

const STATUS_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  idle: 'sync',
  requesting_permission: 'security',
  permission_denied: 'lock',
  reading_contacts: 'contacts',
  processing: 'settings',
  uploading: 'cloud-upload',
  done: 'check-circle',
  error: 'error-outline',
};

export function SyncProgressModal({ visible, progress, onClose }: SyncProgressModalProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const isSpinning = ['idle', 'requesting_permission', 'reading_contacts', 'processing', 'uploading'].includes(
    progress.status
  );
  const isDone = progress.status === 'done';
  const isError = progress.status === 'error';
  const isPermDenied = progress.status === 'permission_denied';

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
    } else {
      scaleAnim.setValue(0.85);
    }
  }, [visible]);

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isSpinning) {
      anim = Animated.loop(
        Animated.timing(rotation, { toValue: 1, duration: 1200, useNativeDriver: true })
      );
      anim.start();
    }
    return () => { anim?.stop(); };
  }, [isSpinning]);

  const spinInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressPercent =
    progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { transform: [{ scale: scaleAnim }] }]}>

          {/* Icon */}
          <View style={[
            styles.iconWrap,
            isDone && styles.iconWrapSuccess,
            isError && styles.iconWrapError,
            isPermDenied && styles.iconWrapWarning,
          ]}>
            {isSpinning ? (
              <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                <MaterialIcons
                  name={STATUS_ICONS[progress.status] ?? 'sync'}
                  size={32}
                  color={Colors.primary}
                />
              </Animated.View>
            ) : (
              <MaterialIcons
                name={STATUS_ICONS[progress.status] ?? 'sync'}
                size={32}
                color={
                  isDone ? Colors.accent
                  : isError ? Colors.error
                  : isPermDenied ? Colors.warning
                  : Colors.primary
                }
              />
            )}
          </View>

          {/* Status label */}
          <Text style={styles.statusLabel}>
            {STATUS_LABELS[progress.status] ?? '...'}
          </Text>

          {/* Progress bar (reading/processing/uploading) */}
          {(progress.status === 'uploading' || progress.status === 'processing' || progress.status === 'reading_contacts') && progress.total > 0 ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressPct}>{progressPercent}٪</Text>
              <Text style={styles.progressDetail}>
                {progress.processed.toLocaleString('ar')} / {progress.total.toLocaleString('ar')}
              </Text>
            </View>
          ) : null}

          {/* Upload sub-stats */}
          {progress.status === 'uploading' && progress.total > 0 ? (
            <View style={styles.uploadStats}>
              <Text style={styles.uploadStatText}>
                تم الرفع: <Text style={styles.uploadStatNum}>{progress.uploaded.toLocaleString('ar')}</Text>
              </Text>
              {progress.skipped > 0 ? (
                <Text style={styles.uploadStatText}>
                  تم التخطي: <Text style={styles.uploadStatNum}>{progress.skipped.toLocaleString('ar')}</Text>
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Done summary */}
          {isDone ? (
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{progress.total.toLocaleString('ar')}</Text>
                <Text style={styles.summaryLbl}>جهة اتصال</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{progress.uploaded.toLocaleString('ar')}</Text>
                <Text style={styles.summaryLbl}>تم الرفع</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{progress.skipped.toLocaleString('ar')}</Text>
                <Text style={styles.summaryLbl}>تخطي</Text>
              </View>
            </View>
          ) : null}

          {/* Permission denied note */}
          {isPermDenied ? (
            <View style={[styles.infoNote, { backgroundColor: '#FFF3F3', borderColor: '#FFCDD2' }]}>
              <MaterialIcons name="lock" size={16} color={Colors.error} />
              <Text style={[styles.infoText, { color: Colors.error }]}>
                لم يتم منح إذن الوصول لجهات الاتصال. يمكنك تفعيل الإذن من إعدادات الجهاز ثم
                إعادة المزامنة.
              </Text>
            </View>
          ) : null}

          {/* Error */}
          {isError && progress.errorMessage ? (
            <View style={[styles.infoNote, { backgroundColor: '#FFF3F3', borderColor: '#FFCDD2' }]}>
              <MaterialIcons name="error-outline" size={16} color={Colors.error} />
              <Text style={[styles.infoText, { color: Colors.error }]}>{progress.errorMessage}</Text>
            </View>
          ) : null}

          {/* Privacy note during upload */}
          {progress.status === 'uploading' ? (
            <View style={[styles.infoNote, { backgroundColor: '#F1FFF5', borderColor: '#C8EDD5' }]}>
              <MaterialIcons name="lock" size={14} color={Colors.accent} />
              <Text style={[styles.infoText, { color: Colors.accent }]}>
                يتم رفع بيانات مجهولة الهوية فقط لتحسين نتائج البحث للجميع
              </Text>
            </View>
          ) : null}

          {/* Action button */}
          {(isDone || isError || isPermDenied) ? (
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.closeBtnText}>
                {isDone
                  ? 'رائع، شكراً لمساهمتك!'
                  : isPermDenied
                  ? 'حسناً، ربما لاحقاً'
                  : 'إغلاق'}
              </Text>
            </Pressable>
          ) : (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.sm }} />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.lg,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconWrapSuccess: { backgroundColor: '#EFF8F2' },
  iconWrapError: { backgroundColor: '#FFEBEE' },
  iconWrapWarning: { backgroundColor: '#FFF8E1' },
  statusLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  progressWrap: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  progressBg: {
    width: '100%', height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4, overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressPct: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  progressDetail: { fontSize: FontSize.sm, color: Colors.textMuted },
  uploadStats: {
    width: '100%',
    alignItems: 'flex-end',
    gap: 4,
  },
  uploadStatText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  uploadStatNum: {
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  summaryItem: { alignItems: 'center', gap: 4, flex: 1 },
  summaryNum: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  summaryLbl: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  infoNote: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    width: '100%',
  },
  infoText: {
    fontSize: FontSize.sm,
    flex: 1,
    textAlign: 'right',
    lineHeight: 20,
  },
  closeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    ...Shadow.sm,
  },
  closeBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
});
