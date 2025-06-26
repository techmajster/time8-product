'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Play, Image as ImageIcon, Monitor, Smartphone, Calendar, FileText, Video, Square, Crop } from 'lucide-react';

// Properties interface
interface AspectRatioProperties {
  ratio: string;
  customRatio: string;
  contentType: 'image' | 'video' | 'placeholder' | 'content' | 'chart';
  showBorder: boolean;
  rounded: boolean;
  width: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  background: 'none' | 'muted' | 'accent' | 'primary';
}

// Common aspect ratios
const aspectRatios = [
  { value: '16/9', label: '16:9 (Widescreen)', description: 'Standard for videos, monitors' },
  { value: '4/3', label: '4:3 (Traditional)', description: 'Classic TV, older monitors' },
  { value: '1/1', label: '1:1 (Square)', description: 'Social media posts, avatars' },
  { value: '3/2', label: '3:2 (Photo)', description: 'Standard photography' },
  { value: '5/4', label: '5:4 (Portrait)', description: 'Print formats' },
  { value: '21/9', label: '21:9 (Ultrawide)', description: 'Cinematic, ultrawide displays' },
  { value: '9/16', label: '9:16 (Vertical)', description: 'Mobile stories, vertical video' },
  { value: 'custom', label: 'Custom', description: 'Define your own ratio' }
];

