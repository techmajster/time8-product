'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ArrowUpDown, ArrowLeftRight, LayoutGrid, List, Calendar, Clock, User, Mail, FileText, Settings } from 'lucide-react';

// Properties Panel Component
function SeparatorPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: SeparatorProperties;
  onChange: (key: keyof SeparatorProperties, value: any) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Properties</h3>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Orientation */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Orientation</Label>
          <Select value={properties.orientation} onValueChange={(value: SeparatorProperties['orientation']) => onChange('orientation', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Size</Label>
          <Select value={properties.size} onValueChange={(value) => onChange('size', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Color Variant</Label>
          <Select value={properties.color} onValueChange={(value) => onChange('color', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="muted">Muted</SelectItem>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="destructive">Destructive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Margin */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Margin: {properties.margin}px</Label>
          <Slider
            value={[properties.margin]}
            onValueChange={(value) => onChange('margin', value[0])}
            max={48}
            min={0}
            step={4}
            className="w-full"
          />
        </div>

        {/* Decorative */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Decorative Only</Label>
          <Switch 
            checked={properties.decorative} 
            onCheckedChange={(checked) => onChange('decorative', checked)}
          />
        </div>

        {/* Show Label */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Text Label</Label>
          <Switch 
            checked={properties.showLabel} 
            onCheckedChange={(checked) => onChange('showLabel', checked)}
          />
        </div>

        {properties.showLabel && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Label Text</Label>
            <Input
              value={properties.labelText}
              onChange={(e) => onChange('labelText', e.target.value)}
              placeholder="Enter label text"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateSeparatorCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveSeparatorPreview({ properties }: { properties: SeparatorProperties }) {
  const getSizeClass = () => {
    if (properties.orientation === 'horizontal') {
      switch (properties.size) {
        case 'sm': return 'h-px';
        case 'lg': return 'h-1';
        default: return 'h-[1px]';
      }
    } else {
      switch (properties.size) {
        case 'sm': return 'w-px';
        case 'lg': return 'w-1';
        default: return 'w-[1px]';
      }
    }
  };

  const getColorClass = () => {
    switch (properties.color) {
      case 'muted': return 'bg-muted';
      case 'primary': return 'bg-primary';
      case 'destructive': return 'bg-destructive';
      default: return 'bg-border';
    }
  };

  const getMarginClass = () => {
    const margin = properties.margin;
    if (properties.orientation === 'horizontal') {
      return margin > 0 ? `my-${margin/4}` : 'my-0';
    } else {
      return margin > 0 ? `mx-${margin/4}` : 'mx-0';
    }
  };

  const containerClass = properties.orientation === 'horizontal' 
    ? 'w-full space-y-4' 
    : 'h-full flex flex-col items-center space-x-4';

  const separatorClass = `${getSizeClass()} ${getColorClass()} ${getMarginClass()}`;

  if (properties.showLabel && properties.orientation === 'horizontal') {
    return (
      <div className="h-full min-h-[500px] flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Separator with Label</h3>
            <p className="text-sm text-muted-foreground">Horizontal separator with text content</p>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm">Content above separator</p>
            
            <div className="relative flex items-center">
              <div className={`flex-1 ${getSizeClass()} ${getColorClass()}`} />
              <span className="mx-3 text-sm text-muted-foreground">{properties.labelText}</span>
              <div className={`flex-1 ${getSizeClass()} ${getColorClass()}`} />
            </div>
            
            <p className="text-sm">Content below separator</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[500px] flex items-center justify-center p-8">
      <div className={containerClass}>
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold mb-2">
            {properties.orientation === 'horizontal' ? 'Horizontal' : 'Vertical'} Separator
          </h3>
          <p className="text-sm text-muted-foreground">
            {properties.orientation === 'horizontal' 
              ? 'Divides content horizontally' 
              : 'Divides content vertically'}
          </p>
        </div>

        {properties.orientation === 'horizontal' ? (
          <>
            <p className="text-sm">Content above</p>
            <Separator 
              orientation={properties.orientation}
              decorative={properties.decorative}
              className={separatorClass}
            />
            <p className="text-sm">Content below</p>
          </>
        ) : (
          <div className="flex items-center h-32 space-x-4">
            <span className="text-sm">Left</span>
            <Separator 
              orientation={properties.orientation}
              decorative={properties.decorative}
              className={separatorClass}
            />
            <span className="text-sm">Right</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface SeparatorProperties {
  orientation: 'horizontal' | 'vertical';
  size: 'sm' | 'default' | 'lg';
  color: 'default' | 'muted' | 'primary' | 'destructive';
  margin: number;
  decorative: boolean;
  showLabel: boolean;
  labelText: string;
}

const defaultProperties: SeparatorProperties = {
  orientation: 'horizontal',
  size: 'default',
  color: 'default',
  margin: 16,
  decorative: true,
  showLabel: false,
  labelText: 'OR',
};

function generateSeparatorCode(props: SeparatorProperties): string {
  const sizeClass = props.size !== 'default' ? 
    (props.orientation === 'horizontal' ? 
      (props.size === 'sm' ? ' h-px' : ' h-1') :
      (props.size === 'sm' ? ' w-px' : ' w-1')) : '';

  const colorClass = props.color !== 'default' ?
    (props.color === 'muted' ? ' bg-muted' :
     props.color === 'primary' ? ' bg-primary' :
     ' bg-destructive') : '';

  const marginClass = props.margin > 0 ?
    (props.orientation === 'horizontal' ? ` my-${props.margin/4}` : ` mx-${props.margin/4}`) : '';

  const className = [sizeClass, colorClass, marginClass].filter(Boolean).join('');

  if (props.showLabel && props.orientation === 'horizontal') {
    return `<div className="relative flex items-center">
  <Separator className="flex-1${className}" />
  <span className="mx-3 text-sm text-muted-foreground">${props.labelText}</span>
  <Separator className="flex-1${className}" />
</div>`;
  }

  return `<Separator${props.orientation !== 'horizontal' ? `
  orientation="${props.orientation}"` : ''}${!props.decorative ? `
  decorative={false}` : ''}${className ? `
  className="${className.trim()}"` : ''}
/>`;
}

export default function SeparatorComponentPage() {
  const [properties, setProperties] = useState<SeparatorProperties>(defaultProperties);

  const handlePropertyChange = (key: keyof SeparatorProperties, value: any) => {
    setProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setProperties(defaultProperties);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Separator</h1>
          <Badge variant="outline">Layout Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Visually or semantically separates content sections with horizontal or vertical dividers.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              Customize the separator properties and see the changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <LiveSeparatorPreview properties={properties} />
              </div>
              <div className="col-span-1 border-l pl-6">
                <SeparatorPropertiesPanel
                  properties={properties}
                  onChange={handlePropertyChange}
                  onReset={handleReset}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Usage Examples</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5" />
                Card Sections
              </CardTitle>
              <CardDescription>Separating content within cards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium">User Profile</h4>
                <p className="text-sm text-muted-foreground">Personal information</p>
                <Separator />
                <h4 className="font-medium">Account Settings</h4>
                <p className="text-sm text-muted-foreground">Privacy and security options</p>
                <Separator />
                <h4 className="font-medium">Notifications</h4>
                <p className="text-sm text-muted-foreground">Email and push preferences</p>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Menu */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="w-5 h-5" />
                Navigation Menu
              </CardTitle>
              <CardDescription>Vertical separators in navigation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm">Home</Button>
                <Separator orientation="vertical" className="h-4" />
                <Button variant="ghost" size="sm">About</Button>
                <Separator orientation="vertical" className="h-4" />
                <Button variant="ghost" size="sm">Contact</Button>
              </div>
            </CardContent>
          </Card>

          {/* Form Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Form Sections
              </CardTitle>
              <CardDescription>Dividing form content into sections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="First name" />
                    <Input placeholder="Last name" />
                  </div>
                </div>
                
                <div className="relative flex items-center">
                  <Separator className="flex-1" />
                  <span className="mx-3 text-sm text-muted-foreground">Contact Details</span>
                  <Separator className="flex-1" />
                </div>
                
                <div>
                  <div className="space-y-2">
                    <Input placeholder="Email address" />
                    <Input placeholder="Phone number" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard Widgets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Dashboard Layout
              </CardTitle>
              <CardDescription>Organizing dashboard components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <Calendar className="w-6 h-6 mx-auto text-blue-500" />
                  <p className="text-xs font-medium">Calendar</p>
                </div>
                <Separator orientation="vertical" className="justify-self-center h-12" />
                <div className="space-y-1">
                  <Clock className="w-6 h-6 mx-auto text-green-500" />
                  <p className="text-xs font-medium">Time Tracker</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <User className="w-6 h-6 mx-auto text-purple-500" />
                  <p className="text-xs font-medium">Profile</p>
                </div>
                <Separator orientation="vertical" className="justify-self-center h-12" />
                <div className="space-y-1">
                  <Settings className="w-6 h-6 mx-auto text-gray-500" />
                  <p className="text-xs font-medium">Settings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Orientation Comparison */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Orientation Comparison</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Horizontal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5" />
                Horizontal Separators
              </CardTitle>
              <CardDescription>Divide content vertically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm">Section One</p>
                <Separator />
                <p className="text-sm">Section Two</p>
                <Separator className="bg-primary h-0.5" />
                <p className="text-sm">Section Three with colored separator</p>
              </div>
            </CardContent>
          </Card>

          {/* Vertical */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5" />
                Vertical Separators
              </CardTitle>
              <CardDescription>Divide content horizontally</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center h-24 space-x-4">
                <span className="text-sm">Left Content</span>
                <Separator orientation="vertical" />
                <span className="text-sm">Middle Content</span>
                <Separator orientation="vertical" className="bg-primary w-0.5" />
                <span className="text-sm">Right Content</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Implementation Notes */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Implementation Notes</h2>
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
            <CardDescription>Important considerations when using the Separator component</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Semantic Usage</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use decorative={true} for visual dividers</li>
                  <li>• Use decorative={false} for semantic separation</li>
                  <li>• Horizontal orientation is default</li>
                  <li>• Vertical separators need explicit height</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Accessibility</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Decorative separators are hidden from screen readers</li>
                  <li>• Semantic separators have role="separator"</li>
                  <li>• Consider aria-label for semantic separators</li>
                  <li>• Sufficient color contrast for visual separators</li>
                </ul>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Styling</h4>
              <p className="text-sm text-muted-foreground">
                The separator inherits border color by default. Use className prop to customize appearance, 
                including color, thickness, and spacing. For vertical separators, specify explicit height.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 