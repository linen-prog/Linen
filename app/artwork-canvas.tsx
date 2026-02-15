
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Alert, ScrollView, Modal, Dimensions, ActivityIndicator, Platform, PanResponder, Animated as RNAnimated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { authenticatedPost } from '@/utils/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Image as SvgImage, Circle, Rect, Defs, LinearGradient, Stop, Pattern } from 'react-native-svg';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import Slider from '@react-native-community/slider';
import { IconSymbol } from '@/components/IconSymbol';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
  runOnJS
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';

type BrushType = 'pencil' | 'marker' | 'pen' | 'watercolor' | 'spray' | 'chalk' | 'ink' | 'charcoal' | 'oil' | 'pastel' | 'crayon' | 'glitter';

type BackgroundPattern = 'none' | 'dots' | 'lines' | 'grid' | 'watercolor' | 'gradient';

interface BrushOption {
  id: BrushType;
  label: string;
  icon: string;
  materialIcon: string;
  isPremium: boolean;
}

interface DrawingStroke {
  points: { x: number; y: number }[];
  color: string;
  brushType: BrushType;
  brushSize: number;
  isEraser?: boolean;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  delay: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Achievement {
  id: string;
  title: string;
  message: string;
  icon: string;
  materialIcon: string;
  threshold: number;
}

interface Sticker {
  id: string;
  icon: string;
  materialIcon: string;
  label: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
}

interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: string[];
  icon: string;
  materialIcon: string;
}

const BRUSH_OPTIONS: BrushOption[] = [
  { id: 'pencil', label: 'Pencil', icon: 'pencil', materialIcon: 'edit', isPremium: false },
  { id: 'marker', label: 'Marker', icon: 'highlighter', materialIcon: 'create', isPremium: false },
  { id: 'pen', label: 'Pen', icon: 'pencil.tip', materialIcon: 'edit', isPremium: false },
  { id: 'watercolor', label: 'Watercolor', icon: 'paintbrush', materialIcon: 'brush', isPremium: false },
  { id: 'spray', label: 'Spray', icon: 'spray', materialIcon: 'brush', isPremium: false },
  { id: 'chalk', label: 'Chalk', icon: 'pencil.circle', materialIcon: 'edit', isPremium: false },
  { id: 'ink', label: 'Ink', icon: 'paintbrush.pointed', materialIcon: 'brush', isPremium: false },
  { id: 'charcoal', label: 'Charcoal', icon: 'scribble', materialIcon: 'brush', isPremium: true },
  { id: 'oil', label: 'Oil', icon: 'paintpalette', materialIcon: 'palette', isPremium: true },
  { id: 'pastel', label: 'Pastel', icon: 'paintbrush.fill', materialIcon: 'brush', isPremium: true },
  { id: 'crayon', label: 'Crayon', icon: 'pencil.and.outline', materialIcon: 'edit', isPremium: true },
  { id: 'glitter', label: 'Glitter', icon: 'sparkles', materialIcon: 'auto-awesome', isPremium: true },
];

const FREE_COLORS = [
  '#000000', '#FFFFFF', '#808080', '#8B4513', '#FF0000', '#FF8C00', '#FFD700', '#008000',
  '#0000FF', '#800080', '#FFC0CB', '#F5F5DC', '#006400', '#000080', '#800000', '#D2B48C',
];

const PREMIUM_COLORS = [
  '#000000', '#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6', '#F5F5F5', '#FFFFFF',
  '#8B0000', '#DC143C', '#FF0000', '#FF4500', '#FF6347', '#FF8C00', '#FFA500', '#FFD700', '#FFFF00', '#F0E68C', '#8B4513', '#D2691E',
  '#006400', '#008000', '#228B22', '#32CD32', '#90EE90', '#000080', '#0000FF', '#4169E1', '#87CEEB', '#4B0082', '#800080', '#9370DB',
  '#FFB6C1', '#FFC0CB', '#FFE4E1', '#FFDAB9', '#F0E68C', '#E0FFFF', '#B0E0E6', '#DDA0DD', '#EE82EE', '#F5DEB3', '#D2B48C', '#BC8F8F',
];

const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'peace',
    name: 'Peace',
    description: 'Calm blues and soft greens',
    colors: ['#87CEEB', '#B0E0E6', '#98D8C8', '#E0F2F1', '#FFFFFF'],
    icon: 'leaf',
    materialIcon: 'eco',
  },
  {
    id: 'hope',
    name: 'Hope',
    description: 'Warm sunrise colors',
    colors: ['#FFD700', '#FFA500', '#FF8C00', '#FFE4B5', '#FFF8DC'],
    icon: 'sunrise',
    materialIcon: 'wb-sunny',
  },
  {
    id: 'love',
    name: 'Love',
    description: 'Gentle pinks and reds',
    colors: ['#FFB6C1', '#FFC0CB', '#FF69B4', '#FFE4E1', '#FFF0F5'],
    icon: 'heart.fill',
    materialIcon: 'favorite',
  },
  {
    id: 'faith',
    name: 'Faith',
    description: 'Deep purples and golds',
    colors: ['#800080', '#9370DB', '#DDA0DD', '#FFD700', '#F0E68C'],
    icon: 'star.fill',
    materialIcon: 'star',
  },
  {
    id: 'joy',
    name: 'Joy',
    description: 'Bright and cheerful',
    colors: ['#FFFF00', '#FFD700', '#FFA500', '#FF69B4', '#87CEEB'],
    icon: 'sun.max.fill',
    materialIcon: 'wb-sunny',
  },
  {
    id: 'grace',
    name: 'Grace',
    description: 'Soft pastels',
    colors: ['#E6E6FA', '#FFE4E1', '#F0FFF0', '#FFF8DC', '#F5F5DC'],
    icon: 'sparkles',
    materialIcon: 'auto-awesome',
  },
  {
    id: 'earth',
    name: 'Earth',
    description: 'Natural browns and greens',
    colors: ['#8B4513', '#D2691E', '#228B22', '#556B2F', '#F5DEB3'],
    icon: 'globe',
    materialIcon: 'public',
  },
];

const STICKER_OPTIONS = [
  { id: 'cross', icon: 'plus', materialIcon: 'add', label: 'Cross' },
  { id: 'heart', icon: 'heart.fill', materialIcon: 'favorite', label: 'Heart' },
  { id: 'star', icon: 'star.fill', materialIcon: 'star', label: 'Star' },
  { id: 'circle', icon: 'circle.fill', materialIcon: 'circle', label: 'Circle' },
  { id: 'flower', icon: 'leaf.fill', materialIcon: 'local-florist', label: 'Flower' },
  { id: 'sun', icon: 'sun.max.fill', materialIcon: 'wb-sunny', label: 'Sun' },
  { id: 'moon', icon: 'moon.fill', materialIcon: 'brightness-3', label: 'Moon' },
  { id: 'dove', icon: 'bird', materialIcon: 'flight', label: 'Dove' },
];

const ENCOURAGING_MESSAGES = [
  "Beautiful start! ✨",
  "Your creativity is flowing! 🎨",
  "Keep going, this is lovely! 💫",
  "What a wonderful expression! 🌟",
  "Your art is taking shape! 🎭",
  "So much beauty here! 🌸",
  "This is coming alive! 🦋",
  "Your heart is showing through! 💝",
  "Gorgeous work! Keep creating! 🌈",
  "You're doing amazing! ⭐",
  "Every stroke tells a story! 📖",
  "Your spirit shines through! ✨",
  "What a gift you're creating! 🎁",
  "This is truly special! 💎",
  "Keep expressing yourself! 🌺",
];

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_stroke', title: 'First Stroke!', message: 'Your creative journey begins! 🎨', icon: 'paintbrush', materialIcon: 'brush', threshold: 1 },
  { id: 'getting_started', title: 'Getting Started!', message: 'You\'re finding your rhythm! 🌟', icon: 'hand.draw', materialIcon: 'gesture', threshold: 10 },
  { id: 'creative_flow', title: 'Creative Flow!', message: 'You\'re in the zone! 💫', icon: 'sparkles', materialIcon: 'auto-awesome', threshold: 25 },
  { id: 'artistic_soul', title: 'Artistic Soul!', message: 'Your creativity is boundless! 🎭', icon: 'heart.fill', materialIcon: 'favorite', threshold: 50 },
  { id: 'master_creator', title: 'Master Creator!', message: 'What a masterpiece! 👑', icon: 'star.fill', materialIcon: 'star', threshold: 100 },
];

const DRAWING_PROMPTS = [
  "Draw something that brings you peace 🕊️",
  "Express a feeling without words 💭",
  "Create something that makes you smile 😊",
  "Draw your happy place 🌈",
  "Capture a moment of gratitude 🙏",
  "Illustrate hope 🌟",
  "Draw what love looks like to you 💝",
  "Express joy through color 🎨",
];

