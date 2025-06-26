'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Calendar, 
  Smile, 
  Calculator, 
  User, 
  CreditCard, 
  Settings, 
  Keyboard,
  Mail,
  MessageSquare,
  Plus,
  File,
  FileText,
  Folder,
  Home,
  Users,
  Bell,
  Download,
  Upload,
  Edit,
  Trash,
  Share,
  Copy,
  Scissors,
  ClipboardPaste
} from 'lucide-react';

// Properties interface
interface CommandProperties {
  variant: 'default' | 'dialog';
  placeholder: string;
  emptyMessage: string;
  showGroups: boolean;
  showShortcuts: boolean;
  showSeparators: boolean;
  itemCount: number;
  dialogOpen: boolean;
}

// Properties Panel Component
function CommandPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: CommandProperties;
  onChange: (key: keyof CommandProperties, value: any) => void;
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
        {/* Variant */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Variant</Label>
          <Select value={properties.variant} onValueChange={(value) => onChange('variant', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="dialog">Dialog</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Placeholder */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Placeholder</Label>
          <Input
            value={properties.placeholder}
            onChange={(e) => onChange('placeholder', e.target.value)}
            placeholder="Search placeholder"
          />
        </div>

        {/* Empty Message */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Empty Message</Label>
          <Input
            value={properties.emptyMessage}
            onChange={(e) => onChange('emptyMessage', e.target.value)}
            placeholder="No results message"
          />
        </div>

        {/* Item Count */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Items per Group: {properties.itemCount}</Label>
          <Slider
            value={[properties.itemCount]}
            onValueChange={(value) => onChange('itemCount', value[0])}
            max={6}
            min={2}
            step={1}
            className="w-full"
          />
        </div>

        {/* Show Groups */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Groups</Label>
          <Switch 
            checked={properties.showGroups} 
            onCheckedChange={(checked) => onChange('showGroups', checked)}
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

        {/* Dialog State (only for dialog variant) */}
        {properties.variant === 'dialog' && (
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Dialog Open</Label>
            <Switch 
              checked={properties.dialogOpen} 
              onCheckedChange={(checked) => onChange('dialogOpen', checked)}
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateCommandCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveCommandPreview({ properties, onChange }: { properties: CommandProperties; onChange: (key: keyof CommandProperties, value: any) => void }) {
  const [search, setSearch] = useState('');

  const sampleItems = [
    { icon: Calendar, label: 'Calendar', shortcut: '⌘K' },
    { icon: Smile, label: 'Search Emoji', shortcut: '⌘E' },
    { icon: Calculator, label: 'Calculator', shortcut: '⌘C' },
    { icon: User, label: 'Profile', shortcut: '⌘P' },
    { icon: CreditCard, label: 'Billing', shortcut: '⌘B' },
    { icon: Settings, label: 'Settings', shortcut: '⌘S' },
  ];

  const fileItems = [
    { icon: File, label: 'New File', shortcut: '⌘N' },
    { icon: Folder, label: 'New Folder', shortcut: '⌘⇧N' },
    { icon: Download, label: 'Download', shortcut: '⌘D' },
    { icon: Upload, label: 'Upload', shortcut: '⌘U' },
  ];

  const editItems = [
    { icon: Copy, label: 'Copy', shortcut: '⌘C' },
    { icon: Scissors, label: 'Cut', shortcut: '⌘X' },
    { icon: ClipboardPaste, label: 'Paste', shortcut: '⌘V' },
    { icon: Edit, label: 'Edit', shortcut: '⌘E' },
  ];

  const renderCommand = () => (
    <Command className="w-full max-w-md">
      <CommandInput 
        placeholder={properties.placeholder} 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>{properties.emptyMessage}</CommandEmpty>
        
        {properties.showGroups ? (
          <>
            <CommandGroup heading="Suggestions">
              {sampleItems.slice(0, properties.itemCount).map((item, index) => (
                <CommandItem key={index}>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  {properties.showShortcuts && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            
            {properties.showSeparators && <CommandSeparator />}
            
            <CommandGroup heading="File">
              {fileItems.slice(0, properties.itemCount).map((item, index) => (
                <CommandItem key={index}>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  {properties.showShortcuts && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            {properties.showSeparators && <CommandSeparator />}
            
            <CommandGroup heading="Edit">
              {editItems.slice(0, properties.itemCount).map((item, index) => (
                <CommandItem key={index}>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  {properties.showShortcuts && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : (
          // Flat list without groups
          <>
            {[...sampleItems, ...fileItems, ...editItems]
              .slice(0, properties.itemCount * 3)
              .map((item, index) => (
                <CommandItem key={index}>
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  {properties.showShortcuts && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))
            }
          </>
        )}
      </CommandList>
    </Command>
  );

  if (properties.variant === 'dialog') {
    return (
      <>
        <div className="flex items-center justify-center">
          <Button onClick={() => onChange('dialogOpen', true)}>
            <Search className="mr-2 h-4 w-4" />
            Open Command Dialog
          </Button>
        </div>
        <CommandDialog open={properties.dialogOpen} onOpenChange={(open) => onChange('dialogOpen', open)}>
          {renderCommand()}
        </CommandDialog>
      </>
    );
  }

  return (
    <div className="flex items-center justify-center">
      {renderCommand()}
    </div>
  );
}

// Generate code function
function generateCommandCode(props: CommandProperties): string {
  if (props.variant === 'dialog') {
    return `<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="${props.placeholder}" />
  <CommandList>
    <CommandEmpty>${props.emptyMessage}</CommandEmpty>
    ${props.showGroups ? `
    <CommandGroup heading="Suggestions">
      <CommandItem>
        <Calendar className="mr-2 h-4 w-4" />
        <span>Calendar</span>
        ${props.showShortcuts ? '<CommandShortcut>⌘K</CommandShortcut>' : ''}
      </CommandItem>
    </CommandGroup>` : `
    <CommandItem>
      <Calendar className="mr-2 h-4 w-4" />
      <span>Calendar</span>
      ${props.showShortcuts ? '<CommandShortcut>⌘K</CommandShortcut>' : ''}
    </CommandItem>`}
  </CommandList>
</CommandDialog>`;
  }

  return `<Command>
  <CommandInput placeholder="${props.placeholder}" />
  <CommandList>
    <CommandEmpty>${props.emptyMessage}</CommandEmpty>
    ${props.showGroups ? `
    <CommandGroup heading="Suggestions">
      <CommandItem>
        <Calendar className="mr-2 h-4 w-4" />
        <span>Calendar</span>
        ${props.showShortcuts ? '<CommandShortcut>⌘K</CommandShortcut>' : ''}
      </CommandItem>
    </CommandGroup>` : `
    <CommandItem>
      <Calendar className="mr-2 h-4 w-4" />
      <span>Calendar</span>
      ${props.showShortcuts ? '<CommandShortcut>⌘K</CommandShortcut>' : ''}
    </CommandItem>`}
  </CommandList>
</Command>`;
}

export default function CommandComponentPage() {
  const [commandProperties, setCommandProperties] = useState<CommandProperties>({
    variant: 'default',
    placeholder: 'Type a command or search...',
    emptyMessage: 'No results found.',
    showGroups: true,
    showShortcuts: true,
    showSeparators: true,
    itemCount: 3,
    dialogOpen: false,
  });

  const handlePropertyChange = (key: keyof CommandProperties, value: any) => {
    setCommandProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setCommandProperties({
      variant: 'default',
      placeholder: 'Type a command or search...',
      emptyMessage: 'No results found.',
      showGroups: true,
      showShortcuts: true,
      showSeparators: true,
      itemCount: 3,
      dialogOpen: false,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Command</h1>
          <Badge variant="outline">Interactive Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A fast, composable, unstyled command menu for React. Perfect for building search interfaces, 
          command palettes, and autocomplete experiences.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Customize the command properties below and see changes in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveCommandPreview 
                    properties={commandProperties} 
                    onChange={handlePropertyChange}
                  />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <CommandPropertiesPanel 
                    properties={commandProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Variants Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Variants</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Command</CardTitle>
              <CardDescription>
                Inline command component for embedding in your interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Command className="max-w-sm">
                <CommandInput placeholder="Search..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Quick Actions">
                    <CommandItem>
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Calendar</span>
                      <CommandShortcut>⌘K</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <Mail className="mr-2 h-4 w-4" />
                      <span>Mail</span>
                      <CommandShortcut>⌘M</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Command Dialog</CardTitle>
              <CardDescription>
                Modal command palette triggered by keyboard shortcut or button
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Keyboard className="mr-2 h-4 w-4" />
                Press ⌘K to open command palette
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                * Dialog variant shown in live preview above
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fast Search</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Built-in filtering with fuzzy search capabilities for instant results.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Keyboard Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Full keyboard support with arrow keys, enter, and escape.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grouped Items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Organize commands into logical groups with separators.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Usage Examples</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Interface</CardTitle>
              <CardDescription>
                Command component used for global search with multiple result types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Command className="max-w-lg">
                <CommandInput placeholder="Search files, users, and more..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Files">
                    <CommandItem>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>project-proposal.pdf</span>
                    </CommandItem>
                    <CommandItem>
                      <File className="mr-2 h-4 w-4" />
                      <span>meeting-notes.txt</span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="People">
                    <CommandItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>John Doe</span>
                    </CommandItem>
                    <CommandItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Jane Smith</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Navigation Menu</CardTitle>
              <CardDescription>
                Quick navigation with keyboard shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Command className="max-w-lg">
                <CommandInput placeholder="Navigate to..." />
                <CommandList>
                  <CommandEmpty>No pages found.</CommandEmpty>
                  <CommandGroup heading="Pages">
                    <CommandItem>
                      <Home className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                      <CommandShortcut>⌘D</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <Users className="mr-2 h-4 w-4" />
                      <span>Team</span>
                      <CommandShortcut>⌘T</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                      <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
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
                Built with full keyboard navigation, ARIA labels, and screen reader support.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Performance</h4>
              <p className="text-sm text-muted-foreground">
                Virtualized list rendering for handling large datasets efficiently.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Customization</h4>
              <p className="text-sm text-muted-foreground">
                Fully customizable with CSS variables and theme integration.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 