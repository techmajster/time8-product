'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description?: string;
}

export function NumberInput({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 1000, 
  step = 1, 
  unit = 'px',
  description 
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange(numValue);
    }
  };

  const handleInputBlur = () => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      setInputValue(value.toString());
    } else {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      setInputValue(clampedValue.toString());
      if (clampedValue !== value) {
        onChange(clampedValue);
      }
    }
  };

  const increment = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const decrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`number-${label}`} className="text-sm font-medium">
          {label}
        </Label>
        {description && (
          <span className="text-xs text-gray-500">{description}</span>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="w-8 h-8 p-0"
          onClick={decrement}
          disabled={value <= min}
        >
          <Minus className="w-3 h-3" />
        </Button>
        
        <div className="flex-1 relative">
          <Input
            id={`number-${label}`}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            type="number"
            min={min}
            max={max}
            step={step}
            className="text-center pr-8"
          />
          {unit && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
              {unit}
            </span>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-8 h-8 p-0"
          onClick={increment}
          disabled={value >= max}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
} 