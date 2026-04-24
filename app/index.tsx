// Powered by OnSpace.AI — SplashScreen with mandatory permission gate
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { APP_CONFIG } from '@/constants/config';
import * as Contacts from 'expo-contacts';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const [splashDone, setSplashDone] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const navigated = useRef(false);

  useEffect(() => {
    // Animate splash in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 600,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // After splash animation, check permission and route
    const timer = setTimeout(() => {
      setSplashDone(true);
    }, APP_CONFIG.splashDuration);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!splashDone) return;
    checkAndRoute();
  }, [splashDone]);

  // Re-check permission when user returns from device settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        splashDone
      ) {
        checkAndRoute();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [splashDone]);

  const checkAndRoute = async () => {
    if (navigated.current) return;
    try {
      const { status } = await Contacts.getPermissionsAsync();
      if (status === 'granted') {
        navigated.current = true;
        router.replace('/home');
      } else {
        // Not granted — send to mandatory permission screen
        // Don't set navigated so we keep checking on return from settings
        router.replace('/permissions');
      }
    } catch {
      router.replace('/permissions');
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Background gradient shapes */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoEmoji}>🔍</Text>
        </View>
      </Animated.View>

      {/* App name */}
      <Animated.View style={[styles.textWrap, { opacity: textOpacity }]}>
        <Text style={styles.appName}>{APP_CONFIG.name}</Text>
        <Text style={styles.tagline}>ابحث عن أي رقم في اليمن</Text>
      </Animated.View>

      {/* Version */}
      <Animated.View
        style={[
          styles.versionWrap,
          { bottom: insets.bottom + 24, opacity: textOpacity },
        ]}
      >
        <Text style={styles.version}>v{APP_CONFIG.version}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgCircle1: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  logoWrap: {
    marginBottom: Spacing.xl,
  },
  logoPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 64,
  },
  textWrap: {
    alignItems: 'center',
  },
  appName: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extraBold,
    color: Colors.textOnPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.75)',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  versionWrap: {
    position: 'absolute',
  },
  version: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.4)',
  },
});
