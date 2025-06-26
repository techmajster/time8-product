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
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Settings, 
  User, 
  Mail, 
  Calendar, 
  Info, 
  MessageSquare, 
  Share,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

// Properties interface
interface PopoverProperties {
  triggerVariant: 'button' | 'icon' | 'text' | 'card';
  triggerText: string;
  side: 'top' | 'right' | 'bottom' | 'left';
  align: 'start' | 'center' | 'end';
  sideOffset: number;
  contentType: 'simple' | 'form' | 'menu' | 'profile' | 'settings';
  width: number;
  showArrow: boolean;
  closeOnOutsideClick: boolean;
  modal: boolean;
}

// Properties Panel Component
function PopoverPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: PopoverProperties;
  onChange: (key: keyof PopoverProperties, value: any) => void;
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
        {/* Trigger Variant */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trigger Variant</Label>
          <Select value={properties.triggerVariant} onValueChange={(value) => onChange('triggerVariant', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="button">Button</SelectItem>
              <SelectItem value="icon">Icon Button</SelectItem>
              <SelectItem value="text">Text Link</SelectItem>
              <SelectItem value="card">Card</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trigger Text */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trigger Text</Label>
          <Input
            value={properties.triggerText}
            onChange={(e) => onChange('triggerText', e.target.value)}
            placeholder="Click me"
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
              <SelectItem value="simple">Simple Content</SelectItem>
              <SelectItem value="form">Form</SelectItem>
              <SelectItem value="menu">Menu</SelectItem>
              <SelectItem value="profile">Profile Card</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>
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
            max="500"
            value={properties.width}
            onChange={(e) => onChange('width', parseInt(e.target.value))}
          />
        </div>

        {/* Modal */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Modal</Label>
          <Switch 
            checked={properties.modal} 
            onCheckedChange={(checked) => onChange('modal', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generatePopoverCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LivePopoverPreview({ properties }: { properties: PopoverProperties }) {
  const renderTrigger = () => {
    switch (properties.triggerVariant) {
      case 'button':
        return (
          <Button variant="outline">
            {properties.triggerText}
          </Button>
        );
      case 'icon':
        return (
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        );
      case 'text':
        return (
          <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer underline">
            {properties.triggerText}
          </span>
        );
      case 'card':
        return (
          <Card className="w-48 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm">{properties.triggerText}</span>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return <Button variant="outline">{properties.triggerText}</Button>;
    }
  };

  const renderContent = () => {
    switch (properties.contentType) {
      case 'simple':
        return (
          <div>
            <h4 className="font-medium mb-2">Simple Popover</h4>
            <p className="text-sm text-muted-foreground">
              This is a simple popover with some basic content.
            </p>
          </div>
        );
      
      case 'form':
        return (
          <div className="space-y-3">
            <h4 className="font-medium">Quick Form</h4>
            <div className="space-y-2">
              <Input placeholder="Enter your name" />
              <Input placeholder="Enter your email" type="email" />
              <Textarea placeholder="Your message" rows={3} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" size="sm">Cancel</Button>
              <Button size="sm">Submit</Button>
            </div>
          </div>
        );
      
      case 'menu':
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer">
              <Settings className="h-4 w-4" />
              <span className="text-sm">Settings</span>
            </div>
            <div className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer">
              <User className="h-4 w-4" />
              <span className="text-sm">Profile</span>
            </div>
            <div className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer">
              <Share className="h-4 w-4" />
              <span className="text-sm">Share</span>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer text-red-600">
              <span className="text-sm">Sign out</span>
            </div>
          </div>
        );
      
      case 'profile':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                JD
              </div>
              <div>
                <h4 className="font-medium">John Doe</h4>
                <p className="text-sm text-muted-foreground">john@example.com</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Product Designer at Acme Corp. Passionate about creating intuitive user experiences.
            </p>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">Follow</Button>
              <Button size="sm">Message</Button>
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <div className="space-y-3">
            <h4 className="font-medium">Quick Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Notifications</span>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Dark Mode</span>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto Save</span>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        );
      
      default:
        return <div>Default content</div>;
    }
  };

  return (
    <div className="flex items-center justify-center p-8">
      <Popover modal={properties.modal}>
        <PopoverTrigger asChild>
          {renderTrigger()}
        </PopoverTrigger>
        <PopoverContent 
          side={properties.side} 
          align={properties.align}
          sideOffset={properties.sideOffset}
          style={{ width: `${properties.width}px` }}
        >
          {renderContent()}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Generate code function
function generatePopoverCode(props: PopoverProperties): string {
  return `<Popover modal={${props.modal}}>
  <PopoverTrigger asChild>
    <Button variant="outline">
      ${props.triggerText}
    </Button>
  </PopoverTrigger>
  <PopoverContent 
    side="${props.side}" 
    align="${props.align}"
    sideOffset={${props.sideOffset}}
    style={{ width: "${props.width}px" }}
  >
    <div>
      <h4 className="font-medium mb-2">Popover Content</h4>
      <p className="text-sm text-muted-foreground">
        Your popover content goes here.
      </p>
    </div>
  </PopoverContent>
</Popover>`;
}

export default function PopoverComponentPage() {
  const [popoverProperties, setPopoverProperties] = useState<PopoverProperties>({
    triggerVariant: 'button',
    triggerText: 'Open Popover',
    side: 'bottom',
    align: 'center',
    sideOffset: 4,
    contentType: 'simple',
    width: 288,
    showArrow: true,
    closeOnOutsideClick: true,
    modal: false,
  });

  const handlePropertyChange = (key: keyof PopoverProperties, value: any) => {
    setPopoverProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setPopoverProperties({
      triggerVariant: 'button',
      triggerText: 'Open Popover',
      side: 'bottom',
      align: 'center',
      sideOffset: 4,
      contentType: 'simple',
      width: 288,
      showArrow: true,
      closeOnOutsideClick: true,
      modal: false,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Popover</h1>
          <Badge variant="outline">Interactive Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Displays rich content in a portal, triggered by a button. Perfect for displaying additional 
          information, forms, or actions without navigating away from the current context.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Customize the popover properties below and see changes in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LivePopoverPreview properties={popoverProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <PopoverPropertiesPanel 
                    properties={popoverProperties}
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
                <MessageSquare className="h-5 w-5" />
                Simple Content
              </CardTitle>
              <CardDescription>
                Basic text and information display
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for tooltips, help text, or simple information panels.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Form Content
              </CardTitle>
              <CardDescription>
                Interactive forms and inputs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Collect user input with forms, perfect for quick actions and data entry.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Cards
              </CardTitle>
              <CardDescription>
                User information and actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Display user profiles, team member info, or contact details.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Positioning Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Positioning & Alignment</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="text-center">
              <ArrowUp className="h-6 w-6 mx-auto mb-2" />
              <CardTitle className="text-lg">Top</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Appears above the trigger
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <ArrowRight className="h-6 w-6 mx-auto mb-2" />
              <CardTitle className="text-lg">Right</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Appears to the right
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <ArrowDown className="h-6 w-6 mx-auto mb-2" />
              <CardTitle className="text-lg">Bottom</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Appears below the trigger
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <ArrowLeft className="h-6 w-6 mx-auto mb-2" />
              <CardTitle className="text-lg">Left</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Appears to the left
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Common Use Cases</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions Menu</CardTitle>
              <CardDescription>
                Provide contextual actions without taking up permanent UI space
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use popovers for action menus, settings panels, or any interface that needs to show 
                additional options on demand.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Information Panels</CardTitle>
              <CardDescription>
                Show detailed information or help content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for showing user profiles, detailed descriptions, or help documentation 
                without navigating away from the current view.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form Overlays</CardTitle>
              <CardDescription>
                Quick data entry without full page forms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use for quick edits, comments, feedback forms, or any situation where you need 
                to collect input without a full page reload.
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
                Built on Radix UI primitives with full keyboard navigation, focus management, and screen reader support.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Portal Rendering</h4>
              <p className="text-sm text-muted-foreground">
                Content is rendered in a portal to avoid z-index issues and ensure proper layering.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Positioning</h4>
              <p className="text-sm text-muted-foreground">
                Automatic collision detection and positioning adjustments to keep content visible in the viewport.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 