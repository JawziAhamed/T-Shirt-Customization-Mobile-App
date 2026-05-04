import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  PanResponder,
  PixelRatio,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { GLView } from 'expo-gl';
import { LinearGradient } from 'expo-linear-gradient';
import { Renderer, TextureLoader } from 'expo-three';
import * as THREE from 'three';

import { colors, radius, spacing } from '../../theme';
import { resolveProductImageUrl } from '../../utils/image';
import { AppBadge, AppText } from '../ui/Atoms';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const disposeTexture = (texture) => {
  if (texture && typeof texture.dispose === 'function') {
    texture.dispose();
  }
};

const normalizeUri = async (source, cacheRef, prefix) => {
  if (!source || typeof source !== 'string') return '';

  const trimmed = source.trim();
  if (!trimmed) return '';

  if (!trimmed.startsWith('data:')) {
    return trimmed;
  }

  const cached = cacheRef.current.get(trimmed);
  if (cached) return cached;

  const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  if (!match) return trimmed;

  const extension = match[1].split('/')[1].replace('jpeg', 'jpg');
  const fileUri = `${FileSystem.cacheDirectory}${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;

  await FileSystem.writeAsStringAsync(fileUri, match[2], {
    encoding: FileSystem.EncodingType.Base64,
  });
  cacheRef.current.set(trimmed, fileUri);
  return fileUri;
};

const buildShirtGeometry = () => {
  const shape = new THREE.Shape();

  shape.moveTo(-0.46, 0.64);
  shape.lineTo(-0.63, 0.30);
  shape.lineTo(-0.48, 0.16);
  shape.lineTo(-0.31, 0.34);
  shape.lineTo(-0.29, -0.74);
  shape.lineTo(0.29, -0.74);
  shape.lineTo(0.31, 0.34);
  shape.lineTo(0.48, 0.16);
  shape.lineTo(0.63, 0.30);
  shape.lineTo(0.46, 0.64);
  shape.lineTo(0.18, 0.55);
  shape.lineTo(0.10, 0.40);
  shape.lineTo(-0.10, 0.40);
  shape.lineTo(-0.18, 0.55);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
    steps: 1,
  });

  geometry.center();
  return geometry;
};

const NativeShirtPreview = forwardRef(function NativeShirtPreview(
  {
    shirtColor = '#ffffff',
    baseImage = '',
    imageUri = '',
    logoDecal = '',
    fullDecal = '',
    customArtworkUrl = '',
    note,
    compact = false,
  },
  ref
) {
  const { width } = useWindowDimensions();
  const glViewRef = useRef(null);
  const pagerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const shirtGroupRef = useRef(null);
  const shirtMeshRef = useRef(null);
  const logoPlaneRef = useRef(null);
  const fullPlaneRef = useRef(null);
  const logoTextureRef = useRef(null);
  const fullTextureRef = useRef(null);
  const animationRef = useRef(null);
  const mountedRef = useRef(true);
  const textureCacheRef = useRef(new Map());
  const targetRotationRef = useRef(0);
  const currentRotationRef = useRef(0);
  const dragDyRef = useRef(0);
  const hasCenteredPagerRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading 3D view');
  const [activeIndex, setActiveIndex] = useState(1);
  const [pagerWidth, setPagerWidth] = useState(0);

  const originalImageUri = useMemo(
    () => resolveProductImageUrl(baseImage || imageUri || ''),
    [baseImage, imageUri]
  );

  const previewHeight = useMemo(() => {
    const base = compact ? 320 : 400;
    const upper = compact ? 380 : 460;
    return clamp(Math.round(width * (compact ? 0.78 : 0.88)), base, upper);
  }, [compact, width]);

  const viewportWidth = useMemo(
    () =>
      pagerWidth ||
      Math.max(260, Math.min(compact ? 340 : 380, width - spacing.lg * (compact ? 2.8 : 4))),
    [width, compact, pagerWidth]
  );

  const loadTexture = useCallback(async (source, prefix) => {
    const uri = await normalizeUri(source, textureCacheRef, prefix);
    if (!uri) return null;

    return new Promise((resolve, reject) => {
      const loader = new TextureLoader();
      loader.load(
        uri,
        (texture) => {
          texture.flipY = false;
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }, []);

  const applyTexture = useCallback((mesh, texture, scale = 1) => {
    if (!mesh) return;

    if (texture) {
      mesh.visible = true;
      mesh.material.map = texture;
      mesh.material.color.set('#ffffff');
      mesh.material.needsUpdate = true;
      mesh.scale.set(scale, scale, 1);
    } else {
      mesh.visible = false;
      mesh.material.map = null;
      mesh.material.needsUpdate = true;
    }
  }, []);

  const syncTextureState = useCallback(async () => {
    if (!mountedRef.current) return;
    if (!shirtMeshRef.current || !sceneRef.current) return;

    setStatus('Preparing design');
    try {
      const nextFullTexture = await loadTexture(fullDecal || '', 'full');
      const nextLogoTexture = await loadTexture(logoDecal || customArtworkUrl || '', 'logo');

      if (!mountedRef.current) {
        disposeTexture(nextFullTexture);
        disposeTexture(nextLogoTexture);
        return;
      }

      if (fullTextureRef.current && fullTextureRef.current !== nextFullTexture) {
        disposeTexture(fullTextureRef.current);
      }
      if (logoTextureRef.current && logoTextureRef.current !== nextLogoTexture) {
        disposeTexture(logoTextureRef.current);
      }

      fullTextureRef.current = nextFullTexture;
      logoTextureRef.current = nextLogoTexture;

      const shirtMaterial = shirtMeshRef.current.material;
      shirtMaterial.color.set(nextFullTexture ? '#ffffff' : shirtColor || '#ffffff');
      shirtMaterial.needsUpdate = true;

      applyTexture(fullPlaneRef.current, nextFullTexture, compact ? 1.12 : 1.22);
      applyTexture(logoPlaneRef.current, nextLogoTexture, compact ? 0.48 : 0.55);

      setReady(true);
      setStatus('Ready');
    } catch {
      if (fullTextureRef.current) {
        disposeTexture(fullTextureRef.current);
      }
      if (logoTextureRef.current) {
        disposeTexture(logoTextureRef.current);
      }
      fullTextureRef.current = null;
      logoTextureRef.current = null;

      const shirtMaterial = shirtMeshRef.current.material;
      shirtMaterial.color.set(shirtColor || '#ffffff');
      shirtMaterial.needsUpdate = true;

      applyTexture(fullPlaneRef.current, null);
      applyTexture(logoPlaneRef.current, null);

      setReady(true);
      setStatus('Ready');
    }
  }, [applyTexture, compact, customArtworkUrl, fullDecal, loadTexture, logoDecal, shirtColor]);

  const captureSnapshot = useCallback(async () => {
    try {
      const snapshot = await glViewRef.current?.takeSnapshotAsync?.({ format: 'png', flip: true });
      return snapshot?.uri || '';
    } catch {
      return '';
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      captureSnapshot,
    }),
    [captureSnapshot]
  );

  useEffect(() => {
    if (!pagerRef.current || !viewportWidth) return;

    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo?.({ x: viewportWidth, y: 0, animated: false });
      hasCenteredPagerRef.current = true;
      setActiveIndex(1);
    });
  }, [viewportWidth]);

  const startAnimation = useCallback((gl) => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    const animate = () => {
      if (!mountedRef.current) return;

      currentRotationRef.current += (targetRotationRef.current - currentRotationRef.current) * 0.08;
      if (shirtGroupRef.current) {
        shirtGroupRef.current.rotation.y = currentRotationRef.current;
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, []);

  const handleContextCreate = useCallback(
    async (gl) => {
      try {
        setStatus('Loading 3D view');

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#07111f');
        scene.fog = new THREE.Fog('#07111f', 3.4, 10.5);

        const camera = new THREE.PerspectiveCamera(
          24,
          gl.drawingBufferWidth / gl.drawingBufferHeight,
          0.1,
          100
        );
        camera.position.set(0.02, 0.08, 5.5);
        camera.lookAt(-0.08, 0.02, 0);

        const renderer = new Renderer({ gl });
        renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
        renderer.setPixelRatio(Math.min(PixelRatio.get(), 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor('#07111f', 1);

        scene.add(new THREE.AmbientLight('#f3f7ff', 1.35));

        const hemi = new THREE.HemisphereLight('#8ed9ff', '#0b1020', 1.05);
        hemi.position.set(0, 2.2, 0);
        scene.add(hemi);

        const keyLight = new THREE.DirectionalLight('#ffffff', 2.4);
        keyLight.position.set(1.8, 2.6, 2.2);
        keyLight.castShadow = true;
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight('#6bc5ff', 0.9);
        rimLight.position.set(-2, 1.2, -1.6);
        scene.add(rimLight);

        const shirtGroup = new THREE.Group();
        const shirtGeometry = buildShirtGeometry();
        const shirtMaterial = new THREE.MeshStandardMaterial({
          color: shirtColor || '#ffffff',
          roughness: 0.92,
          metalness: 0.04,
        });

        const shirtMesh = new THREE.Mesh(shirtGeometry, shirtMaterial);
        shirtMesh.castShadow = true;
        shirtMesh.receiveShadow = true;
        shirtGroup.add(shirtMesh);

        const frontPlaneGeometry = new THREE.PlaneGeometry(0.72, 0.88);
        const logoPlane = new THREE.Mesh(
          frontPlaneGeometry,
          new THREE.MeshStandardMaterial({
            color: '#ffffff',
            transparent: true,
            opacity: 0,
            depthWrite: false,
            roughness: 1,
            metalness: 0,
          })
        );
        logoPlane.position.set(0, 0.06, 0.09);
        shirtGroup.add(logoPlane);

        const fullPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(0.9, 1.15),
          new THREE.MeshStandardMaterial({
            color: '#ffffff',
            transparent: true,
            opacity: 0,
            depthWrite: false,
            roughness: 1,
            metalness: 0,
          })
        );
        fullPlane.position.set(0, 0.04, 0.1);
        shirtGroup.add(fullPlane);

        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(0.72, 48),
          new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22 })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(0, -0.88, -0.08);
        shirtGroup.add(shadow);

        shirtGroup.rotation.x = -0.04;
        shirtGroup.rotation.y = 0;
        shirtGroup.scale.setScalar(compact ? 0.64 : 0.72);
        shirtGroup.position.x = -0.75;
        shirtGroup.position.y = -0.48;

        scene.add(shirtGroup);

        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;
        shirtGroupRef.current = shirtGroup;
        shirtMeshRef.current = shirtMesh;
        logoPlaneRef.current = logoPlane;
        fullPlaneRef.current = fullPlane;

        setReady(false);
        await syncTextureState();
        startAnimation(gl);
      } catch {
        setStatus('Unable to load 3D view');
      }
    },
    [compact, shirtColor, startAnimation, syncTextureState]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      disposeTexture(logoTextureRef.current);
      disposeTexture(fullTextureRef.current);
      logoTextureRef.current = null;
      fullTextureRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !shirtMeshRef.current) return;

    const shirtMaterial = shirtMeshRef.current.material;
    if (!fullTextureRef.current) {
      shirtMaterial.color.set(shirtColor || '#ffffff');
      shirtMaterial.needsUpdate = true;
    }
  }, [shirtColor]);

  useEffect(() => {
    if (!sceneRef.current || !shirtMeshRef.current) return;
    syncTextureState();
  }, [customArtworkUrl, fullDecal, logoDecal, shirtColor, syncTextureState]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const absDx = Math.abs(gestureState.dx);
          const absDy = Math.abs(gestureState.dy);
          return absDy > 4 && absDy > absDx;
        },
        onPanResponderGrant: () => {
          dragDyRef.current = 0;
        },
        onPanResponderMove: (_, gestureState) => {
          const delta = gestureState.dy - dragDyRef.current;
          dragDyRef.current = gestureState.dy;
          targetRotationRef.current += delta * 0.01;
        },
        onPanResponderRelease: () => {
          dragDyRef.current = 0;
        },
        onPanResponderTerminate: () => {
          dragDyRef.current = 0;
        },
      }),
    []
  );

  const renderOriginalPage = () => (
    <View style={[styles.page, { width: viewportWidth, height: previewHeight }]}>
      <View style={styles.pageSurface}>
        {originalImageUri ? (
          <Image source={{ uri: originalImageUri }} style={styles.baseImage} resizeMode="contain" />
        ) : (
          <View style={styles.basePlaceholder}>
            <Text style={styles.placeholderTitle}>Original image unavailable</Text>
            <Text style={styles.placeholderText}>
              Add a product image so the original tee view can appear here.
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderCustomPage = () => (
    <View style={[styles.page, { width: viewportWidth, height: previewHeight }]}>
      <View style={styles.pageSurface} {...panResponder.panHandlers}>
        <GLView
          ref={glViewRef}
          style={StyleSheet.absoluteFill}
          onContextCreate={handleContextCreate}
        />

        {!ready || status !== 'Ready' ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>{status}</Text>
          </View>
        ) : null}

        <View pointerEvents="none" style={styles.glow} />
      </View>
    </View>
  );

  const helperText =
    activeIndex === 1
      ? 'Swipe left or right to compare the original tee'
      : 'Swipe back to the center for the 3D view';

  return (
    <View style={styles.outer}>
      <LinearGradient
        colors={['#0b1425', '#101f37', '#0d182a']}
        style={[styles.frame, compact && styles.frameCompact]}
      >
        <View style={styles.topRow}>
          <AppBadge label="3D Preview" tone="info" />
          <Text style={styles.dragHint}>
            {activeIndex === 1 ? 'Swipe to compare' : 'Swipe back to 3D'}
          </Text>
        </View>

        <View style={[styles.canvasWrap, { height: previewHeight }]}>
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            decelerationRate="fast"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            snapToInterval={viewportWidth}
            style={styles.pagerScroll}
            contentContainerStyle={[styles.pagerContent, { width: viewportWidth * 3 }]}
            onLayout={(event) => {
              const nextWidth = Math.round(event.nativeEvent.layout.width);
              if (nextWidth && nextWidth !== pagerWidth) {
                setPagerWidth(nextWidth);
              }
            }}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / viewportWidth);
              setActiveIndex(clamp(nextIndex, 0, 2));
            }}
          >
            {renderOriginalPage()}
            {renderCustomPage()}
            {renderOriginalPage()}
          </ScrollView>
        </View>

        <View style={styles.footer}>
          <AppText variant="caption" tone="accent" style={styles.caption}>
            {activeIndex === 1 ? 'Live customization preview' : 'Original T-shirt view'}
          </AppText>
          <AppText tone="muted" style={styles.helper}>
            {helperText}
          </AppText>
          {note ? (
            <AppText tone="muted" style={styles.note}>
              {note}
            </AppText>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    width: '100%',
  },
  frame: {
    width: '100%',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: colors.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 5,
  },
  frameCompact: {
    padding: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dragHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  canvasWrap: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#09111f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  canvasInner: {
    flex: 1,
    backgroundColor: '#09111f',
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
  pageSurface: {
    width: '100%',
    height: '100%',
    backgroundColor: '#09111f',
  },
  baseImage: {
    width: '100%',
    height: '100%',
  },
  basePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: 6,
  },
  placeholderTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(7,17,31,0.28)',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(88,213,255,0.04)',
  },
  footer: {
    paddingTop: spacing.sm,
    gap: 4,
  },
  caption: {
    letterSpacing: 0.6,
  },
  helper: {
    fontSize: 12,
    lineHeight: 18,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
  },
});

NativeShirtPreview.displayName = 'NativeShirtPreview';

export default NativeShirtPreview;
