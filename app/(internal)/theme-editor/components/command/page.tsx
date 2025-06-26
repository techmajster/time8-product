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
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  Calendar, 
  CreditCard, 
  Settings, 
  Smile, 
  User, 
  FileText, 
  Search,
  Home,
  Users,
  Mail,
  MessageSquare,
  Plus,
  Trash2
} from 'lucide-react';

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
    <div className="space-y-6 h-full min-h-[500px]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Properties</h3>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Layout Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Layout Type</Label>
          <Select value={properties.layout} onValueChange={(value) => onChange('layout', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inline">Inline Command</SelectItem>
              <SelectItem value="dialog">Command Dialog</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Placeholder */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Search Placeholder</Label>
          <Input
            value={properties.placeholder}
            onChange={(e) => onChange('placeholder', e.target.value)}
            placeholder="Type a command or search..."
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

        {/* Show Icons */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Icons</Label>
          <Switch 
            checked={properties.showIcons} 
            onCheckedChange={(checked) => onChange('showIcons', checked)}
          />
        </div>

        {/* Show Empty State */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Empty State</Label>
          <Switch 
            checked={properties.showEmpty} 
            onCheckedChange={(checked) => onChange('showEmpty', checked)}
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
              <SelectItem value="navigation">Navigation</SelectItem>
              <SelectItem value="actions">Actions</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
              <SelectItem value="mixed">Mixed Content</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Empty Message */}
        {properties.showEmpty && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Empty Message</Label>
            <Input
              value={properties.emptyMessage}
              onChange={(e) => onChange('emptyMessage', e.target.value)}
              placeholder="No results found."
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
function LiveCommandPreview({ properties }: { properties: CommandProperties }) {
  const [open, setOpen] = useState(false);

  const getContentItems = () => {
    switch (properties.contentType) {
      case 'navigation':
        return [
          { group: 'Navigation', items: [
            { icon: Home, text: 'Dashboard', shortcut: '⌘D' },
            { icon: Users, text: 'Team', shortcut: '⌘T' },
            { icon: Mail, text: 'Messages', shortcut: '⌘M' },
            { icon: Settings, text: 'Settings', shortcut: '⌘S' }
          ]},
        ];
      case 'actions':
        return [
          { group: 'Actions', items: [
            { icon: Plus, text: 'Create New', shortcut: '⌘N' },
            { icon: FileText, text: 'New Document', shortcut: '⌘⇧N' },
            { icon: Mail, text: 'Send Message', shortcut: '⌘E' },
            { icon: Trash2, text: 'Delete', shortcut: '⌫' }
          ]},
        ];
      case 'settings':
        return [
          { group: 'Settings', items: [
            { icon: User, text: 'Profile', shortcut: '⌘P' },
            { icon: Settings, text: 'Preferences', shortcut: '⌘,' },
            { icon: CreditCard, text: 'Billing', shortcut: '⌘B' },
            { icon: Calculator, text: 'Advanced', shortcut: '⌘A' }
          ]},
        ];
      default:
        return [
          { group: 'Suggestions', items: [
            { icon: Calendar, text: 'Calendar', shortcut: '⌘K' },
            { icon: Search, text: 'Search Emoji', shortcut: '⌘E' },
            { icon: Calculator, text: 'Calculator', shortcut: '⌘C' }
          ]},
          { group: 'Settings', items: [
            { icon: User, text: 'Profile', shortcut: '⌘P' },
            { icon: CreditCard, text: 'Billing', shortcut: '⌘B' },
            { icon: Settings, text: 'Settings', shortcut: '⌘S' }
          ]},
        ];
    }
  };

  const renderCommand = () => (
    <Command className="rounded-lg border shadow-md">
      <CommandInput placeholder={properties.placeholder} />
      <CommandList>
        {properties.showEmpty && (
          <CommandEmpty>{properties.emptyMessage}</CommandEmpty>
        )}
        {getContentItems().map((group, groupIndex) => (
          <div key={groupIndex}>
            {properties.showGroups && (
              <CommandGroup heading={group.group}>
                {group.items.map((item, itemIndex) => (
                  <CommandItem key={itemIndex}>
                    {properties.showIcons && <item.icon className="mr-2 h-4 w-4" />}
                    <span>{item.text}</span>
                    {properties.showShortcuts && (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!properties.showGroups && 
              group.items.map((item, itemIndex) => (
                <CommandItem key={itemIndex}>
                  {properties.showIcons && <item.icon className="mr-2 h-4 w-4" />}
                  <span>{item.text}</span>
                  {properties.showShortcuts && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))
            }
            {groupIndex < getContentItems().length - 1 && <CommandSeparator />}
          </div>
        ))}
      </CommandList>
    </Command>
  );

  if (properties.layout === 'dialog') {
    return (
      <div className="h-full min-h-[500px] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Button onClick={() => setOpen(true)}>
            Open Command Dialog
          </Button>
          <p className="text-sm text-muted-foreground">
            Press ⌘J to open the command dialog
          </p>
          <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder={properties.placeholder} />
            <CommandList>
              {properties.showEmpty && (
                <CommandEmpty>{properties.emptyMessage}</CommandEmpty>
              )}
              {getContentItems().map((group, groupIndex) => (
                <div key={groupIndex}>
                  {properties.showGroups && (
                    <CommandGroup heading={group.group}>
                      {group.items.map((item, itemIndex) => (
                        <CommandItem key={itemIndex}>
                          {properties.showIcons && <item.icon className="mr-2 h-4 w-4" />}
                          <span>{item.text}</span>
                          {properties.showShortcuts && (
                            <CommandShortcut>{item.shortcut}</CommandShortcut>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {!properties.showGroups && 
                    group.items.map((item, itemIndex) => (
                      <CommandItem key={itemIndex}>
                        {properties.showIcons && <item.icon className="mr-2 h-4 w-4" />}
                        <span>{item.text}</span>
                        {properties.showShortcuts && (
                          <CommandShortcut>{item.shortcut}</CommandShortcut>
                        )}
                      </CommandItem>
                    ))
                  }
                  {groupIndex < getContentItems().length - 1 && <CommandSeparator />}
                </div>
              ))}
            </CommandList>
          </CommandDialog>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[500px] flex items-center justify-center">
      <div className="w-full max-w-md">
        {renderCommand()}
      </div>
    </div>
  );
}

interface CommandProperties {
  layout: string;
  placeholder: string;
  showGroups: boolean;
  showShortcuts: boolean;
  showIcons: boolean;
  showEmpty: boolean;
  contentType: string;
  emptyMessage: string;
}

const defaultProperties: CommandProperties = {
  layout: 'inline',
  placeholder: 'Type a command or search...',
  showGroups: true,
  showShortcuts: true,
  showIcons: true,
  showEmpty: true,
  contentType: 'mixed',
  emptyMessage: 'No results found.',
};

function generateCommandCode(props: CommandProperties): string {
  if (props.layout === 'dialog') {
    return `const [open, setOpen] = useState(false)

<Button onClick={() => setOpen(true)}>
  Open Command Dialog
</Button>

<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="${props.placeholder}" />
  <CommandList>
    ${props.showEmpty ? `<CommandEmpty>${props.emptyMessage}</CommandEmpty>` : ''}
    ${props.showGroups ? `<CommandGroup heading="Suggestions">` : ''}
      <CommandItem>
        ${props.showIcons ? '<Calendar className="mr-2 h-4 w-4" />' : ''}
        <span>Calendar</span>
        ${props.showShortcuts ? '<CommandShortcut>⌘K</CommandShortcut>' : ''}
      </CommandItem>
    ${props.showGroups ? '</CommandGroup>' : ''}
  </CommandList>
</CommandDialog>`;
  }

  return `<Command className="rounded-lg border shadow-md">
  <CommandInput placeholder="${props.placeholder}" />
  <CommandList>
    ${props.showEmpty ? `<CommandEmpty>${props.emptyMessage}</CommandEmpty>` : ''}
    ${props.showGroups ? `<CommandGroup heading="Suggestions">` : ''}
      <CommandItem>
        ${props.showIcons ? '<Calendar className="mr-2 h-4 w-4" />' : ''}
        <span>Calendar</span>
        ${props.showShortcuts ? '<CommandShortcut>⌘K</CommandShortcut>' : ''}
      </CommandItem>
    ${props.showGroups ? '</CommandGroup>' : ''}
  </CommandList>
</Command>`;
}

export default function CommandComponentPage() {
  const [properties, setProperties] = useState<CommandProperties>(defaultProperties);

  const handlePropertyChange = (key: keyof CommandProperties, value: any) => {
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
          <h1 className="text-3xl font-bold">Command</h1>
          <Badge variant="outline">Interactive Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Fast, composable, unstyled command menu for React.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              Customize the command properties and see the changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <LiveCommandPreview properties={properties} />
              </div>
              <div className="col-span-1 border-l pl-6">
                <CommandPropertiesPanel
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
            <CardTitle>Simple Command Menu</CardTitle>
            <CardDescription>Basic command menu with search</CardDescription>
          </CardHeader>
          <CardContent>
            <Command className="rounded-lg border shadow-md max-w-md">
              <CommandInput placeholder="Type a command or search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                  <CommandItem>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Calendar</span>
                  </CommandItem>
                  <CommandItem>
                    <Smile className="mr-2 h-4 w-4" />
                    <span>Search Emoji</span>
                  </CommandItem>
                  <CommandItem>
                    <Calculator className="mr-2 h-4 w-4" />
                    <span>Calculator</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </CardContent>
        </Card>
      </section>

      {/* Command Dialog */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Command Dialog</h2>
        <Card>
          <CardHeader>
            <CardTitle>Modal Command Interface</CardTitle>
            <CardDescription>Command menu as a modal dialog</CardDescription>
          </CardHeader>
          <CardContent>
            <CommandDialogExample />
          </CardContent>
        </Card>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Usage Examples</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Launcher</CardTitle>
              <CardDescription>Quick access to app features</CardDescription>
            </CardHeader>
            <CardContent>
              <Command className="rounded-lg border shadow-md">
                <CommandInput placeholder="Search apps..." />
                <CommandList>
                  <CommandEmpty>No applications found.</CommandEmpty>
                  <CommandGroup heading="Applications">
                    <CommandItem>
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Calendar</span>
                      <CommandShortcut>⌘K</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <Mail className="mr-2 h-4 w-4" />
                      <span>Email</span>
                      <CommandShortcut>⌘E</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>Messages</span>
                      <CommandShortcut>⌘M</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Tools">
                    <CommandItem>
                      <Calculator className="mr-2 h-4 w-4" />
                      <span>Calculator</span>
                      <CommandShortcut>⌘C</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                      <CommandShortcut>⌘,</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search & Actions</CardTitle>
              <CardDescription>Combined search and quick actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Command className="rounded-lg border shadow-md">
                <CommandInput placeholder="Search or run a command..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Quick Actions">
                    <CommandItem>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Create New</span>
                      <CommandShortcut>⌘N</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>New Document</span>
                      <CommandShortcut>⌘⇧N</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <Users className="mr-2 h-4 w-4" />
                      <span>Invite Team</span>
                      <CommandShortcut>⌘I</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Recent">
                    <CommandItem>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Project Proposal</span>
                    </CommandItem>
                    <CommandItem>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Meeting Notes</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Features</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Menu</CardTitle>
              <CardDescription>Command-based navigation</CardDescription>
            </CardHeader>
            <CardContent>
              <Command className="rounded-lg border shadow-md">
                <CommandInput placeholder="Go to..." />
                <CommandList>
                  <CommandGroup heading="Navigation">
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
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Projects</span>
                      <CommandShortcut>⌘P</CommandShortcut>
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

          <Card>
            <CardHeader>
              <CardTitle>Contextual Commands</CardTitle>
              <CardDescription>Context-aware command suggestions</CardDescription>
            </CardHeader>
            <CardContent>
              <Command className="rounded-lg border shadow-md">
                <CommandInput placeholder="What would you like to do?" />
                <CommandList>
                  <CommandGroup heading="File Actions">
                    <CommandItem>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Open File</span>
                      <CommandShortcut>⌘O</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Create File</span>
                      <CommandShortcut>⌘N</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete File</span>
                      <CommandShortcut>⌫</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Edit Actions">
                    <CommandItem>
                      <span>Copy</span>
                      <CommandShortcut>⌘C</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <span>Paste</span>
                      <CommandShortcut>⌘V</CommandShortcut>
                    </CommandItem>
                    <CommandItem>
                      <span>Undo</span>
                      <CommandShortcut>⌘Z</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

// Command Dialog Example Component
function CommandDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Button onClick={() => setOpen(true)}>
        Open Command Dialog
      </Button>
      <p className="text-sm text-muted-foreground">
        Try searching for "calendar", "email", or "settings"
      </p>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Calendar</span>
              <CommandShortcut>⌘K</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Mail className="mr-2 h-4 w-4" />
              <span>Email</span>
              <CommandShortcut>⌘E</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Messages</span>
              <CommandShortcut>⌘M</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
} 