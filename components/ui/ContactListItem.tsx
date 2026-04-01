// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LookupResultGroup } from '@/types';
import { Avatar } from './Avatar';
import { FrequencyBadge } from './FrequencyBadge';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { formatPhoneDisplay } from '@/utils/phoneUtils';
import { callNumber, sendMessageByWhatsApp } from '@/utils/contactUtils';

interface ContactListItemProps {
  item: LookupResultGroup;
  isFirst?: boolean;
  onPress: (item: LookupResultGroup) => void;
  onSave?: (item: LookupResultGroup) => void;
}

export const ContactListItem = React.memo(function ContactListItem({
  item,
  isFirst = false,
  onPress,
  onSave,
}: ContactListItemProps) {
  const isTop = isFirst;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.card,
        isTop && styles.cardTop,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Avatar */}
      <Avatar
        initials={item.topLabel.substring(0, 2)}
        isAbusive={item.isAbusive}
        isTop={isTop}
        size={48}
      />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          {item.isAbusive ? (
            <View style={styles.abusiveBadge}>
              <MaterialIcons name="warning" size={10} color={Colors.error} />
              <Text style={styles.abusiveText}>مشبوه</Text>
            </View>
          ) : null}
          <Text style={[styles.name, isTop && styles.nameTop]} numberOfLines={1}>
            {item.topLabel}
          </Text>
        </View>

        <Text style={styles.phone}>{formatPhoneDisplay(item.phoneNumber)}</Text>

        {item.labels.length > 1 ? (
          <Text style={styles.aliases}>
            +{item.labels.length - 1} {item.labels.length - 1 === 1 ? 'اسم آخر' : 'أسماء أخرى'}
          </Text>
        ) : null}
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => callNumber(item.phoneNumber)}
          hitSlop={6}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="call" size={16} color={Colors.accent} />
        </Pressable>
        <Pressable
          onPress={() => sendMessageByWhatsApp(item.phoneNumber)}
          hitSlop={6}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="chat" size={16} color={Colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => onSave?.(item)}
          hitSlop={6}
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="person-add" size={16} color={Colors.textMuted} />
        </Pressable>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardTop: {
    borderColor: Colors.primaryLight,
    borderWidth: 1.5,
    ...Shadow.md,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  content: {
    flex: 1,
    marginHorizontal: Spacing.md,
    alignItems: 'flex-end',
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
    textAlign: 'right',
    flexShrink: 1,
  },
  nameTop: {
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    fontSize: FontSize.lg,
  },
  phone: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 3,
    textAlign: 'right',
  },
  aliases: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'right',
  },
  abusiveBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFEBEE',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  abusiveText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    fontWeight: FontWeight.semiBold,
  },
  actions: {
    flexDirection: 'column',
    gap: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
