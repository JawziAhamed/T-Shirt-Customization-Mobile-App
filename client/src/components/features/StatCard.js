import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../theme';

export default function StatCard({ label, value, hint, icon, gradientColors = ['#152844', '#0f1e34'] }) {
  return (
    <LinearGradient colors={gradientColors} style={styles.card}>
      <View style={styles.iconBubble}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 130,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.md,
  },
  value: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  label: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  hint: {
    color: colors.primary,
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: '700',
  },
});
