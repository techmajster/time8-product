'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { HelpCircle, Info, Settings, User, Heart, Star, Copy, Edit, Trash2 } from 'lucide-react';

// Live Tooltip Preview Component
function LiveTooltipPreview({ 
  side, 
  content, 
  triggerText, 
  delayDuration, 
  hasArrow 
}: {
  side: 'top' | 'right' | 'bottom' | 'left';
  content: string;
  triggerText: string;
  delayDuration: number;
  hasArrow: boolean;
}) {
  return (
    <div className="flex items-center justify-center">
      <TooltipProvider delayDuration={delayDuration}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">{triggerText}</Button>
          </TooltipTrigger>
          <TooltipContent side={side} className={hasArrow ? '' : 'data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade'}>
            <p>{content}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// Properties Panel Component
function TooltipPropertiesPanel({ 
  side, 
  setSide, 
  content, 
  setContent, 
  triggerText, 
  setTriggerText, 
  delayDuration, 
  setDelayDuration, 
  hasArrow, 
  setHasArrow 
}: {
  side: 'top' | 'right' | 'bottom' | 'left';
  setSide: (side: 'top' | 'right' | 'bottom' | 'left') => void;
  content: string;
  setContent: (content: string) => void;
  triggerText: string;
  setTriggerText: (text: string) => void;
  delayDuration: number;
  setDelayDuration: (duration: number) => void;
  hasArrow: boolean;
  setHasArrow: (hasArrow: boolean) => void;
}) {
  const resetToDefaults = () => {
    setSide('top');
    setContent('This is a helpful tooltip');
    setTriggerText('Hover me');
    setDelayDuration(700);
    setHasArrow(true);
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
        {/* Side */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Position</Label>
          <Select value={side} onValueChange={(value: 'top' | 'right' | 'bottom' | 'left') => setSide(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
              <SelectItem value="left">Left</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Content</Label>
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tooltip content"
          />
        </div>

        {/* Trigger Text */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trigger Text</Label>
          <Input
            value={triggerText}
            onChange={(e) => setTriggerText(e.target.value)}
            placeholder="Button text"
          />
        </div>

        {/* Delay Duration */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Delay: {delayDuration}ms</Label>
          <Input
            type="range"
            min="0"
            max="2000"
            step="100"
            value={delayDuration}
            onChange={(e) => setDelayDuration(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Has Arrow */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Arrow</Label>
          <Switch checked={hasArrow} onCheckedChange={setHasArrow} />
        </div>
      </div>
    </div>
  );
}

export default function TooltipComponentPage() {
  // Interactive example state
  const [side, setSide] = useState<'top' | 'right' | 'bottom' | 'left'>('top');
  const [content, setContent] = useState('This is a helpful tooltip');
  const [triggerText, setTriggerText] = useState('Hover me');
  const [delayDuration, setDelayDuration] = useState(700);
  const [hasArrow, setHasArrow] = useState(true);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Tooltip</h1>
          <Badge variant="outline">Display Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Tooltip Preview</CardTitle>
            <CardDescription>
              Customize the tooltip properties and see changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2 flex items-center justify-center p-8 border rounded-lg bg-muted/30 h-full min-h-[500px]">
                <LiveTooltipPreview
                  side={side}
                  content={content}
                  triggerText={triggerText}
                  delayDuration={delayDuration}
                  hasArrow={hasArrow}
                />
              </div>

              {/* Properties Panel */}
              <div className="space-y-4 p-4 border rounded-lg bg-background h-full min-h-[500px]">
                <TooltipPropertiesPanel
                  side={side}
                  setSide={setSide}
                  content={content}
                  setContent={setContent}
                  triggerText={triggerText}
                  setTriggerText={setTriggerText}
                  delayDuration={delayDuration}
                  setDelayDuration={setDelayDuration}
                  hasArrow={hasArrow}
                  setHasArrow={setHasArrow}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Position Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Position Variants</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Top</Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Tooltip on top</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Right</Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Tooltip on right</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Bottom</Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Tooltip on bottom</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Left</Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Tooltip on left</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Common Use Cases */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Common Use Cases</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Icon Buttons</CardTitle>
              <CardDescription>Explaining icon-only buttons</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy to clipboard</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit item</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete item</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Help Information</CardTitle>
              <CardDescription>Providing additional context</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label>Email Address</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>We'll never share your email address</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center gap-2">
                  <Label>Password Strength</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Must be at least 8 characters with uppercase, lowercase, and numbers</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Interactive Elements */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Elements</h2>
        <Card>
          <CardHeader>
            <CardTitle>Different Trigger Types</CardTitle>
            <CardDescription>Tooltips can be attached to various elements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Text Elements</h4>
                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="underline decoration-dotted cursor-help">
                          Hover for definition
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>A detailed explanation of this term</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Disabled Elements</h4>
                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block">
                          <Button disabled>Disabled Button</Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This feature is not available yet</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Custom Content</h4>
                <div className="space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline">Rich Content</Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-semibold">Advanced Tooltip</p>
                          <p className="text-sm">Multiple lines of content</p>
                          <p className="text-xs text-muted-foreground">With different styling</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Best Practices */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Best Practices</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Do ✓</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium">Keep content concise</p>
                  <p className="text-xs text-muted-foreground">Use brief, helpful descriptions</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium">Provide essential information</p>
                  <p className="text-xs text-muted-foreground">Explain unfamiliar terms or actions</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium">Use consistent positioning</p>
                  <p className="text-xs text-muted-foreground">Maintain predictable tooltip placement</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Don't ✗</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium">Include critical information</p>
                  <p className="text-xs text-muted-foreground">Essential content should be visible by default</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium">Make content too long</p>
                  <p className="text-xs text-muted-foreground">Avoid walls of text in tooltips</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium">Hide interactive elements</p>
                  <p className="text-xs text-muted-foreground">Don't put clickable content inside tooltips</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
} 