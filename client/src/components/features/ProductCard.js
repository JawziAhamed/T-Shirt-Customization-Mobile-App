import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../../theme';
import { currency, truncate } from '../../utils/format';
import { resolveProductDisplayImageUrl } from '../../utils/image';
import { AppBadge } from '../ui/Atoms';

export default function ProductCard({ product, onPress }) {
  const imageUrl = resolveProductDisplayImageUrl(product);
  const [imageSource, setImageSource] = useState(imageUrl);
  const isActive = product?.isActive !== false;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image
        source={{ uri: imageSource || 'https://images.unsplash.com/photo-1618354691438-25bc04584c23?auto=format&fit=crop&w=1200&q=80' }}
        style={styles.image}
        resizeMode="cover"
        onError={() => setImageSource('https://images.unsplash.com/photo-1618354691438-25bc04584c23?auto=format&fit=crop&w=1200&q=80')}
      />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>
            {product?.name || 'Untitled product'}
          </Text>
          <AppBadge label={isActive ? 'Live' : 'Hidden'} tone={isActive ? 'success' : 'warning'} />
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {truncate(product?.description || 'Premium customization-ready t-shirt.', 110)}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.pricePill}>
            <MaterialCommunityIcons name="currency-usd" size={14} color={colors.primary} />
            <Text style={styles.price}>{currency(product?.basePrice || 0)}</Text>
          </View>
          <Text style={styles.meta}>{(product?.colors || []).length || 0} colors</Text>
          <Text style={styles.meta}>{(product?.sizes || []).length || 0} sizes</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surfaceSoft,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(88,213,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  price: {
    color: colors.primary,
    fontWeight: '800',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
