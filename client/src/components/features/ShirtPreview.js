import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { resolveProductImageUrl } from '../../utils/image';

export default function ShirtPreview({
  product,
  shirtColor = '#ffffff',
  imageUri,
  baseImage,
  note,
  compact = false,
}) {
  const pagerRef = useRef(null);
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [pagerWidth, setPagerWidth] = useState(0);

  const viewportWidth = useMemo(
    () =>
      pagerWidth ||
      Math.max(260, Math.min(compact ? 340 : 380, width - spacing.lg * (compact ? 2.8 : 4))),
    [width, compact, pagerWidth]
  );
  const managementImage = resolveProductImageUrl(baseImage || product?.imageUrl || '');
  const customImage = resolveProductImageUrl(imageUri || managementImage);

  useEffect(() => {
    setActiveIndex(0);
    pagerRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
  }, [product?._id, managementImage, customImage]);

  const renderCustomPreview = () => (
    <View style={[styles.page, { width: viewportWidth }]}>
      <View style={styles.previewFrame}>
        <View style={[styles.shirtBody, { backgroundColor: shirtColor }]} />
        <View style={styles.hem} />
        <View style={styles.sleeveLeft} />
        <View style={styles.sleeveRight} />
        {customImage ? <Image source={{ uri: customImage }} style={styles.overlayImage} resizeMode="cover" /> : null}
        <View style={styles.highlight} />
      </View>
    </View>
  );

  const renderBasePreview = () => (
    <View style={[styles.page, { width: viewportWidth }]}>
      <View style={styles.previewFrame}>
        {managementImage ? (
          <Image source={{ uri: managementImage }} style={styles.baseImage} resizeMode="contain" />
        ) : (
          <View style={styles.basePlaceholder}>
            <Text style={styles.placeholderTitle}>Base tee image unavailable</Text>
            <Text style={styles.placeholderText}>Upload a product image from management to show the base tee here.</Text>
          </View>
        )}
      </View>
    </View>
  );

  const helperText = activeIndex === 0 ? 'Swipe left to compare the base tee' : 'Swipe right to return to customization';

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.pagerWrap}
        onLayout={(event) => {
          const nextWidth = Math.round(event.nativeEvent.layout.width);
          if (nextWidth && nextWidth !== pagerWidth) {
            setPagerWidth(nextWidth);
          }
        }}
      >
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          snapToInterval={viewportWidth}
          decelerationRate="fast"
          disableIntervalMomentum
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / viewportWidth);
            setActiveIndex(nextIndex);
          }}
          style={styles.pagerScroll}
          contentContainerStyle={[styles.pagerContent, { width: viewportWidth * 2 }]}
        >
          {renderCustomPreview()}
          {renderBasePreview()}
        </ScrollView>
      </View>
      <View style={styles.captionRow}>
        <Text style={styles.caption}>{activeIndex === 0 ? 'Live customization preview' : 'Base T-shirt view'}</Text>
        <Text style={styles.helper}>{helperText}</Text>
      </View>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  pagerWrap: {
    width: '100%',
    overflow: 'hidden',
  },
  pagerScroll: {
    width: '100%',
  },
  pagerContent: {
    alignItems: 'stretch',
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFrame: {
    width: '100%',
    aspectRatio: 1.02,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  shirtBody: {
    width: '62%',
    height: '70%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 3,
  },
  sleeveLeft: {
    position: 'absolute',
    left: '18%',
    top: '30%',
    width: 72,
    height: 110,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    transform: [{ rotate: '16deg' }],
  },
  sleeveRight: {
    position: 'absolute',
    right: '18%',
    top: '30%',
    width: 72,
    height: 110,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    transform: [{ rotate: '-16deg' }],
  },
  hem: {
    position: 'absolute',
    bottom: '16%',
    width: '36%',
    height: 14,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 999,
  },
  overlayImage: {
    position: 'absolute',
    width: '38%',
    height: '38%',
    borderRadius: 18,
    opacity: 0.92,
  },
  highlight: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    height: '28%',
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  baseImage: {
    width: '88%',
    height: '88%',
  },
  basePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  placeholderTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  captionRow: {
    alignItems: 'center',
    gap: 2,
  },
  caption: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  note: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
  },
});
