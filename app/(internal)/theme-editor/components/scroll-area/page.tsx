'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  FileText,
  Image,
  MessageSquare,
  User,
  Calendar,
  Settings,
  ChevronRight,
  Star,
  Heart,
  Clock,
  MapPin,
  Mail,
  Phone,
  Globe,
  Tag,
  Bookmark,
  Download,
  Eye,
  ThumbsUp
} from 'lucide-react';

// Properties interface
interface ScrollAreaProperties {
  height: number;
  width: number;
  orientation: 'vertical' | 'horizontal' | 'both';
  content: 'text' | 'list' | 'cards' | 'gallery' | 'chat' | 'code';
  itemCount: number;
  showScrollbar: boolean;
  thumbStyle: 'default' | 'thin' | 'thick';
  autoHide: boolean;
}

// Properties Panel Component
function ScrollAreaPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: ScrollAreaProperties;
  onChange: (key: keyof ScrollAreaProperties, value: any) => void;
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
        {/* Content Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Content Type</Label>
          <Select value={properties.content} onValueChange={(value) => onChange('content', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Long Text</SelectItem>
              <SelectItem value="list">List Items</SelectItem>
              <SelectItem value="cards">Card Grid</SelectItem>
              <SelectItem value="gallery">Image Gallery</SelectItem>
              <SelectItem value="chat">Chat Messages</SelectItem>
              <SelectItem value="code">Code Block</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orientation */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Scroll Orientation</Label>
          <Select value={properties.orientation} onValueChange={(value) => onChange('orientation', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vertical">Vertical Only</SelectItem>
              <SelectItem value="horizontal">Horizontal Only</SelectItem>
              <SelectItem value="both">Both Directions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Height */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Height (px): {properties.height}</Label>
          <Slider
            value={[properties.height]}
            onValueChange={(value) => onChange('height', value[0])}
            max={600}
            min={200}
            step={20}
            className="w-full"
          />
        </div>

        {/* Width */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Width (px): {properties.width}</Label>
          <Slider
            value={[properties.width]}
            onValueChange={(value) => onChange('width', value[0])}
            max={600}
            min={200}
            step={20}
            className="w-full"
          />
        </div>

        {/* Item Count */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Item Count: {properties.itemCount}</Label>
          <Slider
            value={[properties.itemCount]}
            onValueChange={(value) => onChange('itemCount', value[0])}
            max={100}
            min={5}
            step={5}
            className="w-full"
          />
        </div>

        {/* Thumb Style */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Scrollbar Style</Label>
          <Select value={properties.thumbStyle} onValueChange={(value) => onChange('thumbStyle', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="thin">Thin</SelectItem>
              <SelectItem value="thick">Thick</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show Scrollbar */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Scrollbar</Label>
          <Switch 
            checked={properties.showScrollbar} 
            onCheckedChange={(checked) => onChange('showScrollbar', checked)}
          />
        </div>

        {/* Auto Hide */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Auto Hide</Label>
          <Switch 
            checked={properties.autoHide} 
            onCheckedChange={(checked) => onChange('autoHide', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateScrollAreaCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveScrollAreaPreview({ properties }: { properties: ScrollAreaProperties }) {
  const getContentByType = () => {
    switch (properties.content) {
      case 'text':
        return (
          <div className="space-y-4 p-4">
            <h3 className="text-lg font-semibold">Lorem Ipsum Article</h3>
            {Array.from({ length: Math.ceil(properties.itemCount / 5) }).map((_, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut 
                labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco 
                laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in 
                voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat 
                non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            ))}
          </div>
        );

      case 'list':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Task List</h3>
            <div className="space-y-2">
              {Array.from({ length: properties.itemCount }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50">
                  <div className="w-4 h-4 border rounded border-muted-foreground" />
                  <span className="text-sm">Task item #{i + 1} - Complete project milestone</span>
                  <div className="ml-auto flex items-center space-x-1">
                    <Badge variant="secondary">{i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Medium' : 'Low'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'cards':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Product Gallery</h3>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: properties.itemCount }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-32 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">Product {i + 1}</CardTitle>
                    <CardDescription className="text-xs">
                      Amazing product description here
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'gallery':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Photo Gallery</h3>
            <div className={`${properties.orientation === 'horizontal' ? 'flex space-x-4' : 'grid grid-cols-3 gap-4'}`}>
              {Array.from({ length: properties.itemCount }).map((_, i) => (
                <div 
                  key={i} 
                  className={`relative rounded-lg overflow-hidden ${
                    properties.orientation === 'horizontal' ? 'w-48 h-32 flex-shrink-0' : 'aspect-square'
                  }`}
                >
                  <div className="w-full h-full bg-gradient-to-br from-purple-200 via-pink-200 to-orange-200 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Image {i + 1}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Chat Messages</h3>
            <div className="space-y-3">
              {Array.from({ length: properties.itemCount }).map((_, i) => (
                <div key={i} className={`flex ${i % 3 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-lg p-3 ${
                    i % 3 === 0 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-muted text-foreground'
                  }`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <User className="h-3 w-3" />
                      <span className="text-xs opacity-70">
                        {i % 3 === 0 ? 'You' : `User ${i % 5 + 1}`}
                      </span>
                      <Clock className="h-3 w-3 opacity-50" />
                    </div>
                    <p className="text-sm">
                      {i % 4 === 0 ? 'Hey there! How are you doing?' :
                       i % 4 === 1 ? 'Working on some new features today 🚀' :
                       i % 4 === 2 ? 'The new design looks great!' :
                       'Thanks for the feedback!'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'code':
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Code Example</h3>
            <div className="bg-muted/50 rounded p-4 font-mono text-xs">
              {Array.from({ length: properties.itemCount }).map((_, i) => (
                <div key={i} className="flex space-x-4 py-1">
                  <span className="text-muted-foreground w-6 text-right">{i + 1}</span>
                  <span>
                    {i === 0 ? 'import React from "react";' :
                     i === 1 ? 'import { ScrollArea } from "@/components/ui/scroll-area";' :
                     i === 2 ? '' :
                     i === 3 ? 'export default function Component() {' :
                     i === 4 ? '  return (' :
                     i % 6 === 0 ? `    <div className="component-${i}">` :
                     i % 6 === 1 ? '      <h1>Hello World</h1>' :
                     i % 6 === 2 ? '      <p>This is a paragraph</p>' :
                     i % 6 === 3 ? '    </div>' :
                     i % 6 === 4 ? '  );' :
                     '}'
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <div>Content here</div>;
    }
  };

  const scrollAreaStyle = {
    height: `${properties.height}px`,
    width: properties.orientation === 'horizontal' ? `${properties.width}px` : 'auto',
  };

  const getScrollBarClassName = () => {
    let className = '';
    if (properties.thumbStyle === 'thin') {
      className += ' [&>div]:w-1';
    } else if (properties.thumbStyle === 'thick') {
      className += ' [&>div]:w-4';
    }
    return className;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-8">
      <div className="space-y-8 w-full max-w-4xl">
        {/* Main Scroll Area */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Interactive Scroll Area</h3>
          <div className="flex justify-center">
            <ScrollArea 
              className={`border rounded-lg ${!properties.showScrollbar ? '[&>div:last-child]:hidden' : ''}`}
              style={scrollAreaStyle}
            >
              <div className={properties.orientation === 'horizontal' ? 'w-max' : ''}>
                {getContentByType()}
              </div>
              {properties.orientation !== 'vertical' && (
                <ScrollBar 
                  orientation="horizontal" 
                  className={getScrollBarClassName()}
                />
              )}
            </ScrollArea>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Scroll to explore the content. Scrollbars are styled consistently across browsers.
          </p>
        </div>

        <Separator />

        {/* Example Patterns */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-center">Common Patterns</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sidebar Navigation */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Sidebar Navigation</h4>
              <ScrollArea className="h-48 border rounded">
                <div className="p-4 space-y-2">
                  {[
                    { icon: User, label: 'Profile', badge: null },
                    { icon: Settings, label: 'Settings', badge: null },
                    { icon: Mail, label: 'Messages', badge: '12' },
                    { icon: Calendar, label: 'Calendar', badge: '3' },
                    { icon: FileText, label: 'Documents', badge: null },
                    { icon: Star, label: 'Favorites', badge: null },
                    { icon: Download, label: 'Downloads', badge: null },
                    { icon: Globe, label: 'Network', badge: null },
                    { icon: Tag, label: 'Tags', badge: '24' },
                    { icon: Bookmark, label: 'Bookmarks', badge: null },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                      <div className="flex items-center space-x-2">
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">{item.badge}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Horizontal Image Strip */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Horizontal Gallery</h4>
              <ScrollArea className="h-48 border rounded">
                <div className="flex space-x-4 p-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="w-32 h-32 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Photo {i + 1}</span>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {/* Comments Section */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Comments Feed</h4>
              <ScrollArea className="h-48 border rounded">
                <div className="p-4 space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-200 to-blue-200 flex items-center justify-center">
                        <span className="text-xs">{String.fromCharCode(65 + i)}</span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">User {i + 1}</span>
                          <span className="text-xs text-muted-foreground">2h ago</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          This is a comment from user {i + 1}. Great work on this project!
                        </p>
                        <div className="flex items-center space-x-3 text-xs">
                          <button className="flex items-center space-x-1 text-muted-foreground hover:text-foreground">
                            <ThumbsUp className="h-3 w-3" />
                            <span>{Math.floor(Math.random() * 20)}</span>
                          </button>
                          <button className="text-muted-foreground hover:text-foreground">
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Data Table */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Data Table</h4>
              <ScrollArea className="h-48 border rounded">
                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Role</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 15 }).map((_, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="p-2">User {i + 1}</td>
                          <td className="p-2">user{i + 1}@example.com</td>
                          <td className="p-2">{i % 3 === 0 ? 'Admin' : i % 3 === 1 ? 'Editor' : 'Viewer'}</td>
                          <td className="p-2">
                            <Badge variant={i % 2 === 0 ? 'default' : 'secondary'}>
                              {i % 2 === 0 ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate code function
function generateScrollAreaCode(props: ScrollAreaProperties): string {
  return `<ScrollArea 
  className="h-[${props.height}px]${props.orientation === 'horizontal' ? ` w-[${props.width}px]` : ''} border rounded"
  ${!props.showScrollbar ? '// Custom styling to hide scrollbar if needed' : ''}
>
  <div${props.orientation === 'horizontal' ? ' className="w-max"' : ''}>
    {/* Your content here */}
    ${props.content === 'text' ? 'Long text content that exceeds container height...' :
      props.content === 'list' ? 'List items that require scrolling...' :
      props.content === 'cards' ? 'Grid of cards or components...' :
      'Your scrollable content'}
  </div>
  ${props.orientation === 'horizontal' || props.orientation === 'both' ? 
    '<ScrollBar orientation="horizontal" />' : ''}
</ScrollArea>`;
}

export default function ScrollAreaComponentPage() {
  const [scrollAreaProperties, setScrollAreaProperties] = useState<ScrollAreaProperties>({
    height: 400,
    width: 500,
    orientation: 'vertical',
    content: 'list',
    itemCount: 25,
    showScrollbar: true,
    thumbStyle: 'default',
    autoHide: false,
  });

  const handlePropertyChange = (key: keyof ScrollAreaProperties, value: any) => {
    setScrollAreaProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setScrollAreaProperties({
      height: 400,
      width: 500,
      orientation: 'vertical',
      content: 'list',
      itemCount: 25,
      showScrollbar: true,
      thumbStyle: 'default',
      autoHide: false,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Scroll Area</h1>
          <Badge variant="outline">Utility Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Augments native scroll functionality for custom, cross-browser styling. Create consistent 
          scrollable areas with enhanced visual design and accessibility features.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Explore different scroll area configurations and content types. Customize properties to see real-time changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveScrollAreaPreview properties={scrollAreaProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <ScrollAreaPropertiesPanel 
                    properties={scrollAreaProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Content Types Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Content Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Text Content
              </CardTitle>
              <CardDescription>
                Long articles and documentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for blog posts, documentation, terms of service, and any lengthy text content 
                that needs vertical scrolling.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Interactive Lists
              </CardTitle>
              <CardDescription>
                Dynamic lists and feeds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ideal for comment sections, chat messages, task lists, and any interactive content 
                that grows dynamically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Media Galleries
              </CardTitle>
              <CardDescription>
                Horizontal and grid layouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Great for image carousels, product galleries, and any media content requiring 
                horizontal or two-dimensional scrolling.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Cross-Browser Consistency
              </CardTitle>
              <CardDescription>
                Unified scrollbar styling across all browsers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Eliminates browser-specific scroll differences:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Consistent visual appearance</li>
                <li>• Custom thumb and track styling</li>
                <li>• Predictable behavior across platforms</li>
                <li>• Theme-aware color integration</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Enhanced Accessibility
              </CardTitle>
              <CardDescription>
                Full keyboard and screen reader support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Accessibility features built-in:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Keyboard navigation (arrow keys, page up/down)</li>
                <li>• Screen reader announcements</li>
                <li>• Focus management and indicators</li>
                <li>• ARIA attributes for scroll state</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Common Use Cases</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Tables and Grids</CardTitle>
              <CardDescription>
                Large datasets requiring horizontal and vertical scrolling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enable users to navigate large tables with consistent scrollbar styling. 
                Perfect for admin dashboards, spreadsheets, and data visualization tools.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sidebar Navigation</CardTitle>
              <CardDescription>
                Long navigation lists and menu hierarchies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Maintain clean sidebar designs even with extensive navigation options. 
                Ideal for complex applications with deep menu structures.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Feeds</CardTitle>
              <CardDescription>
                Social feeds, comments, and real-time content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create smooth scrolling experiences for dynamic content that grows over time. 
                Perfect for social media feeds, comment sections, and notification panels.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Technical Notes */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Technical Notes</h2>
        <Card>
          <CardHeader>
            <CardTitle>Implementation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Performance</h4>
              <p className="text-sm text-muted-foreground">
                Optimized scrolling performance with efficient DOM handling and minimal layout thrashing. 
                Built on Radix UI primitives for production-ready reliability.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Styling Flexibility</h4>
              <p className="text-sm text-muted-foreground">
                Complete control over scrollbar appearance through CSS custom properties. 
                Integrates seamlessly with your design system and theme variables.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Browser Support</h4>
              <p className="text-sm text-muted-foreground">
                Works consistently across all modern browsers including Chrome, Firefox, Safari, and Edge. 
                Graceful fallback to native scrollbars when necessary.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 