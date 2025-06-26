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
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Calendar, 
  MapPin, 
  Link, 
  Star, 
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Github,
  Twitter,
  Calendar as CalendarIcon
} from 'lucide-react';

// Properties interface
interface HoverCardProperties {
  triggerType: 'text' | 'button' | 'avatar' | 'image' | 'link';
  triggerText: string;
  openDelay: number;
  closeDelay: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  align: 'start' | 'center' | 'end';
  sideOffset: number;
  contentType: 'profile' | 'preview' | 'stats' | 'info' | 'tooltip';
  width: number;
  showArrow: boolean;
}

// Properties Panel Component
function HoverCardPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: HoverCardProperties;
  onChange: (key: keyof HoverCardProperties, value: any) => void;
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
        {/* Trigger Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trigger Type</Label>
          <Select value={properties.triggerType} onValueChange={(value) => onChange('triggerType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="button">Button</SelectItem>
              <SelectItem value="avatar">Avatar</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="link">Link</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trigger Text */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trigger Text</Label>
          <Input
            value={properties.triggerText}
            onChange={(e) => onChange('triggerText', e.target.value)}
            placeholder="Hover me"
          />
        </div>

        {/* Content Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Content Type</Label>
          <Select value={properties.contentType} onValueChange={(value) => onChange('contentType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profile">User Profile</SelectItem>
              <SelectItem value="preview">Content Preview</SelectItem>
              <SelectItem value="stats">Statistics</SelectItem>
              <SelectItem value="info">Information Card</SelectItem>
              <SelectItem value="tooltip">Rich Tooltip</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Open Delay */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Open Delay: {properties.openDelay}ms</Label>
          <Input
            type="range"
            min="0"
            max="1000"
            step="50"
            value={properties.openDelay}
            onChange={(e) => onChange('openDelay', parseInt(e.target.value))}
          />
        </div>

        {/* Close Delay */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Close Delay: {properties.closeDelay}ms</Label>
          <Input
            type="range"
            min="0"
            max="1000"
            step="50"
            value={properties.closeDelay}
            onChange={(e) => onChange('closeDelay', parseInt(e.target.value))}
          />
        </div>

        {/* Side */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Side</Label>
          <Select value={properties.side} onValueChange={(value) => onChange('side', value)}>
            <SelectTrigger>
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

        {/* Align */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Align</Label>
          <Select value={properties.align} onValueChange={(value) => onChange('align', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="start">Start</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="end">End</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Side Offset */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Side Offset: {properties.sideOffset}px</Label>
          <Input
            type="range"
            min="0"
            max="20"
            value={properties.sideOffset}
            onChange={(e) => onChange('sideOffset', parseInt(e.target.value))}
          />
        </div>

        {/* Width */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Width: {properties.width}px</Label>
          <Input
            type="range"
            min="200"
            max="400"
            value={properties.width}
            onChange={(e) => onChange('width', parseInt(e.target.value))}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateHoverCardCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveHoverCardPreview({ properties }: { properties: HoverCardProperties }) {
  const renderTrigger = () => {
    switch (properties.triggerType) {
      case 'text':
        return (
          <span className="text-foreground cursor-pointer underline decoration-dotted underline-offset-4">
            {properties.triggerText}
          </span>
        );
      case 'button':
        return (
          <Button variant="outline">
            {properties.triggerText}
          </Button>
        );
      case 'avatar':
        return (
          <Avatar className="cursor-pointer">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        );
      case 'image':
        return (
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg cursor-pointer flex items-center justify-center text-white font-medium">
            IMG
          </div>
        );
      case 'link':
        return (
          <a href="#" className="text-blue-600 hover:text-blue-800 underline cursor-pointer">
            {properties.triggerText}
          </a>
        );
      default:
        return <span className="cursor-pointer">{properties.triggerText}</span>;
    }
  };

  const renderContent = () => {
    switch (properties.contentType) {
      case 'profile':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-semibold">John Doe</h4>
                <p className="text-sm text-muted-foreground">@johndoe</p>
              </div>
            </div>
            <p className="text-sm">
              Senior Frontend Developer at Acme Corp. Passionate about React, TypeScript, and building great user experiences.
            </p>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <MapPin className="h-3 w-3" />
                <span>San Francisco, CA</span>
              </div>
              <div className="flex items-center space-x-1">
                <CalendarIcon className="h-3 w-3" />
                <span>Joined March 2021</span>
              </div>
            </div>
            <div className="flex space-x-4 text-sm">
              <div><span className="font-medium">156</span> Following</div>
              <div><span className="font-medium">2.3k</span> Followers</div>
            </div>
          </div>
        );
      
      case 'preview':
        return (
          <div className="space-y-3">
            <div className="w-full h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
            <div>
              <h4 className="font-semibold">Building Design Systems</h4>
              <p className="text-sm text-muted-foreground mt-1">
                A comprehensive guide to creating scalable design systems for modern web applications.
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>1.2k views</span>
              </div>
              <div className="flex items-center space-x-1">
                <Heart className="h-3 w-3" />
                <span>89 likes</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>5 min read</span>
              </div>
            </div>
          </div>
        );
      
      case 'stats':
        return (
          <div className="space-y-3">
            <h4 className="font-semibold">Repository Statistics</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-lg font-bold">2.3k</div>
                <div className="text-xs text-muted-foreground">Stars</div>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-lg font-bold">456</div>
                <div className="text-xs text-muted-foreground">Forks</div>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-lg font-bold">89</div>
                <div className="text-xs text-muted-foreground">Issues</div>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-lg font-bold">12</div>
                <div className="text-xs text-muted-foreground">PRs</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Last updated 2 hours ago
            </div>
          </div>
        );
      
      case 'info':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <h4 className="font-semibold">Team Information</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Members:</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Projects:</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed:</span>
                <span className="font-medium">24</span>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Cross-functional team focused on product development and user experience design.
              </p>
            </div>
          </div>
        );
      
      case 'tooltip':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <h4 className="font-semibold">Premium Feature</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              This feature is available for Pro and Enterprise plans. Upgrade to unlock advanced functionality.
            </p>
            <div className="flex space-x-2 pt-2">
              <Button size="sm">Upgrade</Button>
              <Button size="sm" variant="outline">Learn More</Button>
            </div>
          </div>
        );
      
      default:
        return <div>Default content</div>;
    }
  };

  return (
    <div className="flex items-center justify-center p-8">
      <HoverCard openDelay={properties.openDelay} closeDelay={properties.closeDelay}>
        <HoverCardTrigger asChild>
          {renderTrigger()}
        </HoverCardTrigger>
        <HoverCardContent 
          side={properties.side} 
          align={properties.align}
          sideOffset={properties.sideOffset}
          style={{ width: `${properties.width}px` }}
        >
          {renderContent()}
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

// Generate code function
function generateHoverCardCode(props: HoverCardProperties): string {
  return `<HoverCard 
  openDelay={${props.openDelay}} 
  closeDelay={${props.closeDelay}}
>
  <HoverCardTrigger asChild>
    <span className="cursor-pointer underline">
      ${props.triggerText}
    </span>
  </HoverCardTrigger>
  <HoverCardContent 
    side="${props.side}" 
    align="${props.align}"
    sideOffset={${props.sideOffset}}
    style={{ width: "${props.width}px" }}
  >
    <div className="space-y-2">
      <h4 className="font-semibold">Hover Card Content</h4>
      <p className="text-sm text-muted-foreground">
        Rich content that appears on hover.
      </p>
    </div>
  </HoverCardContent>
</HoverCard>`;
}

export default function HoverCardComponentPage() {
  const [hoverCardProperties, setHoverCardProperties] = useState<HoverCardProperties>({
    triggerType: 'text',
    triggerText: 'Hover over me',
    openDelay: 700,
    closeDelay: 300,
    side: 'bottom',
    align: 'center',
    sideOffset: 4,
    contentType: 'profile',
    width: 320,
    showArrow: true,
  });

  const handlePropertyChange = (key: keyof HoverCardProperties, value: any) => {
    setHoverCardProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setHoverCardProperties({
      triggerType: 'text',
      triggerText: 'Hover over me',
      openDelay: 700,
      closeDelay: 300,
      side: 'bottom',
      align: 'center',
      sideOffset: 4,
      contentType: 'profile',
      width: 320,
      showArrow: true,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Hover Card</h1>
          <Badge variant="outline">Display Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          For sighted users to preview content available behind a link. Perfect for showing user profiles, 
          content previews, or additional information on hover without requiring a click.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Hover over the trigger element to see the card. Customize properties below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveHoverCardPreview properties={hoverCardProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <HoverCardPropertiesPanel 
                    properties={hoverCardProperties}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profiles
              </CardTitle>
              <CardDescription>
                Display user information and social details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for showing user cards with avatars, bio, and social metrics.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Content Previews
              </CardTitle>
              <CardDescription>
                Preview articles, posts, or media content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Show thumbnails, titles, and metadata for content before clicking.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Rich Tooltips
              </CardTitle>
              <CardDescription>
                Enhanced tooltips with actions and formatting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                More than basic tooltips - include buttons, links, and rich content.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Timing & Behavior Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Timing & Behavior</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Open Delay
              </CardTitle>
              <CardDescription>
                Time before the card appears on hover
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Prevents accidental triggers when quickly moving the mouse. Default is 700ms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Close Delay
              </CardTitle>
              <CardDescription>
                Time before the card disappears on mouse leave
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Allows users to move mouse to the card content. Default is 300ms.
              </p>
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
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>
                Show user profiles when hovering over names or avatars
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Display user information, follower counts, and bio when hovering over usernames 
                or profile pictures in feeds, comments, or user lists.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Link Previews</CardTitle>
              <CardDescription>
                Preview content behind links before clicking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Show article previews, product information, or page summaries when users hover 
                over links, helping them decide whether to navigate.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Visualization</CardTitle>
              <CardDescription>
                Show detailed information for chart points or table cells
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Display detailed metrics, calculations, or context when hovering over data points 
                in charts, graphs, or complex tables.
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
              <h4 className="font-medium mb-2">Accessibility</h4>
              <p className="text-sm text-muted-foreground">
                Keyboard accessible with focus support. Content is announced to screen readers appropriately.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Mobile Considerations</h4>
              <p className="text-sm text-muted-foreground">
                On touch devices, the card appears on tap and disappears when tapping elsewhere.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Performance</h4>
              <p className="text-sm text-muted-foreground">
                Content is only rendered when needed, and positioning is optimized for smooth animations.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 