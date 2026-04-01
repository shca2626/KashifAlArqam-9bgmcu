// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Radius, FontSize, FontWeight } from '@/constants/theme';

interface AvatarProps {
  initials?: string;
  bgColor?: string;
  avatarUrl?: string;
  size?: number;
  isAbusive?: boolean;
  isTop?: boolean;
}

export const Avatar = React.memo(function Avatar({
  initials = '?',
  bgColor = Colors.primary,
  avatarUrl,
  size = 52,
  isAbusive = false,
  isTop = false,
}: AvatarProps) {
  const fontSize = size * 0.34;
  const borderRadius = size * 0.22;

  if (avatarUrl) {
    return (
      <View style={[styles.container, { width: size, height: size }, isTop && styles.topBorder, isTop && { borderRadius }]}>
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.image, { width: size, height: size, borderRadius }]}
          contentFit="cover"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: isAbusive ? Colors.error : bgColor,
        },
        isTop && styles.topBorder,
      ]}
    >
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
      {isTop && (
        <View style={styles.topDot}>
          <View style={styles.dotInner} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {},
  text: {
    color: Colors.textOnPrimary,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  topBorder: {
    borderWidth: 2.5,
    borderColor: Colors.accent,
  },
  topDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
});
