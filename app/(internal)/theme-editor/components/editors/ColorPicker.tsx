'use client';

import { useState, useEffect } from 'react';
import { HslStringColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

export function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Sync input value with prop value when it changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

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

  return (
    <div className="space-y-2">
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
      </div>
    </div>
  );
} 