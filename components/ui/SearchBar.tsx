// Powered by OnSpace.AI
import React, { useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, Shadow } from '@/constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const SearchBar = React.memo(function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  placeholder = 'ابحث برقم الهاتف أو الاسم...',
  autoFocus = false,
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {/* Search icon on the right (RTL) */}
        <Pressable
          onPress={() => {
            inputRef.current?.focus();
            onSubmit?.();
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="search" size={22} color={Colors.primary} />
        </Pressable>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          autoFocus={autoFocus}
          textAlign="right"
          style={styles.input}
        />

        {value.length > 0 ? (
          <Pressable
            onPress={() => {
              onChangeText('');
              onClear?.();
              inputRef.current?.focus();
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <MaterialIcons name="close" size={20} color={Colors.textMuted} />
          </Pressable>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    ...Shadow.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginHorizontal: Spacing.sm,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  iconBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPlaceholder: {
    width: 28,
    height: 28,
  },
});
