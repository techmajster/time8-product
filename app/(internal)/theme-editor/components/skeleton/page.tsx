'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Live Skeleton Preview Component
function LiveSkeletonPreview({ 
  type, 
  animated, 
  count,
  size 
}: {
  type: 'line' | 'circle' | 'rect' | 'avatar' | 'card';
  animated: boolean;
  count: number;
  size: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: { height: 'h-3', width: 'w-24', circle: 'h-8 w-8' },
    md: { height: 'h-4', width: 'w-32', circle: 'h-12 w-12' },
    lg: { height: 'h-6', width: 'w-48', circle: 'h-16 w-16' }
  };

  const renderSkeleton = () => {
    switch (type) {
      case 'line':
        return (
          <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton 
                key={i} 
                className={`${sizeClasses[size].height} ${sizeClasses[size].width} ${animated ? 'animate-pulse' : ''}`} 
              />
            ))}
          </div>
        );
      case 'circle':
        return (
          <div className="flex gap-4">
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton 
                key={i} 
                className={`${sizeClasses[size].circle} rounded-full ${animated ? 'animate-pulse' : ''}`} 
              />
            ))}
          </div>
        );
      case 'rect':
        return (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: count }).map((_, i) => (
              <Skeleton 
                key={i} 
                className={`h-20 w-full ${animated ? 'animate-pulse' : ''}`} 
              />
            ))}
          </div>
        );
      case 'avatar':
        return (
          <div className="flex items-center space-x-4">
            <Skeleton className={`${sizeClasses[size].circle} rounded-full ${animated ? 'animate-pulse' : ''}`} />
            <div className="space-y-2">
              <Skeleton className={`h-4 w-32 ${animated ? 'animate-pulse' : ''}`} />
              <Skeleton className={`h-3 w-24 ${animated ? 'animate-pulse' : ''}`} />
            </div>
          </div>
        );
      case 'card':
        return (
          <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className={`h-32 w-full ${animated ? 'animate-pulse' : ''}`} />
                <div className="space-y-2">
                  <Skeleton className={`h-4 w-3/4 ${animated ? 'animate-pulse' : ''}`} />
                  <Skeleton className={`h-3 w-1/2 ${animated ? 'animate-pulse' : ''}`} />
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md">
      {renderSkeleton()}
    </div>
  );
}

// Properties Panel Component
function SkeletonPropertiesPanel({ 
  type, 
  setType, 
  animated, 
  setAnimated, 
  count, 
  setCount,
  size,
  setSize 
}: {
  type: 'line' | 'circle' | 'rect' | 'avatar' | 'card';
  setType: (type: 'line' | 'circle' | 'rect' | 'avatar' | 'card') => void;
  animated: boolean;
  setAnimated: (animated: boolean) => void;
  count: number;
  setCount: (count: number) => void;
  size: 'sm' | 'md' | 'lg';
  setSize: (size: 'sm' | 'md' | 'lg') => void;
}) {
  const resetToDefaults = () => {
    setType('line');
    setAnimated(true);
    setCount(3);
    setSize('md');
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
        {/* Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Type</Label>
          <Select value={type} onValueChange={(value: 'line' | 'circle' | 'rect' | 'avatar' | 'card') => setType(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="circle">Circle</SelectItem>
              <SelectItem value="rect">Rectangle</SelectItem>
              <SelectItem value="avatar">Avatar</SelectItem>
              <SelectItem value="card">Card</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Size</Label>
          <Select value={size} onValueChange={(value: 'sm' | 'md' | 'lg') => setSize(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Count */}
        {type !== 'avatar' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Count: {count}</Label>
            <Input
              type="range"
              min="1"
              max="5"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {/* Animated */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Animated</Label>
          <Switch checked={animated} onCheckedChange={setAnimated} />
        </div>
      </div>
    </div>
  );
}

export default function SkeletonComponentPage() {
  // Interactive example state
  const [type, setType] = useState<'line' | 'circle' | 'rect' | 'avatar' | 'card'>('line');
  const [animated, setAnimated] = useState(true);
  const [count, setCount] = useState(3);
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showContent, setShowContent] = useState(false);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Skeleton</h1>
          <Badge variant="outline">Display Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A placeholder component to show a loading state while content is being fetched.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Skeleton Preview</CardTitle>
            <CardDescription>
              Customize the skeleton properties and see changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2 flex items-start justify-center p-8 border rounded-lg bg-muted/30 h-full min-h-[500px]">
                <LiveSkeletonPreview
                  type={type}
                  animated={animated}
                  count={count}
                  size={size}
                />
              </div>

              {/* Properties Panel */}
              <div className="space-y-4 p-4 border rounded-lg bg-background h-full min-h-[500px]">
                <SkeletonPropertiesPanel
                  type={type}
                  setType={setType}
                  animated={animated}
                  setAnimated={setAnimated}
                  count={count}
                  setCount={setCount}
                  size={size}
                  setSize={setSize}
                />
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
              <CardTitle>User Profile Loading</CardTitle>
              <CardDescription>Loading state for profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>List Items</CardTitle>
              <CardDescription>Loading state for list content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Before/After Demo */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Loading State Demo</h2>
        <Card>
          <CardHeader>
            <CardTitle>Content Loading Simulation</CardTitle>
            <CardDescription>
              Toggle between loading skeleton and actual content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={() => setShowContent(!showContent)}>
                {showContent ? 'Show Loading State' : 'Show Content'}
              </Button>
              
              <div className="border rounded-lg p-6">
                {showContent ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">John Doe</h3>
                        <p className="text-sm text-muted-foreground">Software Engineer</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Recent Articles</h4>
                      <div className="space-y-1">
                        <p className="text-sm">Building Modern Web Applications</p>
                        <p className="text-sm">Understanding React Hooks</p>
                        <p className="text-sm">TypeScript Best Practices</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-40" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Card Loading States */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Card Loading States</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-32 w-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Different Shapes */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Different Shapes</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <h4 className="font-medium text-center">Lines</h4>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-center">Circles</h4>
                <div className="flex justify-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-16 w-16 rounded-full" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-center">Rectangles</h4>
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 