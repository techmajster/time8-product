'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// Properties Panel Component
function SliderPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: SliderProperties;
  onChange: (key: keyof SliderProperties, value: any) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6 h-full min-h-[500px]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Properties</h3>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Default Value */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Value</Label>
          <Input
            type="number"
            value={properties.defaultValue[0]}
            onChange={(e) => onChange('defaultValue', [parseInt(e.target.value) || 0])}
            min={properties.min}
            max={properties.max}
            step={properties.step}
          />
        </div>

        {/* Min Value */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Min Value</Label>
          <Input
            type="number"
            value={properties.min}
            onChange={(e) => onChange('min', parseInt(e.target.value) || 0)}
          />
        </div>

        {/* Max Value */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Max Value</Label>
          <Input
            type="number"
            value={properties.max}
            onChange={(e) => onChange('max', parseInt(e.target.value) || 100)}
          />
        </div>

        {/* Step */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Step</Label>
          <Input
            type="number"
            value={properties.step}
            onChange={(e) => onChange('step', parseInt(e.target.value) || 1)}
            min={1}
          />
        </div>

        {/* Orientation */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Orientation</Label>
          <Select value={properties.orientation} onValueChange={(value) => onChange('orientation', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Disabled */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Disabled</Label>
          <Switch 
            checked={properties.disabled} 
            onCheckedChange={(checked) => onChange('disabled', checked)}
          />
        </div>

        {/* Range Mode */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Range Mode</Label>
          <Switch 
            checked={properties.range} 
            onCheckedChange={(checked) => onChange('range', checked)}
          />
        </div>

        {/* Show Value */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Value</Label>
          <Switch 
            checked={properties.showValue} 
            onCheckedChange={(checked) => onChange('showValue', checked)}
          />
        </div>

        {/* Show Label */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Label</Label>
          <Switch 
            checked={properties.showLabel} 
            onCheckedChange={(checked) => onChange('showLabel', checked)}
          />
        </div>

        {/* Label Text */}
        {properties.showLabel && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Label Text</Label>
            <Input
              value={properties.label}
              onChange={(e) => onChange('label', e.target.value)}
              placeholder="Enter label"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateSliderCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveSliderPreview({ properties }: { properties: SliderProperties }) {
  const [value, setValue] = useState(
    properties.range 
      ? [properties.defaultValue[0] || properties.min, (properties.defaultValue[1] || properties.min + 20)]
      : properties.defaultValue
  );

  const formatValue = (val: number[]) => {
    if (properties.range) {
      return `${val[0]} - ${val[1]}`;
    }
    return val[0].toString();
  };

  return (
    <div className="h-full min-h-[500px] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4">
        {properties.showLabel && (
          <Label className="text-sm font-medium">{properties.label}</Label>
        )}
        
        <div className={properties.orientation === 'vertical' ? 'h-48 flex justify-center' : ''}>
          <Slider
            value={value}
            onValueChange={setValue}
            max={properties.max}
            min={properties.min}
            step={properties.step}
            disabled={properties.disabled}
            orientation={properties.orientation}
            className={properties.orientation === 'vertical' ? 'h-full' : ''}
          />
        </div>
        
        {properties.showValue && (
          <div className="text-sm text-muted-foreground text-center">
            Value: {formatValue(value)}
          </div>
        )}
      </div>
    </div>
  );
}

interface SliderProperties {
  defaultValue: number[];
  min: number;
  max: number;
  step: number;
  orientation: 'horizontal' | 'vertical';
  disabled: boolean;
  range: boolean;
  showValue: boolean;
  showLabel: boolean;
  label: string;
}

const defaultProperties: SliderProperties = {
  defaultValue: [50],
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
  disabled: false,
  range: false,
  showValue: true,
  showLabel: true,
  label: 'Select value',
};

function generateSliderCode(props: SliderProperties): string {
  const sliderProps = [
    `defaultValue={[${props.defaultValue.join(', ')}]}`,
    `min={${props.min}}`,
    `max={${props.max}}`,
    props.step !== 1 ? `step={${props.step}}` : '',
    props.disabled ? 'disabled' : '',
    props.orientation !== 'horizontal' ? `orientation="${props.orientation}"` : '',
  ].filter(Boolean).join('\n  ');

  let code = '';
  
  if (props.showLabel) {
    code += `<Label>${props.label}</Label>\n`;
  }
  
  code += `<Slider
  ${sliderProps}
/>`;

  if (props.showValue) {
    code += '\n<div className="text-sm text-muted-foreground">\n  Value: {value}\n</div>';
  }

  return code;
}

export default function SliderComponentPage() {
  const [properties, setProperties] = useState<SliderProperties>(defaultProperties);

  const handlePropertyChange = (key: keyof SliderProperties, value: any) => {
    if (key === 'range') {
      // When switching to range mode, set default to array with two values
      if (value) {
        setProperties(prev => ({ 
          ...prev, 
          [key]: value,
          defaultValue: [prev.defaultValue[0] || prev.min, Math.min(prev.defaultValue[0] + 20, prev.max)]
        }));
      } else {
        // When switching from range mode, set default to single value
        setProperties(prev => ({ 
          ...prev, 
          [key]: value,
          defaultValue: [prev.defaultValue[0] || prev.min]
        }));
      }
    } else {
      setProperties(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleReset = () => {
    setProperties(defaultProperties);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Slider</h1>
          <Badge variant="outline">Form Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          An input where the user selects a value from within a given range.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              Customize the slider properties and see the changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <LiveSliderPreview properties={properties} />
              </div>
              <div className="col-span-1 border-l pl-6">
                <SliderPropertiesPanel
                  properties={properties}
                  onChange={handlePropertyChange}
                  onReset={handleReset}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Basic Usage */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Basic Usage</h2>
        <Card>
          <CardHeader>
            <CardTitle>Default Slider</CardTitle>
            <CardDescription>Basic slider with default settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Volume</Label>
              <Slider defaultValue={[33]} max={100} step={1} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Orientations */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Orientations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Horizontal</CardTitle>
              <CardDescription>Default horizontal slider</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Brightness</Label>
                <Slider defaultValue={[75]} max={100} step={1} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vertical</CardTitle>
              <CardDescription>Vertical slider orientation</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="space-y-2 text-center">
                <Label>Volume</Label>
                <Slider 
                  defaultValue={[60]} 
                  max={100} 
                  step={1} 
                  orientation="vertical"
                  className="h-32"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Range Sliders */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Range Sliders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Price Range</CardTitle>
              <CardDescription>Select minimum and maximum values</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Price Range ($)</Label>
                <Slider defaultValue={[25, 75]} max={100} step={1} />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>$0</span>
                  <span>$100</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time Range</CardTitle>
              <CardDescription>Select start and end time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Working Hours</Label>
                <Slider defaultValue={[9, 17]} min={0} max={24} step={1} />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>00:00</span>
                  <span>24:00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* States */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">States</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Normal slider</Label>
                  <Slider defaultValue={[40]} max={100} step={1} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disabled State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Disabled slider</Label>
                  <Slider defaultValue={[40]} max={100} step={1} disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Usage Examples</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Audio Controls</CardTitle>
              <CardDescription>Volume and balance controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Master Volume</Label>
                <Slider defaultValue={[80]} max={100} step={1} />
                <div className="text-xs text-muted-foreground text-right">80%</div>
              </div>

              <div className="space-y-2">
                <Label>Balance</Label>
                <Slider defaultValue={[0]} min={-50} max={50} step={1} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>L</span>
                  <span>Center</span>
                  <span>R</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bass</Label>
                <Slider defaultValue={[25]} max={100} step={1} />
                <div className="text-xs text-muted-foreground text-right">25%</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filters & Search</CardTitle>
              <CardDescription>Range filters for data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Age Range</Label>
                <Slider defaultValue={[25, 65]} min={18} max={80} step={1} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>25 years</span>
                  <span>65 years</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Salary Range (k$)</Label>
                <Slider defaultValue={[50, 150]} min={0} max={200} step={5} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>$50k</span>
                  <span>$150k</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Experience (years)</Label>
                <Slider defaultValue={[2]} min={0} max={20} step={1} />
                <div className="text-xs text-muted-foreground text-right">2+ years</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Advanced Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Examples</h2>
        <Card>
          <CardHeader>
            <CardTitle>Image Editor Controls</CardTitle>
            <CardDescription>Fine-tuning image properties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Brightness</Label>
                    <span className="text-sm text-muted-foreground">120%</span>
                  </div>
                  <Slider defaultValue={[120]} min={0} max={200} step={1} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Contrast</Label>
                    <span className="text-sm text-muted-foreground">85%</span>
                  </div>
                  <Slider defaultValue={[85]} min={0} max={200} step={1} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Saturation</Label>
                    <span className="text-sm text-muted-foreground">110%</span>
                  </div>
                  <Slider defaultValue={[110]} min={0} max={200} step={1} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Hue</Label>
                    <span className="text-sm text-muted-foreground">180°</span>
                  </div>
                  <Slider defaultValue={[180]} min={0} max={360} step={1} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Opacity</Label>
                    <span className="text-sm text-muted-foreground">95%</span>
                  </div>
                  <Slider defaultValue={[95]} min={0} max={100} step={1} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Blur</Label>
                    <span className="text-sm text-muted-foreground">2px</span>
                  </div>
                  <Slider defaultValue={[2]} min={0} max={10} step={0.1} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 