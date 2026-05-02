import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../../theme';
import { AppButton, AppText } from './Atoms';

export function Loader({ label = 'Loading content...' }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <AppText tone="muted" style={styles.description}>{description}</AppText> : null}
      {actionLabel ? <AppButton title={actionLabel} onPress={onAction} style={{ marginTop: spacing.md }} /> : null}
    </View>
  );
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>{title}</Text>
      {description ? <AppText tone="muted" style={styles.description}>{description}</AppText> : null}
      {onRetry ? <AppButton title="Try Again" onPress={onRetry} variant="ghost" style={{ marginTop: spacing.md }} /> : null}
    </View>
  );
}

export function AuthRequiredState({ title = 'Sign in required', description, actionLabel = 'Sign In', onAction }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <AppText tone="muted" style={styles.description}>{description}</AppText> : null}
      {onAction ? <AppButton title={actionLabel} onPress={onAction} style={{ marginTop: spacing.md }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 220,
  },
  label: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
