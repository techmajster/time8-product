'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RotateCcw,
  Search,
  Mail,
  Lock,
  User,
  Calendar,
  Phone,
  CreditCard,
  MapPin,
  Building
} from 'lucide-react';

// Define available options for input properties
const INPUT_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'search', label: 'Search' },
  { value: 'tel', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'number', label: 'Number' },
];

const INPUT_SIZES = [
  { value: 'sm', label: 'Small' },
  { value: 'default', label: 'Default' },
  { value: 'lg', label: 'Large' },
];

const INPUT_VARIANTS = [
  { value: 'default', label: 'Default' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'filled', label: 'Filled' },
];

const ICON_OPTIONS = [
  { value: 'none', label: 'None', icon: null },
  { value: 'search', label: 'Search', icon: Search },
  { value: 'mail', label: 'Mail', icon: Mail },
  { value: 'lock', label: 'Lock', icon: Lock },
  { value: 'user', label: 'User', icon: User },
  { value: 'calendar', label: 'Calendar', icon: Calendar },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'map_pin', label: 'Map Pin', icon: MapPin },
  { value: 'building', label: 'Building', icon: Building },
];

const ICON_POSITIONS = [
  { value: 'none', label: 'None' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

export interface InputProperties {
  type: string;
  placeholder: string;
  disabled: boolean;
  required: boolean;
  size: 'default' | 'sm' | 'lg';
  variant: 'default' | 'ghost' | 'filled';
  icon: string;
  iconPosition: 'left' | 'right' | 'none';
  value: string;
}

interface InputPropertiesPanelProps {
  properties: InputProperties;
  onPropertiesChange: (properties: InputProperties) => void;
}

export function InputPropertiesPanel({
  properties,
  onPropertiesChange,
}: InputPropertiesPanelProps) {
  const handlePropertyChange = (key: keyof InputProperties, value: any) => {
    onPropertiesChange({
      ...properties,
      [key]: value,
    });
  };

  const handleReset = () => {
    const defaultProperties: InputProperties = {
      type: 'text',
      placeholder: 'Enter text...',
      disabled: false,
      required: false,
      size: 'default',
      variant: 'default',
      icon: 'none',
      iconPosition: 'left',
      value: '',
    };
    onPropertiesChange(defaultProperties);
  };

  return (
    <div className="w-full bg-transparent flex flex-col">
      <Card className="border-0 shadow-none bg-transparent h-full flex flex-col">
        <CardHeader className="border-b bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Properties</CardTitle>
              <Badge variant="secondary" className="text-xs">
                Input
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
          {/* Type Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">type</Label>
            <Select
              value={properties.type}
              onValueChange={(value) => handlePropertyChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INPUT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Placeholder Text Input */}
          <div className="space-y-2">
            <Label htmlFor="placeholder" className="text-sm font-medium">
              placeholder
            </Label>
            <Input
              id="placeholder"
              value={properties.placeholder}
              onChange={(e) => handlePropertyChange('placeholder', e.target.value)}
              placeholder="Enter placeholder text..."
            />
          </div>

          {/* Value Text Input */}
          <div className="space-y-2">
            <Label htmlFor="value" className="text-sm font-medium">
              value
            </Label>
            <Input
              id="value"
              value={properties.value}
              onChange={(e) => handlePropertyChange('value', e.target.value)}
              placeholder="Enter value..."
            />
          </div>

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

          {/* Required Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="required" className="text-sm font-medium">
                required
              </Label>
              <Switch
                id="required"
                checked={properties.required}
                onCheckedChange={(value) => handlePropertyChange('required', value)}
              />
            </div>
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
                {INPUT_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                {INPUT_VARIANTS.map((variant) => (
                  <SelectItem key={variant.value} value={variant.value}>
                    {variant.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Icon Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">icon</Label>
            <Select
              value={properties.icon}
              onValueChange={(value) => handlePropertyChange('icon', value)}
            >
                             <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const selectedIcon = ICON_OPTIONS.find(icon => icon.value === properties.icon);
                      const IconComponent = selectedIcon?.icon;
                      return (
                        <>
                          {IconComponent && <IconComponent className="h-4 w-4" />}
                          {selectedIcon?.label}
                        </>
                      );
                    })()}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((iconOption) => (
                  <SelectItem key={iconOption.value} value={iconOption.value}>
                    <div className="flex items-center gap-2">
                      {iconOption.icon && <iconOption.icon className="h-4 w-4" />}
                      {iconOption.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Icon Position Select */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">iconPosition</Label>
            <Select
              value={properties.iconPosition}
              onValueChange={(value) => handlePropertyChange('iconPosition', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_POSITIONS.map((position) => (
                  <SelectItem key={position.value} value={position.value}>
                    {position.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Configuration Display */}
          <div className="pt-3 mt-4 border-t">
            <div className="text-xs text-gray-500 mb-2">Current Configuration:</div>
            <div className="bg-gray-100 p-2 rounded-md">
              <code className="text-xs text-gray-700 leading-relaxed">
                {`<Input
  type="${properties.type}"
  placeholder="${properties.placeholder}"${properties.disabled ? '\n  disabled' : ''}${properties.required ? '\n  required' : ''}
  ${properties.size !== 'default' ? `size="${properties.size}"` : ''}${properties.variant !== 'default' ? `\n  variant="${properties.variant}"` : ''}${properties.value ? `\n  value="${properties.value}"` : ''}
/>`}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 