import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { categoryService } from '../services/categoryService';
import { giftCardService } from '../services/giftCardService';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { colors, radius, spacing } from '../theme';
import { currency, truncate } from '../utils/format';
import { resolveProductDisplayImageUrl, resolveProductImageUrl } from '../utils/image';
import { AppBadge, AppButton, AppInput, AppPicker, AppText, AppCard, SectionHeader } from '../components/ui/Atoms';
import Screen from '../components/ui/Screen';
import { EmptyState, ErrorState, Loader } from '../components/ui/States';
import ProductCard from '../components/features/ProductCard';
import ShirtPreview from '../components/features/ShirtPreview';

const toDataUrl = async (asset) => {
  if (!asset) return '';
  if (asset.base64 && asset.mimeType) {
    return `data:${asset.mimeType};base64,${asset.base64}`;
  }
  if (asset.base64) {
    return `data:image/jpeg;base64,${asset.base64}`;
  }
  return asset.uri || '';
};

const homepageStats = [
  { label: 'Products', value: '50+', icon: 'tshirt-crew-outline' },
  { label: 'Custom orders', value: 'Fast', icon: 'shape-outline' },
  { label: 'Support', value: '24/7', icon: 'headset' },
  { label: 'Checkout', value: 'Secure', icon: 'shield-check-outline' },
];

const homepageSteps = [
  {
    title: 'Pick a product',
    description: 'Browse clean collections, best sellers, and campaign-ready shirts.',
    icon: 'basket-outline',
  },
  {
    title: 'Customize it',
    description: 'Upload artwork, tweak colors, or generate a design in seconds.',
    icon: 'palette-swatch-outline',
  },
  {
    title: 'Order with confidence',
    description: 'Save the cart as a guest, then sign in when you are ready to checkout.',
    icon: 'truck-fast-outline',
  },
];

const homepageHighlights = [
  {
    title: 'Premium materials',
    description: 'Soft, durable blanks selected for long-lasting print quality.',
    icon: 'shield-star-outline',
  },
  {
    title: 'Mobile-first experience',
    description: 'Built for fast browsing, customization, and simple checkout on phones.',
    icon: 'cellphone-check',
  },
  {
    title: 'Built for teams',
    description: 'Designed to support customers, staff, and admins in one polished flow.',
    icon: 'account-group-outline',
  },
];

const customerStories = [
  {
    name: 'Ayesha Rahman',
    role: 'Boutique founder',
    quote: 'The homepage feels premium, and the customization flow helped us launch a small seasonal collection in a single afternoon.',
    result: 'Launched 24 tees for her first drop',
  },
  {
    name: 'Dilan Perera',
    role: 'Event organizer',
    quote: 'We could browse, compare products, and keep a cart ready before signing in. That made our bulk order process much smoother.',
    result: 'Saved hours on event prep',
  },
  {
    name: 'Nadia Khan',
    role: 'Creative director',
    quote: 'The product cards, stories, and hero imagery make the app feel like a polished brand storefront instead of a basic catalog.',
    result: 'Higher engagement on mobile',
  },
];

const heroImageUrl = 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1400&q=80';

function SuggestedProductCard({ item, navigation, width }) {
  const fallbackImage = resolveProductDisplayImageUrl(item) || heroImageUrl;
  const [imageSource, setImageSource] = useState(fallbackImage);

  return (
    <Pressable
      onPress={() => navigation.navigate('ProductDetails', { id: item._id })}
      style={({ pressed }) => [styles.suggestCard, { width }, pressed && styles.pressedCard]}
    >
      <ImageBackground
        source={{ uri: imageSource || fallbackImage }}
        style={styles.suggestImage}
        imageStyle={styles.suggestImageStyle}
        onError={() => setImageSource(fallbackImage)}
      >
        <View style={styles.suggestOverlay}>
          <AppBadge label="Tap to open" tone="success" />
          <Text style={styles.suggestPrice}>{currency(item.basePrice || 0)}</Text>
        </View>
      </ImageBackground>
      <View style={styles.suggestBody}>
        <Text style={styles.suggestTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.suggestText} numberOfLines={2}>
          {truncate(item.description || 'Premium customization-ready t-shirt.', 72)}
        </Text>
      </View>
    </Pressable>
  );
}

