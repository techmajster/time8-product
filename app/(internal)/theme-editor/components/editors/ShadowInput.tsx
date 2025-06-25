'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from './NumberInput';

interface ShadowInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

// Parse shadow string into components
function parseShadow(shadowString: string) {
  // Basic parsing for box-shadow like "0px 4px 6px -1px rgba(0, 0, 0, 0.1)"
  const match = shadowString.match(/(-?\d+)px\s+(-?\d+)px\s+(-?\d+)px\s+(-?\d+)px\s+rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);
  
  if (match) {
    return {
      x: parseInt(match[1]),
      y: parseInt(match[2]),
      blur: parseInt(match[3]),
      spread: parseInt(match[4]),
      r: parseInt(match[5]),
      g: parseInt(match[6]),
      b: parseInt(match[7]),
      opacity: parseFloat(match[8]),
    };
  }
  
  // Default values
  return {
    x: 0,
    y: 4,
    blur: 6,
    spread: -1,
    r: 0,
    g: 0,
    b: 0,
    opacity: 0.1,
  };
}

// Build shadow string from components
function buildShadow(x: number, y: number, blur: number, spread: number, r: number, g: number, b: number, opacity: number) {
  return `${x}px ${y}px ${blur}px ${spread}px rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function ShadowInput({ label, value, onChange, description }: ShadowInputProps) {
  const shadow = parseShadow(value);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  const updateShadow = (updates: Partial<typeof shadow>) => {
    const newShadow = { ...shadow, ...updates };
    const newValue = buildShadow(
      newShadow.x,
      newShadow.y,
      newShadow.blur,
      newShadow.spread,
      newShadow.r,
      newShadow.g,
      newShadow.b,
      newShadow.opacity
    );
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      {/* Visual Preview */}
      <div className="bg-gray-50 p-8 rounded-lg border">
        <div className="text-sm font-medium mb-4 text-gray-700">
          {label}
        </div>
        <div
          className="w-24 h-24 bg-white rounded-lg mx-auto"
          style={{ boxShadow: value }}
        />
        <div className="text-xs text-gray-500 text-center mt-3 font-mono">
          {description}
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Simple Mode - Most Common Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-600">Y Offset</Label>
              <Input
                type="number"
                value={shadow.y}
                onChange={(e) => updateShadow({ y: parseInt(e.target.value) || 0 })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Blur</Label>
              <Input
                type="number"
                value={shadow.blur}
                onChange={(e) => updateShadow({ blur: parseInt(e.target.value) || 0 })}
                className="h-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-600">Spread</Label>
              <Input
                type="number"
                value={shadow.spread}
                onChange={(e) => updateShadow({ spread: parseInt(e.target.value) || 0 })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Opacity</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={shadow.opacity}
                onChange={(e) => updateShadow({ opacity: parseFloat(e.target.value) || 0 })}
                className="h-8"
              />
            </div>
          </div>

          {/* Advanced Toggle */}
          <div className="pt-2 border-t">
            <button
              onClick={() => setIsAdvancedMode(!isAdvancedMode)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {isAdvancedMode ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          </div>

          {/* Advanced Mode */}
          {isAdvancedMode && (
            <div className="space-y-4 pt-2 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600">X Offset</Label>
                  <Input
                    type="number"
                    value={shadow.x}
                    onChange={(e) => updateShadow({ x: parseInt(e.target.value) || 0 })}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Color</Label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      placeholder="R"
                      value={shadow.r}
                      onChange={(e) => updateShadow({ r: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs"
                      min="0"
                      max="255"
                    />
                    <Input
                      type="number"
                      placeholder="G"
                      value={shadow.g}
                      onChange={(e) => updateShadow({ g: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs"
                      min="0"
                      max="255"
                    />
                    <Input
                      type="number"
                      placeholder="B"
                      value={shadow.b}
                      onChange={(e) => updateShadow({ b: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs"
                      min="0"
                      max="255"
                    />
                  </div>
                </div>
              </div>

              {/* Raw Shadow String */}
              <div>
                <Label className="text-xs text-gray-600">Raw CSS Value</Label>
                <Input
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-8 font-mono text-xs"
                  placeholder="0px 4px 6px -1px rgba(0, 0, 0, 0.1)"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 