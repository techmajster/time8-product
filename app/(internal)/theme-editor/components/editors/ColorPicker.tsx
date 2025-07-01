'use client';

import { useState, useEffect } from 'react';
import { HslStringColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Palette, Check, AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  showAccessibility?: boolean;
  contrastBackground?: string;
}

interface AccessibilityInfo {
  contrast: number;
  level: 'AA' | 'AAA' | 'FAIL';
  readable: boolean;
}

export function ColorPicker({ 
  label, 
  value, 
  onChange, 
  description, 
  showAccessibility = true,
  contrastBackground = 'hsl(0, 0%, 100%)'
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [accessibilityInfo, setAccessibilityInfo] = useState<AccessibilityInfo | null>(null);

  // Sync input value with prop value when it changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Calculate accessibility info when colors change
  useEffect(() => {
    if (showAccessibility) {
      const info = checkAccessibility(value, contrastBackground);
      setAccessibilityInfo(info);
    }
  }, [value, contrastBackground, showAccessibility]);

  // Calculate color contrast ratio
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

  // Check accessibility for color combinations
  const checkAccessibility = (foreground: string, background: string): AccessibilityInfo => {
    const contrast = calculateContrast(foreground, background);
    
    let level: 'AA' | 'AAA' | 'FAIL' = 'FAIL';
    if (contrast >= 7) level = 'AAA';
    else if (contrast >= 4.5) level = 'AA';

    return {
      contrast: Math.round(contrast * 100) / 100,
      level,
      readable: contrast >= 4.5,
    };
  };

  const handleColorChange = (newColor: string) => {
    setInputValue(newColor);
    onChange(newColor);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Validate HSL color format
    if (/^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleInputBlur = () => {
    // Reset to current value if invalid
    if (!/^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/.test(inputValue)) {
      setInputValue(value);
    }
  };

  const copyColorToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Color copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy color');
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={`color-${label}`} className="text-sm font-medium">
          {label}
        </Label>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-12 h-8 p-0 border-2"
              style={{ backgroundColor: value }}
            >
              <span className="sr-only">Pick color</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <HslStringColorPicker color={value} onChange={handleColorChange} />
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  placeholder="hsl(0, 0%, 0%)"
                  className="font-mono text-sm"
                />
              </div>
              {showAccessibility && accessibilityInfo && (
                <div className="pt-2 border-t">
                  <div className="text-xs font-medium mb-2">Accessibility Check</div>
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={
                        accessibilityInfo.level === 'AAA' ? 'default' :
                        accessibilityInfo.level === 'AA' ? 'secondary' : 'destructive'
                      }
                      className="text-xs"
                    >
                      {accessibilityInfo.level === 'FAIL' ? (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      ) : (
                        <Check className="h-3 w-3 mr-1" />
                      )}
                      {accessibilityInfo.level}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {accessibilityInfo.contrast}:1 ratio
                    </span>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        
        <Input
          id={`color-${label}`}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="hsl(0, 0%, 0%)"
          className="font-mono text-sm flex-1"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={copyColorToClipboard}
          className="flex items-center gap-1"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>

      {/* Accessibility info outside popover */}
      {showAccessibility && accessibilityInfo && (
        <div className="flex items-center gap-2">
          <Badge 
            variant={
              accessibilityInfo.level === 'AAA' ? 'default' :
              accessibilityInfo.level === 'AA' ? 'secondary' : 'destructive'
            }
            className="text-xs"
          >
            {accessibilityInfo.level === 'FAIL' ? (
              <AlertTriangle className="h-3 w-3 mr-1" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            {accessibilityInfo.level} ({accessibilityInfo.contrast}:1)
          </Badge>
          <span className="text-xs text-muted-foreground">
            {accessibilityInfo.level === 'AAA' ? 'Best accessibility' :
             accessibilityInfo.level === 'AA' ? 'Good accessibility' : 
             'Poor accessibility - may be hard to read'}
          </span>
        </div>
      )}
    </div>
  );
} 