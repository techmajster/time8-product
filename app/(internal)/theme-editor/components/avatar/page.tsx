'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { User, Users, Settings, Crown } from 'lucide-react';

// Live Avatar Preview Component
function LiveAvatarPreview({ 
  size, 
  src, 
  fallback, 
  showBorder, 
  shape 
}: {
  size: 'sm' | 'default' | 'lg' | 'xl';
  src: string;
  fallback: string;
  showBorder: boolean;
  shape: 'circle' | 'square';
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-md'
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${shapeClasses[shape]} ${showBorder ? 'border-2 border-primary' : ''}`}>
      <AvatarImage src={src} alt="Avatar" />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}

// Properties Panel Component
function AvatarPropertiesPanel({ 
  size, 
  setSize, 
  src, 
  setSrc, 
  fallback, 
  setFallback, 
  showBorder, 
  setShowBorder, 
  shape, 
  setShape 
}: {
  size: 'sm' | 'default' | 'lg' | 'xl';
  setSize: (size: 'sm' | 'default' | 'lg' | 'xl') => void;
  src: string;
  setSrc: (src: string) => void;
  fallback: string;
  setFallback: (fallback: string) => void;
  showBorder: boolean;
  setShowBorder: (show: boolean) => void;
  shape: 'circle' | 'square';
  setShape: (shape: 'circle' | 'square') => void;
}) {
  const resetToDefaults = () => {
    setSize('default');
    setSrc('https://github.com/shadcn.png');
    setFallback('CN');
    setShowBorder(false);
    setShape('circle');
  };

  return (
    <div className="space-y-6 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Properties</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetToDefaults}
          className="text-xs"
        >
          Reset
        </Button>
      </div>

      <div className="space-y-4">
        {/* Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Size</Label>
          <Select value={size} onValueChange={(value: 'sm' | 'default' | 'lg' | 'xl') => setSize(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small (32px)</SelectItem>
              <SelectItem value="default">Default (40px)</SelectItem>
              <SelectItem value="lg">Large (48px)</SelectItem>
              <SelectItem value="xl">Extra Large (64px)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Shape */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Shape</Label>
          <Select value={shape} onValueChange={(value: 'circle' | 'square') => setShape(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="circle">Circle</SelectItem>
              <SelectItem value="square">Square</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Image Source */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Image URL</Label>
          <Input
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        {/* Fallback */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Fallback Text</Label>
          <Input
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
            placeholder="JD"
            maxLength={2}
          />
        </div>

        {/* Show Border */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Border</Label>
          <Switch checked={showBorder} onCheckedChange={setShowBorder} />
        </div>
      </div>

      {/* Code Preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
          <pre>{`<Avatar${size !== 'default' || shape !== 'circle' || showBorder ? ` className="${size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : size === 'xl' ? 'h-16 w-16' : 'h-10 w-10'}${shape === 'square' ? ' rounded-md' : ' rounded-full'}${showBorder ? ' border-2 border-primary' : ''}"` : ''}>
  <AvatarImage src="${src}" alt="Avatar" />
  <AvatarFallback>${fallback}</AvatarFallback>
</Avatar>`}</pre>
        </div>
      </div>
    </div>
  );
}

export default function AvatarComponentPage() {
  // Interactive example state
  const [size, setSize] = useState<'sm' | 'default' | 'lg' | 'xl'>('default');
  const [src, setSrc] = useState('https://github.com/shadcn.png');
  const [fallback, setFallback] = useState('CN');
  const [showBorder, setShowBorder] = useState(false);
  const [shape, setShape] = useState<'circle' | 'square'>('circle');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Avatar</h1>
          <Badge variant="outline">Display Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          An image element with a fallback for representing the user.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Avatar Preview</CardTitle>
            <CardDescription>
              Customize the avatar properties and see changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2 flex items-center justify-center p-8 border rounded-lg bg-muted/30 h-full min-h-[500px]">
                <LiveAvatarPreview
                  size={size}
                  src={src}
                  fallback={fallback}
                  showBorder={showBorder}
                  shape={shape}
                />
              </div>

              {/* Properties Panel */}
              <div className="space-y-4 p-4 border rounded-lg bg-background h-full min-h-[500px]">
                <AvatarPropertiesPanel
                  size={size}
                  setSize={setSize}
                  src={src}
                  setSrc={setSrc}
                  fallback={fallback}
                  setFallback={setFallback}
                  showBorder={showBorder}
                  setShowBorder={setShowBorder}
                  shape={shape}
                  setShape={setShape}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Size Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Size Variants</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="text-center space-y-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>SM</AvatarFallback>
                </Avatar>
                <p className="text-xs text-muted-foreground">Small</p>
              </div>
              
              <div className="text-center space-y-2">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>DF</AvatarFallback>
                </Avatar>
                <p className="text-xs text-muted-foreground">Default</p>
              </div>
              
              <div className="text-center space-y-2">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>LG</AvatarFallback>
                </Avatar>
                <p className="text-xs text-muted-foreground">Large</p>
              </div>
              
              <div className="text-center space-y-2">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>XL</AvatarFallback>
                </Avatar>
                <p className="text-xs text-muted-foreground">Extra Large</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Shape Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Shape Variants</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="text-center space-y-2">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CI</AvatarFallback>
                </Avatar>
                <p className="text-xs text-muted-foreground">Circle (Default)</p>
              </div>
              
              <div className="text-center space-y-2">
                <Avatar className="rounded-md">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>SQ</AvatarFallback>
                </Avatar>
                <p className="text-xs text-muted-foreground">Square</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Common Patterns */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Common Patterns</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>User Profiles</CardTitle>
              <CardDescription>Avatar with user information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-muted-foreground">john@example.com</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Jane Smith</p>
                  <p className="text-xs text-muted-foreground">jane@example.com</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Avatar Groups</CardTitle>
              <CardDescription>Multiple avatars together</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex -space-x-2">
                <Avatar className="border-2 border-background">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background">
                  <AvatarImage src="" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background">
                  <AvatarImage src="" />
                  <AvatarFallback>JS</AvatarFallback>
                </Avatar>
                <Avatar className="border-2 border-background">
                  <AvatarFallback>+2</AvatarFallback>
                </Avatar>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Status Indicators */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">With Status Indicators</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>ON</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              
              <div className="relative">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback>AW</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-yellow-500 border-2 border-white rounded-full"></div>
              </div>
              
              <div className="relative">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback>OF</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-gray-400 border-2 border-white rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 