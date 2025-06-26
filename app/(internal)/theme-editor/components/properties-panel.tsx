'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  EyeOff, 
  RotateCcw,
  Accessibility,
  ArrowRight,
  Download,
  Plus,
  Settings,
  Upload,
  Mail,
  Heart,
  Star,
  ShoppingCart
} from 'lucide-react';

// Define available options for button properties
const BUTTON_VARIANTS = [
  { value: 'default', label: 'Default (Primary)' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'destructive', label: 'Destructive' },
  { value: 'link', label: 'Link' },
];

const BUTTON_SIZES = [
  { value: 'sm', label: 'Small' },
  { value: 'default', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'icon', label: 'Icon Only' },
];

const ICON_OPTIONS = [
  { value: 'none', label: 'None', icon: null },
  { value: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { value: 'arrow-right', label: 'Arrow Right', icon: ArrowRight },
  { value: 'download', label: 'Download', icon: Download },
  { value: 'plus', label: 'Plus', icon: Plus },
  { value: 'settings', label: 'Settings', icon: Settings },
  { value: 'upload', label: 'Upload', icon: Upload },
  { value: 'mail', label: 'Mail', icon: Mail },
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'shopping-cart', label: 'Shopping Cart', icon: ShoppingCart },
];

export interface ButtonProperties {
  disabled: boolean;
  variant: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size: 'sm' | 'default' | 'lg' | 'icon';
  children: string;
  icon: string;
  iconRight: string;
  loading: boolean;
}

interface PropertiesPanelProps {
  componentType: 'button';
  properties: ButtonProperties;
  onPropertiesChange: (properties: ButtonProperties) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export function PropertiesPanel({
  componentType,
  properties,
  onPropertiesChange,
  isVisible,
  onToggleVisibility
}: PropertiesPanelProps) {
  const handlePropertyChange = (key: keyof ButtonProperties, value: any) => {
    onPropertiesChange({
      ...properties,
      [key]: value,
    });
  };

  const handleReset = () => {
    const defaultProperties: ButtonProperties = {
      disabled: false,
      variant: 'default',
      size: 'default',
      children: 'Button',
      icon: 'none',
      iconRight: 'none',
      loading: false,
    };
    onPropertiesChange(defaultProperties);
  };

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onToggleVisibility}
          className="shadow-lg"
        >
          <Eye className="w-4 h-4 mr-2" />
          Show Properties
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent flex flex-col">
      <Card className="border-0 shadow-none bg-transparent h-full flex flex-col">
        <CardHeader className="border-b bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Properties</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {componentType.charAt(0).toUpperCase() + componentType.slice(1)}
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {/* Disabled Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="disabled" className="text-sm font-medium">
                disabled
              </Label>
              <Switch
                id="disabled"
                checked={properties.disabled}
                onCheckedChange={(value) => handlePropertyChange('disabled', value)}
              />
            </div>
          </div>

          {/* Variant Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">variant</Label>
            <Select
              value={properties.variant}
              onValueChange={(value) => handlePropertyChange('variant', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_VARIANTS.map((variant) => (
                  <SelectItem key={variant.value} value={variant.value}>
                    {variant.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Size Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">size</Label>
            <Select
              value={properties.size}
              onValueChange={(value) => handlePropertyChange('size', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Children Text Input */}
          <div className="space-y-2">
            <Label htmlFor="children" className="text-sm font-medium">
              children
            </Label>
            <Input
              id="children"
              value={properties.children}
              onChange={(e) => handlePropertyChange('children', e.target.value)}
              placeholder="Button text"
            />
          </div>

          {/* Icon Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">icon</Label>
            <Select
              value={properties.icon}
              onValueChange={(value) => handlePropertyChange('icon', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.icon && <option.icon className="w-4 h-4" />}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Icon Right Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">iconRight</Label>
            <Select
              value={properties.iconRight}
              onValueChange={(value) => handlePropertyChange('iconRight', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.icon && <option.icon className="w-4 h-4" />}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Loading Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="loading" className="text-sm font-medium">
                loading
              </Label>
              <Switch
                id="loading"
                checked={properties.loading}
                onCheckedChange={(value) => handlePropertyChange('loading', value)}
              />
            </div>
          </div>

          {/* Current Configuration Display */}
          <div className="pt-3 mt-4 border-t">
            <div className="text-xs text-gray-500 mb-2">Current Configuration:</div>
            <div className="bg-gray-100 p-2 rounded-md">
              <code className="text-xs text-gray-700 leading-relaxed">
                {`<Button
  variant="${properties.variant}"
  size="${properties.size}"${properties.disabled ? '\n  disabled' : ''}${properties.loading ? '\n  loading' : ''}
>
  ${properties.icon !== 'none' ? `<${properties.icon.charAt(0).toUpperCase() + properties.icon.slice(1)} className="w-4 h-4 mr-2" />` : ''}${properties.children}${properties.iconRight !== 'none' ? `\n  <${properties.iconRight.charAt(0).toUpperCase() + properties.iconRight.slice(1)} className="w-4 h-4 ml-2" />` : ''}
</Button>`}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 