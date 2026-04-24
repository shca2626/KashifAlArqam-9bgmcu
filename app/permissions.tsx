// Powered by OnSpace.AI — Mandatory Permission Gate (blocks app until READ_CONTACTS is granted)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Linking,
  AppState,
  AppStateStatus,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import * as Contacts from 'expo-contacts';
import { runContactSync } from '@/services/contactSyncService';
import { SyncProgressModal } from '@/components';
import { SyncProgress, DEFAULT_PROGRESS } from '@/services/contactSyncService';

type PermState = 'checking' | 'denied' | 'blocked' | 'syncing' | 'done';

export default function PermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [permState, setPermState] = useState<PermState>('checking');
  const [deniedCount, setDeniedCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>(DEFAULT_PROGRESS);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();

    // Check current permission on mount
    checkPermission();
  }, []);

  // Re-check when user returns from Android settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        (permState === 'denied' || permState === 'blocked')
      ) {
        checkPermission();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [permState]);

  const checkPermission = async () => {
    setPermState('checking');

    // Web platform: expo-contacts is not available — skip native permission
    // and go straight to web-based contact sync (Contact Picker API / file import)
    if (Platform.OS === 'web') {
      await doSync();
      return;
    }

    try {
      const { status } = await Contacts.getPermissionsAsync();
      if (status === 'granted') {
        // Already granted — go straight to sync then home
        await doSync();
      } else {
        setPermState(deniedCount > 0 ? 'blocked' : 'denied');
      }
    } catch {
      setPermState('denied');
    }
  };

  const requestPermission = useCallback(async () => {
    setPermState('checking');

    // Web platform: no native permission needed — go straight to web sync
    if (Platform.OS === 'web') {
      await doSync();
      return;
    }

    try {
      const { status, canAskAgain } = await Contacts.requestPermissionsAsync();

      if (status === 'granted') {
        await doSync();
      } else if (!canAskAgain) {
        // User selected "Don't ask again" — must open settings
        setDeniedCount((c) => c + 1);
        setPermState('blocked');
        shake();
      } else {
        setDeniedCount((c) => c + 1);
        setPermState('denied');
        shake();
      }
    } catch {
      setPermState('denied');
    }
  }, [deniedCount]);

  const doSync = async () => {
    setPermState('syncing');
    setShowSyncModal(true);

    await runContactSync((p) => {
      setSyncProgress(p);
    });

    // Sync finished (done or error — still unlock the app)
    setPermState('done');
  };

  const handleSyncModalClose = () => {
    setShowSyncModal(false);
    router.replace('/home');
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const isChecking = permState === 'checking' || permState === 'syncing';
  const isBlocked = permState === 'blocked';
  const isDenied = permState === 'denied';

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Sync modal shown while syncing */}
      <SyncProgressModal
        visible={showSyncModal}
        progress={syncProgress}
        onClose={handleSyncModalClose}
      />

      {/* Background decoration */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
          },
        ]}
      >
        {/* Icon */}
        <View style={[styles.iconCircle, isBlocked && styles.iconCircleBlocked]}>
          {isChecking ? (
            <ActivityIndicator size="large" color={Colors.textOnPrimary} />
          ) : (
            <MaterialIcons
              name={isBlocked ? 'lock' : 'contacts'}
              size={52}
              color={Colors.textOnPrimary}
            />
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {isChecking
            ? permState === 'syncing'
              ? 'جاري مزامنة جهات الاتصال...'
              : 'جاري التحقق...'
            : isBlocked
            ? 'الوصول مقيّد'
            : 'إذن جهات الاتصال مطلوب'}
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {isChecking
            ? 'يرجى الانتظار لحظة...'
            : isBlocked
            ? 'قمت برفض الإذن بشكل دائم. يجب فتح إعدادات الجهاز لمنح الإذن يدوياً.'
            : 'كاشف الأرقام يعتمد على جهات اتصالك لبناء قاعدة بيانات موثوقة لجميع المستخدمين. هذا الإذن إلزامي لاستخدام التطبيق.'}
        </Text>

        {/* Why section */}
        {!isChecking ? (
          <View style={styles.reasonsCard}>
            {REASONS.map((r, i) => (
              <View key={i} style={styles.reasonRow}>
                <MaterialIcons name={r.icon} size={20} color={Colors.primary} />
                <Text style={styles.reasonText}>{r.text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Privacy assurance */}
        {!isChecking ? (
          <View style={styles.privacyNote}>
            <MaterialIcons name="verified-user" size={16} color={Colors.accent} />
            <Text style={styles.privacyText}>
              بياناتك مجهولة الهوية وتُستخدم فقط لتحسين نتائج البحث
            </Text>
          </View>
        ) : null}

        {/* Blocked state — open settings */}
        {isBlocked ? (
          <View style={styles.actionsCol}>
            <Pressable
              onPress={openSettings}
              style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
            >
              <MaterialIcons name="settings" size={18} color={Colors.textOnPrimary} />
              <Text style={styles.btnPrimaryText}>فتح إعدادات الجهاز</Text>
            </Pressable>
            <Pressable
              onPress={checkPermission}
              style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.7 }]}
            >
              <MaterialIcons name="refresh" size={18} color={Colors.primary} />
              <Text style={styles.btnSecondaryText}>التحقق مجدداً</Text>
            </Pressable>
            <Text style={styles.settingsHint}>
              الإعدادات ← التطبيقات ← كاشف الأرقام ← الأذونات ← جهات الاتصال ← السماح
            </Text>
          </View>
        ) : isDenied ? (
          /* Denied — request again */
          <Pressable
            onPress={requestPermission}
            style={({ pressed }) => [styles.btnPrimary, styles.btnFullWidth, pressed && { opacity: 0.85 }]}
          >
            <MaterialIcons name="contacts" size={20} color={Colors.textOnPrimary} />
            <Text style={styles.btnPrimaryText}>
              {deniedCount > 0 ? 'إعادة طلب الإذن' : 'منح إذن جهات الاتصال'}
            </Text>
          </Pressable>
        ) : null}

        {/* Denied warning */}
        {isDenied && deniedCount > 0 ? (
          <View style={styles.warningBox}>
            <MaterialIcons name="warning" size={16} color="#D97706" />
            <Text style={styles.warningText}>
              لا يمكن استخدام التطبيق بدون هذا الإذن. يرجى السماح بالوصول لجهات الاتصال.
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const REASONS = [
  {
    icon: 'search' as const,
    text: 'تعريف أسماء الأرقام المجهولة لك وللآخرين',
  },
  {
    icon: 'group' as const,
    text: 'بناء قاعدة بيانات مجتمعية تشاركية من اليمن',
  },
  {
    icon: 'block' as const,
    text: 'الكشف عن المكالمات المزعجة والمشبوهة',
  },
];

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  content: {
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconCircleBlocked: {
    backgroundColor: 'rgba(220,50,50,0.25)',
    borderColor: 'rgba(220,50,50,0.4)',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  reasonsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  reasonRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
  },
  reasonText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textOnPrimary,
    textAlign: 'right',
    lineHeight: 20,
  },
  privacyNote: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  privacyText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'right',
  },
  actionsCol: {
    width: '100%',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  btnPrimary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.textOnPrimary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    ...Shadow.md,
  },
  btnFullWidth: {
    width: '100%',
  },
  btnPrimaryText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  btnSecondary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    width: '100%',
  },
  btnSecondaryText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semiBold,
    color: Colors.textOnPrimary,
  },
  settingsHint: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  warningBox: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#FDE68A',
    textAlign: 'right',
    lineHeight: 20,
  },
});
