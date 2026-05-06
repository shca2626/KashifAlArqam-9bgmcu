// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LookupResultGroup } from '@/types';
import { Avatar } from './Avatar';
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
    <View style={[styles.wrapper, isTop && styles.wrapperTop]}>
      {/* Info row — tappable */}
      <Pressable
        onPress={() => onPress(item)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {/* Avatar */}
        <Avatar
          initials={item.topLabel.substring(0, 2)}
          isAbusive={item.isAbusive}
          isTop={isTop}
          size={46}
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
              +{item.labels.length - 1}{' '}
              {item.labels.length - 1 === 1 ? 'اسم آخر' : 'أسماء أخرى'}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {/* Horizontal action row */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => callNumber(item.phoneNumber)}
          hitSlop={6}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.actionCall,
            pressed && { opacity: 0.75 },
          ]}
        >
          <MaterialIcons name="call" size={17} color="#fff" />
          <Text style={styles.actionLabel}>اتصال</Text>
        </Pressable>

        <Pressable
          onPress={() => sendMessageByWhatsApp(item.phoneNumber)}
          hitSlop={6}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.actionChat,
            pressed && { opacity: 0.75 },
          ]}
        >
          <MaterialIcons name="chat" size={17} color="#fff" />
          <Text style={styles.actionLabel}>رسالة</Text>
        </Pressable>

        <Pressable
          onPress={() => onSave?.(item)}
          hitSlop={6}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.actionSave,
            pressed && { opacity: 0.75 },
          ]}
        >
          <MaterialIcons name="person-add" size={17} color={Colors.primary} />
          <Text style={[styles.actionLabel, { color: Colors.primary }]}>حفظ</Text>
        </Pressable>

        {item.isAbusive ? (
          <View style={[styles.actionBtn, styles.actionAbusive]}>
            <MaterialIcons name="report" size={17} color={Colors.error} />
            <Text style={[styles.actionLabel, { color: Colors.error }]}>مشبوه</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  wrapperTop: {
    borderColor: Colors.primaryLight,
    borderWidth: 1.5,
    ...Shadow.md,
  },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  cardPressed: {
    opacity: 0.85,
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
  // ── Horizontal actions ──
  actionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    gap: Spacing.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  actionCall: {
    backgroundColor: Colors.accent,
  },
  actionChat: {
    backgroundColor: Colors.primary,
  },
  actionSave: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionAbusive: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  actionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: '#fff',
  },
});
