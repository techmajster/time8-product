'use client';

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
        'accent-success': string;
        'accent-warning': string;
        'accent-info': string;
        'accent-destructive': string;
        'surface-primary': string;
        'surface-secondary': string;
        'surface-tertiary': string;
        'border-success': string;
        'border-warning': string;
        'border-info': string;
        'border-destructive': string;
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
        'accent-success': string;
        'accent-warning': string;
        'accent-info': string;
        'accent-destructive': string;
        'surface-primary': string;
        'surface-secondary': string;
        'surface-tertiary': string;
        'border-success': string;
        'border-warning': string;
        'border-info': string;
        'border-destructive': string;
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
  spacing: {
    xs: number;
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
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Simple interface for backwards compatibility
interface SimpleTokens {
  colors: {
    semantic: {
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
      ring: string;
    };
  };
  borderRadius?: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography?: {
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
  spacing?: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows?: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// Utility to convert HSL color string to HSL values for CSS variables
function hslStringToValues(hslString: string): string {
  const match = hslString.match(/hsl\(([^)]+)\)/);
  if (match) {
    // Extract the values inside hsl()
    let values = match[1].trim();
    
    // Convert comma-separated to space-separated format (modern CSS)
    // Replace commas with spaces and clean up extra whitespace
    values = values.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    
    return values;
  }
  return '0 0% 0%';
}

// Function to generate dark mode variant of a color
function generateDarkModeVariant(lightColor: string): string {
  // Parse HSL string like "hsl(267, 85%, 60%)"
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
}

// Real-time preview function - applies CSS variables immediately for live feedback
export function applyThemePreview(tokens: DesignSystemTokens | SimpleTokens, isDark: boolean = false) {
  console.log('🎨 Applying theme preview with real-time CSS variables');
  console.log('Dark mode:', isDark);
  console.log('Tokens structure:', tokens);
  
  const root = document.documentElement;
  
  // Handle dark mode class
  if (isDark) {
    root.classList.add('dark');
    console.log('✅ Added dark class to document');
  } else {
    root.classList.remove('dark');
    console.log('✅ Removed dark class from document');
  }
  
  // Determine which color set to use
  let colorSet: Record<string, string>;
  
  // Check if it's the new format with light/dark
  if ('light' in tokens.colors.semantic && 'dark' in tokens.colors.semantic) {
    // New format - use appropriate mode
    const enhancedTokens = tokens as DesignSystemTokens;
    colorSet = isDark ? enhancedTokens.colors.semantic.dark : enhancedTokens.colors.semantic.light;
    console.log('Using enhanced format with', isDark ? 'dark' : 'light', 'colors');
  } else {
    // Old format - use semantic colors directly and optionally generate dark variants
    const simpleTokens = tokens as SimpleTokens;
    colorSet = simpleTokens.colors.semantic;
    console.log('Using simple format with semantic colors');
    
    // If dark mode is requested but we only have light colors, generate dark variants
    if (isDark) {
      colorSet = Object.fromEntries(
        Object.entries(colorSet).map(([key, value]) => [key, generateDarkModeVariant(value)])
      );
      console.log('Generated dark variants for simple format');
    }
  }
  
  console.log('Final color set:', colorSet);
  
  // Apply color variables for immediate preview
  Object.entries(colorSet).forEach(([key, value]) => {
    const cssValue = hslStringToValues(value);
    root.style.setProperty(`--${key}`, cssValue);
    console.log(`Set --${key}: ${cssValue} (from ${value})`);
  });
  
  // Apply border radius with safety check
  if (tokens.borderRadius && tokens.borderRadius.lg) {
    const radiusValue = `${tokens.borderRadius.lg / 16}rem`;
    root.style.setProperty('--radius', radiusValue);
    console.log(`Set --radius: ${radiusValue}`);
  }
  
  console.log('✅ Theme preview applied successfully!');
}

// Legacy function for backwards compatibility
export function applyThemeGlobally(tokens: DesignSystemTokens | SimpleTokens, isDark: boolean = false) {
  return applyThemePreview(tokens, isDark);
}

// Function to reset to CSS defaults (removes inline styles)
export function resetThemePreview() {
  const root = document.documentElement;
  
  // Remove all custom CSS variables we might have set
  const semanticKeys = [
    'background', 'foreground', 'primary', 'primary-foreground',
    'secondary', 'secondary-foreground', 'muted', 'muted-foreground',
    'accent', 'accent-foreground', 'destructive', 'destructive-foreground',
    'success', 'success-foreground', 'warning', 'warning-foreground',
    'info', 'info-foreground', 'border', 'input', 'ring'
  ];
  
  semanticKeys.forEach(key => {
    root.style.removeProperty(`--${key}`);
  });
  
  root.style.removeProperty('--radius');
  
  console.log('Theme preview reset to CSS defaults');
}

// Function to export theme as CSS
export function exportThemeAsCSS(tokens: DesignSystemTokens | SimpleTokens): string {
  let lightColors: Record<string, string>;
  let darkColors: Record<string, string>;
  
  // Check if it's the new format with light/dark
  if ('light' in tokens.colors.semantic && 'dark' in tokens.colors.semantic) {
    // New format - use both light and dark
    const enhancedTokens = tokens as DesignSystemTokens;
    lightColors = enhancedTokens.colors.semantic.light;
    darkColors = enhancedTokens.colors.semantic.dark;
  } else {
    // Old format - use semantic as light and generate dark
    const simpleTokens = tokens as SimpleTokens;
    lightColors = simpleTokens.colors.semantic;
    darkColors = Object.fromEntries(
      Object.entries(lightColors).map(([key, value]) => [key, generateDarkModeVariant(value)])
    );
  }
  
  const lightVariables = Object.entries(lightColors)
    .map(([key, value]) => `  --${key}: ${hslStringToValues(value)};`)
    .join('\n');

  const darkVariables = Object.entries(darkColors)
    .map(([key, value]) => `  --${key}: ${hslStringToValues(value)};`)
    .join('\n');

  const borderRadius = tokens.borderRadius?.lg 
    ? `  --radius: ${tokens.borderRadius.lg / 16}rem;`
    : '';

  return `:root {
${lightVariables}
${borderRadius}
}

.dark {
${darkVariables}
${borderRadius}
}`;
}

// Function to generate Tailwind config from tokens
export function exportAsTailwindConfig(tokens: DesignSystemTokens | SimpleTokens): string {
  return `module.exports = {
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))'
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      spacing: {
        xs: '${tokens.spacing?.xs ? tokens.spacing.xs / 16 : 0.25}rem',
        sm: '${tokens.spacing?.sm ? tokens.spacing.sm / 16 : 0.5}rem',
        md: '${tokens.spacing?.md ? tokens.spacing.md / 16 : 1}rem',
        lg: '${tokens.spacing?.lg ? tokens.spacing.lg / 16 : 1.5}rem',
        xl: '${tokens.spacing?.xl ? tokens.spacing.xl / 16 : 2}rem',
      }
    }
  }
}`;
}

// Function to apply the example-tailwind theme for testing
export function applyExampleTailwindTheme() {
  const root = document.documentElement;

  // Light mode CSS variables from example-tailwind
  root.style.setProperty('--background', '0 0% 100%');
  root.style.setProperty('--foreground', '240 10% 3.9%');
  root.style.setProperty('--card', '0 0% 100%');
  root.style.setProperty('--card-foreground', '240 10% 3.9%');
  root.style.setProperty('--popover', '0 0% 100%');
  root.style.setProperty('--popover-foreground', '240 10% 3.9%');
  root.style.setProperty('--primary', '142.1 76.2% 36.3%');
  root.style.setProperty('--primary-foreground', '355.7 100% 97.3%');
  root.style.setProperty('--secondary', '240 4.8% 95.9%');
  root.style.setProperty('--secondary-foreground', '240 5.9% 10%');
  root.style.setProperty('--muted', '240 4.8% 95.9%');
  root.style.setProperty('--muted-foreground', '240 3.8% 46.1%');
  root.style.setProperty('--accent', '240 4.8% 95.9%');
  root.style.setProperty('--accent-foreground', '240 5.9% 10%');
  root.style.setProperty('--destructive', '0 84.2% 60.2%');
  root.style.setProperty('--destructive-foreground', '0 0% 98%');
  root.style.setProperty('--border', '240 5.9% 90%');
  root.style.setProperty('--input', '240 5.9% 90%');
  root.style.setProperty('--ring', '142.1 76.2% 36.3%');
  root.style.setProperty('--radius', '0.65rem');
  root.style.setProperty('--chart-1', '12 76% 61%');
  root.style.setProperty('--chart-2', '173 58% 39%');
  root.style.setProperty('--chart-3', '197 37% 24%');
  root.style.setProperty('--chart-4', '43 74% 66%');
  root.style.setProperty('--chart-5', '27 87% 67%');
  
  console.log('✅ Applied example-tailwind theme successfully!');
}

// Function to apply dark mode version
export function applyExampleTailwindThemeDark() {
  const root = document.documentElement;

  // Dark mode CSS variables from example-tailwind
  root.style.setProperty('--background', '20 14.3% 4.1%');
  root.style.setProperty('--foreground', '0 0% 95%');
  root.style.setProperty('--card', '24 9.8% 10%');
  root.style.setProperty('--card-foreground', '0 0% 95%');
  root.style.setProperty('--popover', '0 0% 9%');
  root.style.setProperty('--popover-foreground', '0 0% 95%');
  root.style.setProperty('--primary', '142.1 70.6% 45.3%');
  root.style.setProperty('--primary-foreground', '144.9 80.4% 10%');
  root.style.setProperty('--secondary', '240 3.7% 15.9%');
  root.style.setProperty('--secondary-foreground', '0 0% 98%');
  root.style.setProperty('--muted', '0 0% 15%');
  root.style.setProperty('--muted-foreground', '240 5% 64.9%');
  root.style.setProperty('--accent', '12 6.5% 15.1%');
  root.style.setProperty('--accent-foreground', '0 0% 98%');
  root.style.setProperty('--destructive', '0 62.8% 30.6%');
  root.style.setProperty('--destructive-foreground', '0 85.7% 97.3%');
  root.style.setProperty('--border', '240 3.7% 15.9%');
  root.style.setProperty('--input', '240 3.7% 15.9%');
  root.style.setProperty('--ring', '142.4 71.8% 29.2%');
  root.style.setProperty('--chart-1', '220 70% 50%');
  root.style.setProperty('--chart-2', '160 60% 45%');
  root.style.setProperty('--chart-3', '30 80% 55%');
  root.style.setProperty('--chart-4', '280 65% 60%');
  root.style.setProperty('--chart-5', '340 75% 55%');
  
  console.log('🌙 Applied example-tailwind dark theme successfully!');
} 