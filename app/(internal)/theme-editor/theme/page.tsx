'use client';

import { useState } from 'react';
import { ColorPicker } from '../components/editors/ColorPicker';
import { NumberInput } from '../components/editors/NumberInput';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, RotateCcw, Palette, Ruler, Type } from 'lucide-react';

interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    muted: string;
    destructive: string;
    background: string;
    foreground: string;
    border: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  typography: {
    fontSize: {
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
}

const defaultTokens: ThemeTokens = {
  colors: {
    primary: '#0f172a',
    secondary: '#64748b',
    accent: '#3b82f6',
    muted: '#f1f5f9',
    destructive: '#ef4444',
    background: '#ffffff',
    foreground: '#0f172a',
    border: '#e2e8f0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  typography: {
    fontSize: {
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
};

export default function ThemeEditorPage() {
  const [tokens, setTokens] = useState<ThemeTokens>(defaultTokens);

  const updateColorToken = (category: keyof ThemeTokens['colors'], value: string) => {
    setTokens(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [category]: value,
      },
    }));
  };

  const updateSpacingToken = (size: keyof ThemeTokens['spacing'], value: number) => {
    setTokens(prev => ({
      ...prev,
      spacing: {
        ...prev.spacing,
        [size]: value,
      },
    }));
  };

  const updateBorderRadiusToken = (size: keyof ThemeTokens['borderRadius'], value: number) => {
    setTokens(prev => ({
      ...prev,
      borderRadius: {
        ...prev.borderRadius,
        [size]: value,
      },
    }));
  };

  const updateFontSizeToken = (size: keyof ThemeTokens['typography']['fontSize'], value: number) => {
    setTokens(prev => ({
      ...prev,
      typography: {
        ...prev.typography,
        fontSize: {
          ...prev.typography.fontSize,
          [size]: value,
        },
      },
    }));
  };

  const updateLineHeightToken = (size: keyof ThemeTokens['typography']['lineHeight'], value: number) => {
    setTokens(prev => ({
      ...prev,
      typography: {
        ...prev.typography,
        lineHeight: {
          ...prev.typography.lineHeight,
          [size]: value,
        },
      },
    }));
  };

  const resetToDefaults = () => {
    setTokens(defaultTokens);
  };

  const exportTokens = () => {
    const dataStr = JSON.stringify(tokens, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'theme-tokens.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Theme Editor</h1>
            <p className="text-gray-600 mt-1">
              Edit design tokens with live preview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetToDefaults}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={exportTokens}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              Phase 3
            </Badge>
            <span>Basic Inline Editors</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <span>Live theme token editing</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editors Panel */}
        <div className="space-y-6">
          <Tabs defaultValue="colors" className="w-full">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              <TabsTrigger value="colors" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="spacing" className="flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="typography" className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Typography
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Color Tokens</CardTitle>
                  <CardDescription>
                    Edit brand and semantic colors
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ColorPicker
                    label="Primary"
                    value={tokens.colors.primary}
                    onChange={(value) => updateColorToken('primary', value)}
                    description="Main brand color"
                  />
                  <ColorPicker
                    label="Secondary"
                    value={tokens.colors.secondary}
                    onChange={(value) => updateColorToken('secondary', value)}
                    description="Secondary brand color"
                  />
                  <ColorPicker
                    label="Accent"
                    value={tokens.colors.accent}
                    onChange={(value) => updateColorToken('accent', value)}
                    description="Interactive elements"
                  />
                  <ColorPicker
                    label="Muted"
                    value={tokens.colors.muted}
                    onChange={(value) => updateColorToken('muted', value)}
                    description="Subtle backgrounds"
                  />
                  <ColorPicker
                    label="Destructive"
                    value={tokens.colors.destructive}
                    onChange={(value) => updateColorToken('destructive', value)}
                    description="Error and danger states"
                  />
                  <ColorPicker
                    label="Border"
                    value={tokens.colors.border}
                    onChange={(value) => updateColorToken('border', value)}
                    description="Element borders"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="spacing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Spacing Tokens</CardTitle>
                  <CardDescription>
                    Adjust layout spacing values
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <NumberInput
                    label="Extra Small (xs)"
                    value={tokens.spacing.xs}
                    onChange={(value) => updateSpacingToken('xs', value)}
                    min={0}
                    max={20}
                    step={1}
                    description="Tight spacing"
                  />
                  <NumberInput
                    label="Small (sm)"
                    value={tokens.spacing.sm}
                    onChange={(value) => updateSpacingToken('sm', value)}
                    min={0}
                    max={30}
                    step={2}
                    description="Small spacing"
                  />
                  <NumberInput
                    label="Medium (md)"
                    value={tokens.spacing.md}
                    onChange={(value) => updateSpacingToken('md', value)}
                    min={0}
                    max={50}
                    step={4}
                    description="Default spacing"
                  />
                  <NumberInput
                    label="Large (lg)"
                    value={tokens.spacing.lg}
                    onChange={(value) => updateSpacingToken('lg', value)}
                    min={0}
                    max={80}
                    step={4}
                    description="Large spacing"
                  />
                  <NumberInput
                    label="Extra Large (xl)"
                    value={tokens.spacing.xl}
                    onChange={(value) => updateSpacingToken('xl', value)}
                    min={0}
                    max={100}
                    step={4}
                    description="Maximum spacing"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Border Radius</CardTitle>
                  <CardDescription>
                    Adjust corner roundness
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <NumberInput
                    label="Small (sm)"
                    value={tokens.borderRadius.sm}
                    onChange={(value) => updateBorderRadiusToken('sm', value)}
                    min={0}
                    max={20}
                    step={1}
                    description="Subtle rounding"
                  />
                  <NumberInput
                    label="Medium (md)"
                    value={tokens.borderRadius.md}
                    onChange={(value) => updateBorderRadiusToken('md', value)}
                    min={0}
                    max={30}
                    step={2}
                    description="Default rounding"
                  />
                  <NumberInput
                    label="Large (lg)"
                    value={tokens.borderRadius.lg}
                    onChange={(value) => updateBorderRadiusToken('lg', value)}
                    min={0}
                    max={50}
                    step={2}
                    description="Strong rounding"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="typography" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Font Sizes</CardTitle>
                  <CardDescription>
                    Adjust text sizing scale
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <NumberInput
                    label="Small (sm)"
                    value={tokens.typography.fontSize.sm}
                    onChange={(value) => updateFontSizeToken('sm', value)}
                    min={10}
                    max={20}
                    step={1}
                    description="Small text"
                  />
                  <NumberInput
                    label="Base"
                    value={tokens.typography.fontSize.base}
                    onChange={(value) => updateFontSizeToken('base', value)}
                    min={12}
                    max={24}
                    step={1}
                    description="Body text"
                  />
                  <NumberInput
                    label="Large (lg)"
                    value={tokens.typography.fontSize.lg}
                    onChange={(value) => updateFontSizeToken('lg', value)}
                    min={16}
                    max={30}
                    step={1}
                    description="Large text"
                  />
                  <NumberInput
                    label="Extra Large (xl)"
                    value={tokens.typography.fontSize.xl}
                    onChange={(value) => updateFontSizeToken('xl', value)}
                    min={18}
                    max={36}
                    step={2}
                    description="Heading text"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Line Heights</CardTitle>
                  <CardDescription>
                    Adjust text vertical spacing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <NumberInput
                    label="Tight"
                    value={tokens.typography.lineHeight.tight}
                    onChange={(value) => updateLineHeightToken('tight', value)}
                    min={1}
                    max={2}
                    step={0.05}
                    unit=""
                    description="Compact line height"
                  />
                  <NumberInput
                    label="Normal"
                    value={tokens.typography.lineHeight.normal}
                    onChange={(value) => updateLineHeightToken('normal', value)}
                    min={1.2}
                    max={2.5}
                    step={0.05}
                    unit=""
                    description="Default line height"
                  />
                  <NumberInput
                    label="Relaxed"
                    value={tokens.typography.lineHeight.relaxed}
                    onChange={(value) => updateLineHeightToken('relaxed', value)}
                    min={1.4}
                    max={3}
                    step={0.05}
                    unit=""
                    description="Spacious line height"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Preview</CardTitle>
              <CardDescription>
                See your changes applied in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="p-6 rounded-lg border-2"
                style={{
                  backgroundColor: tokens.colors.background,
                  borderColor: tokens.colors.border,
                  borderRadius: `${tokens.borderRadius.lg}px`,
                }}
              >
                <div className="space-y-4">
                  <h3 
                    style={{ 
                      color: tokens.colors.primary,
                      fontSize: `${tokens.typography.fontSize.xl}px`,
                      lineHeight: tokens.typography.lineHeight.tight,
                    }}
                    className="font-bold"
                  >
                    Sample Heading
                  </h3>
                  
                  <p 
                    style={{ 
                      color: tokens.colors.foreground,
                      fontSize: `${tokens.typography.fontSize.base}px`,
                      lineHeight: tokens.typography.lineHeight.normal,
                    }}
                  >
                    This is sample body text that demonstrates how your typography tokens affect readability and visual hierarchy.
                  </p>

                  <div className="flex items-center gap-2">
                    <div
                      className="px-4 py-2 rounded text-white font-medium"
                      style={{
                        backgroundColor: tokens.colors.primary,
                        borderRadius: `${tokens.borderRadius.md}px`,
                        fontSize: `${tokens.typography.fontSize.sm}px`,
                        padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
                      }}
                    >
                      Primary Button
                    </div>
                    
                    <div
                      className="px-4 py-2 rounded border"
                      style={{
                        backgroundColor: tokens.colors.background,
                        borderColor: tokens.colors.border,
                        color: tokens.colors.foreground,
                        borderRadius: `${tokens.borderRadius.md}px`,
                        fontSize: `${tokens.typography.fontSize.sm}px`,
                        padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
                      }}
                    >
                      Secondary Button
                    </div>
                  </div>

                  <div
                    className="p-4 rounded"
                    style={{
                      backgroundColor: tokens.colors.muted,
                      borderRadius: `${tokens.borderRadius.sm}px`,
                      padding: `${tokens.spacing.md}px`,
                    }}
                  >
                    <p 
                      style={{ 
                        color: tokens.colors.secondary,
                        fontSize: `${tokens.typography.fontSize.sm}px`,
                        lineHeight: tokens.typography.lineHeight.relaxed,
                      }}
                    >
                      This muted section shows how your color and spacing tokens work together to create visual hierarchy.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Color Palette</CardTitle>
              <CardDescription>
                Current color tokens visualization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(tokens.colors).map(([name, value]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: value }}
                    />
                    <div>
                      <div className="font-medium text-sm capitalize">{name}</div>
                      <div className="text-xs text-gray-500 font-mono">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 