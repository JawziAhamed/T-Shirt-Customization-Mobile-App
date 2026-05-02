import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../theme';

export function AppText({ children, variant = 'body', tone = 'default', style, ...props }) {
  const variantStyle = styles[variant] || styles.body;
  const toneStyle =
    tone === 'muted'
      ? styles.muted
      : tone === 'accent'
        ? styles.accent
        : tone === 'success'
          ? styles.success
          : tone === 'danger'
            ? styles.danger
            : styles.defaultTone;

  return (
    <Text style={[styles.base, variantStyle, toneStyle, style]} {...props}>
      {children}
    </Text>
  );
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  textStyle,
}) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  const content = (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.primaryButton,
        isGhost && styles.ghostButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.text : colors.background} />
      ) : (
        <>
          {icon ? <MaterialCommunityIcons name={icon} size={18} color={isGhost ? colors.text : colors.background} /> : null}
          <Text style={[styles.buttonText, isGhost && styles.ghostText, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );

  if (isPrimary) {
    return (
      <LinearGradient colors={['#58d5ff', '#7c9cff']} style={styles.buttonGradient}>
        {content}
      </LinearGradient>
    );
  }

  return content;
}

export function AppInput({
  label,
  error,
  style,
  inputStyle,
  multiline,
  rightIcon,
  onRightIconPress,
  rightIconColor = colors.textMuted,
  ...props
}) {
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputShell}>
        <TextInput
          placeholderTextColor="rgba(245,247,251,0.45)"
          style={[
            styles.input,
            multiline && styles.multiline,
            rightIcon && styles.inputWithIcon,
            inputStyle,
          ]}
          multiline={multiline}
          {...props}
        />
        {rightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={10} style={styles.inputIcon}>
            <MaterialCommunityIcons name={rightIcon} size={20} color={rightIconColor} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function AppPicker({ label, error, items = [], value, onValueChange, style }) {
  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          dropdownIconColor={colors.text}
          style={styles.picker}
        >
          {items.map((item) => (
            <Picker.Item key={item.value} label={item.label} value={item.value} color={colors.background} />
          ))}
        </Picker>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function AppBadge({ label, tone = 'default', style }) {
  return <View style={[styles.badge, styles[`badge_${tone}`], style]}><Text style={styles.badgeText}>{label}</Text></View>;
}

export function AppCard({ children, style, elevated = false }) {
  return <View style={[styles.card, elevated && styles.elevatedCard, style]}>{children}</View>;
}

export function SectionHeader({ title, actionLabel, onAction, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
  },
  defaultTone: {},
  muted: {
    color: colors.textMuted,
  },
  accent: {
    color: colors.primary,
  },
  success: {
    color: colors.success,
  },
  danger: {
    color: colors.danger,
  },
  label: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    minHeight: 48,
  },
  inputShell: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithIcon: {
    paddingRight: 52,
  },
  inputIcon: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  error: {
    color: colors.danger,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  pickerWrap: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  picker: {
    color: colors.text,
  },
  buttonGradient: {
    borderRadius: radius.md,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {},
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  disabledButton: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  buttonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '800',
  },
  ghostText: {
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSoft,
  },
  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  badge_default: {},
  badge_success: { backgroundColor: 'rgba(94,227,157,0.16)' },
  badge_warning: { backgroundColor: 'rgba(255,209,102,0.16)' },
  badge_danger: { backgroundColor: 'rgba(255,113,141,0.16)' },
  badge_info: { backgroundColor: 'rgba(124,156,255,0.16)' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevatedCard: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