// Interactive Sticker Component
function InteractiveSticker({ 
  sticker, 
  isSelected, 
  onSelect, 
  onUpdate, 
  onDelete 
}: { 
  sticker: Sticker; 
  isSelected: boolean; 
  onSelect: () => void;
  onUpdate: (updates: Partial<Sticker>) => void;
  onDelete: () => void;
}) {
  const translateX = useSharedValue(sticker.x);
  const translateY = useSharedValue(sticker.y);
  const scale = useSharedValue(sticker.size / 48);
  const rotation = useSharedValue(sticker.rotation);
  const savedTranslateX = useSharedValue(sticker.x);
  const savedTranslateY = useSharedValue(sticker.y);
  const savedScale = useSharedValue(sticker.size / 48);
  const savedRotation = useSharedValue(sticker.rotation);

  // Pan gesture for moving
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      runOnJS(onUpdate)({
        x: translateX.value,
        y: translateY.value,
      });
    });

  // Pinch gesture for scaling
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(0.5, Math.min(3, savedScale.value * event.scale));
    })
    .onEnd(() => {
      runOnJS(onUpdate)({
        size: scale.value * 48,
      });
    });

  // Rotation gesture
  const rotationGesture = Gesture.Rotation()
    .onStart(() => {
      savedRotation.value = rotation.value;
    })
    .onUpdate((event) => {
      rotation.value = savedRotation.value + (event.rotation * 180) / Math.PI;
    })
    .onEnd(() => {
      runOnJS(onUpdate)({
        rotation: rotation.value,
      });
    });

  // Combine all gestures
  const composedGesture = Gesture.Simultaneous(
    panGesture,
    Gesture.Simultaneous(pinchGesture, rotationGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - 24 },
      { translateY: translateY.value - 24 },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.interactiveSticker,
          animatedStyle,
          isSelected && styles.interactiveStickerSelected,
        ]}
      >
        <TouchableOpacity
          onPress={onSelect}
          onLongPress={onDelete}
          activeOpacity={0.8}
          style={styles.stickerTouchable}
        >
          <IconSymbol 
            ios_icon_name={sticker.icon}
            android_material_icon_name={sticker.materialIcon}
            size={48}
            color={sticker.color}
          />
        </TouchableOpacity>
        {isSelected && (
          <View style={styles.stickerSelectionBorder} />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export default function ArtworkCanvasScreen() {
  console.log('User viewing Artwork Canvas screen');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [selectedBrush, setSelectedBrush] = useState<BrushType>('pencil');
  const [brushSize, setBrushSize] = useState(5);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const [undoneStrokes, setUndoneStrokes] = useState<DrawingStroke[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundPattern, setBackgroundPattern] = useState<BackgroundPattern>('none');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBrushPicker, setShowBrushPicker] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPaletteModal, setShowPaletteModal] = useState(false);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [showPatternModal, setShowPatternModal] = useState(false);
  const [showShareSuccessModal, setShowShareSuccessModal] = useState(false);
  const [shareAnonymous, setShareAnonymous] = useState(false);
  const [shareCategory, setShareCategory] = useState<'feed' | 'wisdom' | 'care' | 'prayers'>('feed');
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [photoPosition, setPhotoPosition] = useState({ x: 0, y: 0 });
  const [photoScale, setPhotoScale] = useState(1);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [showPostSaveModal, setShowPostSaveModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [encouragementMessage, setEncouragementMessage] = useState('');
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showAchievement, setShowAchievement] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [showPrompt, setShowPrompt] = useState(true);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);

  const canvasRef = useRef<View>(null);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);
  const hasLoadedRef = useRef(false);
  const photoPositionRef = useRef({ x: 0, y: 0 });
  const initialPhotoTouchRef = useRef({ x: 0, y: 0 });
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEncouragementRef = useRef(0);
  const particleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const selectedColorRef = useRef(selectedColor);
  const brushSizeRef = useRef(brushSize);
  const selectedBrushRef = useRef(selectedBrush);

  // Animated values for fun effects
  const brushPreviewScale = useSharedValue(1);
  const brushPreviewRotation = useSharedValue(0);
  const colorPickerScale = useSharedValue(1);
  const celebrationScale = useSharedValue(0);
  const celebrationOpacity = useSharedValue(0);
  const achievementScale = useSharedValue(0);
  const achievementOpacity = useSharedValue(0);
  const promptOpacity = useSharedValue(1);
  const cursorScale = useSharedValue(0);
  const paletteButtonScale = useSharedValue(1);

  // Select random prompt on mount
  useEffect(() => {
    const randomPrompt = DRAWING_PROMPTS[Math.floor(Math.random() * DRAWING_PROMPTS.length)];
    setCurrentPrompt(randomPrompt);
    
    // Auto-hide prompt after 8 seconds
    const timer = setTimeout(() => {
      promptOpacity.value = withTiming(0, { duration: 500 });
      setTimeout(() => setShowPrompt(false), 500);
    }, 8000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    selectedColorRef.current = selectedColor;
    console.log('[Canvas] Color updated to:', selectedColor);
    
    // Animate color change with bounce
    colorPickerScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 150 })
    );
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [selectedColor]);

  useEffect(() => {
    brushSizeRef.current = brushSize;
    console.log('[Canvas] Brush size updated to:', brushSize);
  }, [brushSize]);

  useEffect(() => {
    selectedBrushRef.current = selectedBrush;
    console.log('[Canvas] Brush type updated to:', selectedBrush);
    
    // Animate brush change with rotation
    brushPreviewScale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 180 }),
      withSpring(1, { damping: 8, stiffness: 150 })
    );
    brushPreviewRotation.value = withSequence(
      withTiming(15, { duration: 100 }),
      withTiming(-15, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [selectedBrush]);

  // Pulse animation for brush preview
  useEffect(() => {
    brushPreviewScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  // Particle system for drawing effects
  useEffect(() => {
    if (particles.length > 0) {
      particleTimerRef.current = setInterval(() => {
        setParticles(prev => 
          prev
            .map(p => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              life: p.life - 0.02,
              vy: p.vy + 0.1, // gravity
            }))
            .filter(p => p.life > 0)
        );
      }, 16);
    } else if (particleTimerRef.current) {
      clearInterval(particleTimerRef.current);
      particleTimerRef.current = null;
    }
    
    return () => {
      if (particleTimerRef.current) {
        clearInterval(particleTimerRef.current);
      }
    };
  }, [particles.length > 0]);

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }
    
    const loadExistingArtwork = async () => {
      try {
        console.log('[Canvas] Loading existing artwork...');
        const { authenticatedGet } = await import('@/utils/api');
        const response = await authenticatedGet<{ artworkData: string; backgroundImage?: string } | null>('/api/artwork/current');
        
        if (response) {
          console.log('[Canvas] Existing artwork loaded:', response);
          if (response.backgroundImage) {
            console.log('[Canvas] Setting background image:', response.backgroundImage);
            setBackgroundImage(response.backgroundImage);
          }
          try {
            const parsed = JSON.parse(response.artworkData);
            console.log('[Canvas] Parsed artwork data:', parsed);
            if (parsed.strokes && Array.isArray(parsed.strokes)) {
              console.log('[Canvas] Restoring', parsed.strokes.length, 'strokes');
              setStrokes(parsed.strokes);
              setStrokeCount(parsed.strokes.length);
            }
            if (parsed.brushType) {
              setSelectedBrush(parsed.brushType);
            }
            if (parsed.brushSize) {
              setBrushSize(parsed.brushSize);
            }
            if (parsed.color) {
              setSelectedColor(parsed.color);
            }
            if (parsed.photoPosition) {
              console.log('[Canvas] Restoring photo position:', parsed.photoPosition);
              setPhotoPosition(parsed.photoPosition);
              photoPositionRef.current = parsed.photoPosition;
            }
            if (parsed.photoScale) {
              console.log('[Canvas] Restoring photo scale:', parsed.photoScale);
              setPhotoScale(parsed.photoScale);
            }
            if (parsed.stickers && Array.isArray(parsed.stickers)) {
              console.log('[Canvas] Restoring stickers:', parsed.stickers);
              setStickers(parsed.stickers);
            }
            if (parsed.backgroundPattern) {
              console.log('[Canvas] Restoring background pattern:', parsed.backgroundPattern);
              setBackgroundPattern(parsed.backgroundPattern);
            }
          } catch (e) {
            console.error('[Canvas] Failed to parse artwork data:', e);
          }
        } else {
          console.log('[Canvas] No existing artwork found, starting fresh');
        }
        setIsLoading(false);
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('[Canvas] Failed to load existing artwork:', error);
        setIsLoading(false);
        hasLoadedRef.current = true;
      }
    };

    loadExistingArtwork();
  }, []);

  // Check for achievements - INCREASED DISPLAY TIME TO 6 SECONDS
  useEffect(() => {
    if (strokeCount > 0) {
      const achievement = ACHIEVEMENTS.find(
        a => a.threshold === strokeCount && !unlockedAchievements.has(a.id)
      );
      
      if (achievement) {
        console.log('[Canvas] Achievement unlocked:', achievement.title);
        setCurrentAchievement(achievement);
        setUnlockedAchievements(prev => new Set([...prev, achievement.id]));
        setShowAchievement(true);
        
        achievementScale.value = withSequence(
          withSpring(1, { damping: 8 }),
          withTiming(0, { duration: 300, delay: 6000 })
        );
        achievementOpacity.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0, { duration: 300, delay: 6000 })
        );
        
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        setTimeout(() => {
          setShowAchievement(false);
        }, 6300);
      }
    }
  }, [strokeCount]);

  // Show encouraging messages periodically - CHANGED TO EVERY 20 STROKES
  useEffect(() => {
    if (strokeCount > 0 && strokeCount % 20 === 0 && strokeCount !== lastEncouragementRef.current) {
      lastEncouragementRef.current = strokeCount;
      const randomMessage = ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];
      setEncouragementMessage(randomMessage);
      setShowEncouragement(true);
      
      // Haptic feedback for encouragement
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      setTimeout(() => {
        setShowEncouragement(false);
      }, 4000);
    }
  }, [strokeCount]);

  const createParticles = (x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    const particleCount = selectedBrushRef.current === 'glitter' ? 8 : 3;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 1 + Math.random() * 2;
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        color,
        size: brushSizeRef.current * 0.3,
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        console.log('[Canvas] onStartShouldSetPanResponder called');
        return !isEditingPhoto && selectedStickerId === null;
      },
      onMoveShouldSetPanResponder: () => !isEditingPhoto && selectedStickerId === null,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        console.log('[Canvas] Touch started at:', locationX, locationY);
        console.log('[Canvas] Using color:', selectedColorRef.current, 'size:', brushSizeRef.current, 'brush:', selectedBrushRef.current);
        
        // Show cursor
        setCursorPosition({ x: locationX, y: locationY });
        cursorScale.value = withSpring(1, { damping: 10 });
        
        // Haptic feedback on touch start
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        if (hasSaved) {
          setHasSaved(false);
        }
        
        const isEraser = selectedBrushRef.current === 'pencil' && selectedColorRef.current === '#FFFFFF';
        const newStroke: DrawingStroke = {
          points: [{ x: locationX, y: locationY }],
          color: selectedColorRef.current,
          brushType: selectedBrushRef.current,
          brushSize: brushSizeRef.current,
          isEraser: isEraser,
        };
        currentStrokeRef.current = newStroke;
        setCurrentStroke(newStroke);
        setUndoneStrokes([]);
        console.log('[Canvas] New stroke created:', { color: newStroke.color, size: newStroke.brushSize, type: newStroke.brushType });
        
        // Create initial particles
        if (selectedBrushRef.current === 'glitter' || selectedBrushRef.current === 'spray') {
          createParticles(locationX, locationY, selectedColorRef.current);
        }
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        
        // Update cursor position
        setCursorPosition({ x: locationX, y: locationY });
        
        if (currentStrokeRef.current) {
          const updatedStroke = {
            ...currentStrokeRef.current,
            points: [...currentStrokeRef.current.points, { x: locationX, y: locationY }],
          };
          currentStrokeRef.current = updatedStroke;
          setCurrentStroke(updatedStroke);
          
          // Create particles along the stroke
          if (updatedStroke.points.length % 3 === 0) {
            if (selectedBrushRef.current === 'glitter' || selectedBrushRef.current === 'spray') {
              createParticles(locationX, locationY, selectedColorRef.current);
            }
          }
          
          if (updatedStroke.points.length % 10 === 0) {
            console.log('[Canvas] Stroke now has', updatedStroke.points.length, 'points');
          }
        } else {
          console.log('[Canvas] WARNING: onPanResponderMove called but no current stroke!');
        }
      },
      onPanResponderRelease: () => {
        console.log('[Canvas] Touch ended, current stroke has', currentStrokeRef.current?.points.length || 0, 'points');
        
        // Hide cursor
        cursorScale.value = withTiming(0, { duration: 200 });
        setTimeout(() => setCursorPosition(null), 200);
        
        // Haptic feedback on touch end
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
          const strokeToSave = currentStrokeRef.current;
          console.log('[Canvas] Saving stroke with color:', strokeToSave.color, 'size:', strokeToSave.brushSize);
          setStrokes(prev => {
            const newStrokes = [...prev, strokeToSave];
            console.log('[Canvas] Stroke saved! Total strokes:', newStrokes.length);
            setStrokeCount(newStrokes.length);
            return newStrokes;
          });
          currentStrokeRef.current = null;
          setCurrentStroke(null);
        } else {
          console.log('[Canvas] WARNING: Touch ended but no valid stroke to save');
        }
      },
    })
  ).current;

  const photoPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isEditingPhoto,
      onMoveShouldSetPanResponder: () => isEditingPhoto,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        console.log('[Canvas] Photo edit touch started at:', locationX, locationY);
        initialPhotoTouchRef.current = { x: locationX, y: locationY };
        photoPositionRef.current = photoPosition;
        
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const deltaX = locationX - initialPhotoTouchRef.current.x;
        const deltaY = locationY - initialPhotoTouchRef.current.y;
        
        setPhotoPosition({
          x: photoPositionRef.current.x + deltaX,
          y: photoPositionRef.current.y + deltaY,
        });
      },
      onPanResponderRelease: () => {
        console.log('[Canvas] Photo edit touch ended at position:', photoPosition);
        
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
    })
  ).current;

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;

  const handleUndo = () => {
    if (strokes.length === 0) {
      console.log('[Canvas] No strokes to undo');
      return;
    }
    
    console.log('[Canvas] User undoing stroke');
    const lastStroke = strokes[strokes.length - 1];
    setStrokes(strokes.slice(0, -1));
    setStrokeCount(strokes.length - 1);
    setUndoneStrokes([...undoneStrokes, lastStroke]);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleRedo = () => {
    if (undoneStrokes.length === 0) {
      console.log('[Canvas] No strokes to redo');
      return;
    }
    
    console.log('[Canvas] User redoing stroke');
    const strokeToRedo = undoneStrokes[undoneStrokes.length - 1];
    setStrokes([...strokes, strokeToRedo]);
    setStrokeCount(strokes.length + 1);
    setUndoneStrokes(undoneStrokes.slice(0, -1));
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleClear = () => {
    console.log('[Canvas] User requesting to clear canvas');
    Alert.alert(
      'Clear Canvas',
      'Are you sure you want to clear all your artwork? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            console.log('[Canvas] User confirmed clear canvas');
            setStrokes([]);
            setCurrentStroke(null);
            currentStrokeRef.current = null;
            setUndoneStrokes([]);
            setBackgroundImage(null);
            setBackgroundPattern('none');
            setPhotoPosition({ x: 0, y: 0 });
            setPhotoScale(1);
            setIsEditingPhoto(false);
            photoPositionRef.current = { x: 0, y: 0 };
            setStrokeCount(0);
            setParticles([]);
            setStickers([]);
            setSelectedStickerId(null);
            
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          },
        },
      ]
    );
  };

  const handleEraser = () => {
    console.log('[Canvas] User activating eraser');
    setSelectedBrush('pencil');
    setSelectedColor('#FFFFFF');
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleUploadPhoto = async () => {
    console.log('[Canvas] User requesting to upload photo');
    
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        allowsMultipleSelection: false,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[Canvas] User selected photo:', result.assets[0].uri);
        setIsUploadingPhoto(true);

        try {
          const { BACKEND_URL } = await import('@/utils/api');
          const { getBearerToken } = await import('@/lib/auth');
          
          console.log('[Canvas] Getting authentication token...');
          const token = await getBearerToken();
          
          if (!token) {
            console.error('[Canvas] No authentication token available');
            setIsUploadingPhoto(false);
            Alert.alert(
              'Authentication Required',
              'You need to be signed in to upload photos. Please sign in and try again.',
              [{ text: 'OK' }]
            );
            return;
          }

          console.log('[Canvas] Authentication token obtained successfully');

          const formData = new FormData();
          
          const fileUri = result.assets[0].uri;
          const fileName = result.assets[0].fileName || `photo-${Date.now()}.jpg`;
          const fileType = result.assets[0].mimeType || 'image/jpeg';
          
          console.log('[Canvas] Preparing to upload photo:', { fileName, fileType, uri: fileUri });
          
          if (Platform.OS === 'web') {
            const response = await fetch(fileUri);
            const blob = await response.blob();
            formData.append('image', blob, fileName);
          } else {
            formData.append('image', {
              uri: fileUri,
              type: fileType,
              name: fileName,
            } as any);
          }

          console.log('[Canvas] Uploading photo to backend...');
          const uploadResponse = await fetch(`${BACKEND_URL}/api/artwork/upload-photo`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('[Canvas] Upload failed:', uploadResponse.status, errorText);
            throw new Error(`Upload failed with status ${uploadResponse.status}: ${errorText}`);
          }

          const uploadResult = await uploadResponse.json() as { url: string; filename: string; key?: string };
          console.log('[Canvas] Photo uploaded successfully:', uploadResult);
          
          const imageUrl = uploadResult.url;
          
          setBackgroundImage(imageUrl);
          setPhotoPosition({ x: 0, y: 0 });
          setPhotoScale(1);
          photoPositionRef.current = { x: 0, y: 0 };
          setIsUploadingPhoto(false);
          setIsEditingPhoto(true);
          
          console.log('[Canvas] Background image set to:', imageUrl);
          
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          
          Alert.alert('Photo Added! 🎨', 'Your photo has been added to the canvas. Use the slider to zoom and drag to position it, then tap "Done" to start drawing!');
        } catch (error) {
          console.error('[Canvas] Failed to upload photo:', error);
          setIsUploadingPhoto(false);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          Alert.alert('Upload Failed', `Could not upload photo: ${errorMessage}. Please try again.`);
        }
      }
    } catch (error) {
      console.error('[Canvas] Failed to access photo library:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Could not access photo library: ${errorMessage}`);
    }
  };

  const handleAddSticker = (stickerId: string) => {
    console.log('[Canvas] User adding sticker:', stickerId);
    const stickerOption = STICKER_OPTIONS.find(s => s.id === stickerId);
    if (!stickerOption) {
      return;
    }

    const centerX = canvasLayout.width / 2;
    const centerY = canvasLayout.height / 2;
    
    const newSticker: Sticker = {
      id: `${stickerId}-${Date.now()}`,
      icon: stickerOption.icon,
      materialIcon: stickerOption.materialIcon,
      label: stickerOption.label,
      x: centerX,
      y: centerY,
      size: 48,
      rotation: 0,
      color: selectedColor,
    };
    
    setStickers([...stickers, newSticker]);
    setShowStickerModal(false);
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    Alert.alert(
      'Sticker Added! ✨',
      'Tap to select, drag to move, pinch to resize, and rotate with two fingers. Long press to delete.',
      [{ text: 'Got it!' }]
    );
  };

  const handleUpdateSticker = (stickerId: string, updates: Partial<Sticker>) => {
    console.log('[Canvas] Updating sticker:', stickerId, updates);
    setStickers(prev => 
      prev.map(s => s.id === stickerId ? { ...s, ...updates } : s)
    );
  };

  const handleDeleteSticker = (stickerId: string) => {
    console.log('[Canvas] User requesting to delete sticker:', stickerId);
    Alert.alert(
      'Delete Sticker',
      'Remove this sticker from your artwork?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('[Canvas] User confirmed delete sticker');
            setStickers(prev => prev.filter(s => s.id !== stickerId));
            setSelectedStickerId(null);
            
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          },
        },
      ]
    );
  };

  const handleApplyPalette = (palette: ColorPalette) => {
    console.log('[Canvas] User applying color palette:', palette.name);
    setSelectedPalette(palette);
    setSelectedColor(palette.colors[0]);
    setShowPaletteModal(false);
    
    // Animate palette button
    paletteButtonScale.value = withSequence(
      withSpring(1.3, { damping: 8 }),
      withSpring(1, { damping: 10 })
    );
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    Alert.alert(
      `${palette.name} Palette Applied! 🎨`,
      `${palette.description}\n\nTap the color picker to see all colors in this palette.`
    );
  };

  const handleApplyPattern = (pattern: BackgroundPattern) => {
    console.log('[Canvas] User applying background pattern:', pattern);
    setBackgroundPattern(pattern);
    setShowPatternModal(false);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleSave = async () => {
    if (strokes.length === 0 && !backgroundImage && stickers.length === 0) {
      Alert.alert('Empty Canvas', 'Please add some content before saving.');
      return;
    }

    console.log('[Canvas] User saving artwork', { strokeCount: strokes.length, hasBackground: !!backgroundImage, stickerCount: stickers.length });
    setIsSaving(true);

    try {
      const artworkData = JSON.stringify({ 
        strokes, 
        backgroundImage,
        backgroundPattern,
        photoPosition,
        photoScale,
        brushType: selectedBrush,
        brushSize,
        color: selectedColor,
        stickers,
        savedAt: new Date().toISOString(),
      });
      
      const result = await authenticatedPost('/api/artwork/save', {
        artworkData,
        photoUrls: backgroundImage ? [backgroundImage] : [],
      });
      
      console.log('Artwork saved successfully:', result);
      setIsSaving(false);
      
      // Don't set hasSaved to true anymore - allow multiple saves
      // setHasSaved(true);
      
      // Celebration animation
      setShowCelebration(true);
      celebrationScale.value = withSequence(
        withSpring(1, { damping: 8 }),
        withTiming(0, { duration: 300, delay: 2000 })
      );
      celebrationOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 300, delay: 2000 })
      );
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      setTimeout(() => {
        setShowCelebration(false);
        setShowPostSaveModal(true);
      }, 2300);
    } catch (error) {
      console.error('Failed to save artwork:', error);
      setIsSaving(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Save Failed', `Could not save your artwork: ${errorMessage}. Please try again.`);
    }
  };

  const handleShareToCommunity = async () => {
    console.log('[Canvas] 🚀 User sharing artwork to community', { category: shareCategory, anonymous: shareAnonymous });
    console.log('[Canvas] 🚀 Current backgroundImage state:', backgroundImage);
    setIsSharing(true);

    try {
      const artworkData = JSON.stringify({ 
        strokes, 
        backgroundImage,
        backgroundPattern,
        photoPosition,
        photoScale,
        brushType: selectedBrush,
        brushSize,
        color: selectedColor,
        stickers,
        savedAt: new Date().toISOString(),
      });
      
      console.log('[Canvas] 📦 Saving artwork with photoUrls:', backgroundImage ? [backgroundImage] : []);
      
      // Save the artwork first
      const savedArtwork = await authenticatedPost<{ id: string; photoUrls: string[] }>('/api/artwork/save', {
        artworkData,
        photoUrls: backgroundImage ? [backgroundImage] : [],
      });

      console.log('[Canvas] ✅ Artwork saved before sharing:', savedArtwork);
      console.log('[Canvas] 📸 savedArtwork.photoUrls:', savedArtwork.photoUrls);
      console.log('[Canvas] 📸 savedArtwork.photoUrls length:', savedArtwork.photoUrls ? savedArtwork.photoUrls.length : 0);

      // Determine the artwork URL to share
      // Priority: 1. photoUrls from saved artwork, 2. backgroundImage state
      const artworkUrlToShare = (savedArtwork.photoUrls && savedArtwork.photoUrls.length > 0) 
        ? savedArtwork.photoUrls[0] 
        : backgroundImage;
      
      console.log('[Canvas] 🎨 FINAL artworkUrlToShare:', artworkUrlToShare);
      console.log('[Canvas] 🎨 artworkUrlToShare type:', typeof artworkUrlToShare);
      console.log('[Canvas] 🎨 artworkUrlToShare length:', artworkUrlToShare ? artworkUrlToShare.length : 0);

      // Share to community with ONLY the artwork URL, no text content
      console.log('[Canvas] 📤 Posting to community with payload:', {
        content: '',
        category: shareCategory,
        isAnonymous: shareAnonymous,
        contentType: 'somatic',
        artworkUrl: artworkUrlToShare,
      });
      
      await authenticatedPost('/api/community/post', {
        content: '', // Empty string - no text, just artwork
        category: shareCategory,
        isAnonymous: shareAnonymous,
        contentType: 'somatic',
        artworkUrl: artworkUrlToShare,
      });

      console.log('[Canvas] ✅ Artwork shared to community successfully');
      setIsSharing(false);
      setShowShareModal(false);
      setShowPostSaveModal(false);
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Show celebratory success modal
      setShowShareSuccessModal(true);
    } catch (error) {
      console.error('[Canvas] ❌ Failed to share artwork:', error);
      setIsSharing(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Share Failed', `Could not share your artwork: ${errorMessage}. Please try again.`);
    }
  };

  const handleDownload = async () => {
    console.log('[Canvas] User requesting to download artwork');
    setIsDownloading(true);

    try {
      if (Platform.OS === 'web') {
        Alert.alert('Download', 'Web download functionality coming soon. For now, you can take a screenshot of your artwork.');
        setIsDownloading(false);
      } else {
        Alert.alert('Download', 'To save your artwork to your device, please take a screenshot. Download functionality coming soon!');
        setIsDownloading(false);
      }
    } catch (error) {
      console.error('Failed to download artwork:', error);
      setIsDownloading(false);
      Alert.alert('Download Failed', 'Could not download your artwork. Please try again.');
    }
  };

  const handleBrushSelect = (brushType: BrushType) => {
    const brush = BRUSH_OPTIONS.find(b => b.id === brushType);
    if (brush?.isPremium && !isPremium) {
      console.log('[Canvas] User attempted to select premium brush without subscription');
      Alert.alert('Premium Feature', 'This brush type is available with a premium subscription.');
      return;
    }
    
    console.log('[Canvas] User selected brush:', brushType);
    setSelectedBrush(brushType);
    setShowBrushPicker(false);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleColorSelect = (color: string) => {
    console.log('[Canvas] User selected color:', color);
    setSelectedColor(color);
    setShowColorPicker(false);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const strokeToPath = (stroke: DrawingStroke): string => {
    if (!stroke || !stroke.points || stroke.points.length === 0) {
      return '';
    }
    
    const firstPoint = stroke.points[0];
    let pathData = `M ${firstPoint.x} ${firstPoint.y}`;
    
    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      pathData += ` L ${point.x} ${point.y}`;
    }
    
    return pathData;
  };

  const getBrushProps = (stroke: DrawingStroke) => {
    const baseProps = {
      stroke: stroke.color,
      strokeWidth: stroke.brushSize,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      fill: 'none' as const,
    };

    switch (stroke.brushType) {
      case 'watercolor':
        return {
          ...baseProps,
          opacity: 0.4,
          strokeWidth: stroke.brushSize * 1.5,
          strokeLinecap: 'round' as const,
        };
      case 'marker':
        return {
          ...baseProps,
          opacity: 0.7,
          strokeWidth: stroke.brushSize * 1.2,
          strokeLinecap: 'square' as const,
        };
      case 'pen':
        return {
          ...baseProps,
          opacity: 1,
          strokeWidth: stroke.brushSize * 0.8,
          strokeLinecap: 'round' as const,
        };
      case 'pencil':
        return {
          ...baseProps,
          opacity: 0.8,
          strokeWidth: stroke.brushSize * 0.7,
          strokeLinecap: 'round' as const,
        };
      case 'spray':
        return {
          ...baseProps,
          opacity: 0.3,
          strokeWidth: stroke.brushSize * 2,
          strokeLinecap: 'round' as const,
        };
      case 'chalk':
        return {
          ...baseProps,
          opacity: 0.6,
          strokeWidth: stroke.brushSize * 1.3,
          strokeLinecap: 'round' as const,
        };
      case 'ink':
        return {
          ...baseProps,
          opacity: 0.9,
          strokeWidth: stroke.brushSize * 0.6,
          strokeLinecap: 'round' as const,
        };
      case 'charcoal':
        return {
          ...baseProps,
          opacity: 0.7,
          strokeWidth: stroke.brushSize * 1.4,
          strokeLinecap: 'round' as const,
        };
      case 'oil':
        return {
          ...baseProps,
          opacity: 0.85,
          strokeWidth: stroke.brushSize * 1.3,
          strokeLinecap: 'round' as const,
        };
      case 'pastel':
        return {
          ...baseProps,
          opacity: 0.65,
          strokeWidth: stroke.brushSize * 1.2,
          strokeLinecap: 'round' as const,
        };
      case 'crayon':
        return {
          ...baseProps,
          opacity: 0.75,
          strokeWidth: stroke.brushSize * 1.1,
          strokeLinecap: 'round' as const,
        };
      case 'glitter':
        return {
          ...baseProps,
          opacity: 0.8,
          strokeWidth: stroke.brushSize * 0.9,
          strokeLinecap: 'round' as const,
        };
      default:
        return baseProps;
    }
  };

  const renderBackgroundPattern = () => {
    if (backgroundPattern === 'none' || !canvasLayout.width) {
      return null;
    }

    const patternSize = 20;
    
    switch (backgroundPattern) {
      case 'dots':
        return (
          <Defs>
            <Pattern id="dots" x="0" y="0" width={patternSize} height={patternSize} patternUnits="userSpaceOnUse">
              <Circle cx={patternSize / 2} cy={patternSize / 2} r="2" fill="#E0E0E0" opacity="0.3" />
            </Pattern>
          </Defs>
        );
      case 'lines':
        return (
          <Defs>
            <Pattern id="lines" x="0" y="0" width={patternSize} height={patternSize} patternUnits="userSpaceOnUse">
              <Path d={`M 0 ${patternSize / 2} L ${patternSize} ${patternSize / 2}`} stroke="#E0E0E0" strokeWidth="1" opacity="0.3" />
            </Pattern>
          </Defs>
        );
      case 'grid':
        return (
          <Defs>
            <Pattern id="grid" x="0" y="0" width={patternSize} height={patternSize} patternUnits="userSpaceOnUse">
              <Path d={`M ${patternSize} 0 L 0 0 0 ${patternSize}`} fill="none" stroke="#E0E0E0" strokeWidth="1" opacity="0.2" />
            </Pattern>
          </Defs>
        );
      case 'watercolor':
        return (
          <Defs>
            <LinearGradient id="watercolor" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#E3F2FD" stopOpacity="0.3" />
              <Stop offset="50%" stopColor="#BBDEFB" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#E3F2FD" stopOpacity="0.3" />
            </LinearGradient>
          </Defs>
        );
      case 'gradient':
        return (
          <Defs>
            <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFF9E6" stopOpacity="0.5" />
              <Stop offset="100%" stopColor="#FFE6F0" stopOpacity="0.5" />
            </LinearGradient>
          </Defs>
        );
      default:
        return null;
    }
  };

  const getPatternFill = () => {
    switch (backgroundPattern) {
      case 'dots':
        return 'url(#dots)';
      case 'lines':
        return 'url(#lines)';
      case 'grid':
        return 'url(#grid)';
      case 'watercolor':
        return 'url(#watercolor)';
      case 'gradient':
        return 'url(#gradient)';
      default:
        return 'none';
    }
  };

  const availableColors = selectedPalette ? selectedPalette.colors : (isPremium ? PREMIUM_COLORS : FREE_COLORS);
  const freeBrushes = BRUSH_OPTIONS.filter(b => !b.isPremium);
  const premiumBrushes = BRUSH_OPTIONS.filter(b => b.isPremium);

  const saveButtonText = isSaving ? 'Saving...' : 'Save Artwork';
  const headerTitle = 'Create Artwork';
  const canvasPlaceholderText = 'Touch and drag to draw on the canvas';
  const brushSizeLabel = 'Brush Size';
  const brushPickerTitle = 'Select Brush';
  const colorPickerTitle = selectedPalette ? `${selectedPalette.name} Palette` : 'Select Color';
  const freeBrushesLabel = 'Free Brushes';
  const premiumBrushesLabel = 'Premium Brushes';
  const premiumBadge = 'PREMIUM';
  const uploadingText = 'Uploading photo...';
  const shareModalTitle = 'Share to Community';
  const shareAnonymousLabel = 'Share Anonymously';
  const shareCategoryLabel = 'Category';
  const shareButtonText = isSharing ? 'Sharing...' : 'Share';
  const cancelButtonText = 'Cancel';

  const canUndo = strokes.length > 0;
  const canRedo = undoneStrokes.length > 0;
  const canSave = strokes.length > 0 || backgroundImage !== null || stickers.length > 0;

  const selectedBrushLabel = BRUSH_OPTIONS.find(b => b.id === selectedBrush)?.label || 'Pencil';
  const isEraserMode = selectedColor === '#FFFFFF';

  const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

  // Animated styles
  const brushPreviewStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: brushPreviewScale.value },
      { rotate: `${brushPreviewRotation.value}deg` }
    ],
  }));

  const colorPickerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: colorPickerScale.value }],
  }));

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationOpacity.value,
  }));

  const achievementStyle = useAnimatedStyle(() => ({
    transform: [{ scale: achievementScale.value }],
    opacity: achievementOpacity.value,
  }));

  const promptStyle = useAnimatedStyle(() => ({
    opacity: promptOpacity.value,
  }));

  const cursorStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cursorScale.value }],
  }));

  const paletteButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: paletteButtonScale.value }],
  }));

  // Generate sparkles for celebration
  const celebrationSparkles: Sparkle[] = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    y: Math.random() * 300 - 150,
    delay: Math.random() * 200,
  }));

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen 
          options={{
            headerShown: false,
          }}
        />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.uploadingText, { color: textColor, marginTop: spacing.md }]}>
            Loading artwork...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen 
          options={{
            headerShown: false,
          }}
        />
        
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name="chevron.left"
                android_material_icon_name="arrow-back"
                size={24}
                color={textColor}
              />
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {headerTitle}
            </Text>
            
            <View style={styles.headerSpacer} />
          </View>

          {/* Drawing Prompt */}
          {showPrompt && (
            <Animated.View style={[styles.promptBanner, { backgroundColor: colors.primaryLight + '30' }, promptStyle]}>
              <IconSymbol 
                ios_icon_name="lightbulb.fill"
                android_material_icon_name="lightbulb"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.promptText, { color: colors.primary }]}>
                {currentPrompt}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  promptOpacity.value = withTiming(0, { duration: 300 });
                  setTimeout(() => setShowPrompt(false), 300);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol 
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Brush Preview Indicator */}
          <Animated.View style={[styles.brushPreview, brushPreviewStyle]}>
            <View style={[styles.brushPreviewCircle, { 
              backgroundColor: selectedColor,
              width: Math.min(brushSize * 2 + 20, 60),
              height: Math.min(brushSize * 2 + 20, 60),
              borderRadius: Math.min(brushSize * 2 + 20, 60) / 2,
            }]}>
              <IconSymbol 
                ios_icon_name={BRUSH_OPTIONS.find(b => b.id === selectedBrush)?.icon || 'pencil'}
                android_material_icon_name={BRUSH_OPTIONS.find(b => b.id === selectedBrush)?.materialIcon || 'edit'}
                size={20}
                color={selectedColor === '#FFFFFF' || selectedColor === '#F5F5F5' ? '#000000' : '#FFFFFF'}
              />
            </View>
            <Text style={[styles.brushPreviewLabel, { color: textColor }]}>
              {selectedBrushLabel}
            </Text>
          </Animated.View>

          {/* Progress Indicator */}
          {strokeCount > 0 && (
            <View style={[styles.progressIndicator, { backgroundColor: cardBg }]}>
              <IconSymbol 
                ios_icon_name="paintbrush.fill"
                android_material_icon_name="brush"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.progressText, { color: textSecondaryColor }]}>
                {strokeCount} {strokeCount === 1 ? 'stroke' : 'strokes'}
              </Text>
            </View>
          )}

          {/* Encouragement Message */}
          {showEncouragement && (
            <Animated.View 
              style={[styles.encouragementBanner, { backgroundColor: colors.primary }]}
              entering={undefined}
              exiting={undefined}
            >
              <Text style={styles.encouragementText}>
                {encouragementMessage}
              </Text>
            </Animated.View>
          )}

          {/* Achievement Notification */}
          {showAchievement && currentAchievement && (
            <Animated.View style={[styles.achievementBanner, { backgroundColor: colors.accent }, achievementStyle]}>
              <IconSymbol 
                ios_icon_name={currentAchievement.icon}
                android_material_icon_name={currentAchievement.materialIcon}
                size={32}
                color="#FFFFFF"
              />
              <View style={styles.achievementTextContainer}>
                <Text style={styles.achievementTitle}>
                  {currentAchievement.title}
                </Text>
                <Text style={styles.achievementMessage}>
                  {currentAchievement.message}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Canvas Area */}
          <View 
            style={[styles.canvasContainer, { backgroundColor: '#FFFFFF' }]}
            ref={canvasRef}
            onLayout={(event) => {
              const { x, y, width, height } = event.nativeEvent.layout;
              console.log('[Canvas] Layout updated:', { x, y, width, height });
              setCanvasLayout({ x, y, width, height });
            }}
          >
            <View 
              style={styles.touchableCanvas}
              {...(isEditingPhoto ? photoPanResponder.panHandlers : panResponder.panHandlers)}
            >
              {canvasLayout.width > 0 && canvasLayout.height > 0 && (
                <Svg 
                  width={canvasLayout.width} 
                  height={canvasLayout.height}
                  style={styles.svgCanvas}
                >
                  {renderBackgroundPattern()}
                  
                  {backgroundPattern !== 'none' && (
                    <Rect
                      x="0"
                      y="0"
                      width={canvasLayout.width}
                      height={canvasLayout.height}
                      fill={getPatternFill()}
                    />
                  )}

                  {backgroundImage && (
                    <SvgImage
                      href={backgroundImage}
                      x={photoPosition.x}
                      y={photoPosition.y}
                      width={canvasLayout.width * photoScale}
                      height={canvasLayout.height * photoScale}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  )}
                  
                  {allStrokes.map((stroke, index) => {
                    const pathData = strokeToPath(stroke);
                    if (!pathData) {
                      return null;
                    }
                    const brushProps = getBrushProps(stroke);
                    return (
                      <Path
                        key={`stroke-${index}`}
                        d={pathData}
                        {...brushProps}
                      />
                    );
                  })}

                  {/* Cursor preview */}
                  {cursorPosition && !isEditingPhoto && selectedStickerId === null && (
                    <Circle
                      cx={cursorPosition.x}
                      cy={cursorPosition.y}
                      r={brushSize / 2}
                      fill={selectedColor}
                      opacity={0.3}
                      stroke={selectedColor}
                      strokeWidth={1}
                    />
                  )}
                </Svg>
              )}
              
              {/* Interactive Stickers overlay */}
              {stickers.map((sticker) => (
                <InteractiveSticker
                  key={sticker.id}
                  sticker={sticker}
                  isSelected={selectedStickerId === sticker.id}
                  onSelect={() => {
                    console.log('[Canvas] Sticker selected:', sticker.id);
                    setSelectedStickerId(sticker.id);
                  }}
                  onUpdate={(updates) => handleUpdateSticker(sticker.id, updates)}
                  onDelete={() => handleDeleteSticker(sticker.id)}
                />
              ))}
              
              {/* Particle effects */}
              {particles.map(particle => (
                <View
                  key={particle.id}
                  style={[
                    styles.particle,
                    {
                      left: particle.x,
                      top: particle.y,
                      width: particle.size,
                      height: particle.size,
                      backgroundColor: particle.color,
                      opacity: particle.life,
                    }
                  ]}
                />
              ))}
              
              {!backgroundImage && strokes.length === 0 && !currentStroke && backgroundPattern === 'none' && stickers.length === 0 && (
                <View style={styles.canvasPlaceholder}>
                  <IconSymbol 
                    ios_icon_name="hand.draw"
                    android_material_icon_name="gesture"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.canvasPlaceholderText, { color: textSecondaryColor }]}>
                    {canvasPlaceholderText}
                  </Text>
                </View>
              )}
              
              {isUploadingPhoto && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.uploadingText, { color: textColor }]}>
                    {uploadingText}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Controls Bar */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.controlsBar}
            contentContainerStyle={styles.controlsBarContent}
          >
            {/* Brush Selector */}
            <TouchableOpacity 
              style={[
                styles.controlButton, 
                { backgroundColor: cardBg },
              ]}
              onPress={() => {
                console.log('[Canvas] User opening brush picker');
                setShowBrushPicker(true);
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name="paintbrush"
                android_material_icon_name="brush"
                size={20}
                color={textColor}
              />
              <Text style={[
                styles.controlButtonLabel, 
                { color: textSecondaryColor }
              ]}>
                {selectedBrushLabel}
              </Text>
            </TouchableOpacity>

            {/* Color Palette Selector */}
            <Animated.View style={paletteButtonStyle}>
              <TouchableOpacity 
                style={[
                  styles.controlButton, 
                  { backgroundColor: cardBg },
                  selectedPalette && styles.controlButtonActive
                ]}
                onPress={() => {
                  console.log('[Canvas] User opening palette picker');
                  setShowPaletteModal(true);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  ios_icon_name="paintpalette"
                  android_material_icon_name="palette"
                  size={20}
                  color={selectedPalette ? colors.primary : textColor}
                />
                <Text style={[
                  styles.controlButtonLabel, 
                  { color: selectedPalette ? colors.primary : textSecondaryColor }
                ]}>
                  {selectedPalette ? selectedPalette.name : 'Palette'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Color Selector */}
            <Animated.View style={colorPickerStyle}>
              <TouchableOpacity 
                style={[styles.controlButton, { backgroundColor: selectedColor, borderWidth: 2, borderColor: cardBg }]}
                onPress={() => {
                  console.log('[Canvas] User opening color picker');
                  setShowColorPicker(true);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.colorPreview} />
              </TouchableOpacity>
            </Animated.View>

            {/* Pattern Selector */}
            <TouchableOpacity 
              style={[
                styles.controlButton, 
                { backgroundColor: cardBg },
                backgroundPattern !== 'none' && styles.controlButtonActive
              ]}
              onPress={() => {
                console.log('[Canvas] User opening pattern picker');
                setShowPatternModal(true);
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name="square.grid.2x2"
                android_material_icon_name="grid-on"
                size={20}
                color={backgroundPattern !== 'none' ? colors.primary : textColor}
              />
            </TouchableOpacity>

            {/* Sticker Button */}
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: cardBg }]}
              onPress={() => {
                console.log('[Canvas] User opening sticker picker');
                setShowStickerModal(true);
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={20}
                color={textColor}
              />
            </TouchableOpacity>

            {/* Eraser Button */}
            <TouchableOpacity 
              style={[
                styles.controlButton, 
                { backgroundColor: cardBg },
                isEraserMode && styles.controlButtonActive
              ]}
              onPress={handleEraser}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name="eraser"
                android_material_icon_name="auto-fix-off"
                size={20}
                color={isEraserMode ? colors.error : textColor}
              />
              <Text style={[
                styles.controlButtonLabel, 
                { color: isEraserMode ? colors.error : textSecondaryColor }
              ]}>
                Eraser
              </Text>
            </TouchableOpacity>

            {/* Undo */}
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: cardBg }, !canUndo && styles.controlButtonDisabled]}
              onPress={handleUndo}
              disabled={!canUndo}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name="arrow.uturn.backward"
                android_material_icon_name="undo"
                size={20}
                color={canUndo ? textColor : textSecondaryColor}
              />
            </TouchableOpacity>

            {/* Redo */}
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: cardBg }, !canRedo && styles.controlButtonDisabled]}
              onPress={handleRedo}
              disabled={!canRedo}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name="arrow.uturn.forward"
                android_material_icon_name="redo"
                size={20}
                color={canRedo ? textColor : textSecondaryColor}
              />
            </TouchableOpacity>

            {/* Upload Photo */}
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: cardBg }]}
              onPress={handleUploadPhoto}
              disabled={isUploadingPhoto}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name="photo"
                android_material_icon_name="image"
                size={20}
                color={textColor}
              />
            </TouchableOpacity>

            {/* Edit Photo (only show if photo exists) */}
            {backgroundImage && (
              <TouchableOpacity 
                style={[
                  styles.controlButton, 
                  { backgroundColor: cardBg },
                  isEditingPhoto && styles.controlButtonActive
                ]}
                onPress={() => {
                  console.log('[Canvas] User toggling photo edit mode');
                  setIsEditingPhoto(!isEditingPhoto);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                }}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  ios_icon_name="crop"
                  android_material_icon_name="crop"
                  size={20}
                  color={isEditingPhoto ? colors.primary : textColor}
                />
                <Text style={[
                  styles.controlButtonLabel, 
                  { color: isEditingPhoto ? colors.primary : textSecondaryColor }
                ]}>
                  {isEditingPhoto ? 'Done' : 'Edit'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Clear */}
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: cardBg }]}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name="trash"
                android_material_icon_name="delete"
                size={20}
                color={colors.error}
              />
            </TouchableOpacity>
          </ScrollView>

          {/* Brush Size Slider or Photo Scale Slider */}
          {isEditingPhoto && backgroundImage ? (
            <View style={[styles.sliderContainer, { backgroundColor: cardBg }]}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: textColor }]}>
                  Photo Scale
                </Text>
                <Text style={[styles.sliderValue, { color: textSecondaryColor }]}>
                  {Math.round(photoScale * 100)}%
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={3}
                step={0.1}
                value={photoScale}
                onValueChange={(value) => {
                  console.log('[Canvas] Photo scale changed to:', value);
                  setPhotoScale(value);
                }}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
              />
              <View style={styles.photoEditHint}>
                <IconSymbol 
                  ios_icon_name="hand.draw"
                  android_material_icon_name="pan-tool"
                  size={16}
                  color={textSecondaryColor}
                />
                <Text style={[styles.photoEditHintText, { color: textSecondaryColor }]}>
                  Drag to move photo, use slider to zoom
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.sliderContainer, { backgroundColor: cardBg }]}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: textColor }]}>
                  {brushSizeLabel}
                </Text>
                <Text style={[styles.sliderValue, { color: textSecondaryColor }]}>
                  {brushSize}
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={50}
                step={1}
                value={brushSize}
                onValueChange={(value) => {
                  console.log('[Canvas] Brush size changed to:', value);
                  setBrushSize(value);
                }}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
              />
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, (!canSave || isSaving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave || isSaving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {saveButtonText}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Celebration Overlay */}
        {showCelebration && (
          <Animated.View style={[styles.celebrationOverlay, celebrationStyle]}>
            <View style={styles.celebrationContent}>
              <IconSymbol 
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={80}
                color={colors.accent}
              />
              <Text style={styles.celebrationText}>
                Artwork Saved! ✨
              </Text>
              <Text style={styles.celebrationSubtext}>
                Beautiful work!
              </Text>
            </View>
            {celebrationSparkles.map((sparkle) => (
              <View
                key={sparkle.id}
                style={[
                  styles.celebrationSparkle,
                  {
                    left: '50%',
                    top: '50%',
                    marginLeft: sparkle.x,
                    marginTop: sparkle.y,
                  }
                ]}
              >
                <IconSymbol 
                  ios_icon_name="sparkle"
                  android_material_icon_name="auto-awesome"
                  size={16}
                  color={colors.primary}
                />
              </View>
            ))}
          </Animated.View>
        )}

        {/* Color Palette Modal */}
        <Modal
          visible={showPaletteModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPaletteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Scripture-Inspired Palettes
                </Text>
                <TouchableOpacity onPress={() => setShowPaletteModal(false)}>
                  <IconSymbol 
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={24}
                    color={textColor}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {COLOR_PALETTES.map((palette) => {
                  const isSelected = selectedPalette?.id === palette.id;
                  return (
                    <TouchableOpacity
                      key={palette.id}
                      style={[
                        styles.paletteOption,
                        { borderColor: colors.border },
                        isSelected && styles.paletteOptionSelected
                      ]}
                      onPress={() => handleApplyPalette(palette)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.paletteHeader}>
                        <IconSymbol 
                          ios_icon_name={palette.icon}
                          android_material_icon_name={palette.materialIcon}
                          size={24}
                          color={isSelected ? colors.primary : textColor}
                        />
                        <View style={styles.paletteInfo}>
                          <Text style={[
                            styles.paletteName,
                            { color: isSelected ? colors.primary : textColor }
                          ]}>
                            {palette.name}
                          </Text>
                          <Text style={[styles.paletteDescription, { color: textSecondaryColor }]}>
                            {palette.description}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.paletteColors}>
                        {palette.colors.map((color, index) => (
                          <View
                            key={index}
                            style={[
                              styles.paletteColorSwatch,
                              { backgroundColor: color }
                            ]}
                          />
                        ))}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Sticker Modal */}
        <Modal
          visible={showStickerModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowStickerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Add Sticker
                </Text>
                <TouchableOpacity onPress={() => setShowStickerModal(false)}>
                  <IconSymbol 
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={24}
                    color={textColor}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.stickerGrid}>
                  {STICKER_OPTIONS.map((sticker) => (
                    <TouchableOpacity
                      key={sticker.id}
                      style={[
                        styles.stickerOption,
                        { borderColor: colors.border }
                      ]}
                      onPress={() => handleAddSticker(sticker.id)}
                      activeOpacity={0.7}
                    >
                      <IconSymbol 
                        ios_icon_name={sticker.icon}
                        android_material_icon_name={sticker.materialIcon}
                        size={32}
                        color={textColor}
                      />
                      <Text style={[styles.stickerLabel, { color: textColor }]}>
                        {sticker.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Pattern Modal */}
        <Modal
          visible={showPatternModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPatternModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Background Pattern
                </Text>
                <TouchableOpacity onPress={() => setShowPatternModal(false)}>
                  <IconSymbol 
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={24}
                    color={textColor}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.patternGrid}>
                  {(['none', 'dots', 'lines', 'grid', 'watercolor', 'gradient'] as BackgroundPattern[]).map((pattern) => {
                    const isSelected = backgroundPattern === pattern;
                    const patternLabel = pattern.charAt(0).toUpperCase() + pattern.slice(1);
                    return (
                      <TouchableOpacity
                        key={pattern}
                        style={[
                          styles.patternOption,
                          { borderColor: colors.border },
                          isSelected && styles.patternOptionSelected
                        ]}
                        onPress={() => handleApplyPattern(pattern)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.patternLabel,
                          { color: isSelected ? colors.primary : textColor }
                        ]}>
                          {patternLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Brush Picker Modal */}
        <Modal
          visible={showBrushPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowBrushPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  {brushPickerTitle}
                </Text>
                <TouchableOpacity onPress={() => setShowBrushPicker(false)}>
                  <IconSymbol 
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={24}
                    color={textColor}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <Text style={[styles.brushSectionTitle, { color: textColor }]}>
                  {freeBrushesLabel}
                </Text>
                <View style={styles.brushGrid}>
                  {freeBrushes.map((brush) => {
                    const isSelected = selectedBrush === brush.id;
                    return (
                      <TouchableOpacity
                        key={brush.id}
                        style={[
                          styles.brushOption,
                          { borderColor: colors.border },
                          isSelected && styles.brushOptionSelected
                        ]}
                        onPress={() => handleBrushSelect(brush.id)}
                        activeOpacity={0.7}
                      >
                        <IconSymbol 
                          ios_icon_name={brush.icon}
                          android_material_icon_name={brush.materialIcon}
                          size={24}
                          color={isSelected ? colors.primary : textColor}
                        />
                        <Text style={[
                          styles.brushOptionText,
                          { color: isSelected ? colors.primary : textColor }
                        ]}>
                          {brush.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.premiumSection}>
                  <View style={styles.premiumHeader}>
                    <Text style={[styles.brushSectionTitle, { color: textColor }]}>
                      {premiumBrushesLabel}
                    </Text>
                    <View style={styles.premiumBadge}>
                      <Text style={styles.premiumBadgeText}>
                        {premiumBadge}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.brushGrid}>
                    {premiumBrushes.map((brush) => {
                      const isSelected = selectedBrush === brush.id;
                      const isLocked = !isPremium;
                      return (
                        <TouchableOpacity
                          key={brush.id}
                          style={[
                            styles.brushOption,
                            { borderColor: colors.border },
                            isSelected && styles.brushOptionSelected,
                            isLocked && styles.brushOptionLocked
                          ]}
                          onPress={() => handleBrushSelect(brush.id)}
                          activeOpacity={0.7}
                        >
                          {isLocked && (
                            <View style={styles.lockIcon}>
                              <IconSymbol 
                                ios_icon_name="lock.fill"
                                android_material_icon_name="lock"
                                size={16}
                                color={colors.textSecondary}
                              />
                            </View>
                          )}
                          <IconSymbol 
                            ios_icon_name={brush.icon}
                            android_material_icon_name={brush.materialIcon}
                            size={24}
                            color={isSelected ? colors.primary : (isLocked ? textSecondaryColor : textColor)}
                          />
                          <Text style={[
                            styles.brushOptionText,
                            { color: isSelected ? colors.primary : (isLocked ? textSecondaryColor : textColor) }
                          ]}>
                            {brush.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Color Picker Modal */}
        <Modal
          visible={showColorPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowColorPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  {colorPickerTitle}
                </Text>
                <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                  <IconSymbol 
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={24}
                    color={textColor}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {selectedPalette && (
                  <View style={styles.paletteInfo}>
                    <Text style={[styles.paletteDescription, { color: textSecondaryColor, marginBottom: spacing.md }]}>
                      {selectedPalette.description}
                    </Text>
                  </View>
                )}
                <View style={styles.colorGrid}>
                  {availableColors.map((color, index) => {
                    const isSelected = selectedColor === color;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          isSelected && styles.colorOptionSelected
                        ]}
                        onPress={() => handleColorSelect(color)}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <IconSymbol 
                            ios_icon_name="checkmark"
                            android_material_icon_name="check"
                            size={20}
                            color={color === '#FFFFFF' ? '#000000' : '#FFFFFF'}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Post-Save Options Modal */}
        <Modal
          visible={showPostSaveModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPostSaveModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Artwork Saved!
                </Text>
                <TouchableOpacity onPress={() => setShowPostSaveModal(false)}>
                  <IconSymbol 
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={24}
                    color={textColor}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.shareContent}>
                <View style={styles.successIcon}>
                  <IconSymbol 
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={64}
                    color={colors.primary}
                  />
                </View>

                <Text style={[styles.successMessage, { color: textColor }]}>
                  Your artwork has been saved successfully!
                </Text>

                <TouchableOpacity
                  style={styles.postSaveButton}
                  onPress={() => {
                    setShowPostSaveModal(false);
                    setShowShareModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <IconSymbol 
                    ios_icon_name="person.2"
                    android_material_icon_name="group"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.postSaveButtonText}>
                    Share with Community
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.postSaveButton, styles.postSaveButtonSecondary]}
                  onPress={handleDownload}
                  disabled={isDownloading}
                  activeOpacity={0.8}
                >
                  <IconSymbol 
                    ios_icon_name="arrow.down.circle"
                    android_material_icon_name="download"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.postSaveButtonText, { color: colors.primary }]}>
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPostSaveModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cancelButtonText, { color: textColor }]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Share to Community Modal */}
        <Modal
          visible={showShareModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowShareModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  {shareModalTitle}
                </Text>
                <TouchableOpacity onPress={() => setShowShareModal(false)}>
                  <IconSymbol 
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={24}
                    color={textColor}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.shareContent}>
                <View style={styles.shareOption}>
                  <Text style={[styles.shareOptionLabel, { color: textColor }]}>
                    {shareAnonymousLabel}
                  </Text>
                  <TouchableOpacity
                    style={[styles.shareToggle, shareAnonymous && styles.shareToggleActive]}
                    onPress={() => setShareAnonymous(!shareAnonymous)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.shareToggleThumb, shareAnonymous && styles.shareToggleThumbActive]} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.shareOptionLabel, { color: textColor, marginTop: spacing.lg }]}>
                  {shareCategoryLabel}
                </Text>
                <View style={styles.categoryGrid}>
                  {(['feed', 'wisdom', 'care', 'prayers'] as const).map((category) => {
                    const isSelected = shareCategory === category;
                    const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
                    return (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryOption,
                          { borderColor: colors.border },
                          isSelected && styles.categoryOptionSelected
                        ]}
                        onPress={() => setShareCategory(category)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.categoryOptionText,
                          { color: isSelected ? colors.primary : textColor }
                        ]}>
                          {categoryLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
                  onPress={handleShareToCommunity}
                  disabled={isSharing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.shareButtonText}>
                    {shareButtonText}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowShareModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cancelButtonText, { color: textColor }]}>
                    {cancelButtonText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Share Success Modal */}
        <Modal
          visible={showShareSuccessModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => {
            setShowShareSuccessModal(false);
            router.back();
          }}
        >
          <View style={styles.successModalOverlay}>
            <View style={styles.successModalContent}>
              <View style={styles.successIconCircle}>
                <IconSymbol 
                  ios_icon_name="person.2.fill"
                  android_material_icon_name="group"
                  size={48}
                  color="#FFFFFF"
                />
              </View>

              <Text style={styles.successModalTitle}>
                Beautiful! 🎉
              </Text>

              <Text style={styles.successModalMessage}>
                Your artwork has been shared with the community
              </Text>

              <View style={styles.successModalNote}>
                <Text style={styles.successModalNoteText}>
                  Your words or art may be exactly what someone else needs to see today. Thank you for your courage in sharing.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.successModalButton}
                onPress={() => {
                  setShowShareSuccessModal(false);
                  router.back();
                  router.push('/(tabs)/community');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.successModalButtonText}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
  },
  headerSpacer: {
    width: 40,
  },
  promptBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  promptText: {
    flex: 1,
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  brushPreview: {
    position: 'absolute',
    top: 80,
    right: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    zIndex: 10,
  },
  brushPreviewCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  brushPreviewLabel: {
    fontSize: typography.bodySmall - 2,
    fontWeight: typography.semibold,
  },
  progressIndicator: {
    position: 'absolute',
    top: 80,
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  progressText: {
    fontSize: typography.bodySmall - 2,
    fontWeight: typography.medium,
  },
  encouragementBanner: {
    position: 'absolute',
    top: 140,
    left: spacing.lg,
    right: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    zIndex: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  encouragementText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  achievementBanner: {
    position: 'absolute',
    top: 200,
    left: spacing.lg,
    right: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 30,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  achievementTextContainer: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: typography.h4,
    fontWeight: typography.bold,
    color: '#FFFFFF',
    marginBottom: spacing.xs / 2,
  },
  achievementMessage: {
    fontSize: typography.bodySmall,
    color: '#FFFFFF',
    opacity: 0.95,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  celebrationContent: {
    alignItems: 'center',
    gap: spacing.md,
  },
  celebrationText: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: '#FFFFFF',
  },
  celebrationSubtext: {
    fontSize: typography.body,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  celebrationSparkle: {
    position: 'absolute',
  },
  canvasContainer: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  touchableCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  svgCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    borderRadius: 100,
    pointerEvents: 'none',
  },
  interactiveSticker: {
    position: 'absolute',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactiveStickerSelected: {
    zIndex: 1000,
  },
  stickerTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerSelectionBorder: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  canvasPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    pointerEvents: 'none',
  },
  canvasPlaceholderText: {
    fontSize: typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 10,
  },
  uploadingText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  controlsBar: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  controlsBarContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  controlButton: {
    minWidth: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs / 2,
  },
  controlButtonActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlButtonLabel: {
    fontSize: typography.bodySmall - 2,
    fontWeight: typography.medium,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  sliderContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sliderLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
  },
  sliderValue: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  photoEditHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  photoEditHintText: {
    fontSize: typography.bodySmall - 2,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
  },
  modalScroll: {
    padding: spacing.lg,
  },
  brushSectionTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  brushGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  brushOption: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  brushOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '15',
  },
  brushOptionLocked: {
    opacity: 0.5,
  },
  brushOptionText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
    textAlign: 'center',
  },
  lockIcon: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  premiumSection: {
    marginTop: spacing.md,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  premiumBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  premiumBadgeText: {
    fontSize: typography.bodySmall - 2,
    fontWeight: typography.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  paletteOption: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  paletteOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  paletteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  paletteInfo: {
    flex: 1,
  },
  paletteName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs / 2,
  },
  paletteDescription: {
    fontSize: typography.bodySmall,
  },
  paletteColors: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  paletteColorSwatch: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stickerOption: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stickerLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
    textAlign: 'center',
  },
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  patternOption: {
    width: '45%',
    aspectRatio: 1.5,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '15',
  },
  patternLabel: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  shareContent: {
    padding: spacing.lg,
  },
  shareOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shareOptionLabel: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  shareToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  shareToggleActive: {
    backgroundColor: colors.primary,
  },
  shareToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  shareToggleThumbActive: {
    alignSelf: 'flex-end',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  categoryOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
  },
  categoryOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '15',
  },
  categoryOptionText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shareButtonDisabled: {
    opacity: 0.4,
  },
  shareButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  successIcon: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  successMessage: {
    fontSize: typography.body,
    fontWeight: typography.medium,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  postSaveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  postSaveButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  postSaveButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successModalTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successModalMessage: {
    fontSize: typography.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  successModalNote: {
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    width: '100%',
  },
  successModalNoteText: {
    fontSize: typography.bodySmall,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  successModalButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xxl,
    width: '100%',
    alignItems: 'center',
  },
  successModalButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
});