// Properties Panel Component
function AspectRatioPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: AspectRatioProperties;
  onChange: (key: keyof AspectRatioProperties, value: any) => void;
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
        {/* Aspect Ratio */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Aspect Ratio</Label>
          <Select value={properties.ratio} onValueChange={(value) => onChange('ratio', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aspectRatios.map((ratio) => (
                <SelectItem key={ratio.value} value={ratio.value}>
                  <div className="flex flex-col">
                    <span>{ratio.label}</span>
                    <span className="text-xs text-muted-foreground">{ratio.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Ratio Input */}
        {properties.ratio === 'custom' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Custom Ratio (w/h)</Label>
            <Input
              value={properties.customRatio}
              onChange={(e) => onChange('customRatio', e.target.value)}
              placeholder="e.g., 16/9 or 1.777"
            />
            <p className="text-xs text-muted-foreground">
              Enter as fraction (16/9) or decimal (1.777)
            </p>
          </div>
        )}

        {/* Width */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Container Width</Label>
          <Select value={properties.width} onValueChange={(value) => onChange('width', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small (200px)</SelectItem>
              <SelectItem value="md">Medium (300px)</SelectItem>
              <SelectItem value="lg">Large (400px)</SelectItem>
              <SelectItem value="xl">Extra Large (500px)</SelectItem>
              <SelectItem value="full">Full Width</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Content Type</Label>
          <Select value={properties.contentType} onValueChange={(value) => onChange('contentType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video Player</SelectItem>
              <SelectItem value="placeholder">Placeholder</SelectItem>
              <SelectItem value="content">Text Content</SelectItem>
              <SelectItem value="chart">Chart/Graph</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Background */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Background</Label>
          <Select value={properties.background} onValueChange={(value) => onChange('background', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="muted">Muted</SelectItem>
              <SelectItem value="accent">Accent</SelectItem>
              <SelectItem value="primary">Primary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show Border */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Border</Label>
          <Switch 
            checked={properties.showBorder} 
            onCheckedChange={(checked) => onChange('showBorder', checked)}
          />
        </div>

        {/* Rounded Corners */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Rounded Corners</Label>
          <Switch 
            checked={properties.rounded} 
            onCheckedChange={(checked) => onChange('rounded', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateAspectRatioCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveAspectRatioPreview({ properties }: { properties: AspectRatioProperties }) {
  const getWidthClass = () => {
    switch (properties.width) {
      case 'sm': return 'w-[200px]';
      case 'md': return 'w-[300px]';
      case 'lg': return 'w-[400px]';
      case 'xl': return 'w-[500px]';
      case 'full': return 'w-full max-w-2xl';
      default: return 'w-[300px]';
    }
  };

  const getBackgroundClass = () => {
    switch (properties.background) {
      case 'muted': return 'bg-muted';
      case 'accent': return 'bg-accent';
      case 'primary': return 'bg-primary';
      default: return '';
    }
  };

  const getRatio = () => {
    if (properties.ratio === 'custom') {
      const custom = properties.customRatio;
      if (custom.includes('/')) {
        const [w, h] = custom.split('/');
        return parseFloat(w) / parseFloat(h);
      }
      return parseFloat(custom) || 16/9;
    }
    return properties.ratio;
  };

  const renderContent = () => {
    const baseClasses = `w-full h-full flex items-center justify-center ${getBackgroundClass()} ${
      properties.showBorder ? 'border' : ''
    } ${properties.rounded ? 'rounded-lg' : ''}`;

    switch (properties.contentType) {
      case 'image':
        return (
          <div className={`${baseClasses} bg-gradient-to-br from-blue-400 to-purple-500 overflow-hidden`}>
            <div className="text-white text-center">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-medium">Sample Image</p>
              <p className="text-xs opacity-75">Landscape Photo</p>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className={`${baseClasses} bg-black relative overflow-hidden`}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="text-white text-center z-10">
              <div className="w-12 h-12 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center">
                <Play className="h-6 w-6 ml-1" />
              </div>
              <p className="text-sm font-medium">Video Player</p>
              <p className="text-xs opacity-75">1080p • 16:9</p>
            </div>
          </div>
        );
      case 'placeholder':
        return (
          <div className={`${baseClasses} bg-muted border-2 border-dashed`}>
            <div className="text-center text-muted-foreground">
              <Square className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Content Area</p>
              <p className="text-xs">Drag & drop content here</p>
            </div>
          </div>
        );
      case 'content':
        return (
          <div className={`${baseClasses} p-6 text-left`}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Article Title</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This is a sample content area that maintains the specified aspect ratio. 
                It could contain articles, blog posts, or any other text-based content.
              </p>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>5 min read</span>
                <span>•</span>
                <span>Technology</span>
              </div>
            </div>
          </div>
        );
      case 'chart':
        return (
          <div className={`${baseClasses} p-4`}>
            <div className="w-full h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm font-medium">Analytics Chart</span>
              </div>
              <div className="flex-1 flex items-end gap-1">
                {[40, 70, 45, 80, 60, 90, 35].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary/20 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className={baseClasses}>
            <div className="text-center text-muted-foreground">
              <Crop className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Aspect Ratio Container</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full min-h-[500px] flex items-center justify-center p-8">
      <div className={getWidthClass()}>
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-1">
              {aspectRatios.find(r => r.value === properties.ratio)?.label || 'Custom Ratio'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {properties.ratio === 'custom' 
                ? `Custom: ${properties.customRatio}` 
                : aspectRatios.find(r => r.value === properties.ratio)?.description
              }
            </p>
          </div>
          
          <AspectRatio ratio={getRatio()}>
            {renderContent()}
          </AspectRatio>

          <div className="text-center text-xs text-muted-foreground">
            Container adapts height based on width and aspect ratio
          </div>
        </div>
      </div>
    </div>
  );
}

const defaultProperties: AspectRatioProperties = {
  ratio: '16/9',
  customRatio: '16/9',
  contentType: 'image',
  showBorder: false,
  rounded: true,
  width: 'md',
  background: 'none'
};

function generateAspectRatioCode(props: AspectRatioProperties): string {
  const ratio = props.ratio === 'custom' ? props.customRatio : props.ratio;
  const containerClasses = [
    props.showBorder && 'border',
    props.rounded && 'rounded-lg',
    props.background !== 'none' && `bg-${props.background}`
  ].filter(Boolean).join(' ');

  return `<AspectRatio ratio={${ratio}}>
  <div className="${containerClasses || 'w-full h-full'}">
    {/* Your content here */}
  </div>
</AspectRatio>`;
}

export default function AspectRatioComponentPage() {
  const [properties, setProperties] = useState<AspectRatioProperties>(defaultProperties);

  const handlePropertyChange = (key: keyof AspectRatioProperties, value: any) => {
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
          <h1 className="text-3xl font-bold">Aspect Ratio</h1>
          <Badge variant="outline">Layout Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A component for maintaining consistent aspect ratios across different content types. Essential for responsive images, videos, and containers.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Aspect Ratio Preview</CardTitle>
            <CardDescription>
              Customize the aspect ratio properties and see changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2 flex items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 h-full min-h-[500px]">
                <LiveAspectRatioPreview properties={properties} />
              </div>

              {/* Properties Panel */}
              <div className="space-y-4 p-4 border rounded-lg bg-background h-full min-h-[500px]">
                <AspectRatioPropertiesPanel
                  properties={properties}
                  onChange={handlePropertyChange}
                  onReset={handleReset}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Common Ratios */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Common Aspect Ratios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {aspectRatios.slice(0, -1).map((ratio) => (
            <Card key={ratio.value} className="text-center">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{ratio.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <AspectRatio ratio={ratio.value} className="mb-3">
                  <div className="w-full h-full border-2 border-dashed border-muted-foreground/25 rounded flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-mono">{ratio.value}</span>
                  </div>
                </AspectRatio>
                <p className="text-sm text-muted-foreground">{ratio.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Use Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Media Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <AspectRatio ratio={16/9} className="bg-muted rounded">
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-6 w-6 text-muted-foreground" />
                  </div>
                </AspectRatio>
                <AspectRatio ratio={1} className="bg-muted rounded">
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                </AspectRatio>
              </div>
              <p className="text-sm text-muted-foreground">
                Perfect for embedding videos, images, and media players with consistent dimensions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Responsive Design
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <AspectRatio ratio={9/16} className="bg-muted rounded">
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs">9:16</span>
                  </div>
                </AspectRatio>
                <AspectRatio ratio={4/3} className="bg-muted rounded">
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs">4:3</span>
                  </div>
                </AspectRatio>
                <AspectRatio ratio={21/9} className="bg-muted rounded">
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs">21:9</span>
                  </div>
                </AspectRatio>
              </div>
              <p className="text-sm text-muted-foreground">
                Ensures content maintains proportions across different screen sizes and orientations.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Technical Notes */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Technical Implementation</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Responsive Behavior</h4>
                <p className="text-sm text-muted-foreground">
                  The component automatically calculates height based on width and aspect ratio, ensuring perfect proportions at any size.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">CSS Implementation</h4>
                <p className="text-sm text-muted-foreground">
                  Uses CSS aspect-ratio property with fallback support for older browsers through padding-based technique.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Performance</h4>
                <p className="text-sm text-muted-foreground">
                  Minimal overhead with pure CSS solution that doesn't require JavaScript for ratio calculations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}