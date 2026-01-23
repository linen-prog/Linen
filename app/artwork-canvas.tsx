
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Alert, ScrollView, Modal, Dimensions, ActivityIndicator, Platform, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as ImagePicker from 'expo-image-picker';
import { authenticatedPost } from '@/utils/api';
import Slider from '@react-native-community/slider';
import Svg, { Path, Image as SvgImage } from 'react-native-svg';

type BrushType = 'pencil' | 'marker' | 'pen' | 'watercolor' | 'spray' | 'chalk' | 'ink' | 'charcoal' | 'oil' | 'pastel' | 'crayon' | 'glitter';

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

// Free tier colors (16 colors, 2 rows)
const FREE_COLORS = [
  // Row 1
  '#000000', '#FFFFFF', '#808080', '#8B4513', '#FF0000', '#FF8C00', '#FFD700', '#008000',
  // Row 2
  '#0000FF', '#800080', '#FFC0CB', '#F5F5DC', '#006400', '#000080', '#800000', '#D2B48C',
];

// Premium tier colors (48 colors, 4 rows)
const PREMIUM_COLORS = [
  // Grayscale and neutrals
  '#000000', '#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6', '#F5F5F5', '#FFFFFF',
  // Warm colors (reds, oranges, yellows, browns)
  '#8B0000', '#DC143C', '#FF0000', '#FF4500', '#FF6347', '#FF8C00', '#FFA500', '#FFD700', '#FFFF00', '#F0E68C', '#8B4513', '#D2691E',
  // Cool colors (greens, blues, purples)
  '#006400', '#008000', '#228B22', '#32CD32', '#90EE90', '#000080', '#0000FF', '#4169E1', '#87CEEB', '#4B0082', '#800080', '#9370DB',
  // Pastels and specialty shades
  '#FFB6C1', '#FFC0CB', '#FFE4E1', '#FFDAB9', '#F0E68C', '#E0FFFF', '#B0E0E6', '#DDA0DD', '#EE82EE', '#F5DEB3', '#D2B48C', '#BC8F8F',
];

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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBrushPicker, setShowBrushPicker] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareAnonymous, setShareAnonymous] = useState(false);
  const [shareCategory, setShareCategory] = useState<'feed' | 'wisdom' | 'care' | 'prayers'>('feed');
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const canvasRef = useRef<View>(null);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);

  useEffect(() => {
    const loadExistingArtwork = async () => {
      try {
        const { authenticatedGet } = await import('@/utils/api');
        const response = await authenticatedGet<{ artworkData: string; backgroundImage?: string } | null>('/api/artwork/current');
        
        if (response) {
          console.log('Existing artwork loaded');
          if (response.backgroundImage) {
            setBackgroundImage(response.backgroundImage);
          }
          // Parse and restore strokes from artworkData
          try {
            const parsed = JSON.parse(response.artworkData);
            if (parsed.strokes && Array.isArray(parsed.strokes)) {
              setStrokes(parsed.strokes);
            }
          } catch (e) {
            console.error('Failed to parse artwork data:', e);
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load existing artwork:', error);
        setIsLoading(false);
      }
    };

    loadExistingArtwork();
  }, []);

  // Create PanResponder for touch drawing
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        console.log('[Canvas] onStartShouldSetPanResponder called');
        return true;
      },
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        console.log('[Canvas] Touch started at:', locationX, locationY, 'Canvas size:', canvasLayout.width, 'x', canvasLayout.height);
        console.log('[Canvas] Current brush:', selectedBrush, 'Color:', selectedColor, 'Size:', brushSize);
        
        const isEraser = selectedBrush === 'pencil' && selectedColor === '#FFFFFF';
        const newStroke: DrawingStroke = {
          points: [{ x: locationX, y: locationY }],
          color: selectedColor,
          brushType: selectedBrush,
          brushSize: brushSize,
          isEraser: isEraser,
        };
        currentStrokeRef.current = newStroke;
        setCurrentStroke(newStroke);
        setUndoneStrokes([]);
        console.log('[Canvas] New stroke created with', newStroke.points.length, 'points');
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        
        if (currentStrokeRef.current) {
          const updatedStroke = {
            ...currentStrokeRef.current,
            points: [...currentStrokeRef.current.points, { x: locationX, y: locationY }],
          };
          currentStrokeRef.current = updatedStroke;
          setCurrentStroke(updatedStroke);
          
          // Log every 10th point to avoid spam
          if (updatedStroke.points.length % 10 === 0) {
            console.log('[Canvas] Stroke now has', updatedStroke.points.length, 'points');
          }
        } else {
          console.log('[Canvas] WARNING: onPanResponderMove called but no current stroke!');
        }
      },
      onPanResponderRelease: () => {
        console.log('[Canvas] Touch ended, current stroke has', currentStrokeRef.current?.points.length || 0, 'points');
        if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
          setStrokes(prev => {
            const newStrokes = [...prev, currentStrokeRef.current!];
            console.log('[Canvas] Stroke saved! Total strokes:', newStrokes.length);
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
    setUndoneStrokes([...undoneStrokes, lastStroke]);
  };

  const handleRedo = () => {
    if (undoneStrokes.length === 0) {
      console.log('[Canvas] No strokes to redo');
      return;
    }
    
    console.log('[Canvas] User redoing stroke');
    const strokeToRedo = undoneStrokes[undoneStrokes.length - 1];
    setStrokes([...strokes, strokeToRedo]);
    setUndoneStrokes(undoneStrokes.slice(0, -1));
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
          },
        },
      ]
    );
  };

  const handleEraser = () => {
    console.log('[Canvas] User activating eraser');
    setSelectedBrush('pencil');
    setSelectedColor('#FFFFFF');
  };

  const handleUploadPhoto = async () => {
    console.log('[Canvas] User requesting to upload photo');
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('[Canvas] User selected photo:', result.assets[0].uri);
      setIsUploadingPhoto(true);

      try {
        // Upload photo to backend
        const formData = new FormData();
        
        // Prepare file data for upload
        const fileUri = result.assets[0].uri;
        const fileName = result.assets[0].fileName || 'photo.jpg';
        const fileType = result.assets[0].mimeType || 'image/jpeg';
        
        console.log('[Canvas] Preparing to upload photo:', { fileName, fileType, uri: fileUri });
        
        // For web, fetch the blob and append it
        if (Platform.OS === 'web') {
          const response = await fetch(fileUri);
          const blob = await response.blob();
          formData.append('image', blob, fileName);
        } else {
          // For native, use the file object format
          formData.append('image', {
            uri: fileUri,
            type: fileType,
            name: fileName,
          } as any);
        }

        // Make authenticated request with multipart form data
        const { BACKEND_URL } = await import('@/utils/api');
        const { getBearerToken } = await import('@/lib/auth');
        const token = await getBearerToken();
        
        if (!token) {
          throw new Error('Authentication required to upload photos');
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
          throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        const uploadResult = await uploadResponse.json() as { url: string; filename: string };
        console.log('[Canvas] Photo uploaded successfully:', uploadResult);
        
        // Use the full backend URL for the uploaded image
        const imageUrl = uploadResult.url.startsWith('http') 
          ? uploadResult.url 
          : `${BACKEND_URL}${uploadResult.url}`;
        
        setBackgroundImage(imageUrl);
        setIsUploadingPhoto(false);
      } catch (error) {
        console.error('[Canvas] Failed to upload photo:', error);
        setIsUploadingPhoto(false);
        Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
      }
    }
  };

  const handleSave = async () => {
    if (strokes.length === 0 && !backgroundImage) {
      Alert.alert('Empty Canvas', 'Please add some content before saving.');
      return;
    }

    console.log('[Canvas] User saving artwork', { strokeCount: strokes.length, hasBackground: !!backgroundImage });
    setIsSaving(true);

    try {
      const artworkData = JSON.stringify({ 
        strokes, 
        backgroundImage,
        brushType: selectedBrush,
        brushSize,
        color: selectedColor,
      });
      
      await authenticatedPost('/api/artwork/save', {
        artworkData,
        photoUrls: backgroundImage ? [backgroundImage] : [],
      });
      
      console.log('Artwork saved successfully');
      setIsSaving(false);
      Alert.alert('Saved', 'Your artwork has been saved.', [
        {
          text: 'Share to Community',
          onPress: () => setShowShareModal(true),
        },
        {
          text: 'Done',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Failed to save artwork:', error);
      setIsSaving(false);
      Alert.alert('Error', 'Failed to save artwork. Please try again.');
    }
  };

  const handleShareToCommunity = async () => {
    console.log('[Canvas] User sharing artwork to community', { category: shareCategory, anonymous: shareAnonymous });
    setIsSharing(true);

    try {
      // First, ensure artwork is saved
      const artworkData = JSON.stringify({ 
        strokes, 
        backgroundImage,
        brushType: selectedBrush,
        brushSize,
        color: selectedColor,
      });
      
      await authenticatedPost('/api/artwork/save', {
        artworkData,
        photoUrls: backgroundImage ? [backgroundImage] : [],
      });

      // Then share to community
      await authenticatedPost('/api/community/posts', {
        content: 'Shared my artwork from this week\'s reflection',
        category: shareCategory,
        isAnonymous: shareAnonymous,
        contentType: 'somatic',
      });

      console.log('Artwork shared to community successfully');
      setIsSharing(false);
      setShowShareModal(false);
      Alert.alert('Shared', 'Your artwork has been shared with the community.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to share artwork:', error);
      setIsSharing(false);
      Alert.alert('Error', 'Failed to share artwork. Please try again.');
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
  };

  const handleColorSelect = (color: string) => {
    console.log('[Canvas] User selected color:', color);
    setSelectedColor(color);
    setShowColorPicker(false);
  };

  // Convert stroke points to SVG path data
  const strokeToPath = (stroke: DrawingStroke): string => {
    if (!stroke || !stroke.points || stroke.points.length === 0) {
      console.log('[Canvas] Warning: Attempted to render stroke with no points');
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

  const availableColors = isPremium ? PREMIUM_COLORS : FREE_COLORS;
  const freeBrushes = BRUSH_OPTIONS.filter(b => !b.isPremium);
  const premiumBrushes = BRUSH_OPTIONS.filter(b => b.isPremium);

  const saveButtonText = isSaving ? 'Saving...' : 'Save Artwork';
  const headerTitle = 'Create Artwork';
  const canvasPlaceholderText = 'Touch and drag to draw on the canvas';
  const brushSizeLabel = 'Brush Size';
  const brushPickerTitle = 'Select Brush';
  const colorPickerTitle = 'Select Color';
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
  const canSave = strokes.length > 0 || backgroundImage !== null;

  const selectedBrushLabel = BRUSH_OPTIONS.find(b => b.id === selectedBrush)?.label || 'Pencil';
  const isEraserMode = selectedColor === '#FFFFFF';

  // All strokes to render (completed + current)
  const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
  
  // Debug logging for rendering
  useEffect(() => {
    console.log('[Canvas] Rendering update - Total strokes:', strokes.length, 'Current stroke:', currentStroke ? 'yes' : 'no', 'All strokes to render:', allStrokes.length);
  }, [strokes.length, currentStroke, allStrokes.length]);

  return (
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
            {...panResponder.panHandlers}
          >
            {canvasLayout.width > 0 && canvasLayout.height > 0 && (
              <Svg 
                width={canvasLayout.width} 
                height={canvasLayout.height}
                style={styles.svgCanvas}
              >
                {/* Background image if exists */}
                {backgroundImage && (
                  <SvgImage
                    href={backgroundImage}
                    width={canvasLayout.width}
                    height={canvasLayout.height}
                    preserveAspectRatio="xMidYMid slice"
                  />
                )}
                
                {/* Render all strokes */}
                {allStrokes.map((stroke, index) => {
                  const pathData = strokeToPath(stroke);
                  if (!pathData) {
                    return null;
                  }
                  return (
                    <Path
                      key={index}
                      d={pathData}
                      stroke={stroke.color}
                      strokeWidth={stroke.brushSize}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      opacity={stroke.isEraser ? 1 : 0.9}
                    />
                  );
                })}
              </Svg>
            )}
            
            {!backgroundImage && strokes.length === 0 && !currentStroke && (
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

          {/* Color Selector */}
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: selectedColor, borderWidth: 2, borderColor: cardBg }]}
            onPress={() => {
              console.log('[Canvas] User opening color picker');
              setShowColorPicker(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.colorPreview} />
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

        {/* Brush Size Slider */}
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
              setBrushSize(value);
            }}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
        </View>

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
              {/* Free Brushes */}
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

              {/* Premium Brushes */}
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
              {/* Anonymous Toggle */}
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

              {/* Category Selection */}
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

              {/* Share Button */}
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

              {/* Cancel Button */}
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
    </SafeAreaView>
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
    borderColor: colors.error,
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
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
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
});
