'use client';

import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
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

  const handleColorChange = (newColor: string) => {
    setInputValue(newColor);
    onChange(newColor);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Validate hex color format
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleInputBlur = () => {
    // Reset to current value if invalid
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(inputValue)) {
      setInputValue(value);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`color-${label}`} className="text-sm font-medium">
          {label}
        </Label>
        {description && (
          <span className="text-xs text-gray-500">{description}</span>
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
              <HexColorPicker color={value} onChange={handleColorChange} />
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-gray-500" />
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  placeholder="#000000"
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
          placeholder="#000000"
          className="font-mono text-sm flex-1"
        />
      </div>
    </div>
  );
} 