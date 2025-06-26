'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  Settings, 
  LogOut, 
  Plus, 
  Edit, 
  Trash, 
  Copy,
  MoreHorizontal,
  MoreVertical,
  ChevronDown,
  Menu,
  Share,
  Download,
  Star,
  Heart,
  Bookmark,
  Flag,
  Archive,
  Forward,
  Reply,
  Shield,
  Lock,
  Key,
  Bell,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  FileText,
  Folder,
  Image,
  Video,
  Music
} from 'lucide-react';

// Properties interface
interface DropdownMenuProperties {
  triggerVariant: 'button' | 'icon' | 'text' | 'avatar';
  triggerText: string;
  align: 'start' | 'center' | 'end';
  side: 'top' | 'right' | 'bottom' | 'left';
  showLabels: boolean;
  showSeparators: boolean;
  showShortcuts: boolean;
  showSubmenus: boolean;
  showCheckboxes: boolean;
  showRadioGroup: boolean;
  itemCount: number;
  menuWidth: 'auto' | 'sm' | 'md' | 'lg';
}

// Properties Panel Component
function DropdownMenuPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: DropdownMenuProperties;
  onChange: (key: keyof DropdownMenuProperties, value: any) => void;
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
              <SelectItem value="icon">Icon</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="avatar">Avatar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trigger Text */}
        {(properties.triggerVariant === 'button' || properties.triggerVariant === 'text') && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Trigger Text</Label>
            <Input
              value={properties.triggerText}
              onChange={(e) => onChange('triggerText', e.target.value)}
              placeholder="Menu trigger text"
            />
          </div>
        )}

        {/* Alignment */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Alignment</Label>
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

        {/* Menu Width */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Menu Width</Label>
          <Select value={properties.menuWidth} onValueChange={(value) => onChange('menuWidth', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="sm">Small (12rem)</SelectItem>
              <SelectItem value="md">Medium (16rem)</SelectItem>
              <SelectItem value="lg">Large (20rem)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Item Count */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Menu Items: {properties.itemCount}</Label>
          <Slider
            value={[properties.itemCount]}
            onValueChange={(value) => onChange('itemCount', value[0])}
            max={8}
            min={3}
            step={1}
            className="w-full"
          />
        </div>

        {/* Show Labels */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Labels</Label>
          <Switch 
            checked={properties.showLabels} 
            onCheckedChange={(checked) => onChange('showLabels', checked)}
          />
        </div>

        {/* Show Separators */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Separators</Label>
          <Switch 
            checked={properties.showSeparators} 
            onCheckedChange={(checked) => onChange('showSeparators', checked)}
          />
        </div>

        {/* Show Shortcuts */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Shortcuts</Label>
          <Switch 
            checked={properties.showShortcuts} 
            onCheckedChange={(checked) => onChange('showShortcuts', checked)}
          />
        </div>

        {/* Show Submenus */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Submenus</Label>
          <Switch 
            checked={properties.showSubmenus} 
            onCheckedChange={(checked) => onChange('showSubmenus', checked)}
          />
        </div>

        {/* Show Checkboxes */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Checkboxes</Label>
          <Switch 
            checked={properties.showCheckboxes} 
            onCheckedChange={(checked) => onChange('showCheckboxes', checked)}
          />
        </div>

        {/* Show Radio Group */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Radio Group</Label>
          <Switch 
            checked={properties.showRadioGroup} 
            onCheckedChange={(checked) => onChange('showRadioGroup', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateDropdownMenuCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveDropdownMenuPreview({ properties }: { properties: DropdownMenuProperties }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [liked, setLiked] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');

  const getWidthClass = () => {
    switch (properties.menuWidth) {
      case 'sm': return 'w-48';
      case 'md': return 'w-64';
      case 'lg': return 'w-80';
      default: return '';
    }
  };

  const renderTrigger = () => {
    switch (properties.triggerVariant) {
      case 'button':
        return (
          <Button variant="outline">
            {properties.triggerText}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        );
      case 'icon':
        return (
          <Button variant="outline" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        );
      case 'text':
        return (
          <Button variant="ghost" className="h-auto p-0">
            {properties.triggerText}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        );
      case 'avatar':
        return (
          <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
              JD
            </div>
          </Button>
        );
      default:
        return (
          <Button variant="outline">
            {properties.triggerText}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        );
    }
  };

  const basicItems = [
    { icon: User, label: 'Profile', shortcut: '⌘P' },
    { icon: Settings, label: 'Settings', shortcut: '⌘S' },
    { icon: Edit, label: 'Edit', shortcut: '⌘E' },
    { icon: Copy, label: 'Copy', shortcut: '⌘C' },
    { icon: Download, label: 'Download', shortcut: '⌘D' },
    { icon: Share, label: 'Share', shortcut: '⌘⇧S' },
    { icon: Archive, label: 'Archive', shortcut: '⌘A' },
    { icon: LogOut, label: 'Sign Out', shortcut: '⌘Q' },
  ];

  return (
    <div className="flex items-center justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {renderTrigger()}
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className={getWidthClass()}
          align={properties.align}
          side={properties.side}
        >
          {properties.showLabels && (
            <>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              {properties.showSeparators && <DropdownMenuSeparator />}
            </>
          )}

          <DropdownMenuGroup>
            {basicItems.slice(0, properties.itemCount).map((item, index) => (
              <DropdownMenuItem key={index}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
                {properties.showShortcuts && (
                  <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          {properties.showSubmenus && (
            <>
              {properties.showSeparators && <DropdownMenuSeparator />}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Share className="mr-2 h-4 w-4" />
                  <span>Share</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>
                      <Mail className="mr-2 h-4 w-4" />
                      <span>Email</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      <span>Copy link</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Forward className="mr-2 h-4 w-4" />
                      <span>Forward</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </>
          )}

          {properties.showCheckboxes && (
            <>
              {properties.showSeparators && <DropdownMenuSeparator />}
              <DropdownMenuCheckboxItem
                checked={bookmarked}
                onCheckedChange={setBookmarked}
              >
                <Bookmark className="mr-2 h-4 w-4" />
                Bookmark
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={liked}
                onCheckedChange={setLiked}
              >
                <Heart className="mr-2 h-4 w-4" />
                Like
              </DropdownMenuCheckboxItem>
            </>
          )}

          {properties.showRadioGroup && (
            <>
              {properties.showSeparators && <DropdownMenuSeparator />}
              <DropdownMenuRadioGroup value={radioValue} onValueChange={setRadioValue}>
                <DropdownMenuRadioItem value="option1">
                  Option 1
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="option2">
                  Option 2
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="option3">
                  Option 3
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Generate code function
function generateDropdownMenuCode(props: DropdownMenuProperties): string {
  const trigger = props.triggerVariant === 'button' ? 
    `<Button variant="outline">
    ${props.triggerText}
    <ChevronDown className="ml-2 h-4 w-4" />
  </Button>` :
  props.triggerVariant === 'icon' ?
    `<Button variant="outline" size="icon">
    <MoreVertical className="h-4 w-4" />
  </Button>` :
  props.triggerVariant === 'avatar' ?
    `<Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
    <Avatar className="h-8 w-8">
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  </Button>` :
    `<Button variant="ghost">
    ${props.triggerText}
    <ChevronDown className="ml-1 h-3 w-3" />
  </Button>`;

  return `<DropdownMenu>
  <DropdownMenuTrigger asChild>
    ${trigger}
  </DropdownMenuTrigger>
  <DropdownMenuContent align="${props.align}" side="${props.side}">
    ${props.showLabels ? `<DropdownMenuLabel>Menu Label</DropdownMenuLabel>
    ${props.showSeparators ? '<DropdownMenuSeparator />' : ''}` : ''}
    
    <DropdownMenuGroup>
      <DropdownMenuItem>
        <User className="mr-2 h-4 w-4" />
        <span>Profile</span>
        ${props.showShortcuts ? '<DropdownMenuShortcut>⌘P</DropdownMenuShortcut>' : ''}
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Settings className="mr-2 h-4 w-4" />
        <span>Settings</span>
        ${props.showShortcuts ? '<DropdownMenuShortcut>⌘S</DropdownMenuShortcut>' : ''}
      </DropdownMenuItem>
    </DropdownMenuGroup>
    
    ${props.showSubmenus ? `${props.showSeparators ? '<DropdownMenuSeparator />' : ''}
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Share className="mr-2 h-4 w-4" />
        <span>Share</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem>Share via email</DropdownMenuItem>
          <DropdownMenuItem>Copy link</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>` : ''}
  </DropdownMenuContent>
</DropdownMenu>`;
}

export default function DropdownMenuComponentPage() {
  const [dropdownProperties, setDropdownProperties] = useState<DropdownMenuProperties>({
    triggerVariant: 'button',
    triggerText: 'Open Menu',
    align: 'start',
    side: 'bottom',
    showLabels: true,
    showSeparators: true,
    showShortcuts: true,
    showSubmenus: false,
    showCheckboxes: false,
    showRadioGroup: false,
    itemCount: 5,
    menuWidth: 'auto',
  });

  const handlePropertyChange = (key: keyof DropdownMenuProperties, value: any) => {
    setDropdownProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setDropdownProperties({
      triggerVariant: 'button',
      triggerText: 'Open Menu',
      align: 'start',
      side: 'bottom',
      showLabels: true,
      showSeparators: true,
      showShortcuts: true,
      showSubmenus: false,
      showCheckboxes: false,
      showRadioGroup: false,
      itemCount: 5,
      menuWidth: 'auto',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Dropdown Menu</h1>
          <Badge variant="outline">Interactive Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A dropdown menu component that displays a list of options when triggered. 
          Perfect for context menus, user profile menus, and action lists.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Customize the dropdown menu properties below and see changes in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveDropdownMenuPreview properties={dropdownProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <DropdownMenuPropertiesPanel 
                    properties={dropdownProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Trigger Variants Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Trigger Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Button Trigger</CardTitle>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Actions
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Icon Trigger</CardTitle>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Star className="mr-2 h-4 w-4" />
                    Favorite
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Text Trigger</CardTitle>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-auto p-0 font-normal">
                    More options
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Avatar Trigger</CardTitle>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
                      JD
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Advanced Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Features</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Submenus</CardTitle>
              <CardDescription>
                Nested menus for organizing complex actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">File Menu</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem>
                    <Plus className="mr-2 h-4 w-4" />
                    New File
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <FileText className="mr-2 h-4 w-4" />
                      New Document
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          Text Document
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Image className="mr-2 h-4 w-4" />
                          Image
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Video className="mr-2 h-4 w-4" />
                          Video
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Music className="mr-2 h-4 w-4" />
                          Audio
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Folder className="mr-2 h-4 w-4" />
                    New Folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checkboxes & Radio Groups</CardTitle>
              <CardDescription>
                Interactive menu items with state
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">View Options</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Display</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem checked>
                    <Bell className="mr-2 h-4 w-4" />
                    Show notifications
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>
                    <Shield className="mr-2 h-4 w-4" />
                    Enable 2FA
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value="light">
                    <DropdownMenuRadioItem value="light">
                      Light
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      Dark
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                      System
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <CardTitle>Context Menu</CardTitle>
              <CardDescription>
                Right-click or action menu for table rows and cards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Project Documentation</h4>
                    <p className="text-sm text-muted-foreground">Updated 2 hours ago</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Profile Menu</CardTitle>
              <CardDescription>
                Account management and navigation menu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-medium">
                    JD
                  </div>
                  <div>
                    <p className="font-medium">John Doe</p>
                    <p className="text-sm text-muted-foreground">john@example.com</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                      <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                      <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                      <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                      <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
              <h4 className="font-medium mb-2">Positioning</h4>
              <p className="text-sm text-muted-foreground">
                Uses Radix UI Popper for intelligent positioning, automatically adjusting based on viewport.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Keyboard Navigation</h4>
              <p className="text-sm text-muted-foreground">
                Full keyboard support with arrow keys, Enter, Escape, and automatic focus management.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Accessibility</h4>
              <p className="text-sm text-muted-foreground">
                ARIA compliant with proper roles, states, and keyboard interaction patterns.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 