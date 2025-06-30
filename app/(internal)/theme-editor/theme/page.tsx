'use client';

import { useState, useEffect, useCallback } from 'react';
import { applyThemePreview, resetThemePreview, applyExampleTailwindTheme, applyExampleTailwindThemeDark } from '../components/theme-applier';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeManager } from '../components/theme/ThemeManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Palette, Square, Type, Move, Moon, Sun, Eye, EyeOff, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { ColorPicker } from '../components/editors/ColorPicker';

// Enhanced Design system tokens interface with separate light/dark colors
interface DesignSystemTokens {
  colors: {
    semantic: {
      light: {
        background: string;
        foreground: string;
        primary: string;
        'primary-foreground': string;
        secondary: string;
        'secondary-foreground': string;
        muted: string;
        'muted-foreground': string;
        accent: string;
        'accent-foreground': string;
        destructive: string;
        'destructive-foreground': string;
        success: string;
        'success-foreground': string;
        warning: string;
        'warning-foreground': string;
        info: string;
        'info-foreground': string;
        border: string;
        input: string;
        'input-border': string;
        ring: string;
        'text-primary': string;
        'text-secondary': string;
        'text-tertiary': string;
        'text-disabled': string;
        'text-inverse': string;
        'text-link': string;
        'text-link-hover': string;
        'text-placeholder': string;
        'heading-primary': string;
        'heading-secondary': string;
      };
      dark: {
        background: string;
        foreground: string;
        primary: string;
        'primary-foreground': string;
        secondary: string;
        'secondary-foreground': string;
        muted: string;
        'muted-foreground': string;
        accent: string;
        'accent-foreground': string;
        destructive: string;
        'destructive-foreground': string;
        success: string;
        'success-foreground': string;
        warning: string;
        'warning-foreground': string;
        info: string;
        'info-foreground': string;
        border: string;
        input: string;
        'input-border': string;
        ring: string;
        'text-primary': string;
        'text-secondary': string;
        'text-tertiary': string;
        'text-disabled': string;
        'text-inverse': string;
        'text-link': string;
        'text-link-hover': string;
        'text-placeholder': string;
        'heading-primary': string;
        'heading-secondary': string;
      };
    };
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    fontSize: {
      xs: number;
      sm: number;
      base: number;
      lg: number;
      xl: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Auto-generate dark mode variant function
const generateDarkModeVariant = (lightColor: string): string => {
  const match = lightColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return lightColor;
  
  const h = parseInt(match[1]);
  const s = parseInt(match[2]);
  const l = parseInt(match[3]);
  
  // Special handling for specific color types
  if (lightColor.includes('100%')) {
    // Pure white backgrounds become dark
    return `hsl(${h}, ${Math.min(s, 15)}%, 4%)`;
  }
  if (lightColor.includes('0%') && s === 0) {
    // Pure black text becomes light
    return `hsl(${h}, ${s}%, 95%)`;
  }
  
  // For colored elements, adjust based on lightness
  if (l > 80) {
    // Very light colors become dark
    return `hsl(${h}, ${Math.max(s - 10, 0)}%, ${Math.max(l - 75, 5)}%)`;
  } else if (l < 20) {
    // Very dark colors become light
    return `hsl(${h}, ${Math.max(s - 10, 0)}%, ${Math.min(l + 75, 95)}%)`;
  } else if (l > 50) {
    // Medium-light colors become darker
    return `hsl(${h}, ${s}%, ${Math.max(l - 40, 10)}%)`;
  } else {
    // Medium-dark colors become lighter
    return `hsl(${h}, ${s}%, ${Math.min(l + 40, 90)}%)`;
  }
};

// Color utility functions
function hslToHex(hslString: string): string {
  // Parse HSL string like "hsl(267, 85%, 60%)"
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return '#000000';
  
  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  let r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): string {
  // Convert hex to RGB first
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0; break;
    }
    h /= 6;
  }
  
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// Function to read current CSS variables and create tokens
const getCurrentThemeFromDOM = (): DesignSystemTokens => {
  if (typeof window === 'undefined') {
    // Server-side fallback - will be replaced when component mounts
    return getFallbackTokens();
  }

  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  // Helper to get CSS variable value and convert to HSL format
  const getCSSVar = (name: string): string => {
    const value = computedStyle.getPropertyValue(`--${name}`).trim();
    if (value) {
      // Convert space-separated values back to HSL format
      return `hsl(${value})`;
    }
    return getFallbackColor(name);
  };

  // Get current radius value
  const radiusValue = computedStyle.getPropertyValue('--radius').trim();
  const currentRadius = radiusValue ? parseFloat(radiusValue) * 16 : 8; // Convert rem to px

  return {
    colors: {
      semantic: {
        light: {
          background: getCSSVar('background'),
          foreground: getCSSVar('foreground'),
          primary: getCSSVar('primary'),
          'primary-foreground': getCSSVar('primary-foreground'),
          secondary: getCSSVar('secondary'),
          'secondary-foreground': getCSSVar('secondary-foreground'),
          muted: getCSSVar('muted'),
          'muted-foreground': getCSSVar('muted-foreground'),
          accent: getCSSVar('accent'),
          'accent-foreground': getCSSVar('accent-foreground'),
          destructive: getCSSVar('destructive'),
          'destructive-foreground': getCSSVar('destructive-foreground'),
          success: getCSSVar('success'),
          'success-foreground': getCSSVar('success-foreground'),
          warning: getCSSVar('warning'),
          'warning-foreground': getCSSVar('warning-foreground'),
          info: getCSSVar('info'),
          'info-foreground': getCSSVar('info-foreground'),
          border: getCSSVar('border'),
          input: getCSSVar('input'),
          'input-border': getCSSVar('input-border') || getCSSVar('border'),
          ring: getCSSVar('ring'),
          'text-primary': getCSSVar('text-primary'),
          'text-secondary': getCSSVar('text-secondary'),
          'text-tertiary': getCSSVar('text-tertiary'),
          'text-disabled': getCSSVar('text-disabled'),
          'text-inverse': getCSSVar('text-inverse'),
          'text-link': getCSSVar('text-link'),
          'text-link-hover': getCSSVar('text-link-hover'),
          'text-placeholder': getCSSVar('text-placeholder'),
          'heading-primary': getCSSVar('heading-primary'),
          'heading-secondary': getCSSVar('heading-secondary'),
        },
        dark: {
          // Auto-generate dark colors from light colors using our smart algorithm
          background: generateDarkModeVariant(getCSSVar('background')),
          foreground: generateDarkModeVariant(getCSSVar('foreground')),
          primary: getCSSVar('primary'), // Keep same primary in dark mode
          'primary-foreground': generateDarkModeVariant(getCSSVar('primary-foreground')),
          secondary: generateDarkModeVariant(getCSSVar('secondary')),
          'secondary-foreground': generateDarkModeVariant(getCSSVar('secondary-foreground')),
          muted: generateDarkModeVariant(getCSSVar('muted')),
          'muted-foreground': generateDarkModeVariant(getCSSVar('muted-foreground')),
          accent: generateDarkModeVariant(getCSSVar('accent')),
          'accent-foreground': generateDarkModeVariant(getCSSVar('accent-foreground')),
          destructive: getCSSVar('destructive'),
          'destructive-foreground': generateDarkModeVariant(getCSSVar('destructive-foreground')),
          success: getCSSVar('success'),
          'success-foreground': generateDarkModeVariant(getCSSVar('success-foreground')),
          warning: getCSSVar('warning'),
          'warning-foreground': getCSSVar('warning-foreground'),
          info: getCSSVar('info'),
          'info-foreground': generateDarkModeVariant(getCSSVar('info-foreground')),
          border: generateDarkModeVariant(getCSSVar('border')),
          input: generateDarkModeVariant(getCSSVar('input')),
          'input-border': getCSSVar('input-border') ? generateDarkModeVariant(getCSSVar('input-border')) : generateDarkModeVariant(getCSSVar('border')),
          ring: getCSSVar('ring'),
          'text-primary': generateDarkModeVariant(getCSSVar('text-primary')),
          'text-secondary': generateDarkModeVariant(getCSSVar('text-secondary')),
          'text-tertiary': generateDarkModeVariant(getCSSVar('text-tertiary')),
          'text-disabled': generateDarkModeVariant(getCSSVar('text-disabled')),
          'text-inverse': generateDarkModeVariant(getCSSVar('text-inverse')),
          'text-link': generateDarkModeVariant(getCSSVar('text-link')),
          'text-link-hover': generateDarkModeVariant(getCSSVar('text-link-hover')),
          'text-placeholder': generateDarkModeVariant(getCSSVar('text-placeholder')),
          'heading-primary': generateDarkModeVariant(getCSSVar('heading-primary')),
          'heading-secondary': generateDarkModeVariant(getCSSVar('heading-secondary')),
        },
      },
    },
    borderRadius: {
      sm: Math.max(currentRadius - 4, 0),
      md: Math.max(currentRadius - 2, 0),
      lg: currentRadius,
      xl: currentRadius + 4,
    },
    typography: {
      fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
  };
};

// Fallback colors for when CSS variables aren't available
const getFallbackColor = (name: string): string => {
  const fallbacks: Record<string, string> = {
    'background': 'hsl(0, 0%, 100%)',
    'foreground': 'hsl(240, 10%, 25%)',
    'primary': 'hsl(214, 100%, 44%)', // Your actual primary color
    'primary-foreground': 'hsl(0, 0%, 100%)',
    'secondary': 'hsl(240, 5%, 93%)',
    'secondary-foreground': 'hsl(240, 6%, 35%)',
    'muted': 'hsl(0, 0%, 86.67%)',
    'muted-foreground': 'hsl(240, 4%, 54%)',
    'accent': 'hsl(270, 8%, 92%)',
    'accent-foreground': 'hsl(240, 6%, 35%)',
    'destructive': 'hsl(0, 84%, 60%)',
    'destructive-foreground': 'hsl(0, 0%, 100%)',
    'success': 'hsl(142, 76%, 36%)',
    'success-foreground': 'hsl(0, 0%, 100%)',
    'warning': 'hsl(48, 96%, 53%)',
    'warning-foreground': 'hsl(26, 83%, 14%)',
    'info': 'hsl(200, 89%, 48%)',
    'info-foreground': 'hsl(0, 0%, 100%)',
    'border': 'hsl(240, 6%, 87%)',
    'input': 'hsl(0, 0%, 100%)',
    'input-border': 'hsl(240, 6%, 87%)',
    'ring': 'hsl(267, 85%, 60%)',
    'text-primary': 'hsl(240, 10%, 25%)',
    'text-secondary': 'hsl(240, 6%, 35%)',
    'text-tertiary': 'hsl(240, 4%, 54%)',
    'text-disabled': 'hsl(240, 3%, 70%)',
    'text-inverse': 'hsl(0, 0%, 100%)',
    'text-link': 'hsl(214, 100%, 44%)',
    'text-link-hover': 'hsl(214, 100%, 35%)',
    'text-placeholder': 'hsl(240, 4%, 54%)',
    'heading-primary': 'hsl(240, 10%, 25%)',
    'heading-secondary': 'hsl(240, 6%, 35%)',
  };
  return fallbacks[name] || 'hsl(0, 0%, 50%)';
};

// Server-side fallback tokens
const getFallbackTokens = (): DesignSystemTokens => {
  return {
    colors: {
      semantic: {
        light: {
          background: 'hsl(0, 0%, 100%)',
          foreground: 'hsl(240, 10%, 25%)',
          primary: 'hsl(214, 100%, 44%)', // Your actual primary color
          'primary-foreground': 'hsl(0, 0%, 100%)',
          secondary: 'hsl(240, 5%, 93%)',
          'secondary-foreground': 'hsl(240, 6%, 35%)',
          muted: 'hsl(0, 0%, 86.67%)',
          'muted-foreground': 'hsl(240, 4%, 54%)',
          accent: 'hsl(270, 8%, 92%)',
          'accent-foreground': 'hsl(240, 6%, 35%)',
          destructive: 'hsl(0, 84%, 60%)',
          'destructive-foreground': 'hsl(0, 0%, 100%)',
          success: 'hsl(142, 76%, 36%)',
          'success-foreground': 'hsl(0, 0%, 100%)',
          warning: 'hsl(48, 96%, 53%)',
          'warning-foreground': 'hsl(26, 83%, 14%)',
          info: 'hsl(200, 89%, 48%)',
          'info-foreground': 'hsl(0, 0%, 100%)',
          border: 'hsl(240, 6%, 87%)',
          input: 'hsl(0, 0%, 100%)',
          'input-border': 'hsl(240, 6%, 87%)',
          ring: 'hsl(267, 85%, 60%)',
          'text-primary': 'hsl(240, 10%, 25%)',
          'text-secondary': 'hsl(240, 6%, 35%)',
          'text-tertiary': 'hsl(240, 4%, 54%)',
          'text-disabled': 'hsl(240, 3%, 70%)',
          'text-inverse': 'hsl(0, 0%, 100%)',
          'text-link': 'hsl(214, 100%, 44%)',
          'text-link-hover': 'hsl(214, 100%, 35%)',
          'text-placeholder': 'hsl(240, 4%, 54%)',
          'heading-primary': 'hsl(240, 10%, 25%)',
          'heading-secondary': 'hsl(240, 6%, 35%)',
        },
        dark: {
          background: 'hsl(240, 10%, 18%)',
          foreground: 'hsl(240, 5%, 92%)',
          primary: 'hsl(214, 100%, 44%)', // Your actual primary color
          'primary-foreground': 'hsl(240, 10%, 18%)',
          secondary: 'hsl(240, 8%, 30%)',
          'secondary-foreground': 'hsl(240, 5%, 85%)',
          muted: 'hsl(240, 10%, 25%)',
          'muted-foreground': 'hsl(240, 5%, 70%)',
          accent: 'hsl(240, 8%, 35%)',
          'accent-foreground': 'hsl(240, 5%, 85%)',
          destructive: 'hsl(0, 84%, 60%)',
          'destructive-foreground': 'hsl(240, 10%, 18%)',
          success: 'hsl(142, 76%, 36%)',
          'success-foreground': 'hsl(145, 80%, 10%)',
          warning: 'hsl(48, 96%, 53%)',
          'warning-foreground': 'hsl(26, 83%, 14%)',
          info: 'hsl(200, 89%, 48%)',
          'info-foreground': 'hsl(0, 0%, 100%)',
          border: 'hsl(240, 8%, 42%)',
          input: 'hsl(240, 10%, 25%)',
          'input-border': 'hsl(240, 8%, 42%)',
          ring: 'hsl(267, 85%, 60%)',
          'text-primary': 'hsl(240, 5%, 92%)',
          'text-secondary': 'hsl(240, 5%, 85%)',
          'text-tertiary': 'hsl(240, 5%, 70%)',
          'text-disabled': 'hsl(240, 4%, 40%)',
          'text-inverse': 'hsl(240, 10%, 18%)',
          'text-link': 'hsl(214, 100%, 44%)',
          'text-link-hover': 'hsl(214, 100%, 55%)',
          'text-placeholder': 'hsl(240, 5%, 50%)',
          'heading-primary': 'hsl(240, 5%, 92%)',
          'heading-secondary': 'hsl(240, 5%, 85%)',
        },
      },
    },
    borderRadius: {
      sm: 4,
      md: 6,
      lg: 8,
      xl: 12,
    },
    typography: {
      fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
  };
};

export default function ThemeEditorPage() {
  const [tokens, setTokens] = useState<DesignSystemTokens>(getFallbackTokens());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRealTimePreview, setIsRealTimePreview] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [currentThemeId, setCurrentThemeId] = useState<string | null>(null);
  const [themeManagementOpen, setThemeManagementOpen] = useState(false);

  // Load current theme from API on component mount
  useEffect(() => {
    const loadCurrentTheme = async () => {
      try {
        const response = await fetch('/api/themes');
        if (response.ok) {
          const data = await response.json();
          console.log('Loaded theme data:', data);
          
          if (data.currentTheme && data.currentTheme.tokens) {
            // Convert old format to new format if needed
            const loadedTokens = data.currentTheme.tokens;
            
            // Check if it's the old format (colors.semantic without light/dark)
            if (loadedTokens.colors?.semantic && !loadedTokens.colors.semantic.light) {
              console.log('Converting old format to new light/dark format');
              const oldColors = loadedTokens.colors.semantic;
              
              // Create new format with light colors as the old colors
              // and auto-generate dark colors
              const newTokens = {
                ...loadedTokens,
                colors: {
                  semantic: {
                    light: oldColors,
                    dark: Object.fromEntries(
                      Object.entries(oldColors).map(([key, value]) => [
                        key,
                        generateDarkModeVariant(value as string)
                      ])
                    )
                  }
                }
              };
              
              setTokens(newTokens);
              setCurrentThemeId(data.currentTheme.id);
            } else {
              // Already in new format
              setTokens(loadedTokens);
              setCurrentThemeId(data.currentTheme.id);
            }
          } else {
            // No saved theme, read current CSS variables
            console.log('No saved theme found, reading from current CSS variables');
            setTokens(getCurrentThemeFromDOM());
          }
        } else {
          // API error, read current CSS variables
          console.log('API error, reading from current CSS variables');
          setTokens(getCurrentThemeFromDOM());
        }
      } catch (error) {
        console.error('Error loading current theme:', error);
        // Fallback to reading current CSS variables
        setTokens(getCurrentThemeFromDOM());
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentTheme();
  }, []);

  // Apply theme preview when tokens change (if real-time preview is enabled)
  useEffect(() => {
    if (isRealTimePreview && tokens) {
      // Use the appropriate color set based on dark mode
      const colorSet = isDarkMode ? tokens.colors.semantic.dark : tokens.colors.semantic.light;
      
      // Create a temporary token structure for the applier
      const previewTokens = {
        ...tokens,
        colors: {
          semantic: colorSet
        }
      };
      
      applyThemePreview(previewTokens, false); // Don't auto-generate since we're using manual colors
    }
  }, [tokens, isDarkMode, isRealTimePreview]);

  const updateLightColor = (colorKey: string, value: string) => {
    setTokens(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        semantic: {
          ...prev.colors.semantic,
          light: {
            ...prev.colors.semantic.light,
            [colorKey]: value,
          },
        },
      },
    }));
  };

  const updateDarkColor = (colorKey: string, value: string) => {
    setTokens(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        semantic: {
          ...prev.colors.semantic,
          dark: {
            ...prev.colors.semantic.dark,
            [colorKey]: value,
          },
        },
      },
    }));
  };

  const generateDarkColorsFromLight = () => {
    const lightColors = tokens.colors.semantic.light;
    const generatedDark = Object.fromEntries(
      Object.entries(lightColors).map(([key, value]) => [
        key,
        generateDarkModeVariant(value)
      ])
    ) as typeof tokens.colors.semantic.dark;
    
    setTokens(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        semantic: {
          ...prev.colors.semantic,
          dark: generatedDark,
        },
      },
    }));
    
    toast.success('Dark mode colors auto-generated from light colors');
  };

  const updateBorderRadius = (key: string, value: number) => {
    setTokens(prev => ({
      ...prev,
      borderRadius: {
        ...prev.borderRadius,
        [key]: value,
      },
    }));
  };

  const updateSpacing = (key: string, value: number) => {
    setTokens(prev => ({
      ...prev,
      spacing: {
        ...prev.spacing,
        [key]: value,
      },
    }));
  };

  const updateTypography = (key: string, value: number) => {
    setTokens(prev => ({
      ...prev,
      typography: {
        ...prev.typography,
        fontSize: {
          ...prev.typography.fontSize,
          [key]: value,
        },
      },
    }));
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleRealTimePreview = () => {
    const newValue = !isRealTimePreview;
    setIsRealTimePreview(newValue);
    
    if (!newValue) {
      // Reset to CSS defaults when disabling real-time preview
      resetThemePreview();
    }
  };

  const handleApplyTheme = async () => {
    try {
      // Save all design tokens to database as current/default theme
      const response = await fetch('/api/themes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentThemeId, // If updating existing theme
          tokens: tokens, // Send all design tokens
          setAsDefault: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save theme');
      }

      const savedTheme = await response.json();
      setCurrentThemeId(savedTheme.id);

      // Apply the current preview
      const colorSet = isDarkMode ? tokens.colors.semantic.dark : tokens.colors.semantic.light;
      const previewTokens = {
        ...tokens,
        colors: {
          semantic: colorSet
        }
      };
      
      applyThemePreview(previewTokens, false);
      toast.success('Theme saved and applied to design system!');
    } catch (error) {
      console.error('Error saving and applying theme:', error);
      toast.error('Error saving theme to database');
    }
  };

  const handleApplyThemeGlobally = async () => {
    try {
      let savedTheme;
      
      if (currentThemeId) {
        // Update existing theme
        const response = await fetch('/api/themes', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: currentThemeId,
            tokens: tokens,
            setAsDefault: true
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update theme');
        }

        savedTheme = await response.json();
      } else {
        // Create new default theme
        const response = await fetch('/api/themes', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tokens: tokens,
            setAsDefault: true
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create default theme');
        }

        savedTheme = await response.json();
        setCurrentThemeId(savedTheme.id);
      }

      // Then apply it globally by writing to globals.css
      const applyResponse = await fetch('/api/themes/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          themeId: savedTheme.id
        }),
      });

      if (!applyResponse.ok) {
        const error = await applyResponse.json();
        throw new Error(error.error || 'Failed to apply theme globally');
      }

      // Clear all inline styles so CSS file styles take precedence
      resetThemePreview();

      toast.success('Theme applied to design system globally!', {
        description: 'Changes have been written to globals.css and will persist across app restarts.'
      });
    } catch (error) {
      console.error('Error applying theme globally:', error);
      toast.error('Error applying theme globally: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };



  const handleApplyLoadedTheme = async (loadedTokens: any, themeId?: string) => {
    try {
      console.log('Applying loaded theme:', loadedTokens);
      
      // Convert old format if needed
      if (loadedTokens.colors?.semantic && !loadedTokens.colors.semantic.light) {
        const oldColors = loadedTokens.colors.semantic;
        const newTokens = {
          ...loadedTokens,
          colors: {
            semantic: {
              light: oldColors,
              dark: Object.fromEntries(
                Object.entries(oldColors).map(([key, value]) => [
                  key,
                  generateDarkModeVariant(value as string)
                ])
              )
            }
          }
        };
        setTokens(newTokens);
      } else {
        setTokens(loadedTokens);
      }
      
      setCurrentThemeId(themeId || null);
      
      if (isRealTimePreview) {
        const colorSet = isDarkMode ? loadedTokens.colors.semantic.dark : loadedTokens.colors.semantic.light;
        const previewTokens = {
          ...loadedTokens,
          colors: {
            semantic: colorSet
          }
        };
        applyThemePreview(previewTokens, false);
      }
      
      toast.success('Theme loaded and applied successfully!');
    } catch (error) {
      console.error('Error applying loaded theme:', error);
      toast.error('Error applying theme globally');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Design System Editor</h1>
          <p className="text-muted-foreground mt-2">
            Loading current theme...
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Design System Editor</h1>
            <p className="text-muted-foreground mt-2">
              Edit design tokens with separate light and dark mode colors. 
              Connected directly to your shadcn/ui system.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Sheet open={themeManagementOpen} onOpenChange={setThemeManagementOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Theme Management
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[540px] lg:w-[600px]">
                <ThemeManager 
                  currentTokens={{
                    ...tokens,
                    colors: {
                      semantic: tokens.colors.semantic.light // Use light colors for backwards compatibility
                    }
                  }}
                  onApplyTheme={handleApplyLoadedTheme}
                />
              </SheetContent>
            </Sheet>

            <Button variant="outline" onClick={handleApplyTheme}>
              <Palette className="w-4 h-4 mr-2" />
              Save as Current Theme
            </Button>

            <Button onClick={handleApplyThemeGlobally}>
              <Square className="w-4 h-4 mr-2" />
              Apply to Design System
            </Button>
          </div>
        </div>
        
        {/* Preview Controls */}
        <div className="flex items-center gap-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center space-x-2">
            <Switch 
              id="real-time-preview" 
              checked={isRealTimePreview} 
              onCheckedChange={toggleRealTimePreview}
            />
            <Label htmlFor="real-time-preview" className="flex items-center gap-2">
              {isRealTimePreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Real-time Preview
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="dark-mode" 
              checked={isDarkMode} 
              onCheckedChange={toggleDarkMode}
              disabled={!isRealTimePreview}
            />
            <Label htmlFor="dark-mode" className="flex items-center gap-2">
              {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              Dark Mode Preview
            </Label>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isRealTimePreview ? "default" : "secondary"}>
              {isRealTimePreview ? "Live Preview" : "Manual Apply"}
            </Badge>
            {isDarkMode && <Badge variant="outline">Dark Mode</Badge>}
            <Badge variant="outline" className="text-xs">
              CSS File Active
            </Badge>
          </div>
        </div>


      </div>



      {/* Main Content */}
      <div className="space-y-12">
        {/* Colors Section with Light/Dark Tabs */}
        <section id="colors" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Colors</h2>
            <p className="text-muted-foreground">
              Design system colors with separate light and dark mode variants
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Semantic Colors
                {isDarkMode && <Badge variant="outline">Previewing Dark Mode</Badge>}
              </CardTitle>
              <CardDescription>
                Edit light and dark mode colors separately for complete control over your theme
                {isRealTimePreview && " - Changes apply immediately"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="light" className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="light" className="flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      Light Mode
                    </TabsTrigger>
                    <TabsTrigger value="dark" className="flex items-center gap-2">
                      <Moon className="w-4 h-4" />
                      Dark Mode
                    </TabsTrigger>
                  </TabsList>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateDarkColorsFromLight}
                  >
                    Auto-Generate Dark Colors
                  </Button>
                </div>

                <TabsContent value="light" className="space-y-8">
                  {/* UI Component Colors */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">UI Component Colors</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(tokens.colors.semantic.light)
                        .filter(([key]) => !key.startsWith('text-') && !key.startsWith('heading-'))
                        .map(([key, value]) => (
                          <ColorPicker
                            key={key}
                            label={key.replace('-', ' ')}
                            value={value}
                            onChange={(newValue) => updateLightColor(key, newValue)}
                            description={`${key} color (light mode)`}
                          />
                        ))}
                    </div>
                  </div>

                  {/* Typography Colors */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Typography Colors</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(tokens.colors.semantic.light)
                        .filter(([key]) => key.startsWith('text-') || key.startsWith('heading-'))
                        .map(([key, value]) => (
                          <ColorPicker
                            key={key}
                            label={key.replace(/^(text-|heading-)/, '').replace('-', ' ')}
                            value={value}
                            onChange={(newValue) => updateLightColor(key, newValue)}
                            description={`${key.replace('-', ' ')} (light mode)`}
                          />
                        ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="dark" className="space-y-8">
                  {/* UI Component Colors */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">UI Component Colors</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(tokens.colors.semantic.dark)
                        .filter(([key]) => !key.startsWith('text-') && !key.startsWith('heading-'))
                        .map(([key, value]) => (
                          <ColorPicker
                            key={key}
                            label={key.replace('-', ' ')}
                            value={value}
                            onChange={(newValue) => updateDarkColor(key, newValue)}
                            description={`${key} color (dark mode)`}
                          />
                        ))}
                    </div>
                  </div>

                  {/* Typography Colors */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Typography Colors</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(tokens.colors.semantic.dark)
                        .filter(([key]) => key.startsWith('text-') || key.startsWith('heading-'))
                        .map(([key, value]) => (
                          <ColorPicker
                            key={key}
                            label={key.replace(/^(text-|heading-)/, '').replace('-', ' ')}
                            value={value}
                            onChange={(newValue) => updateDarkColor(key, newValue)}
                            description={`${key.replace('-', ' ')} (dark mode)`}
                          />
                        ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* Border Radius Section */}
        <section id="border-radius" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Border Radius</h2>
            <p className="text-muted-foreground">Global border radius for consistent rounded corners</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Square className="w-5 h-5" />
                Border Radius Scale
              </CardTitle>
              <CardDescription>
                Consistent border radius values across your design system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(tokens.borderRadius).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`radius-${key}`} className="text-sm font-medium capitalize">
                      {key} ({value}px)
                    </Label>
                    <Input
                      id={`radius-${key}`}
                      type="number"
                      value={value}
                      onChange={(e) => updateBorderRadius(key, parseInt(e.target.value) || 0)}
                      className="w-full"
                    />
                    <div 
                      className="w-16 h-16 bg-primary"
                      style={{ borderRadius: `${value}px` }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Typography Section */}
        <section id="typography" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Typography</h2>
            <p className="text-muted-foreground">Font size scale for consistent text hierarchy</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Font Size Scale
              </CardTitle>
              <CardDescription>
                Base font sizes used throughout your design system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {Object.entries(tokens.typography.fontSize).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`font-${key}`} className="text-sm font-medium capitalize">
                      {key} ({value}px)
                    </Label>
                    <Input
                      id={`font-${key}`}
                      type="number"
                      value={value}
                      onChange={(e) => updateTypography(key, parseInt(e.target.value) || 0)}
                      className="w-full"
                    />
                    <div 
                      className="text-foreground"
                      style={{ fontSize: `${value}px` }}
                    >
                      Sample Text
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Spacing Section */}
        <section id="spacing" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Spacing</h2>
            <p className="text-muted-foreground">Consistent spacing scale for layout and components</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Move className="w-5 h-5" />
                Spacing Scale
              </CardTitle>
              <CardDescription>
                Spacing values for margins, padding, and gaps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {Object.entries(tokens.spacing).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`spacing-${key}`} className="text-sm font-medium capitalize">
                      {key} ({value}px)
                    </Label>
                    <Input
                      id={`spacing-${key}`}
                      type="number"
                      value={value}
                      onChange={(e) => updateSpacing(key, parseInt(e.target.value) || 0)}
                      className="w-full"
                    />
                    <div className="flex items-center gap-2">
                      <div 
                        className="bg-primary"
                        style={{ width: `${value}px`, height: '16px' }}
                      />
                      <span className="text-xs text-muted-foreground">{value}px</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
} 
