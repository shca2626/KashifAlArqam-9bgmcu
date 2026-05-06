// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LookupResultGroup } from '@/types';
import { Avatar } from './Avatar';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { formatPhoneDisplay } from '@/utils/phoneUtils';
import { callNumber, sendMessageByWhatsApp, sendSMS } from '@/utils/contactUtils';

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
        size={44}
      />

      {/* Content — name + phone */}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          {item.isAbusive ? (
            <MaterialIcons name="warning" size={13} color={Colors.error} />
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

      {/* Inline icon actions */}
      <View style={styles.icons}>
        <Pressable
          onPress={() => callNumber(item.phoneNumber)}
          hitSlop={8}
          style={({ pressed }) => [styles.icon, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="call" size={22} color={Colors.accent} />
        </Pressable>

        <Pressable
          onPress={() => sendMessageByWhatsApp(item.phoneNumber)}
          hitSlop={8}
          style={({ pressed }) => [styles.icon, pressed && { opacity: 0.6 }]}
        >
          <MaterialCommunityIcons name="whatsapp" size={22} color="#25D366" />
        </Pressable>

        <Pressable
          onPress={() => sendSMS(item.phoneNumber)}
          hitSlop={8}
          style={({ pressed }) => [styles.icon, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="sms" size={22} color={Colors.primary} />
        </Pressable>

        {item.isAbusive ? (
          <View style={styles.icon}>
            <MaterialIcons name="report" size={22} color={Colors.error} />
          </View>
        ) : null}
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
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  cardTop: {
    borderColor: Colors.primaryLight,
    borderWidth: 1.5,
    ...Shadow.md,
  },
  cardPressed: {
    opacity: 0.82,
  },
  content: {
    flex: 1,
    marginHorizontal: Spacing.sm,
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
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
    marginTop: 2,
    textAlign: 'right',
  },
  aliases: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
    textAlign: 'right',
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginRight: Spacing.xs,
  },
  icon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
