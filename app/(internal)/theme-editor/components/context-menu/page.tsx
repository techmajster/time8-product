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
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuCheckboxItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  Copy, 
  Scissors, 
  ClipboardPaste, 
  Edit, 
  Trash2, 
  Share, 
  Download, 
  Eye, 
  EyeOff,
  Star,
  Heart,
  BookmarkPlus,
  MoreHorizontal,
  Settings,
  User,
  RefreshCw,
  MousePointer
} from 'lucide-react';

// Properties interface
interface ContextMenuProperties {
  triggerType: 'text' | 'card' | 'image' | 'button' | 'area';
  triggerText: string;
  showShortcuts: boolean;
  showSeparators: boolean;
  showSubmenus: boolean;
  showCheckboxes: boolean;
  showRadioGroups: boolean;
  menuType: 'basic' | 'file' | 'edit' | 'social' | 'advanced';
  itemCount: number;
  showIcons: boolean;
}

// Properties Panel Component
function ContextMenuPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: ContextMenuProperties;
  onChange: (key: keyof ContextMenuProperties, value: any) => void;
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
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="button">Button</SelectItem>
              <SelectItem value="area">Area</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trigger Text */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trigger Text</Label>
          <Input
            value={properties.triggerText}
            onChange={(e) => onChange('triggerText', e.target.value)}
            placeholder="Right click me"
          />
        </div>

        {/* Menu Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Menu Type</Label>
          <Select value={properties.menuType} onValueChange={(value) => onChange('menuType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic Actions</SelectItem>
              <SelectItem value="file">File Operations</SelectItem>
              <SelectItem value="edit">Edit Actions</SelectItem>
              <SelectItem value="social">Social Actions</SelectItem>
              <SelectItem value="advanced">Advanced Menu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Item Count */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Item Count: {properties.itemCount}</Label>
          <Input
            type="range"
            min="3"
            max="12"
            value={properties.itemCount}
            onChange={(e) => onChange('itemCount', parseInt(e.target.value))}
          />
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

        {/* Show Radio Groups */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Radio Groups</Label>
          <Switch 
            checked={properties.showRadioGroups} 
            onCheckedChange={(checked) => onChange('showRadioGroups', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateContextMenuCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveContextMenuPreview({ properties }: { properties: ContextMenuProperties }) {
  const [selectedView, setSelectedView] = useState('grid');

  const renderTrigger = () => {
    switch (properties.triggerType) {
      case 'text':
        return (
          <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white cursor-pointer hover:bg-gray-50">
            <p className="text-center text-muted-foreground">
              {properties.triggerText}
            </p>
          </div>
        );
      case 'card':
        return (
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-medium">
                  F
                </div>
                <div>
                  <h3 className="font-medium">Project File</h3>
                  <p className="text-sm text-muted-foreground">Document.pdf</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'image':
        return (
          <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg cursor-pointer hover:scale-105 transition-transform flex items-center justify-center text-white font-medium text-xl">
            IMG
          </div>
        );
      case 'button':
        return (
          <Button variant="outline" className="w-full">
            {properties.triggerText}
          </Button>
        );
      case 'area':
        return (
          <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <MousePointer className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">{properties.triggerText}</p>
            </div>
          </div>
        );
      default:
        return <div className="p-4 border rounded cursor-pointer">{properties.triggerText}</div>;
    }
  };

  const renderMenuContent = () => {
    switch (properties.menuType) {
      case 'basic':
        return (
          <>
            <ContextMenuItem>
              {properties.showIcons && <Copy className="mr-2 h-4 w-4" />}
              Copy
              {properties.showShortcuts && <ContextMenuShortcut>⌘C</ContextMenuShortcut>}
            </ContextMenuItem>
            <ContextMenuItem>
              {properties.showIcons && <Scissors className="mr-2 h-4 w-4" />}
              Cut
              {properties.showShortcuts && <ContextMenuShortcut>⌘X</ContextMenuShortcut>}
            </ContextMenuItem>
            <ContextMenuItem>
              {properties.showIcons && <ClipboardPaste className="mr-2 h-4 w-4" />}
              Paste
              {properties.showShortcuts && <ContextMenuShortcut>⌘V</ContextMenuShortcut>}
            </ContextMenuItem>
            {properties.showSeparators && <ContextMenuSeparator />}
            <ContextMenuItem>
              {properties.showIcons && <Edit className="mr-2 h-4 w-4" />}
              Edit
            </ContextMenuItem>
            <ContextMenuItem>
              {properties.showIcons && <Trash2 className="mr-2 h-4 w-4" />}
              Delete
              {properties.showShortcuts && <ContextMenuShortcut>Del</ContextMenuShortcut>}
            </ContextMenuItem>
          </>
        );
      
      case 'file':
        return (
          <>
            <ContextMenuItem>
              {properties.showIcons && <Eye className="mr-2 h-4 w-4" />}
              Open
              {properties.showShortcuts && <ContextMenuShortcut>⌘O</ContextMenuShortcut>}
            </ContextMenuItem>
            <ContextMenuItem>
              {properties.showIcons && <Download className="mr-2 h-4 w-4" />}
              Download
              {properties.showShortcuts && <ContextMenuShortcut>⌘D</ContextMenuShortcut>}
            </ContextMenuItem>
            {properties.showSeparators && <ContextMenuSeparator />}
            <ContextMenuItem>
              {properties.showIcons && <Copy className="mr-2 h-4 w-4" />}
              Copy Link
            </ContextMenuItem>
            <ContextMenuItem>
              {properties.showIcons && <Share className="mr-2 h-4 w-4" />}
              Share
            </ContextMenuItem>
            {properties.showSeparators && <ContextMenuSeparator />}
            <ContextMenuItem>
              {properties.showIcons && <Edit className="mr-2 h-4 w-4" />}
              Rename
              {properties.showShortcuts && <ContextMenuShortcut>F2</ContextMenuShortcut>}
            </ContextMenuItem>
            <ContextMenuItem>
              {properties.showIcons && <Trash2 className="mr-2 h-4 w-4" />}
              Move to Trash
            </ContextMenuItem>
          </>
        );
      
      case 'social':
        return (
          <>
            <ContextMenuItem>
              {properties.showIcons && <Heart className="mr-2 h-4 w-4" />}
              Like
              {properties.showShortcuts && <ContextMenuShortcut>L</ContextMenuShortcut>}
            </ContextMenuItem>
            <ContextMenuItem>
              {properties.showIcons && <BookmarkPlus className="mr-2 h-4 w-4" />}
              Save Post
              {properties.showShortcuts && <ContextMenuShortcut>S</ContextMenuShortcut>}
            </ContextMenuItem>
            <ContextMenuItem>
              {properties.showIcons && <Share className="mr-2 h-4 w-4" />}
              Share
            </ContextMenuItem>
            {properties.showSeparators && <ContextMenuSeparator />}
            <ContextMenuItem>
              {properties.showIcons && <Copy className="mr-2 h-4 w-4" />}
              Copy Link
            </ContextMenuItem>
            <ContextMenuItem>
              {properties.showIcons && <User className="mr-2 h-4 w-4" />}
              View Profile
            </ContextMenuItem>
          </>
        );
      
      default:
        return (
          <>
            <ContextMenuLabel>Actions</ContextMenuLabel>
            <ContextMenuItem>
              {properties.showIcons && <Copy className="mr-2 h-4 w-4" />}
              Copy
              {properties.showShortcuts && <ContextMenuShortcut>⌘C</ContextMenuShortcut>}
            </ContextMenuItem>
            <ContextMenuItem>
              {properties.showIcons && <Edit className="mr-2 h-4 w-4" />}
              Edit
            </ContextMenuItem>
            {properties.showSeparators && <ContextMenuSeparator />}
            {properties.showSubmenus && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  {properties.showIcons && <MoreHorizontal className="mr-2 h-4 w-4" />}
                  More Options
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem>
                    {properties.showIcons && <RefreshCw className="mr-2 h-4 w-4" />}
                    Refresh
                  </ContextMenuItem>
                  <ContextMenuItem>
                    {properties.showIcons && <Settings className="mr-2 h-4 w-4" />}
                    Settings
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
            {properties.showCheckboxes && (
              <>
                {properties.showSeparators && <ContextMenuSeparator />}
                <ContextMenuCheckboxItem checked>
                  Show Grid
                </ContextMenuCheckboxItem>
                <ContextMenuCheckboxItem>
                  Show Details
                </ContextMenuCheckboxItem>
              </>
            )}
            {properties.showRadioGroups && (
              <>
                {properties.showSeparators && <ContextMenuSeparator />}
                <ContextMenuLabel>View</ContextMenuLabel>
                <ContextMenuRadioGroup value={selectedView} onValueChange={setSelectedView}>
                  <ContextMenuRadioItem value="grid">Grid View</ContextMenuRadioItem>
                  <ContextMenuRadioItem value="list">List View</ContextMenuRadioItem>
                  <ContextMenuRadioItem value="card">Card View</ContextMenuRadioItem>
                </ContextMenuRadioGroup>
              </>
            )}
          </>
        );
    }
  };

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Right-click on the element below
        </div>
        <ContextMenu>
          <ContextMenuTrigger>
            {renderTrigger()}
          </ContextMenuTrigger>
          <ContextMenuContent>
            {renderMenuContent()}
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </div>
  );
}

// Generate code function
function generateContextMenuCode(props: ContextMenuProperties): string {
  return `<ContextMenu>
  <ContextMenuTrigger>
    <div className="cursor-pointer">
      ${props.triggerText}
    </div>
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>
      ${props.showIcons ? '<Copy className="mr-2 h-4 w-4" />' : ''}
      Copy
      ${props.showShortcuts ? '<ContextMenuShortcut>⌘C</ContextMenuShortcut>' : ''}
    </ContextMenuItem>
    <ContextMenuItem>
      ${props.showIcons ? '<Edit className="mr-2 h-4 w-4" />' : ''}
      Edit
    </ContextMenuItem>
    ${props.showSeparators ? '<ContextMenuSeparator />' : ''}
    <ContextMenuItem>
      ${props.showIcons ? '<Trash2 className="mr-2 h-4 w-4" />' : ''}
      Delete
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>`;
}

export default function ContextMenuComponentPage() {
  const [contextMenuProperties, setContextMenuProperties] = useState<ContextMenuProperties>({
    triggerType: 'card',
    triggerText: 'Right click me',
    showShortcuts: true,
    showSeparators: true,
    showSubmenus: false,
    showCheckboxes: false,
    showRadioGroups: false,
    menuType: 'basic',
    itemCount: 6,
    showIcons: true,
  });

  const handlePropertyChange = (key: keyof ContextMenuProperties, value: any) => {
    setContextMenuProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setContextMenuProperties({
      triggerType: 'card',
      triggerText: 'Right click me',
      showShortcuts: true,
      showSeparators: true,
      showSubmenus: false,
      showCheckboxes: false,
      showRadioGroups: false,
      menuType: 'basic',
      itemCount: 6,
      showIcons: true,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Context Menu</h1>
          <Badge variant="outline">Interactive Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Displays a menu to the user — such as a set of actions or functions — triggered by a right click. 
          Perfect for providing contextual actions without cluttering the main interface.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Right-click on the trigger element to see the context menu. Customize properties below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveContextMenuPreview properties={contextMenuProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <ContextMenuPropertiesPanel 
                    properties={contextMenuProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Menu Types Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Menu Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Basic Actions
              </CardTitle>
              <CardDescription>
                Standard copy, cut, paste, edit, and delete actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Essential operations for text editing and content manipulation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                File Operations
              </CardTitle>
              <CardDescription>
                File management actions like open, download, share, rename
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete file management operations for document handling.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Social Actions
              </CardTitle>
              <CardDescription>
                Social media actions like like, save, share, view profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Social interaction features for content and user engagement.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Advanced Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MoreHorizontal className="h-5 w-5" />
                Submenus
              </CardTitle>
              <CardDescription>
                Nested menus for organizing complex actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Group related actions under submenus to keep the main menu clean and organized.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Interactive Items
              </CardTitle>
              <CardDescription>
                Checkboxes and radio groups for settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Include toggles and option selectors directly in the context menu.
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
              <CardTitle>Data Tables</CardTitle>
              <CardDescription>
                Row and cell actions for data manipulation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Right-click on table rows to edit, delete, duplicate, or export individual records. 
                Essential for data management interfaces.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Managers</CardTitle>
              <CardDescription>
                File and folder operations in directory views
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete file management with context menus for rename, move, copy, delete, 
                share, and property viewing.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>
                Article, post, and media management actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Publishing workflows with context menus for draft, publish, archive, 
                duplicate, and moderation actions.
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
                Full keyboard navigation support with arrow keys, Enter, and Escape. Screen reader compatible.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Platform Behavior</h4>
              <p className="text-sm text-muted-foreground">
                Automatically adapts to platform conventions - right-click on desktop, long-press on mobile.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Performance</h4>
              <p className="text-sm text-muted-foreground">
                Menu content is rendered only when opened, ensuring optimal performance for large lists.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 