function FeaturedProductCard({ item, navigation, width }) {
  const fallbackImage = heroImageUrl;
  const [imageSource, setImageSource] = useState(resolveProductDisplayImageUrl(item) || fallbackImage);

  return (
    <Pressable
      onPress={() => navigation.navigate('ProductDetails', { id: item._id })}
      style={({ pressed }) => [styles.featuredCard, { width }, pressed && styles.pressedCard]}
    >
      <ImageBackground
        source={{ uri: imageSource || fallbackImage }}
        style={styles.featuredImage}
        imageStyle={styles.featuredImageStyle}
        onError={() => setImageSource(fallbackImage)}
      >
        <View style={styles.featuredOverlay}>
          <AppBadge label={item.isActive === false ? 'Hidden' : 'Latest drop'} tone={item.isActive === false ? 'warning' : 'success'} />
          <Text style={styles.featuredPrice}>{currency(item.basePrice || 0)}</Text>
        </View>
      </ImageBackground>
      <View style={styles.featuredBody}>
        <Text style={styles.featuredTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.featuredDescription} numberOfLines={2}>
          {truncate(item.description || 'Premium customization-ready t-shirt.', 96)}
        </Text>
        <View style={styles.featuredMetaRow}>
          <Text style={styles.featuredMeta}>{(item.colors || []).length || 0} colors</Text>
          <Text style={styles.featuredMeta}>{(item.sizes || []).length || 0} sizes</Text>
          <Text style={styles.featuredMeta}>Tap to customize</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function HomeScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const guestMode = useAuthStore((state) => state.guestMode);
  const cartItems = useCartStore((state) => state.items);
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);
  const carouselIndexRef = useRef(0);

  const cartCount = useMemo(
    () => cartItems.reduce((count, item) => count + Number(item.quantity || 0), 0),
    [cartItems]
  );

  const featuredCarousel = useMemo(() => featured.slice(0, 6), [featured]);
  const carouselCardWidth = useMemo(() => Math.max(260, Math.min(340, width - spacing.lg * 2 - spacing.md)), [width]);
  const carouselSpacing = spacing.md;
  const carouselStep = carouselCardWidth + carouselSpacing;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [productsResult, categoriesResult] = await Promise.all([
          productService.getProducts({ limit: 6 }),
          categoryService.getCategories(),
        ]);

        if (!active) return;
        setFeatured(productsResult.data.data || []);
        setCategories(categoriesResult.data.categories || categoriesResult.data.data || []);
      } catch (error) {
        if (!active) return;
        Alert.alert('Unable to load homepage', error?.message || 'Please try again later.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!featuredCarousel.length || featuredCarousel.length < 2) return undefined;

    carouselIndexRef.current = 0;
    const timer = setInterval(() => {
      const nextIndex = (carouselIndexRef.current + 1) % featuredCarousel.length;
      carouselIndexRef.current = nextIndex;
      carouselRef.current?.scrollToIndex?.({ index: nextIndex, animated: true });
    }, 3600);

    return () => clearInterval(timer);
  }, [featuredCarousel, carouselStep]);

  if (loading) {
    return <Loader label="Loading your mobile storefront" />;
  }

  return (
    <Screen scroll contentStyle={styles.homeContent}>
      <View style={styles.hero}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.heroTextBlock}>
            <AppBadge label={user ? `Welcome ${user.name?.split(' ')[0] || 'back'}` : 'Browse as guest'} tone="info" />
            <AppText variant="title" style={styles.heroTitle}>
              Design, shop, and order premium tees from one polished mobile storefront.
            </AppText>
            <AppText tone="muted" style={styles.heroCopy}>
              Guests can browse the catalog and build a cart instantly. Sign in whenever you are ready to checkout, view orders, or manage your account.
            </AppText>
            <View style={styles.heroActions}>
              <AppButton title="Browse Products" onPress={() => navigation.navigate('Products')} />
              <AppButton title="View Cart" onPress={() => navigation.navigate('Cart')} variant="ghost" />
              {!user ? <AppButton title="Sign In" onPress={() => navigation.navigate('Login')} variant="ghost" /> : null}
            </View>
          </View>
          <View style={styles.heroMediaWrap}>
            <ImageBackground source={{ uri: heroImageUrl }} style={styles.heroMedia} imageStyle={styles.heroMediaImage}>
              <View style={styles.heroMediaOverlay}>
                <AppBadge label="Premium drop" tone="success" />
                <Text style={styles.heroMediaTitle}>Custom tees, polished presentation.</Text>
                <Text style={styles.heroMediaText}>Inspired by premium streetwear and made to convert on mobile.</Text>
                <View style={styles.heroMiniStats}>
                  <View style={styles.heroMiniStat}>
                    <Text style={styles.heroMiniValue}>4.9</Text>
                    <Text style={styles.heroMiniLabel}>rating</Text>
                  </View>
                  <View style={styles.heroMiniStat}>
                    <Text style={styles.heroMiniValue}>24h</Text>
                    <Text style={styles.heroMiniLabel}>support</Text>
                  </View>
                </View>
              </View>
            </ImageBackground>
          </View>
        </View>
      </View>

      <View style={styles.statGrid}>
        {homepageStats.map((stat) => (
          <AppCard key={stat.label} style={styles.statCard}>
            <MaterialCommunityIcons name={stat.icon} size={20} color={colors.primary} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </AppCard>
        ))}
      </View>

      <View style={styles.sectionGap}>
        <SectionHeader title="How it works" subtitle="A simple path from browsing to custom order." />
        <View style={styles.infoGrid}>
          {homepageSteps.map((step, index) => (
            <AppCard key={step.title} style={styles.infoCard}>
              <View style={styles.infoBadge}>
                <MaterialCommunityIcons name={step.icon} size={22} color={colors.primary} />
                <Text style={styles.infoStep}>{String(index + 1).padStart(2, '0')}</Text>
              </View>
              <Text style={styles.infoTitle}>{step.title}</Text>
              <Text style={styles.infoText}>{step.description}</Text>
            </AppCard>
          ))}
        </View>
      </View>

      <View style={styles.sectionGap}>
        <SectionHeader title="Categories" subtitle="A fast entry point into the catalog." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {categories.map((category) => (
            <AppBadge key={category._id || category.slug || category.name} label={category.name || category.slug} style={styles.categoryChip} />
          ))}
          {!categories.length ? <AppText tone="muted">No categories available yet.</AppText> : null}
        </ScrollView>
      </View>

      <View style={styles.sectionGap}>
        <SectionHeader title="Why customers love it" subtitle="Built for browsing, customization, and trust." />
        <View style={styles.infoGrid}>
          {homepageHighlights.map((item) => (
            <AppCard key={item.title} style={styles.infoCard}>
              <MaterialCommunityIcons name={item.icon} size={22} color={colors.primary} />
              <Text style={styles.infoTitle}>{item.title}</Text>
              <Text style={styles.infoText}>{item.description}</Text>
            </AppCard>
          ))}
        </View>
      </View>

      <View style={styles.sectionGap}>
        <SectionHeader title="Featured Products" actionLabel="See all" onAction={() => navigation.navigate('Products')} />
        <FlatList
          ref={carouselRef}
          data={featuredCarousel}
          keyExtractor={(item) => item._id}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled={false}
          decelerationRate="fast"
          snapToInterval={carouselStep}
          snapToAlignment="start"
          disableIntervalMomentum
          contentContainerStyle={styles.carouselContent}
          ItemSeparatorComponent={() => <View style={{ width: carouselSpacing }} />}
          getItemLayout={(_, index) => ({
            length: carouselStep,
            offset: carouselStep * index,
            index,
          })}
          onScrollToIndexFailed={({ index }) => {
            carouselRef.current?.scrollToOffset?.({ offset: index * carouselStep, animated: true });
          }}
          renderItem={({ item }) => <FeaturedProductCard item={item} navigation={navigation} width={carouselCardWidth} />}
          ListEmptyComponent={
            <AppCard style={styles.emptyFeaturedCard}>
              <AppText tone="muted">Featured products will appear here once the catalog loads.</AppText>
            </AppCard>
          }
        />
      </View>

      <View style={styles.sectionGap}>
        <SectionHeader title="Customer stories" subtitle="Real feedback from people using the mobile storefront." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
          {customerStories.map((story) => (
            <AppCard key={story.name} style={styles.storyCard}>
              <MaterialCommunityIcons name="account-voice" size={24} color={colors.primary} />
              <Text style={styles.storyQuote} numberOfLines={4}>{`"${story.quote}"`}</Text>
              <View style={styles.storyFooter}>
                <View style={styles.storyIdentity}>
                  <Text style={styles.storyName}>{story.name}</Text>
                  <Text style={styles.storyRole}>{story.role}</Text>
                </View>
                <AppBadge label={story.result} tone="info" style={styles.storyBadge} />
              </View>
            </AppCard>
          ))}
        </ScrollView>
      </View>

      <View style={styles.sectionGap}>
        <AppCard style={styles.ctaBanner}>
          <AppText variant="subtitle" style={styles.ctaTitle}>
            {guestMode || !user ? 'Save your cart, sign in later, and finish checkout when ready.' : 'Need another custom order?'}
          </AppText>
          <AppText tone="muted" style={styles.ctaText}>
            {guestMode || !user
              ? `You already have ${cartCount} item${cartCount === 1 ? '' : 's'} in your cart.`
              : 'Jump back into the catalog or open your cart to continue shopping.'}
          </AppText>
          <View style={styles.heroActions}>
            <AppButton title="Browse Products" onPress={() => navigation.navigate('Products')} />
            {!user ? <AppButton title="Sign In" onPress={() => navigation.navigate('Login')} variant="ghost" /> : null}
          </View>
        </AppCard>
      </View>
    </Screen>
  );
}

