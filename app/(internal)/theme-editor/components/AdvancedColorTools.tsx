'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ColorPicker } from './editors/ColorPicker';
import { 
  Palette, 
  Shuffle, 
  Download, 
  Upload, 
  Check, 
  AlertTriangle,
  Copy,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';

interface AdvancedColorToolsProps {
  currentColors: Record<string, string>;
  onColorsChange: (colors: Record<string, string>) => void;
  isDarkMode: boolean;
}

type ColorHarmony = 'complementary' | 'triadic' | 'analogous' | 'monochromatic' | 'split-complementary';

interface ColorPalette {
  name: string;
  colors: Record<string, string>;
}

export function AdvancedColorTools({ currentColors, onColorsChange, isDarkMode }: AdvancedColorToolsProps) {
  const [selectedBaseColor, setSelectedBaseColor] = useState('hsl(214, 100%, 44%)');
  const [harmonyType, setHarmonyType] = useState<ColorHarmony>('complementary');
  const [generatedPalette, setGeneratedPalette] = useState<Record<string, string>>({});

  // Color harmony algorithms
  const generateColorHarmony = (baseColor: string, type: ColorHarmony): string[] => {
    const hslMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!hslMatch) return [baseColor];

    const [, hueStr, satStr, lightStr] = hslMatch;
    const hue = parseInt(hueStr);
    const sat = parseInt(satStr);
    const light = parseInt(lightStr);

    switch (type) {
      case 'complementary':
        return [
          baseColor,
          `hsl(${(hue + 180) % 360}, ${sat}%, ${light}%)`
        ];
      
      case 'triadic':
        return [
          baseColor,
          `hsl(${(hue + 120) % 360}, ${sat}%, ${light}%)`,
          `hsl(${(hue + 240) % 360}, ${sat}%, ${light}%)`
        ];
      
      case 'analogous':
        return [
          `hsl(${(hue - 30 + 360) % 360}, ${sat}%, ${light}%)`,
          baseColor,
          `hsl(${(hue + 30) % 360}, ${sat}%, ${light}%)`
        ];
      
      case 'monochromatic':
        return [
          `hsl(${hue}, ${sat}%, ${Math.max(light - 20, 10)}%)`,
          baseColor,
          `hsl(${hue}, ${sat}%, ${Math.min(light + 20, 90)}%)`
        ];
      
      case 'split-complementary':
        return [
          baseColor,
          `hsl(${(hue + 150) % 360}, ${sat}%, ${light}%)`,
          `hsl(${(hue + 210) % 360}, ${sat}%, ${light}%)`
        ];
      
      default:
        return [baseColor];
    }
  };

  // Generate a palette based on harmony
  const generateHarmonyPalette = () => {
    const harmonyColors = generateColorHarmony(selectedBaseColor, harmonyType);
    
    // Map harmony colors to semantic color names
    const palette: Record<string, string> = {};
    
    if (harmonyColors.length >= 1) {
      palette.primary = harmonyColors[0];
      palette['accent-success'] = harmonyColors[0];
    }
    if (harmonyColors.length >= 2) {
      palette.secondary = harmonyColors[1];
      palette['accent-warning'] = harmonyColors[1];
    }
    if (harmonyColors.length >= 3) {
      palette.accent = harmonyColors[2];
      palette['accent-info'] = harmonyColors[2];
    }

    setGeneratedPalette(palette);
  };

  // Apply generated palette to the theme
  const applyGeneratedPalette = () => {
    if (Object.keys(generatedPalette).length === 0) {
      toast.error('No palette generated yet');
      return;
    }

    onColorsChange(generatedPalette);
    toast.success(`Applied ${harmonyType} color harmony`);
  };

  // Random palette generation
  const generateRandomPalette = () => {
    const randomHue = Math.floor(Math.random() * 360);
    const randomSat = 60 + Math.floor(Math.random() * 40); // 60-100%
    const randomLight = isDarkMode ? 30 + Math.floor(Math.random() * 30) : 40 + Math.floor(Math.random() * 40); // Adjust for mode
    
    const baseColor = `hsl(${randomHue}, ${randomSat}%, ${randomLight}%)`;
    setSelectedBaseColor(baseColor);
    
    // Auto-generate harmony
    const harmonyColors = generateColorHarmony(baseColor, harmonyType);
    const palette: Record<string, string> = {};
    
    if (harmonyColors.length >= 1) {
      palette.primary = harmonyColors[0];
      palette['accent-success'] = harmonyColors[0];
    }
    if (harmonyColors.length >= 2) {
      palette.secondary = harmonyColors[1];
      palette['accent-warning'] = harmonyColors[1];
    }
    if (harmonyColors.length >= 3) {
      palette.accent = harmonyColors[2];
      palette['accent-info'] = harmonyColors[2];
    }

    setGeneratedPalette(palette);
    onColorsChange(palette);
    toast.success('Generated random color palette');
  };

  // Calculate accessibility contrast
  const calculateContrast = (color1: string, color2: string): number => {
    const getLuminance = (color: string): number => {
      const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (!match) return 0;
      const l = parseInt(match[3]);
      return l / 100;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  };

  // Export current colors as JSON
  const exportPalette = () => {
    const palette = {
      name: `Theme Palette - ${isDarkMode ? 'Dark' : 'Light'}`,
      mode: isDarkMode ? 'dark' : 'light',
      colors: currentColors,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(palette, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-palette-${isDarkMode ? 'dark' : 'light'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Palette exported successfully');
  };

  // Copy color to clipboard
  const copyColorToClipboard = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      toast.success('Color copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy color');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="harmony" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="harmony">Color Harmony</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          <TabsTrigger value="extended">Extended Colors</TabsTrigger>
        </TabsList>

        <TabsContent value="harmony" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Color Harmony Generator
              </CardTitle>
              <CardDescription>
                Generate beautiful color combinations based on color theory principles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Color</Label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded border border-border" 
                      style={{ backgroundColor: selectedBaseColor }}
                    />
                    <Input
                      value={selectedBaseColor}
                      onChange={(e) => setSelectedBaseColor(e.target.value)}
                      placeholder="hsl(214, 100%, 44%)"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Harmony Type</Label>
                  <select 
                    value={harmonyType} 
                    onChange={(e) => setHarmonyType(e.target.value as ColorHarmony)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="complementary">Complementary</option>
                    <option value="triadic">Triadic</option>
                    <option value="analogous">Analogous</option>
                    <option value="monochromatic">Monochromatic</option>
                    <option value="split-complementary">Split Complementary</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={generateHarmonyPalette} variant="outline">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Generate Harmony
                </Button>
                <Button onClick={generateRandomPalette} variant="outline">
                  <Shuffle className="w-4 h-4 mr-2" />
                  Random Palette
                </Button>
                <Button onClick={exportPalette} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Palette
                </Button>
              </div>

              {Object.keys(generatedPalette).length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Generated Palette</h4>
                    <Button onClick={applyGeneratedPalette} size="sm">
                      Apply to Theme
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(generatedPalette).map(([name, color]) => (
                      <div key={name} className="space-y-1">
                        <div 
                          className="w-full h-12 rounded border border-border cursor-pointer"
                          style={{ backgroundColor: color }}
                          onClick={() => copyColorToClipboard(color)}
                        />
                        <div className="text-xs font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{color}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Accessibility Checker
              </CardTitle>
              <CardDescription>
                Check color contrast ratios for WCAG compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Key color combinations to check */}
                {[
                  { name: 'Primary on Background', fg: currentColors.primary, bg: currentColors.background },
                  { name: 'Text on Background', fg: currentColors.foreground, bg: currentColors.background },
                  { name: 'Muted Text on Background', fg: currentColors['muted-foreground'], bg: currentColors.background },
                  { name: 'Success on Background', fg: currentColors.success, bg: currentColors.background },
                  { name: 'Warning on Background', fg: currentColors.warning, bg: currentColors.background },
                  { name: 'Destructive on Background', fg: currentColors.destructive, bg: currentColors.background },
                ].map(({ name, fg, bg }) => {
                  if (!fg || !bg) return null;
                  
                  const contrast = calculateContrast(fg, bg);
                  let level: 'AAA' | 'AA' | 'FAIL' = 'FAIL';
                  if (contrast >= 7) level = 'AAA';
                  else if (contrast >= 4.5) level = 'AA';

                  return (
                    <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex">
                          <div 
                            className="w-6 h-6 rounded-l border border-r-0"
                            style={{ backgroundColor: bg }}
                          />
                          <div 
                            className="w-6 h-6 rounded-r border border-l-0"
                            style={{ backgroundColor: fg }}
                          />
                        </div>
                        <span className="font-medium">{name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={level === 'AAA' ? 'default' : level === 'AA' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {level === 'FAIL' ? (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          {level} ({contrast.toFixed(1)}:1)
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extended" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Extended Semantic Colors
              </CardTitle>
              <CardDescription>
                Advanced color tokens for complex design systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(currentColors)
                  .filter(([key]) => 
                    key.startsWith('accent-') || 
                    key.startsWith('surface-') || 
                    key.startsWith('border-')
                  )
                  .map(([key, value]) => (
                    <ColorPicker
                      key={key}
                      label={key.replace('-', ' ')}
                      value={value}
                      onChange={(newValue) => {
                        onColorsChange({ ...currentColors, [key]: newValue });
                      }}
                      description={`${key} semantic color`}
                      showAccessibility={true}
                      contrastBackground={currentColors.background}
                    />
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 