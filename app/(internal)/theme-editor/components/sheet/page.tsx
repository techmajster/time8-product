'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Menu, Settings, User, Bell, Search, Filter } from 'lucide-react';

// Properties Panel Component
function SheetPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: SheetProperties;
  onChange: (key: keyof SheetProperties, value: any) => void;
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
        {/* Side */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Side</Label>
          <Select value={properties.side} onValueChange={(value) => onChange('side', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Title</Label>
          <Input
            value={properties.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Sheet title"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Description</Label>
          <Textarea
            value={properties.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Sheet description"
            rows={2}
          />
        </div>

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
              <SelectItem value="filters">Filter Options</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateSheetCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveSheetPreview({ properties }: { properties: SheetProperties }) {
  const renderContent = () => {
    switch (properties.contentType) {
      case 'navigation':
        return (
          <div className="space-y-4">
            <nav className="space-y-2">
              <a href="#" className="flex items-center space-x-2 text-sm font-medium p-2 rounded hover:bg-accent">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </a>
              <a href="#" className="flex items-center space-x-2 text-sm font-medium p-2 rounded hover:bg-accent">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </a>
              <a href="#" className="flex items-center space-x-2 text-sm font-medium p-2 rounded hover:bg-accent">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </a>
            </nav>
          </div>
        );
      case 'form':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Enter your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Enter your message" />
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Appearance</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="darkMode">Dark mode</Label>
                  <Switch id="darkMode" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="compactMode">Compact mode</Label>
                  <Switch id="compactMode" />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-medium">Notifications</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailNotif">Email notifications</Label>
                  <Switch id="emailNotif" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="pushNotif">Push notifications</Label>
                  <Switch id="pushNotif" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'filters':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="tech">Technology</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      default:
        return <p>This is the sheet content area.</p>;
    }
  };

  return (
    <div className="h-full min-h-[500px] flex items-center justify-center">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant={properties.triggerVariant as any}>
            {properties.contentType === 'navigation' && <Menu className="mr-2 h-4 w-4" />}
            {properties.contentType === 'filters' && <Filter className="mr-2 h-4 w-4" />}
            {properties.contentType === 'settings' && <Settings className="mr-2 h-4 w-4" />}
            {properties.triggerText}
          </Button>
        </SheetTrigger>
        <SheetContent side={properties.side as any}>
          <SheetHeader>
            <SheetTitle>{properties.title}</SheetTitle>
            {properties.description && (
              <SheetDescription>
                {properties.description}
              </SheetDescription>
            )}
          </SheetHeader>
          <div className="py-4">
            {renderContent()}
          </div>
          {properties.showFooter && (
            <SheetFooter>
              {properties.showCloseButton && (
                <SheetClose asChild>
                  <Button variant="outline">Cancel</Button>
                </SheetClose>
              )}
              <Button>
                {properties.contentType === 'form' ? 'Save' : 'Apply'}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface SheetProperties {
  side: string;
  title: string;
  description: string;
  triggerText: string;
  triggerVariant: string;
  showFooter: boolean;
  showCloseButton: boolean;
  contentType: string;
}

const defaultProperties: SheetProperties = {
  side: 'right',
  title: 'Sheet Title',
  description: 'This is a sheet description that provides context.',
  triggerText: 'Open Sheet',
  triggerVariant: 'default',
  showFooter: true,
  showCloseButton: true,
  contentType: 'navigation',
};

function generateSheetCode(props: SheetProperties): string {
  let code = `<Sheet>
  <SheetTrigger asChild>
    <Button variant="${props.triggerVariant}">${props.triggerText}</Button>
  </SheetTrigger>
  <SheetContent${props.side !== 'right' ? ` side="${props.side}"` : ''}>
    <SheetHeader>
      <SheetTitle>${props.title}</SheetTitle>`;

  if (props.description) {
    code += `
      <SheetDescription>
        ${props.description}
      </SheetDescription>`;
  }

  code += `
    </SheetHeader>
    <div className="py-4">
      {/* Your content here */}
    </div>`;

  if (props.showFooter) {
    code += `
    <SheetFooter>`;
    
    if (props.showCloseButton) {
      code += `
      <SheetClose asChild>
        <Button variant="outline">Cancel</Button>
      </SheetClose>`;
    }
    
    code += `
      <Button>Save</Button>
    </SheetFooter>`;
  }

  code += `
  </SheetContent>
</Sheet>`;

  return code;
}

export default function SheetComponentPage() {
  const [properties, setProperties] = useState<SheetProperties>(defaultProperties);

  const handlePropertyChange = (key: keyof SheetProperties, value: any) => {
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
          <h1 className="text-3xl font-bold">Sheet</h1>
          <Badge variant="outline">Interactive Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Extends the Dialog component to display content that complements the main content of the screen.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              Customize the sheet properties and see the changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <LiveSheetPreview properties={properties} />
              </div>
              <div className="col-span-1 border-l pl-6">
                <SheetPropertiesPanel
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
            <CardTitle>Simple Sheet</CardTitle>
            <CardDescription>Basic sheet with content</CardDescription>
          </CardHeader>
          <CardContent>
            <Sheet>
              <SheetTrigger asChild>
                <Button>Open Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Sheet Title</SheetTitle>
                  <SheetDescription>
                    Make changes to your profile here. Click save when you're done.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                  <p>This is the sheet content area.</p>
                </div>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>
      </section>

      {/* Sides */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Sheet Sides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Left</CardTitle>
              <CardDescription>Sheet from left side</CardDescription>
            </CardHeader>
            <CardContent>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">Left Sheet</Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Left Sheet</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <p>Content slides in from the left.</p>
                  </div>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Right</CardTitle>
              <CardDescription>Sheet from right side (default)</CardDescription>
            </CardHeader>
            <CardContent>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">Right Sheet</Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Right Sheet</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <p>Content slides in from the right.</p>
                  </div>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top</CardTitle>
              <CardDescription>Sheet from top</CardDescription>
            </CardHeader>
            <CardContent>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">Top Sheet</Button>
                </SheetTrigger>
                <SheetContent side="top">
                  <SheetHeader>
                    <SheetTitle>Top Sheet</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <p>Content slides in from the top.</p>
                  </div>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bottom</CardTitle>
              <CardDescription>Sheet from bottom</CardDescription>
            </CardHeader>
            <CardContent>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">Bottom Sheet</Button>
                </SheetTrigger>
                <SheetContent side="bottom">
                  <SheetHeader>
                    <SheetTitle>Bottom Sheet</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <p>Content slides in from the bottom.</p>
                  </div>
                </SheetContent>
              </Sheet>
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
              <CardTitle>Navigation Menu</CardTitle>
              <CardDescription>Mobile-style navigation drawer</CardDescription>
            </CardHeader>
            <CardContent>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Menu className="mr-2 h-4 w-4" />
                    Menu
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px]">
                  <SheetHeader>
                    <SheetTitle>Navigation</SheetTitle>
                    <SheetDescription>
                      Access all app features from here.
                    </SheetDescription>
                  </SheetHeader>
                  <nav className="py-4 space-y-2">
                    <a href="#" className="flex items-center space-x-2 text-sm font-medium p-3 rounded hover:bg-accent">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </a>
                    <a href="#" className="flex items-center space-x-2 text-sm font-medium p-3 rounded hover:bg-accent">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </a>
                    <a href="#" className="flex items-center space-x-2 text-sm font-medium p-3 rounded hover:bg-accent">
                      <Bell className="h-4 w-4" />
                      <span>Notifications</span>
                    </a>
                  </nav>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filter Panel</CardTitle>
              <CardDescription>Advanced filtering options</CardDescription>
            </CardHeader>
            <CardContent>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter Options</SheetTitle>
                    <SheetDescription>
                      Refine your search results with these filters.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="tech">Technology</SelectItem>
                          <SelectItem value="design">Design</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Any time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">This Week</SelectItem>
                          <SelectItem value="month">This Month</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <SheetFooter>
                    <SheetClose asChild>
                      <Button variant="outline">Reset</Button>
                    </SheetClose>
                    <Button>Apply Filters</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Advanced Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Examples</h2>
        <Card>
          <CardHeader>
            <CardTitle>Settings Panel</CardTitle>
            <CardDescription>Comprehensive settings interface</CardDescription>
          </CardHeader>
          <CardContent>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px]">
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                  <SheetDescription>
                    Manage your account settings and preferences here.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Appearance</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="theme">Dark mode</Label>
                        <Switch id="theme" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="compact">Compact view</Label>
                        <Switch id="compact" />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Notifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email-notif">Email notifications</Label>
                        <Switch id="email-notif" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="push-notif">Push notifications</Label>
                        <Switch id="push-notif" />
                      </div>
                    </div>
                  </div>
                </div>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </SheetClose>
                  <Button>Save Changes</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 