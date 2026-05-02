import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { currency, shortDate, statusColor, titleCase } from '../../utils/format';
import { AppBadge } from '../ui/Atoms';

export default function OrderCard({ order, onPress, onPayInstallment }) {
  const firstItem = order?.items?.[0];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <Text style={styles.title}>Order #{String(order?._id || '').slice(-6).toUpperCase()}</Text>
        <AppBadge label={titleCase(order?.status || 'pending')} style={{ backgroundColor: `${statusColor(order?.status)}22` }} />
      </View>
      <Text style={styles.meta}>{shortDate(order?.createdAt || new Date())}</Text>
      <Text style={styles.summary} numberOfLines={2}>
        {firstItem ? `${firstItem.productName} x${firstItem.quantity}` : 'No line items available'}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.total}>{currency(order?.total || 0)}</Text>
        {order?.paymentMethod === 'installment' && order?.paymentStatus !== 'paid' && onPayInstallment ? (
          <Text style={styles.payAction} onPress={onPayInstallment}>
            Pay installment
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  summary: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  total: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  payAction: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
});