export function ProductsScreen() {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [productsResult, categoriesResult] = await Promise.all([
        productService.getProducts({ search, category, limit: 24 }),
        categoryService.getCategories(),
      ]);

      setProducts(productsResult.data.data || []);
      setCategories(categoriesResult.data.categories || categoriesResult.data.data || []);
    } catch (error) {
      Alert.alert('Products unavailable', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  const categoryItems = useMemo(
    () => [{ label: 'All categories', value: '' }, ...categories.map((item) => ({ label: item.name || item.slug, value: item.name || item.slug }))],
    [categories]
  );

  if (loading) {
    return <Loader label="Loading products" />;
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.productsRow}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.productsHeader}>
            <View style={styles.productsHeaderTopRow}>
              <View style={styles.productsHeaderIcon}>
                <MaterialCommunityIcons name="tshirt-crew-outline" size={24} color={colors.primary} />
              </View>
              <AppBadge label="Catalog" tone="info" />
            </View>
            <Text style={styles.productsHeaderTitle}>Products</Text>
            <Text style={styles.productsHeaderSubtitle}>Search, filter, and open a product to customize.</Text>
            <AppInput
              label="Search"
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or tag"
              autoCapitalize="none"
              style={{ marginTop: spacing.md }}
            />
            <AppPicker
              label="Category"
              items={categoryItems}
              value={category}
              onValueChange={setCategory}
              style={{ marginTop: spacing.md }}
            />
          </View>
        }
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        renderItem={({ item }) => (
          <View style={styles.productGridItem}>
            <ProductCard product={item} onPress={() => navigation.navigate('ProductDetails', { id: item._id })} />
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No products found" description="Try another search or category." />}
      />
    </Screen>
  );
}

