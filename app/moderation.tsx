// Powered by OnSpace.AI — ModerationSettingsScreen
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { useModeration } from '@/hooks/useModeration';
import { HiddenItem } from '@/types';

export default function ModerationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { prefs, hiddenItems, isLoading, updatePref, unhide, clearAll } = useModeration();

  const handleUnhide = async (item: HiddenItem) => {
    showAlert(
      'إلغاء الإخفاء',
      `هل تريد إعادة إظهار "${item.type === 'number' ? item.value : item.value.split('::')[1]}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إعادة الإظهار',
          onPress: async () => {
            await unhide(item.id);
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    showAlert(
      'مسح كل الإخفاءات',
      'هل أنت متأكد؟ سيتم إعادة إظهار جميع الأرقام والأسماء المخفية.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح الكل',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            showAlert('تم', 'تم مسح جميع بيانات الإخفاء المحلية');
          },
        },
      ]
    );
  };

  const getItemLabel = (item: HiddenItem): string => {
    if (item.type === 'number') return item.value;
    const parts = item.value.split('::');
    return parts.length > 1 ? parts[1] : item.value;
  };

  const getItemSub = (item: HiddenItem): string => {
    if (item.type === 'name') {
      const parts = item.value.split('::');
      return parts.length > 1 ? `رقم: ${parts[0]}` : '';
    }
    return '';
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <MaterialIcons name="arrow-forward" size={22} color={Colors.textOnPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>إعدادات الإشراف</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Moderation toggles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>إعدادات التصفية</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>إخفاء الأسماء المسيئة تلقائياً</Text>
                <Text style={styles.settingDesc}>
                  يخفي الأرقام المُبلَّغ عنها كمزعجة من نتائج البحث
                </Text>
              </View>
              <Switch
                value={prefs.hideAbusiveAuto}
                onValueChange={(v) => updatePref('hideAbusiveAuto', v)}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={prefs.hideAbusiveAuto ? Colors.primary : Colors.textMuted}
              />
            </View>

            <View style={[styles.settingRow, styles.settingRowLast]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>تفعيل الفلترة المحلية</Text>
                <Text style={styles.settingDesc}>
                  يُطبّق قائمة الإخفاء الشخصية على نتائج البحث
                </Text>
              </View>
              <Switch
                value={prefs.filterEnabled}
                onValueChange={(v) => updatePref('filterEnabled', v)}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={prefs.filterEnabled ? Colors.primary : Colors.textMuted}
              />
            </View>
          </View>

          {/* Hidden items */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { padding: 0 }]}>العناصر المخفية محلياً</Text>
              {hiddenItems.length > 0 ? (
                <Pressable
                  onPress={handleClearAll}
                  style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.clearAllText}>مسح الكل</Text>
                </Pressable>
              ) : null}
            </View>

            {hiddenItems.length === 0 ? (
              <View style={styles.emptyHidden}>
                <MaterialIcons name="visibility" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyHiddenText}>
                  لا توجد عناصر مخفية. ستظهر هنا الأرقام والأسماء التي تخفيها من نتائج البحث.
                </Text>
              </View>
            ) : (
              hiddenItems.map((item) => (
                <View key={item.id} style={styles.hiddenItem}>
                  <Pressable
                    onPress={() => handleUnhide(item)}
                    hitSlop={6}
                    style={({ pressed }) => [styles.unhideBtn, pressed && { opacity: 0.6 }]}
                  >
                    <MaterialIcons name="visibility" size={18} color={Colors.primary} />
                  </Pressable>

                  <View style={styles.hiddenItemInfo}>
                    <Text style={styles.hiddenItemLabel}>{getItemLabel(item)}</Text>
                    {getItemSub(item) ? (
                      <Text style={styles.hiddenItemSub}>{getItemSub(item)}</Text>
                    ) : null}
                  </View>

                  <View style={[styles.hiddenTypeBadge, item.type === 'number' ? styles.badgeNum : styles.badgeName]}>
                    <MaterialIcons
                      name={item.type === 'number' ? 'dialpad' : 'person'}
                      size={16}
                      color={item.type === 'number' ? Colors.primary : Colors.accent}
                    />
                  </View>

                  <Text style={styles.hiddenItemDate}>
                    {new Date(item.hiddenAt).toLocaleDateString('ar-YE')}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Privacy notice */}
          <View style={styles.privacyNote}>
            <MaterialIcons name="lock" size={20} color={Colors.accent} />
            <View style={styles.privacyText}>
              <Text style={styles.privacyTitle}>بيانات خاصة بك تماماً</Text>
              <Text style={styles.privacyDesc}>
                جميع إعدادات الإخفاء والتصفية محفوظة على جهازك فقط ولا تُرسل إلى أي خادم.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'right',
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  clearAllText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    fontWeight: FontWeight.semiBold,
  },
  settingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  settingLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  settingDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 3,
    lineHeight: 18,
  },
  emptyHidden: {
    alignItems: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyHiddenText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  hiddenItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  hiddenTypeBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeNum: { backgroundColor: '#EEF0F8' },
  badgeName: { backgroundColor: '#EFF8F2' },
  hiddenItemInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  hiddenItemLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  hiddenItemSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  hiddenItemDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  unhideBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyNote: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: '#F1FFF5',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: '#C8EDD5',
  },
  privacyText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  privacyTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semiBold,
    color: Colors.accent,
    textAlign: 'right',
  },
  privacyDesc: {
    fontSize: FontSize.sm,
    color: Colors.accentDark,
    textAlign: 'right',
    lineHeight: 20,
    marginTop: 4,
  },
});
