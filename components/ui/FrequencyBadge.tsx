// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, FontSize, FontWeight, Spacing } from '@/constants/theme';

interface FrequencyBadgeProps {
  count: number;
  isTop?: boolean;
  compact?: boolean;
}

export const FrequencyBadge = React.memo(function FrequencyBadge({
  count,
  isTop = false,
  compact = false,
}: FrequencyBadgeProps) {
  if (compact) {
    return (
      <View style={[styles.compact, isTop && styles.compactTop]}>
        <Text style={[styles.compactText, isTop && styles.compactTextTop]}>
          {count}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, isTop && styles.badgeTop]}>
      <Text style={[styles.text, isTop && styles.textTop]}>
        {isTop ? 'الأكثر إبلاغاً' : `${count} مرة`}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeTop: {
    backgroundColor: Colors.primary,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.textSecondary,
  },
  textTop: {
    color: Colors.textOnPrimary,
  },
  compact: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
    minWidth: 28,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  compactTop: {
    backgroundColor: Colors.primary,
  },
  compactText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  compactTextTop: {
    color: Colors.textOnPrimary,
  },
});
