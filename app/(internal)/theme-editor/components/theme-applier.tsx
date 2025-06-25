'use client';

import { useEffect } from 'react';

interface DesignSystemTokens {
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
  typography: {
    fontSize: {
      xs: number;
      sm: number;
      base: number;
      lg: number;
      xl: number;
      '2xl': number;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
}

// Utility to convert HSL color string to HSL values for CSS variables
function hslStringToValues(hslString: string): string {
  const match = hslString.match(/hsl\(([^)]+)\)/);
  return match ? match[1] : '0 0% 0%';
}

// Component that applies tokens to actual CSS variables
export function ThemeApplier({ tokens }: { tokens: DesignSystemTokens }) {
  useEffect(() => {
    const root = document.documentElement;

    // Apply semantic colors
    Object.entries(tokens.colors.semantic).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, hslStringToValues(value));
    });

    // Apply border radius
    root.style.setProperty('--radius', `${tokens.borderRadius.lg / 16}rem`);

    // Note: Typography and spacing would need more complex mapping to apply globally
    // For now, we focus on colors and radius which are the most impactful

    return () => {
      // Optional: Reset to original values on cleanup
      // This could be implemented by storing original values first
    };
  }, [tokens]);

  return null; // This component doesn't render anything
}

// Hook for applying tokens programmatically
export function useThemeTokens(tokens: DesignSystemTokens) {
  useEffect(() => {
    const root = document.documentElement;

    // Apply semantic colors to CSS variables
    Object.entries(tokens.colors.semantic).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, hslStringToValues(value));
    });

    // Apply border radius
    root.style.setProperty('--radius', `${tokens.borderRadius.lg / 16}rem`);

  }, [tokens]);
}

// Function to export theme as CSS
export function exportThemeAsCSS(tokens: DesignSystemTokens): string {
  const cssVariables = Object.entries(tokens.colors.semantic)
    .map(([key, value]) => `  --${key}: ${hslStringToValues(value)};`)
    .join('\n');

  const borderRadius = `  --radius: ${tokens.borderRadius.lg / 16}rem;`;

  return `:root {
${cssVariables}
${borderRadius}
}

.dark {
  /* Dark mode variants would be defined here */
  /* This would require extending the token structure */
}`;
}

// Function to generate Tailwind config from tokens
export function exportAsTailwindConfig(tokens: DesignSystemTokens): string {
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
      fontSize: {
        xs: '${tokens.typography.fontSize.xs / 16}rem',
        sm: '${tokens.typography.fontSize.sm / 16}rem',
        base: '${tokens.typography.fontSize.base / 16}rem',
        lg: '${tokens.typography.fontSize.lg / 16}rem',
        xl: '${tokens.typography.fontSize.xl / 16}rem',
        '2xl': '${tokens.typography.fontSize['2xl'] / 16}rem',
      },
      spacing: {
        xs: '${tokens.spacing.xs / 16}rem',
        sm: '${tokens.spacing.sm / 16}rem',
        md: '${tokens.spacing.md / 16}rem',
        lg: '${tokens.spacing.lg / 16}rem',
        xl: '${tokens.spacing.xl / 16}rem',
        '2xl': '${tokens.spacing['2xl'] / 16}rem',
      }
    }
  }
}`;
} 