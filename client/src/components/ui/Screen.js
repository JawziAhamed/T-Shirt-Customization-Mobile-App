import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients, spacing } from '../../theme';

export default function Screen({
  children,
  scroll = true,
  refreshControl = null,
  contentStyle = {},
  edges = ['top', 'left', 'right'],
}) {
  const Container = scroll ? ScrollView : View;
  const scrollPadding = scroll ? [styles.scrollContent, styles.pagePadding, contentStyle] : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <LinearGradient colors={gradients.hero} style={styles.background}>
        <Container
          style={[styles.container, !scroll && styles.flex, contentStyle]}
          contentContainerStyle={scrollPadding}
          refreshControl={scroll ? refreshControl : undefined}
        >
          {children}
        </Container>
      </LinearGradient>
    </SafeAreaView>
  );
}

export const screenStyles = StyleSheet.create({
  pagePadding: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});

const styles = StyleSheet.create({
  pagePadding: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
