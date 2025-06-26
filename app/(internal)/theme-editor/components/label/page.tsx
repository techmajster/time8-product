'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Calendar, 
  MapPin,
  Star,
  AlertCircle,
  Info,
  HelpCircle,
  Settings,
  Tag,
  FileText
} from 'lucide-react';

// Properties interface
interface LabelProperties {
  text: string;
  size: 'sm' | 'default' | 'lg';
  weight: 'normal' | 'medium' | 'semibold' | 'bold';
  required: boolean;
  disabled: boolean;
  withTooltip: boolean;
  tooltipText: string;
  color: 'default' | 'muted' | 'primary' | 'destructive' | 'success';
  htmlFor: string;
  position: 'top' | 'left' | 'inline';
}

// Properties Panel Component
function LabelPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: LabelProperties;
  onChange: (key: keyof LabelProperties, value: any) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6 h-full min-h-[500px] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Properties</h3>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Label Text */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Label Text</Label>
          <Input
            value={properties.text}
            onChange={(e) => onChange('text', e.target.value)}
            placeholder="Enter label text"
          />
        </div>

        {/* HTML For */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">HTML For (ID)</Label>
          <Input
            value={properties.htmlFor}
            onChange={(e) => onChange('htmlFor', e.target.value)}
            placeholder="input-id"
          />
        </div>

        {/* Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Size</Label>
          <Select value={properties.size} onValueChange={(value) => onChange('size', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Font Weight</Label>
          <Select value={properties.weight} onValueChange={(value) => onChange('weight', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="semibold">Semi Bold</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Color</Label>
          <Select value={properties.color} onValueChange={(value) => onChange('color', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="muted">Muted</SelectItem>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="destructive">Destructive</SelectItem>
              <SelectItem value="success">Success</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Position */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Position</Label>
          <Select value={properties.position} onValueChange={(value) => onChange('position', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="inline">Inline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Required */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Required Indicator</Label>
          <Switch 
            checked={properties.required} 
            onCheckedChange={(checked) => onChange('required', checked)}
          />
        </div>

        {/* Disabled */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Disabled</Label>
          <Switch 
            checked={properties.disabled} 
            onCheckedChange={(checked) => onChange('disabled', checked)}
          />
        </div>

        {/* With Tooltip */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">With Tooltip</Label>
          <Switch 
            checked={properties.withTooltip} 
            onCheckedChange={(checked) => onChange('withTooltip', checked)}
          />
        </div>

        {/* Tooltip Text */}
        {properties.withTooltip && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tooltip Text</Label>
            <Input
              value={properties.tooltipText}
              onChange={(e) => onChange('tooltipText', e.target.value)}
              placeholder="Helpful tooltip text"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateLabelCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveLabelPreview({ properties }: { properties: LabelProperties }) {
  const getSizeClass = () => {
    switch (properties.size) {
      case 'sm': return 'text-xs';
      case 'default': return 'text-sm';
      case 'lg': return 'text-base';
      default: return 'text-sm';
    }
  };

  const getWeightClass = () => {
    switch (properties.weight) {
      case 'normal': return 'font-normal';
      case 'medium': return 'font-medium';
      case 'semibold': return 'font-semibold';
      case 'bold': return 'font-bold';
      default: return 'font-medium';
    }
  };

  const getColorClass = () => {
    switch (properties.color) {
      case 'default': return 'text-foreground';
      case 'muted': return 'text-muted-foreground';
      case 'primary': return 'text-primary';
      case 'destructive': return 'text-destructive';
      case 'success': return 'text-green-600';
      default: return 'text-foreground';
    }
  };

  const renderLabel = () => (
    <Label 
      htmlFor={properties.htmlFor}
      className={`
        ${getSizeClass()} 
        ${getWeightClass()} 
        ${getColorClass()}
        ${properties.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {properties.text}
      {properties.required && <span className="text-destructive ml-1">*</span>}
      {properties.withTooltip && (
        <HelpCircle className="inline w-3 h-3 ml-1 text-muted-foreground" />
      )}
    </Label>
  );

  const renderWithInput = () => {
    const inputElement = (
      <Input 
        id={properties.htmlFor}
        placeholder="Sample input"
        disabled={properties.disabled}
        className="flex-1"
      />
    );

    if (properties.position === 'left') {
      return (
        <div className="flex items-center gap-4 w-full max-w-md">
          <div className="flex-shrink-0">
            {renderLabel()}
          </div>
          {inputElement}
        </div>
      );
    }

    if (properties.position === 'inline') {
      return (
        <div className="flex items-center gap-2 w-full max-w-md">
          {inputElement}
          {renderLabel()}
        </div>
      );
    }

    // Default: top
    return (
      <div className="space-y-2 w-full max-w-md">
        {renderLabel()}
        {inputElement}
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center">
      {renderWithInput()}
    </div>
  );
}

// Generate code function
function generateLabelCode(props: LabelProperties): string {
  const classes = [];
  
  if (props.size !== 'default') {
    classes.push(props.size === 'sm' ? 'text-xs' : 'text-base');
  }
  
  if (props.weight !== 'medium') {
    classes.push(`font-${props.weight}`);
  }
  
  if (props.color !== 'default') {
    const colorClass = props.color === 'muted' ? 'text-muted-foreground' : 
                       props.color === 'primary' ? 'text-primary' :
                       props.color === 'destructive' ? 'text-destructive' :
                       props.color === 'success' ? 'text-green-600' : '';
    if (colorClass) classes.push(colorClass);
  }

  if (props.disabled) {
    classes.push('opacity-50 cursor-not-allowed');
  }

  const className = classes.length > 0 ? `className="${classes.join(' ')}"` : '';
  const htmlFor = props.htmlFor ? `htmlFor="${props.htmlFor}"` : '';
  
  return `<Label ${htmlFor}${className ? ' ' + className : ''}>
  ${props.text}${props.required ? '\n  <span className="text-destructive ml-1">*</span>' : ''}${props.withTooltip ? '\n  <HelpCircle className="inline w-3 h-3 ml-1" />' : ''}
</Label>`;
}

export default function LabelComponentPage() {
  const [labelProperties, setLabelProperties] = useState<LabelProperties>({
    text: 'Email Address',
    size: 'default',
    weight: 'medium',
    required: true,
    disabled: false,
    withTooltip: false,
    tooltipText: 'Enter your email address',
    color: 'default',
    htmlFor: 'email-input',
    position: 'top',
  });

  const handlePropertyChange = (key: keyof LabelProperties, value: any) => {
    setLabelProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLabelProperties({
      text: 'Email Address',
      size: 'default',
      weight: 'medium',
      required: true,
      disabled: false,
      withTooltip: false,
      tooltipText: 'Enter your email address',
      color: 'default',
      htmlFor: 'email-input',
      position: 'top',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Label</h1>
          <Badge variant="outline">Form Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A form label component that provides accessible labeling for form controls. 
          Essential for screen readers and helps users understand what information is expected.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Customize the label properties below and see changes in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveLabelPreview properties={labelProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <LabelPropertiesPanel 
                    properties={labelProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Positions Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Label Positions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Label</CardTitle>
              <CardDescription>Label positioned above the input (default)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="name-top">Full Name *</Label>
                <Input id="name-top" placeholder="John Doe" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Left Label</CardTitle>
              <CardDescription>Label positioned to the left of the input</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="name-left" className="flex-shrink-0">Name:</Label>
                <Input id="name-left" placeholder="John Doe" className="flex-1" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inline Label</CardTitle>
              <CardDescription>Label positioned after the input</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Checkbox id="terms" />
                <Label htmlFor="terms">I agree to the terms and conditions</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Variants Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Label Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Size Variants</CardTitle>
              <CardDescription>Different label sizes for various contexts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Small Label</Label>
                  <Input placeholder="Small input" className="h-8 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Default Label</Label>
                  <Input placeholder="Default input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Large Label</Label>
                  <Input placeholder="Large input" className="h-11 text-base" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Color Variants</CardTitle>
              <CardDescription>Different colors for various states</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Default Color</Label>
                  <Input placeholder="Normal state" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Muted Color</Label>
                  <Input placeholder="Secondary info" />
                </div>
                <div className="space-y-2">
                  <Label className="text-destructive">Error State *</Label>
                  <Input placeholder="Error input" className="border-destructive" />
                </div>
                <div className="space-y-2">
                  <Label className="text-green-600">Success State</Label>
                  <Input placeholder="Valid input" className="border-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Usage Examples</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Fields</CardTitle>
              <CardDescription>
                Standard form with various input types and labels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="user-email">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input id="user-email" type="email" placeholder="john@example.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-phone">Phone Number</Label>
                  <Input id="user-phone" type="tel" placeholder="+1 (555) 123-4567" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-bio">
                    Bio
                    <HelpCircle className="inline w-3 h-3 ml-1 text-muted-foreground" />
                  </Label>
                  <Textarea id="user-bio" placeholder="Tell us about yourself..." />
                </div>

                <div className="space-y-3">
                  <Label>Notification Preferences</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="email-notifications" />
                      <Label htmlFor="email-notifications" className="text-sm font-normal">
                        Email notifications
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="sms-notifications" />
                      <Label htmlFor="sms-notifications" className="text-sm font-normal">
                        SMS notifications
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings Form</CardTitle>
              <CardDescription>
                Settings interface with labels and form controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-w-md">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Switch to dark theme
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select>
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Privacy Level</Label>
                  <RadioGroup defaultValue="private">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public" className="font-normal">Public</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="friends" id="friends" />
                      <Label htmlFor="friends" className="font-normal">Friends only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private" className="font-normal">Private</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Technical Notes */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Technical Notes</h2>
        <Card>
          <CardHeader>
            <CardTitle>Accessibility Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">htmlFor Attribute</h4>
              <p className="text-sm text-muted-foreground">
                Always use the htmlFor attribute to associate labels with form controls for screen reader accessibility.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Required Indicators</h4>
              <p className="text-sm text-muted-foreground">
                Use visual indicators (like asterisks) and aria-required attributes for required fields.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Clear Language</h4>
              <p className="text-sm text-muted-foreground">
                Use clear, descriptive text that helps users understand what information is expected.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 