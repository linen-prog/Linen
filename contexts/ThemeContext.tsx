
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      console.log('[ThemeContext] Loading theme preference from AsyncStorage');
      const savedTheme = await AsyncStorage.getItem('themeMode');
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'auto') {
        console.log('[ThemeContext] Loaded theme:', savedTheme);
        setThemeModeState(savedTheme);
      } else if (savedTheme) {
        console.warn('[ThemeContext] Invalid theme value, using default:', savedTheme);
        setThemeModeState('auto');
      } else {
        console.log('[ThemeContext] No saved theme, using default: auto');
        setThemeModeState('auto');
      }
    } catch (error) {
      console.error('[ThemeContext] Failed to load theme preference:', error);
      // Use default theme on error
      setThemeModeState('auto');
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      console.log('[ThemeContext] Setting theme mode:', mode);
      
      // Validate mode
      if (mode !== 'light' && mode !== 'dark' && mode !== 'auto') {
        console.error('[ThemeContext] Invalid theme mode:', mode);
        return;
      }
      
      setThemeModeState(mode);
      await AsyncStorage.setItem('themeMode', mode);
      console.log('[ThemeContext] ✅ Theme mode saved:', mode);
    } catch (error) {
      console.error('[ThemeContext] ❌ Failed to save theme preference:', error);
      // Still update state even if save fails
      setThemeModeState(mode);
    }
  };

  // Determine if dark mode should be active
  const isDark = themeMode === 'auto' 
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