export function ProductDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const addItem = useCartStore((state) => state.addItem);
  const previewRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [quantity, setQuantity] = useState(1);
  const [shirtColor, setShirtColor] = useState('#ffffff');
  const [logoDecal, setLogoDecal] = useState('');
  const [fullDecal, setFullDecal] = useState('');
  const [customArtworkUrl, setCustomArtworkUrl] = useState('');
  const [note, setNote] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [pendingArtwork, setPendingArtwork] = useState('');
  const [pendingArtworkTarget, setPendingArtworkTarget] = useState('');
  const suggestionCardWidth = Math.max(176, Math.min(220, Math.round(width * 0.5)));

  useEffect(() => {
    if (selectedColor) {
      setShirtColor(selectedColor);
    }
  }, [selectedColor]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const { data } = await productService.getProductById(route.params?.id);
        if (!active) return;
        const currentProduct = data.product;
        setProduct(currentProduct);
        setInventory(data.inventory);

        setSelectedSize(currentProduct.sizes?.[0]?.size || '');
        setSelectedColor(currentProduct.colors?.[0] || '#FFFFFF');
        setShirtColor(currentProduct.colors?.[0] || '#ffffff');

        const relatedResult = await productService.getProducts({
          category: currentProduct.category || '',
          limit: 8,
        });
        if (!active) return;

        const related = (relatedResult.data.data || []).filter((item) => String(item._id) !== String(currentProduct._id));

        if (related.length >= 3) {
          setSuggestions(related.slice(0, 5));
          return;
        }

        const fallbackResult = await productService.getProducts({ limit: 8 });
        if (!active) return;
        const fallback = (fallbackResult.data.data || []).filter(
          (item) =>
            String(item._id) !== String(currentProduct._id) &&
            !related.some((candidate) => String(candidate._id) === String(item._id))
        );
        setSuggestions([...related, ...fallback].slice(0, 5));
      } catch (error) {
        Alert.alert('Unable to load product', error?.message || 'Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [route.params?.id]);

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    const sizeMatch = product.sizes?.find((size) => size.size === selectedSize);
    return Number(product.basePrice) + Number(sizeMatch?.priceModifier || 0);
  }, [product, selectedSize]);

  const openImagePicker = async (target) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const dataUrl = await toDataUrl(result.assets[0]);
    setPendingArtwork(dataUrl);
    setPendingArtworkTarget(target);
  };

  const confirmArtworkSelection = () => {
    if (!pendingArtwork) return;

    const targetSetter = pendingArtworkTarget === 'full' ? setFullDecal : setLogoDecal;
    targetSetter(pendingArtwork);
    if (!customArtworkUrl) {
      setCustomArtworkUrl(pendingArtwork);
    }
    setPendingArtwork('');
    setPendingArtworkTarget('');
  };

  const cancelArtworkSelection = () => {
    setPendingArtwork('');
    setPendingArtworkTarget('');
  };

  const handleAddToCart = async () => {
    if (!product) return;

    const snapshot = (await previewRef.current?.captureSnapshot?.()) || '';
    const previewImage = snapshot || customArtworkUrl || fullDecal || logoDecal || product.imageUrl || '';

    addItem({
      productId: product._id,
      productName: product.name,
      quantity,
      size: selectedSize,
      color: selectedColor,
      unitPrice,
      baseProductImage: product.imageUrl || '',
      customPreviewImage: previewImage,
      customization: {
        shirtColor,
        logoDecal,
        fullDecal,
        customArtworkUrl,
        baseProductImage: product.imageUrl || '',
        customPreviewImage: previewImage,
        note,
      },
    });

    Alert.alert('Added to cart', 'The customized shirt is now ready for checkout.', [
      { text: 'Keep browsing', style: 'cancel' },
      { text: 'View cart', onPress: () => navigation.navigate('Tabs', { screen: 'Cart' }) },
    ]);
  };

  if (loading) {
    return <Loader label="Loading product" />;
  }

  if (!product) {
    return <ErrorState title="Product not found" description="This product may have been removed." onRetry={() => navigation.goBack()} />;
  }

  return (
    <Screen scroll contentStyle={styles.detailContent}>
      <SectionHeader title={product.name} subtitle={truncate(product.description, 120)} />

      <View style={styles.detailStack}>
        <AppCard elevated style={styles.previewCard}>
          <ShirtPreview
            ref={previewRef}
            product={product}
            shirtColor={shirtColor}
            imageUri={customArtworkUrl || fullDecal || logoDecal || resolveProductImageUrl(product.imageUrl)}
            baseImage={product.imageUrl}
            logoDecal={logoDecal}
            fullDecal={fullDecal}
            customArtworkUrl={customArtworkUrl}
            note={note}
            compact
          />
          <View style={styles.priceRow}>
            <AppBadge label={`Stock ${inventory?.stock ?? 0}`} tone="info" />
            <AppBadge label={currency(unitPrice)} tone="success" />
          </View>
        </AppCard>

        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            Configuration
          </AppText>
          <AppText tone="muted">
            Choose size, color, and quantity, then add your artwork or AI-generated design.
          </AppText>

          <View style={styles.pillGrid}>
            {(product.sizes || []).map((size) => (
              <Pressable
                key={size.size}
                onPress={() => setSelectedSize(size.size)}
                style={[styles.pill, selectedSize === size.size && styles.pillActive]}
              >
                <Text style={styles.pillText}>{size.size}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.pillGrid}>
            {(product.colors || []).map((color) => (
                <Pressable
                  key={color}
                onPress={() => {
                  setSelectedColor(color);
                  setShirtColor(color);
                }}
                  style={[styles.colorDot, selectedColor === color && styles.colorDotActive]}
                >
                <View style={[styles.colorSwatch, { backgroundColor: color }]} />
                <Text style={styles.colorText}>{color}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <View style={styles.quantityStepper}>
              <Pressable onPress={() => setQuantity((value) => Math.max(1, value - 1))} style={styles.stepButton}>
                <Text style={styles.stepText}>-</Text>
              </Pressable>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <Pressable
                onPress={() => setQuantity((value) => Math.min(Number(inventory?.stock || 99), value + 1))}
                style={styles.stepButton}
              >
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
          </View>
        </AppCard>

        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            Artwork & Notes
          </AppText>
          <AppText tone="muted">
            Upload your logo or full artwork, then add a short placement note for the print team.
          </AppText>
          <AppInput
            label="Design note"
            value={note}
            onChangeText={setNote}
            placeholder="Tell us where to place the design"
            multiline
          />
          <View style={styles.actionGrid}>
            <AppButton
              title="Upload Logo"
              variant="ghost"
              onPress={() => openImagePicker('logo')}
              icon="upload"
            />
            <AppButton
              title="Upload Full Art"
              variant="ghost"
              onPress={() => openImagePicker('full')}
              icon="image"
            />
          </View>
        </AppCard>

        <AppButton title="Add to Cart" onPress={handleAddToCart} />

        <View style={styles.suggestionSection}>
          <SectionHeader title="Suggested products" subtitle="Swipe through similar tees and open one to explore." />
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={suggestionCardWidth + spacing.md}
            snapToAlignment="start"
            disableIntervalMomentum
            contentContainerStyle={styles.suggestionList}
            ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
            renderItem={({ item }) => <SuggestedProductCard item={item} navigation={navigation} width={suggestionCardWidth} />}
            ListEmptyComponent={
              <AppCard style={styles.suggestionEmpty}>
                <AppText tone="muted">Suggested products will appear here once we find similar styles in the catalog.</AppText>
              </AppCard>
            }
          />
        </View>

        <Modal visible={Boolean(pendingArtwork)} transparent animationType="fade" onRequestClose={cancelArtworkSelection}>
          <View style={styles.artworkModalBackdrop}>
            <View style={styles.artworkModalCard}>
              <AppText variant="subtitle" style={styles.artworkModalTitle}>
                Confirm {pendingArtworkTarget === 'full' ? 'full artwork' : 'logo'} upload
              </AppText>
              <AppText tone="muted" style={styles.artworkModalText}>
                Review the selected image and tap Continue to apply it to the product.
              </AppText>
              <View style={styles.artworkPreviewFrame}>
                <Image source={{ uri: pendingArtwork }} style={styles.artworkPreviewImage} resizeMode="cover" />
              </View>
              <View style={styles.artworkModalActions}>
                <AppButton title="Retake" variant="ghost" onPress={cancelArtworkSelection} style={{ flex: 1 }} />
                <AppButton title="Continue" onPress={confirmArtworkSelection} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

export function CartScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const token = useAuthStore((state) => state.token);
  const items = useCartStore((state) => state.items);
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const [suggestions, setSuggestions] = useState([]);
  const suggestionCardWidth = Math.max(176, Math.min(220, Math.round(width * 0.5)));
  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const lineTotal = Number(item.unitPrice || 0) * Number(item.quantity || 0);
        return sum + lineTotal;
      }, 0),
    [items]
  );

  useEffect(() => {
    let active = true;

    const loadSuggestions = async () => {
      if (items.length) {
        return;
      }

      try {
        const { data } = await productService.getProducts({ limit: 6 });
        if (!active) return;

        setSuggestions((data.data || []).slice(0, 4));
      } catch {
        if (active) {
          setSuggestions([]);
        }
      }
    };

    loadSuggestions();

    return () => {
      active = false;
    };
  }, [items.length]);

  const checkoutAction = () => {
    if (!token) {
      navigation.navigate('Login');
      return;
    }

    navigation.navigate('Checkout');
  };

  return (
    <Screen scroll contentStyle={styles.cartContent}>
      {items.length ? (
        <View style={{ gap: spacing.md }}>
          <AppCard>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items</Text>
              <Text style={styles.summaryValue}>{items.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{currency(subtotal)}</Text>
            </View>
            <AppText tone="muted" style={{ marginTop: spacing.sm }}>
              Guests can keep building their cart now and sign in later to checkout.
            </AppText>
          </AppCard>

          {items.map((item, index) => (
            <AppCard key={`${item.productId}-${index}`}>
              <View style={styles.cartRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartTitle}>{item.productName}</Text>
                  <Text style={styles.cartMeta}>
                    {item.size ? `Size ${item.size}` : 'One size'} • {item.color || 'Default color'}
                  </Text>
                  <Text style={styles.cartMeta}>{currency(item.unitPrice)}</Text>
                </View>
                <Pressable onPress={() => removeItem(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
              <View style={styles.quantityRow}>
                <Text style={styles.quantityLabel}>Quantity</Text>
                <View style={styles.quantityStepper}>
                  <Pressable onPress={() => updateItemQuantity(index, item.quantity - 1)} style={styles.stepButton}>
                    <Text style={styles.stepText}>-</Text>
                  </Pressable>
                  <Text style={styles.quantityValue}>{item.quantity}</Text>
                  <Pressable onPress={() => updateItemQuantity(index, item.quantity + 1)} style={styles.stepButton}>
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </AppCard>
          ))}

          <AppCard>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cart total</Text>
              <Text style={styles.summaryValue}>{currency(subtotal)}</Text>
            </View>
            <AppButton
              title={token ? 'Proceed to Checkout' : 'Sign In to Checkout'}
              onPress={checkoutAction}
              style={{ marginTop: spacing.md }}
            />
          </AppCard>
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          <AppCard style={styles.emptyCartCard}>
            <MaterialCommunityIcons name="cart-off-outline" size={44} color={colors.primary} />
            <AppText variant="subtitle" style={styles.emptyCartTitle}>
              Your cart is empty
            </AppText>
            <AppText tone="muted" style={styles.emptyCartText}>
              Start with the homepage or product catalog, then save items here as you build your order.
            </AppText>
            <View style={styles.heroActions}>
              <AppButton title="Browse Products" onPress={() => navigation.navigate('Products')} />
              {!token ? <AppButton title="Sign In" onPress={() => navigation.navigate('Login')} variant="ghost" /> : null}
            </View>
          </AppCard>

          <View style={styles.suggestionSection}>
            <SectionHeader
              title="Suggested products"
              subtitle="Swipe through products that match the collection and open one to start shopping."
            />
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={suggestionCardWidth + spacing.md}
              snapToAlignment="start"
              disableIntervalMomentum
              contentContainerStyle={styles.suggestionList}
              ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
              renderItem={({ item }) => (
                <SuggestedProductCard item={item} navigation={navigation} width={suggestionCardWidth} />
              )}
              ListEmptyComponent={
                <AppCard style={styles.suggestionEmpty}>
                  <AppText tone="muted">Suggested products will appear here once the catalog is loaded.</AppText>
                </AppCard>
              }
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

export function CheckoutScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const lineTotal = Number(item.unitPrice || 0) * Number(item.quantity || 0);
        return sum + lineTotal;
      }, 0),
    [items]
  );

  const [summary, setSummary] = useState(null);
  const [appliedGiftCard, setAppliedGiftCard] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingGiftCard, setLoadingGiftCard] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    addressLine1: user?.address || '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    paymentMethod: 'cod',
    promoCode: '',
    giftCardCode: '',
  });

  useEffect(() => {
    setSummary(null);
    setAppliedGiftCard(null);
  }, [form.paymentMethod, form.promoCode, form.state]);

  if (!items.length) {
    return <EmptyState title="No items in cart" description="Add products before checkout." actionLabel="Browse products" onAction={() => navigation.navigate('Products')} />;
  }

  const buildPayload = ({ includeGiftCardCode = true } = {}) => ({
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      customization: {
        ...item.customization,
        shirtColor: item.customization?.shirtColor || item.color || '#FFFFFF',
      },
    })),
    promoCode: form.promoCode?.trim().toUpperCase() || undefined,
    giftCardCode: includeGiftCardCode ? form.giftCardCode?.trim().toUpperCase() || undefined : undefined,
    paymentMethod: form.paymentMethod,
    deliveryAddress: {
      fullName: form.fullName,
      phone: form.phone,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2,
      city: form.city,
      state: form.state,
      country: 'Sri Lanka',
      postalCode: form.postalCode,
    },
  });

  const calculateSummary = async () => {
    try {
      setLoadingQuote(true);
      const { data } = await orderService.quote(buildPayload({ includeGiftCardCode: false }));
      setSummary(data.summary);
      Alert.alert('Summary ready', 'Your order total has been calculated.');
    } catch (error) {
      Alert.alert('Quote failed', error?.message || 'Please check the form and try again.');
    } finally {
      setLoadingQuote(false);
    }
  };

  const applyGiftCard = async () => {
    const code = form.giftCardCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Gift card needed', 'Enter a gift card code first.');
      return;
    }

    try {
      setLoadingGiftCard(true);
      const quote = summary || (await orderService.quote(buildPayload({ includeGiftCardCode: false }))).data.summary;
      const { data } = await giftCardService.apply({ code, amount: Number(quote?.payableAmount || 0) });
      setAppliedGiftCard({
        code,
        usedAmount: Number(data.usedAmount || 0),
        remainingPayable: Number(data.remainingPayable || 0),
      });
    } catch (error) {
      setAppliedGiftCard(null);
      Alert.alert('Gift card failed', error?.message || 'Unable to apply gift card.');
    } finally {
      setLoadingGiftCard(false);
    }
  };

  const placeOrder = async () => {
    try {
      setPlacingOrder(true);
      const { data } = await orderService.createOrder(buildPayload());
      clearCart();
      setSummary(null);
      setAppliedGiftCard(null);
      Alert.alert('Order placed', 'Your order was submitted successfully.', [
        {
          text: 'View orders',
          onPress: () =>
            navigation.navigate('Tabs', {
              screen: user?.role === 'customer' ? 'Orders' : 'OrdersAdmin',
            }),
        },
      ]);
      return data;
    } catch (error) {
      Alert.alert('Order failed', error?.message || 'Please try again.');
      return null;
    } finally {
      setPlacingOrder(false);
    }
  };

  const totalBeforeGiftCard = summary?.payableAmount ?? subtotal + (summary?.deliveryFee || 0) - (summary?.promoDiscount || 0);
  const totalAfterGiftCard = Math.max(totalBeforeGiftCard - (appliedGiftCard?.usedAmount || 0), 0);

  return (
    <Screen scroll>
      <SectionHeader title="Checkout" subtitle="Add delivery details and confirm the order." />
      <View style={{ gap: spacing.md }}>
        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            Shipping
          </AppText>
          <AppInput label="Full name" value={form.fullName} onChangeText={(value) => setForm((prev) => ({ ...prev, fullName: value }))} />
          <AppInput label="Phone" value={form.phone} onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))} style={{ marginTop: spacing.md }} />
          <AppInput
            label="Address line 1"
            value={form.addressLine1}
            onChangeText={(value) => setForm((prev) => ({ ...prev, addressLine1: value }))}
            style={{ marginTop: spacing.md }}
          />
          <AppInput label="Address line 2" value={form.addressLine2} onChangeText={(value) => setForm((prev) => ({ ...prev, addressLine2: value }))} style={{ marginTop: spacing.md }} />
          <AppInput label="City" value={form.city} onChangeText={(value) => setForm((prev) => ({ ...prev, city: value }))} style={{ marginTop: spacing.md }} />
          <AppPicker
            label="District"
            value={form.state}
            onValueChange={(value) => setForm((prev) => ({ ...prev, state: value }))}
            items={[
              { label: 'Select district', value: '' },
              { label: 'Colombo', value: 'Colombo' },
              { label: 'Gampaha', value: 'Gampaha' },
              { label: 'Kalutara', value: 'Kalutara' },
              { label: 'Kandy', value: 'Kandy' },
              { label: 'Galle', value: 'Galle' },
              { label: 'Jaffna', value: 'Jaffna' },
              { label: 'Badulla', value: 'Badulla' },
              { label: 'Kurunegala', value: 'Kurunegala' },
            ]}
            style={{ marginTop: spacing.md }}
          />
          <AppInput label="Postal code" value={form.postalCode} onChangeText={(value) => setForm((prev) => ({ ...prev, postalCode: value }))} style={{ marginTop: spacing.md }} />
        </AppCard>

        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            Payments
          </AppText>
          <AppPicker
            label="Payment method"
            value={form.paymentMethod}
            onValueChange={(value) => setForm((prev) => ({ ...prev, paymentMethod: value }))}
            items={[{ label: 'Cash on Delivery', value: 'cod' }, { label: '3-Month Installment', value: 'installment' }, { label: 'Gift Card', value: 'gift_card' }]}
          />
          <AppInput label="Promo code" value={form.promoCode} onChangeText={(value) => setForm((prev) => ({ ...prev, promoCode: value }))} style={{ marginTop: spacing.md }} />
          <AppInput label="Gift card code" value={form.giftCardCode} onChangeText={(value) => setForm((prev) => ({ ...prev, giftCardCode: value }))} style={{ marginTop: spacing.md }} />
          <View style={styles.actionGrid}>
            <AppButton title={loadingGiftCard ? 'Applying...' : 'Apply Gift Card'} variant="ghost" onPress={applyGiftCard} />
            <AppButton title={loadingQuote ? 'Calculating...' : 'Calculate Summary'} variant="ghost" onPress={calculateSummary} />
          </View>
          {form.paymentMethod === 'installment' ? <AppText tone="accent" style={{ marginTop: spacing.md }}>Installment orders collect the first payment now and the rest later.</AppText> : null}
        </AppCard>

        <AppCard>
          <AppText variant="subtitle" style={styles.cardHeading}>
            Order Summary
          </AppText>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{currency(summary?.subtotal ?? subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={styles.summaryValue}>{currency(summary?.deliveryFee ?? 0)}</Text>
          </View>
          {summary?.promoDiscount ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Promo discount</Text>
              <Text style={styles.summaryValue}>- {currency(summary.promoDiscount)}</Text>
            </View>
          ) : null}
          {appliedGiftCard ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gift card</Text>
              <Text style={styles.summaryValue}>- {currency(appliedGiftCard.usedAmount)}</Text>
            </View>
          ) : null}
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{currency(totalAfterGiftCard)}</Text>
          </View>
        </AppCard>

        <AppButton title={placingOrder ? 'Placing order...' : 'Place Order'} onPress={placeOrder} loading={placingOrder} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: 0,
    marginTop: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroHeaderRow: {
    gap: spacing.lg,
  },
  heroTextBlock: {
    gap: 2,
  },
  heroTitle: {
    marginTop: spacing.md,
  },
  heroCopy: {
    marginTop: spacing.md,
    lineHeight: 23,
  },
  heroActions: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  heroMediaWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  heroMedia: {
    minHeight: 240,
    justifyContent: 'flex-end',
  },
  heroMediaImage: {
    borderRadius: radius.lg,
  },
  heroMediaOverlay: {
    padding: spacing.lg,
    backgroundColor: 'rgba(2,6,23,0.34)',
    gap: spacing.sm,
  },
  heroMediaTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  heroMediaText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    lineHeight: 19,
  },
  heroMiniStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  heroMiniStat: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroMiniValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  heroMiniLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: 0,
    marginTop: spacing.lg,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 8,
    padding: spacing.md,
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionGap: {
    paddingHorizontal: 0,
    marginTop: spacing.lg,
  },
  infoGrid: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  infoCard: {
    gap: 8,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoStep: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  chipRow: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  categoryChip: {
    marginRight: spacing.sm,
  },
  carouselContent: {
    paddingVertical: spacing.md,
  },
  featuredCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  pressedCard: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
  featuredImage: {
    height: 200,
    justifyContent: 'space-between',
  },
  featuredImageStyle: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  featuredOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: 'rgba(2,6,23,0.2)',
  },
  featuredPrice: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    backgroundColor: 'rgba(15,23,42,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  featuredBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  featuredTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  featuredDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  featuredMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featuredMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyFeaturedCard: {
    padding: spacing.lg,
  },
  storyRow: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  storyCard: {
    width: 280,
    gap: spacing.sm,
  },
  storyQuote: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  storyFooter: {
    marginTop: spacing.xs,
  },
  storyIdentity: {
    gap: 4,
  },
  storyBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  storyName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  storyRole: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  productsRow: {
    gap: spacing.md,
  },
  productGridItem: {
    flex: 1,
    marginBottom: spacing.md,
  },
  productsHeader: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  productsHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  productsHeaderIcon: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(88,213,255,0.10)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  productsHeaderTitle: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  productsHeaderSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  homeContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  detailContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  detailStack: {
    gap: spacing.sm,
    marginTop: 0,
  },
  previewCard: {
    padding: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  cardHeading: {
    marginBottom: spacing.sm,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(88,213,255,0.12)',
  },
  pillText: {
    color: colors.text,
    fontWeight: '700',
  },
  colorDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  colorDotActive: {
    borderColor: colors.accent,
  },
  colorSwatch: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  colorText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  quantityLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  quantityStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  quantityValue: {
    minWidth: 22,
    textAlign: 'center',
    color: colors.text,
    fontWeight: '800',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  artworkModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  artworkModalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  artworkModalTitle: {
    textAlign: 'center',
  },
  artworkModalText: {
    textAlign: 'center',
  },
  artworkPreviewFrame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    aspectRatio: 1,
  },
  artworkPreviewImage: {
    width: '100%',
    height: '100%',
  },
  artworkModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  suggestionSection: {
    marginTop: spacing.md,
  },
  suggestionList: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  suggestionEmpty: {
    width: 300,
    padding: spacing.lg,
  },
  suggestCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestImage: {
    height: 118,
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceSoft,
  },
  suggestImageStyle: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  suggestOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(2,6,23,0.35)',
  },
  suggestPrice: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 13,
  },
  suggestBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  suggestTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  suggestText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cartContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  cartTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  cartMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  emptyCartCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyCartTitle: {
    textAlign: 'center',
  },
  emptyCartText: {
    textAlign: 'center',
  },
  removeText: {
    color: colors.danger,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.md,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  summaryValue: {
    color: colors.text,
    fontWeight: '800',
  },
  ctaBanner: {
    gap: spacing.sm,
  },
  ctaTitle: {
    fontSize: 17,
  },
  ctaText: {
    fontSize: 13,
    lineHeight: 19,
  },
});

