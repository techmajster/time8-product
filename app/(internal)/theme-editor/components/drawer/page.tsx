'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Menu, Settings, User, Bell, Search, Filter, Home, Users, CreditCard, Mail, FileText, Download, Upload, Share, Copy, Edit, Trash, Plus, Minus } from 'lucide-react';

// Properties interface
interface DrawerProperties {
  triggerText: string;
  triggerVariant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  direction: 'bottom' | 'top' | 'left' | 'right';
  title: string;
  description: string;
  contentType: 'navigation' | 'form' | 'settings' | 'confirmation' | 'info';
  showFooter: boolean;
  showCloseButton: boolean;
  snapPoints: boolean;
  height: 'auto' | 'sm' | 'md' | 'lg' | 'xl';
}

// Properties Panel Component
function DrawerPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: DrawerProperties;
  onChange: (key: keyof DrawerProperties, value: any) => void;
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
        {/* Trigger Text */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trigger Text</Label>
          <Input
            value={properties.triggerText}
            onChange={(e) => onChange('triggerText', e.target.value)}
            placeholder="Button text"
          />
        </div>

        {/* Trigger Variant */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trigger Variant</Label>
          <Select value={properties.triggerVariant} onValueChange={(value) => onChange('triggerVariant', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="destructive">Destructive</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
              <SelectItem value="ghost">Ghost</SelectItem>
              <SelectItem value="link">Link</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Direction */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Direction</Label>
          <Select value={properties.direction} onValueChange={(value) => onChange('direction', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom">Bottom</SelectItem>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Height */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Height</Label>
          <Select value={properties.height} onValueChange={(value) => onChange('height', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="sm">Small (300px)</SelectItem>
              <SelectItem value="md">Medium (400px)</SelectItem>
              <SelectItem value="lg">Large (500px)</SelectItem>
              <SelectItem value="xl">Extra Large (600px)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Title</Label>
          <Input
            value={properties.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Drawer title"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Description</Label>
          <Textarea
            value={properties.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Drawer description"
            rows={2}
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
              <SelectItem value="navigation">Navigation Menu</SelectItem>
              <SelectItem value="form">Form Content</SelectItem>
              <SelectItem value="settings">Settings Panel</SelectItem>
              <SelectItem value="confirmation">Confirmation Dialog</SelectItem>
              <SelectItem value="info">Information Display</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show Footer */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Footer</Label>
          <Switch 
            checked={properties.showFooter} 
            onCheckedChange={(checked) => onChange('showFooter', checked)}
          />
        </div>

        {/* Show Close Button */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Close Button</Label>
          <Switch 
            checked={properties.showCloseButton} 
            onCheckedChange={(checked) => onChange('showCloseButton', checked)}
          />
        </div>

        {/* Snap Points */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Enable Snap Points</Label>
          <Switch 
            checked={properties.snapPoints} 
            onCheckedChange={(checked) => onChange('snapPoints', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateDrawerCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveDrawerPreview({ properties }: { properties: DrawerProperties }) {
  const getHeightClass = () => {
    switch (properties.height) {
      case 'sm': return 'h-[300px]';
      case 'md': return 'h-[400px]';
      case 'lg': return 'h-[500px]';
      case 'xl': return 'h-[600px]';
      default: return 'h-auto';
    }
  };

  const renderContent = () => {
    switch (properties.contentType) {
      case 'navigation':
        return (
          <div className="space-y-4 p-4">
            <nav className="space-y-2">
              <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors">
                <Home className="h-5 w-5" />
                <span className="font-medium">Dashboard</span>
              </a>
              <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors">
                <Users className="h-5 w-5" />
                <span className="font-medium">Team</span>
              </a>
              <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors">
                <FileText className="h-5 w-5" />
                <span className="font-medium">Projects</span>
              </a>
              <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors">
                <CreditCard className="h-5 w-5" />
                <span className="font-medium">Billing</span>
              </a>
              <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors">
                <Settings className="h-5 w-5" />
                <span className="font-medium">Settings</span>
              </a>
            </nav>
          </div>
        );
      case 'form':
        return (
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Enter your full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="Enter your phone number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Enter your message" rows={3} />
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6 p-4">
            <div className="space-y-4">
              <h4 className="font-medium">Appearance</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Dark Mode</Label>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Compact Layout</Label>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Show Animations</Label>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium">Notifications</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Email Notifications</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Push Notifications</Label>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <Label>SMS Alerts</Label>
                  <Switch />
                </div>
              </div>
            </div>
          </div>
        );
      case 'confirmation':
        return (
          <div className="space-y-4 p-4 text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <Trash className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Are you sure?</h4>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. This will permanently delete the selected items and remove all associated data.
              </p>
            </div>
          </div>
        );
      case 'info':
        return (
          <div className="space-y-4 p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Document Information</h4>
                  <p className="text-sm text-muted-foreground">Last updated 2 hours ago</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">File Size:</span>
                  <span>2.4 MB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span>PDF Document</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <span>Jan 15, 2024</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Owner:</span>
                  <span>John Doe</span>
                </div>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-4">
            <p className="text-muted-foreground">This is the drawer content area.</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full min-h-[500px] flex items-center justify-center">
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant={properties.triggerVariant as any}>
            {properties.triggerText}
          </Button>
        </DrawerTrigger>
        <DrawerContent className={properties.height !== 'auto' ? getHeightClass() : ''}>
          <DrawerHeader>
            <DrawerTitle>{properties.title}</DrawerTitle>
            {properties.description && (
              <DrawerDescription>
                {properties.description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          
          <div className="flex-1 overflow-auto">
            {renderContent()}
          </div>

          {properties.showFooter && (
            <DrawerFooter>
              <div className="flex gap-2">
                {properties.contentType === 'confirmation' ? (
                  <>
                    <Button variant="destructive" className="flex-1">
                      Delete
                    </Button>
                    {properties.showCloseButton && (
                      <DrawerClose asChild>
                        <Button variant="outline" className="flex-1">
                          Cancel
                        </Button>
                      </DrawerClose>
                    )}
                  </>
                ) : (
                  <>
                    <Button className="flex-1">
                      {properties.contentType === 'form' ? 'Submit' : 'Save Changes'}
                    </Button>
                    {properties.showCloseButton && (
                      <DrawerClose asChild>
                        <Button variant="outline" className="flex-1">
                          Cancel
                        </Button>
                      </DrawerClose>
                    )}
                  </>
                )}
              </div>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

const defaultProperties: DrawerProperties = {
  triggerText: 'Open Drawer',
  triggerVariant: 'default',
  direction: 'bottom',
  title: 'Drawer Title',
  description: 'This is a description of the drawer content.',
  contentType: 'navigation',
  showFooter: true,
  showCloseButton: true,
  snapPoints: false,
  height: 'auto'
};

function generateDrawerCode(props: DrawerProperties): string {
  const heightClass = props.height !== 'auto' ? 
    (props.height === 'sm' ? ' className="h-[300px]"' :
     props.height === 'md' ? ' className="h-[400px]"' :
     props.height === 'lg' ? ' className="h-[500px]"' :
     props.height === 'xl' ? ' className="h-[600px]"' : '') : '';

  return `<Drawer>
  <DrawerTrigger asChild>
    <Button${props.triggerVariant !== 'default' ? ` variant="${props.triggerVariant}"` : ''}>
      ${props.triggerText}
    </Button>
  </DrawerTrigger>
  <DrawerContent${heightClass}>
    <DrawerHeader>
      <DrawerTitle>${props.title}</DrawerTitle>
      ${props.description ? `<DrawerDescription>
        ${props.description}
      </DrawerDescription>` : ''}
    </DrawerHeader>
    
    <div className="flex-1 overflow-auto">
      {/* Your content here */}
    </div>

    ${props.showFooter ? `<DrawerFooter>
      <Button>Save Changes</Button>
      ${props.showCloseButton ? `<DrawerClose asChild>
        <Button variant="outline">Cancel</Button>
      </DrawerClose>` : ''}
    </DrawerFooter>` : ''}
  </DrawerContent>
</Drawer>`;
}

export default function DrawerComponentPage() {
  const [properties, setProperties] = useState<DrawerProperties>(defaultProperties);

  const handlePropertyChange = (key: keyof DrawerProperties, value: any) => {
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
          <h1 className="text-3xl font-bold">Drawer</h1>
          <Badge variant="outline">Interactive Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A drawer component that slides in from the edge of the screen. Perfect for mobile navigation, forms, and additional content that doesn't require a full page.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Drawer Preview</CardTitle>
            <CardDescription>
              Customize the drawer properties and see changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2 flex items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 h-full min-h-[500px]">
                <LiveDrawerPreview properties={properties} />
              </div>

              {/* Properties Panel */}
              <div className="space-y-4 p-4 border rounded-lg bg-background h-full min-h-[500px]">
                <DrawerPropertiesPanel
                  properties={properties}
                  onChange={handlePropertyChange}
                  onReset={handleReset}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Content Types Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Content Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Menu className="h-5 w-5" />
                Navigation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for mobile navigation menus with icons and organized sections.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Form Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ideal for forms, surveys, and data input without leaving the current page.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings Panel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configuration panels with toggles, sliders, and preferences.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Use Cases */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Common Use Cases</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mobile Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Replace traditional navigation menus on mobile devices with a slide-out drawer that conserves screen space.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Main navigation links</li>
                <li>• User profile quick access</li>
                <li>• Secondary menu items</li>
                <li>• App settings and preferences</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Provide instant access to frequently used actions without navigation.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create new content forms</li>
                <li>• Filter and search options</li>
                <li>• User account management</li>
                <li>• Support and help sections</li>
              </ul>
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
                <h4 className="font-semibold mb-2">Mobile Optimization</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically adjusts to mobile viewport with touch gestures and proper z-index stacking.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Accessibility</h4>
                <p className="text-sm text-muted-foreground">
                  Includes proper ARIA attributes, focus management, and keyboard navigation support.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Performance</h4>
                <p className="text-sm text-muted-foreground">
                  Uses CSS transforms for smooth animations and lazy loading for drawer content.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}