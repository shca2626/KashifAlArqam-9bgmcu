// Powered by OnSpace.AI — SplashScreen / Boot router
//
// Reads persistent flags and routes to the correct screen:
//  • permissionsAsked = false  → /onboarding  (first run: consent + auto sync)
//  • permissionsAsked = true   → /home

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { APP_CONFIG, STORAGE_KEYS } from '@/constants/config';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
    Animated.timing(textOpacity, { toValue: 1, duration: 600, delay: 400, useNativeDriver: true }).start();

    const timer = setTimeout(async () => {
      try {
        const permAsked = await AsyncStorage.getItem(STORAGE_KEYS.permissionsAsked);
        if (permAsked === 'true') {
          router.replace('/home');
        } else {
          router.replace('/onboarding');
        }
      } catch {
        router.replace('/onboarding');
      }
    }, APP_CONFIG.splashDuration);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🔍</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.textWrap, { opacity: textOpacity }]}>
        <Text style={styles.appName}>{APP_CONFIG.name}</Text>
        <Text style={styles.tagline}>ابحث عن أي رقم في اليمن</Text>
      </Animated.View>

      <Animated.View style={[styles.versionWrap, { opacity: textOpacity, bottom: insets.bottom + 24 }]}>
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
    position: 'absolute', top: -80, left: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bgCircle2: {
    position: 'absolute', bottom: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  logoWrap: { marginBottom: Spacing.xl },
  logoCircle: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoEmoji: { fontSize: 60 },
  textWrap: { alignItems: 'center' },
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
  versionWrap: { position: 'absolute' },
  version: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.4)' },
});
