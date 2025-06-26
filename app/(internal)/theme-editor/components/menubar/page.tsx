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
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
} from '@/components/ui/menubar';
import { 
  FileText,
  Edit,
  Copy,
  Scissors,
  ClipboardPaste,
  Trash2,
  Save,
  FolderOpen,
  Settings,
  User,
  LogOut,
  Check,
  Circle,
  ChevronRight,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Zap,
  Help,
  Info
} from 'lucide-react';

// Properties interface
interface MenubarProperties {
  style: 'desktop' | 'compact' | 'modern';
  variant: 'default' | 'outline' | 'ghost';
  size: 'sm' | 'default' | 'lg';
  showIcons: boolean;
  showShortcuts: boolean;
  showSeparators: boolean;
  groupItems: boolean;
  showRadioGroups: boolean;
  showCheckboxItems: boolean;
  showSubmenus: boolean;
}

// Properties Panel Component
function MenubarPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: MenubarProperties;
  onChange: (key: keyof MenubarProperties, value: any) => void;
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
        {/* Style */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Style</Label>
          <Select value={properties.style} onValueChange={(value) => onChange('style', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desktop">Desktop App</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="modern">Modern Web</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Variant */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Variant</Label>
          <Select value={properties.variant} onValueChange={(value) => onChange('variant', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="ghost">Ghost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Size</Label>
          <Select value={properties.size} onValueChange={(value) => onChange('size', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show Icons */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Icons</Label>
          <Switch 
            checked={properties.showIcons} 
            onCheckedChange={(checked) => onChange('showIcons', checked)}
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

        {/* Show Separators */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Separators</Label>
          <Switch 
            checked={properties.showSeparators} 
            onCheckedChange={(checked) => onChange('showSeparators', checked)}
          />
        </div>

        {/* Group Items */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Group Items</Label>
          <Switch 
            checked={properties.groupItems} 
            onCheckedChange={(checked) => onChange('groupItems', checked)}
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

        {/* Show Radio Groups */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Radio Groups</Label>
          <Switch 
            checked={properties.showRadioGroups} 
            onCheckedChange={(checked) => onChange('showRadioGroups', checked)}
          />
        </div>

        {/* Show Checkbox Items */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Checkbox Items</Label>
          <Switch 
            checked={properties.showCheckboxItems} 
            onCheckedChange={(checked) => onChange('showCheckboxItems', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateMenubarCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveMenubarPreview({ properties }: { properties: MenubarProperties }) {
  const [boldEnabled, setBoldEnabled] = useState(false);
  const [italicEnabled, setItalicEnabled] = useState(false);
  const [alignment, setAlignment] = useState('left');

  const getMenubarByStyle = () => {
    switch (properties.style) {
      case 'desktop':
        return (
          <Menubar className={properties.variant === 'outline' ? 'border-2' : properties.variant === 'ghost' ? 'border-0 bg-transparent' : ''}>
            <MenubarMenu>
              <MenubarTrigger>File</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  {properties.showIcons && <FileText className="mr-2 h-4 w-4" />}
                  New File
                  {properties.showShortcuts && <MenubarShortcut>⌘N</MenubarShortcut>}
                </MenubarItem>
                <MenubarItem>
                  {properties.showIcons && <FolderOpen className="mr-2 h-4 w-4" />}
                  Open File
                  {properties.showShortcuts && <MenubarShortcut>⌘O</MenubarShortcut>}
                </MenubarItem>
                {properties.showSeparators && <MenubarSeparator />}
                <MenubarItem>
                  {properties.showIcons && <Save className="mr-2 h-4 w-4" />}
                  Save
                  {properties.showShortcuts && <MenubarShortcut>⌘S</MenubarShortcut>}
                </MenubarItem>
                <MenubarItem>
                  Save As...
                  {properties.showShortcuts && <MenubarShortcut>⌘⇧S</MenubarShortcut>}
                </MenubarItem>
                {properties.showSeparators && <MenubarSeparator />}
                <MenubarItem disabled>
                  Print
                  {properties.showShortcuts && <MenubarShortcut>⌘P</MenubarShortcut>}
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger>Edit</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  {properties.showIcons && <Undo className="mr-2 h-4 w-4" />}
                  Undo
                  {properties.showShortcuts && <MenubarShortcut>⌘Z</MenubarShortcut>}
                </MenubarItem>
                <MenubarItem>
                  {properties.showIcons && <Redo className="mr-2 h-4 w-4" />}
                  Redo
                  {properties.showShortcuts && <MenubarShortcut>⌘⇧Z</MenubarShortcut>}
                </MenubarItem>
                {properties.showSeparators && <MenubarSeparator />}
                <MenubarItem>
                  {properties.showIcons && <Scissors className="mr-2 h-4 w-4" />}
                  Cut
                  {properties.showShortcuts && <MenubarShortcut>⌘X</MenubarShortcut>}
                </MenubarItem>
                <MenubarItem>
                  {properties.showIcons && <Copy className="mr-2 h-4 w-4" />}
                  Copy
                  {properties.showShortcuts && <MenubarShortcut>⌘C</MenubarShortcut>}
                </MenubarItem>
                <MenubarItem>
                  {properties.showIcons && <ClipboardPaste className="mr-2 h-4 w-4" />}
                  Paste
                  {properties.showShortcuts && <MenubarShortcut>⌘V</MenubarShortcut>}
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger>Format</MenubarTrigger>
              <MenubarContent>
                {properties.showCheckboxItems && (
                  <>
                    <MenubarCheckboxItem checked={boldEnabled} onCheckedChange={setBoldEnabled}>
                      {properties.showIcons && <Bold className="mr-2 h-4 w-4" />}
                      Bold
                      {properties.showShortcuts && <MenubarShortcut>⌘B</MenubarShortcut>}
                    </MenubarCheckboxItem>
                    <MenubarCheckboxItem checked={italicEnabled} onCheckedChange={setItalicEnabled}>
                      {properties.showIcons && <Italic className="mr-2 h-4 w-4" />}
                      Italic
                      {properties.showShortcuts && <MenubarShortcut>⌘I</MenubarShortcut>}
                    </MenubarCheckboxItem>
                    <MenubarCheckboxItem>
                      {properties.showIcons && <Underline className="mr-2 h-4 w-4" />}
                      Underline
                      {properties.showShortcuts && <MenubarShortcut>⌘U</MenubarShortcut>}
                    </MenubarCheckboxItem>
                    {properties.showSeparators && <MenubarSeparator />}
                  </>
                )}
                {properties.showRadioGroups && (
                  <MenubarRadioGroup value={alignment} onValueChange={setAlignment}>
                    <MenubarRadioItem value="left">
                      {properties.showIcons && <AlignLeft className="mr-2 h-4 w-4" />}
                      Align Left
                    </MenubarRadioItem>
                    <MenubarRadioItem value="center">
                      {properties.showIcons && <AlignCenter className="mr-2 h-4 w-4" />}
                      Align Center
                    </MenubarRadioItem>
                    <MenubarRadioItem value="right">
                      {properties.showIcons && <AlignRight className="mr-2 h-4 w-4" />}
                      Align Right
                    </MenubarRadioItem>
                  </MenubarRadioGroup>
                )}
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger>View</MenubarTrigger>
              <MenubarContent>
                {properties.showSubmenus && (
                  <>
                    <MenubarSub>
                      <MenubarSubTrigger>
                        {properties.showIcons && <Zap className="mr-2 h-4 w-4" />}
                        Appearance
                      </MenubarSubTrigger>
                      <MenubarSubContent>
                        <MenubarItem>Light Theme</MenubarItem>
                        <MenubarItem>Dark Theme</MenubarItem>
                        <MenubarItem>Auto Theme</MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem>Custom Theme...</MenubarItem>
                      </MenubarSubContent>
                    </MenubarSub>
                    {properties.showSeparators && <MenubarSeparator />}
                  </>
                )}
                <MenubarItem>
                  Zoom In
                  {properties.showShortcuts && <MenubarShortcut>⌘+</MenubarShortcut>}
                </MenubarItem>
                <MenubarItem>
                  Zoom Out
                  {properties.showShortcuts && <MenubarShortcut>⌘-</MenubarShortcut>}
                </MenubarItem>
                <MenubarItem>
                  Reset Zoom
                  {properties.showShortcuts && <MenubarShortcut>⌘0</MenubarShortcut>}
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        );

      case 'compact':
        return (
          <Menubar className="h-8 space-x-0">
            <MenubarMenu>
              <MenubarTrigger className="px-2 text-sm">File</MenubarTrigger>
              <MenubarContent>
                <MenubarItem className="text-sm">New</MenubarItem>
                <MenubarItem className="text-sm">Open</MenubarItem>
                <MenubarItem className="text-sm">Save</MenubarItem>
                <MenubarSeparator />
                <MenubarItem className="text-sm">Exit</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger className="px-2 text-sm">Edit</MenubarTrigger>
              <MenubarContent>
                <MenubarItem className="text-sm">Cut</MenubarItem>
                <MenubarItem className="text-sm">Copy</MenubarItem>
                <MenubarItem className="text-sm">Paste</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger className="px-2 text-sm">Help</MenubarTrigger>
              <MenubarContent>
                <MenubarItem className="text-sm">About</MenubarItem>
                <MenubarItem className="text-sm">Support</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        );

      default: // modern
        return (
          <Menubar className="rounded-full px-6">
            <MenubarMenu>
              <MenubarTrigger>Dashboard</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  {properties.showIcons && <FileText className="mr-2 h-4 w-4" />}
                  Overview
                </MenubarItem>
                <MenubarItem>
                  {properties.showIcons && <Settings className="mr-2 h-4 w-4" />}
                  Analytics
                </MenubarItem>
                <MenubarItem>
                  {properties.showIcons && <User className="mr-2 h-4 w-4" />}
                  Reports
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger>Settings</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  {properties.showIcons && <User className="mr-2 h-4 w-4" />}
                  Account
                </MenubarItem>
                <MenubarItem>
                  {properties.showIcons && <Settings className="mr-2 h-4 w-4" />}
                  Preferences
                </MenubarItem>
                {properties.showSeparators && <MenubarSeparator />}
                <MenubarItem>
                  {properties.showIcons && <LogOut className="mr-2 h-4 w-4" />}
                  Sign Out
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger>Help</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  {properties.showIcons && <Help className="mr-2 h-4 w-4" />}
                  Documentation
                </MenubarItem>
                <MenubarItem>
                  {properties.showIcons && <Info className="mr-2 h-4 w-4" />}
                  Support
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-8">
      <div className="space-y-8 w-full max-w-4xl">
        {/* Main Menubar */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Interactive Menubar</h3>
          <div className="flex justify-center">
            {getMenubarByStyle()}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Click on menu items to explore different configurations and features.
          </p>
        </div>

        <Separator />

        {/* Example Patterns */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-center">Desktop App Style</h3>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-background">
              <Menubar>
                <MenubarMenu>
                  <MenubarTrigger>File</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      <FileText className="mr-2 h-4 w-4" />
                      New Document
                      <MenubarShortcut>⌘N</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Open...
                      <MenubarShortcut>⌘O</MenubarShortcut>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarSub>
                      <MenubarSubTrigger>Recent Files</MenubarSubTrigger>
                      <MenubarSubContent>
                        <MenubarItem>Project.doc</MenubarItem>
                        <MenubarItem>Notes.txt</MenubarItem>
                        <MenubarItem>Presentation.ppt</MenubarItem>
                      </MenubarSubContent>
                    </MenubarSub>
                    <MenubarSeparator />
                    <MenubarItem>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                      <MenubarShortcut>⌘S</MenubarShortcut>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>

                <MenubarMenu>
                  <MenubarTrigger>Edit</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem disabled>
                      <Undo className="mr-2 h-4 w-4" />
                      Undo
                      <MenubarShortcut>⌘Z</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem disabled>
                      <Redo className="mr-2 h-4 w-4" />
                      Redo
                      <MenubarShortcut>⌘⇧Z</MenubarShortcut>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>
                      <Scissors className="mr-2 h-4 w-4" />
                      Cut
                      <MenubarShortcut>⌘X</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                      <MenubarShortcut>⌘C</MenubarShortcut>
                    </MenubarItem>
                    <MenubarItem>
                      <ClipboardPaste className="mr-2 h-4 w-4" />
                      Paste
                      <MenubarShortcut>⌘V</MenubarShortcut>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>

                <MenubarMenu>
                  <MenubarTrigger>View</MenubarTrigger>
                  <MenubarContent>
                    <MenubarCheckboxItem checked>
                      Show Sidebar
                    </MenubarCheckboxItem>
                    <MenubarCheckboxItem>
                      Show Toolbar
                    </MenubarCheckboxItem>
                    <MenubarSeparator />
                    <MenubarRadioGroup value="list">
                      <MenubarRadioItem value="grid">Grid View</MenubarRadioItem>
                      <MenubarRadioItem value="list">List View</MenubarRadioItem>
                      <MenubarRadioItem value="details">Details View</MenubarRadioItem>
                    </MenubarRadioGroup>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate code function
function generateMenubarCode(props: MenubarProperties): string {
  return `<Menubar${props.variant !== 'default' ? ` className="${props.variant === 'outline' ? 'border-2' : 'border-0 bg-transparent'}"` : ''}>
  <MenubarMenu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>
        ${props.showIcons ? '<FileText className="mr-2 h-4 w-4" />' : ''}
        New File
        ${props.showShortcuts ? '<MenubarShortcut>⌘N</MenubarShortcut>' : ''}
      </MenubarItem>
      <MenubarItem>
        ${props.showIcons ? '<FolderOpen className="mr-2 h-4 w-4" />' : ''}
        Open File
        ${props.showShortcuts ? '<MenubarShortcut>⌘O</MenubarShortcut>' : ''}
      </MenubarItem>
      ${props.showSeparators ? '<MenubarSeparator />' : ''}
      <MenubarItem>
        ${props.showIcons ? '<Save className="mr-2 h-4 w-4" />' : ''}
        Save
        ${props.showShortcuts ? '<MenubarShortcut>⌘S</MenubarShortcut>' : ''}
      </MenubarItem>
    </MenubarContent>
  </MenubarMenu>
  
  <MenubarMenu>
    <MenubarTrigger>Edit</MenubarTrigger>
    <MenubarContent>
      ${props.showCheckboxItems ? `<MenubarCheckboxItem>
        ${props.showIcons ? '<Bold className="mr-2 h-4 w-4" />' : ''}
        Bold
        ${props.showShortcuts ? '<MenubarShortcut>⌘B</MenubarShortcut>' : ''}
      </MenubarCheckboxItem>` : ''}
      ${props.showRadioGroups ? `<MenubarRadioGroup value="left">
        <MenubarRadioItem value="left">Align Left</MenubarRadioItem>
        <MenubarRadioItem value="center">Align Center</MenubarRadioItem>
      </MenubarRadioGroup>` : ''}
    </MenubarContent>
  </MenubarMenu>
</Menubar>`;
}

export default function MenubarComponentPage() {
  const [menubarProperties, setMenubarProperties] = useState<MenubarProperties>({
    style: 'desktop',
    variant: 'default',
    size: 'default',
    showIcons: true,
    showShortcuts: true,
    showSeparators: true,
    groupItems: true,
    showRadioGroups: true,
    showCheckboxItems: true,
    showSubmenus: true,
  });

  const handlePropertyChange = (key: keyof MenubarProperties, value: any) => {
    setMenubarProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setMenubarProperties({
      style: 'desktop',
      variant: 'default',
      size: 'default',
      showIcons: true,
      showShortcuts: true,
      showSeparators: true,
      groupItems: true,
      showRadioGroups: true,
      showCheckboxItems: true,
      showSubmenus: true,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Menubar</h1>
          <Badge variant="outline">Navigation Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A desktop-style menubar component that displays a set of persistently visible menus. 
          Perfect for application navigation, complex actions, and professional desktop interfaces.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Explore different menubar styles and configurations. Customize properties to see real-time changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveMenubarPreview properties={menubarProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <MenubarPropertiesPanel 
                    properties={menubarProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Styles Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Menubar Styles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Desktop App
              </CardTitle>
              <CardDescription>
                Traditional desktop application menubar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Full-featured menubar with keyboard shortcuts, icons, submenus, and rich interactions. 
                Perfect for complex desktop-style applications.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Circle className="h-5 w-5" />
                Compact
              </CardTitle>
              <CardDescription>
                Space-efficient minimal design
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Condensed menubar for applications with limited vertical space. 
                Maintains functionality while minimizing visual footprint.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Modern Web
              </CardTitle>
              <CardDescription>
                Contemporary web application style
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Clean, modern design optimized for web applications. 
                Balances functionality with contemporary aesthetics.
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
                <ChevronRight className="h-5 w-5" />
                Rich Interactions
              </CardTitle>
              <CardDescription>
                Comprehensive menu functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Complete desktop-style menu system:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Nested submenus with unlimited depth</li>
                <li>• Checkbox and radio group items</li>
                <li>• Keyboard shortcuts display</li>
                <li>• Disabled and grouped items</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Accessible Design
              </CardTitle>
              <CardDescription>
                Full keyboard and screen reader support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Professional accessibility features:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Arrow key navigation between menus</li>
                <li>• Enter/Space to activate items</li>
                <li>• Escape to close menus</li>
                <li>• ARIA labels and states</li>
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
              <CardTitle>Desktop Applications</CardTitle>
              <CardDescription>
                Traditional desktop software navigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Provide familiar desktop application navigation with File, Edit, View, and Help menus. 
                Essential for professional software that needs comprehensive functionality access.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Web-Based Tools</CardTitle>
              <CardDescription>
                Complex web applications and editors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for web-based IDEs, design tools, or productivity applications that require 
                rich functionality organization similar to desktop software.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin Dashboards</CardTitle>
              <CardDescription>
                Enterprise and business applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Organize complex administrative functions into logical menu groups. 
                Ideal for enterprise software with extensive feature sets and user management needs.
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
              <h4 className="font-medium mb-2">Keyboard Navigation</h4>
              <p className="text-sm text-muted-foreground">
                Full keyboard support with arrow keys, Enter/Space activation, and Escape to close. 
                Follows WAI-ARIA menu button pattern for accessibility compliance.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Performance</h4>
              <p className="text-sm text-muted-foreground">
                Efficient menu rendering with lazy content loading and optimized event handling 
                for smooth interactions even with complex nested structures.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Responsive Behavior</h4>
              <p className="text-sm text-muted-foreground">
                Automatically adapts to viewport constraints with intelligent positioning and 
                mobile-optimized touch targets when needed.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 