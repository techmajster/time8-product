'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { X, Settings, User, CreditCard, Bell, Save, Plus, Edit, Trash2 } from 'lucide-react';

// Live Dialog Preview Component
function LiveDialogPreview({ properties }: { properties: DialogProperties }) {
  const getSizeClass = (size: string) => {
    const sizes = {
      sm: 'max-w-sm',
      default: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-screen-lg w-[95vw] h-[95vh]'
    };
    return sizes[size as keyof typeof sizes] || 'max-w-lg';
  };

  const renderContent = () => {
    switch (properties.contentType) {
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
      case 'confirmation':
        return (
          <div className="space-y-4">
            <p>Are you sure you want to delete this item? This action cannot be undone.</p>
          </div>
        );
      case 'list':
        return (
          <div className="space-y-4">
            <ul className="space-y-2">
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>First item in the list</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Second item in the list</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Third item in the list</span>
              </li>
            </ul>
          </div>
        );
      default:
        return <p>This is the dialog content. You can add any content here.</p>;
    }
  };

  return (
    <div className="h-full min-h-[500px] flex items-center justify-center">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant={properties.triggerVariant as any}>
            {properties.triggerText}
          </Button>
        </DialogTrigger>
        <DialogContent className={getSizeClass(properties.size)}>
          <DialogHeader>
            <DialogTitle>{properties.title}</DialogTitle>
            {properties.description && (
              <DialogDescription>
                {properties.description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4">
            {renderContent()}
          </div>
          {properties.showFooter && (
            <DialogFooter>
              {properties.showCloseButton && (
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
              )}
              <Button>
                {properties.contentType === 'confirmation' ? 'Delete' : 'Save'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Properties Panel Component
function DialogPropertiesPanel({ properties, onChange, onReset }: { properties: DialogProperties; onChange: (key: keyof DialogProperties, value: any) => void; onReset: () => void }) {
  return (
    <div className="space-y-6 h-full min-h-[500px]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Properties</h3>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Title</Label>
          <Input
            value={properties.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Dialog title"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Description</Label>
          <Textarea
            value={properties.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Dialog description"
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

        {/* Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Dialog Size</Label>
          <Select value={properties.size} onValueChange={(value) => onChange('size', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
              <SelectItem value="xl">Extra Large</SelectItem>
              <SelectItem value="full">Full Screen</SelectItem>
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
              <SelectItem value="simple">Simple Text</SelectItem>
              <SelectItem value="form">Form Example</SelectItem>
              <SelectItem value="confirmation">Confirmation</SelectItem>
              <SelectItem value="list">List Content</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateDialogCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

interface DialogProperties {
  title: string;
  description: string;
  triggerText: string;
  triggerVariant: string;
  size: string;
  showFooter: boolean;
  showCloseButton: boolean;
  contentType: string;
}

const defaultProperties: DialogProperties = {
  title: 'Dialog Title',
  description: 'This is a dialog description that provides context.',
  triggerText: 'Open Dialog',
  triggerVariant: 'default',
  size: 'default',
  showFooter: true,
  showCloseButton: true,
  contentType: 'simple',
};

function generateDialogCode(props: DialogProperties): string {
  const sizeClass = {
    sm: 'max-w-sm',
    default: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-screen-lg w-[95vw] h-[95vh]'
  }[props.size] || 'max-w-lg';

  let code = `<Dialog>
  <DialogTrigger asChild>
    <Button variant="${props.triggerVariant}">${props.triggerText}</Button>
  </DialogTrigger>
  <DialogContent${props.size !== 'default' ? ` className="${sizeClass}"` : ''}>
    <DialogHeader>
      <DialogTitle>${props.title}</DialogTitle>`;

  if (props.description) {
    code += `
      <DialogDescription>
        ${props.description}
      </DialogDescription>`;
  }

  code += `
    </DialogHeader>
    <div className="py-4">
      {/* Your content here */}
    </div>`;

  if (props.showFooter) {
    code += `
    <DialogFooter>`;
    
    if (props.showCloseButton) {
      code += `
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>`;
    }
    
    code += `
      <Button>Save</Button>
    </DialogFooter>`;
  }

  code += `
  </DialogContent>
</Dialog>`;

  return code;
}

export default function DialogComponentPage() {
  const [properties, setProperties] = useState<DialogProperties>(defaultProperties);

  const handlePropertyChange = (key: keyof DialogProperties, value: any) => {
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
          <h1 className="text-3xl font-bold">Dialog</h1>
          <Badge variant="outline">Interactive Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A window overlaid on either the primary window or another dialog window.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              Customize the dialog properties and see the changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <LiveDialogPreview properties={properties} />
              </div>
              <div className="col-span-1 border-l pl-6">
                <DialogPropertiesPanel
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
            <CardTitle>Simple Dialog</CardTitle>
            <CardDescription>Basic dialog with title and content</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Open Basic Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Basic Dialog</DialogTitle>
                  <DialogDescription>
                    This is a simple dialog with basic content.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p>This is the main content of the dialog.</p>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </section>

      {/* Sizes */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Sizes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Small</CardTitle>
              <CardDescription>Compact dialog for simple interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Small Dialog</Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Small Dialog</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <p>This is a small dialog.</p>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Large</CardTitle>
              <CardDescription>Spacious dialog for complex content</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Large Dialog</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Large Dialog</DialogTitle>
                    <DialogDescription>
                      This dialog has more space for content.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p>This is a large dialog with more room for content and complex layouts.</p>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Full Screen</CardTitle>
              <CardDescription>Maximum size for extensive content</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Full Screen</Button>
                </DialogTrigger>
                <DialogContent className="max-w-screen-lg w-[95vw] h-[95vh]">
                  <DialogHeader>
                    <DialogTitle>Full Screen Dialog</DialogTitle>
                    <DialogDescription>
                      This dialog takes up most of the screen.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 overflow-auto">
                    <p>This is a full-screen dialog that can contain extensive content.</p>
                  </div>
                </DialogContent>
              </Dialog>
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
              <CardTitle>Form Dialog</CardTitle>
              <CardDescription>Dialog containing a form</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Add User</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                      Fill out the form below to add a new user.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Enter name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="Enter email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button>Add User</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Confirmation Dialog</CardTitle>
              <CardDescription>Dialog for confirming actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">Delete Item</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete the item.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p>Are you sure you want to delete this item?</p>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button variant="destructive">Delete</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Advanced Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Examples</h2>
        <Card>
          <CardHeader>
            <CardTitle>Settings Dialog</CardTitle>
            <CardDescription>Complex dialog with multiple sections</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Settings</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                  <DialogDescription>
                    Manage your account settings and preferences.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Profile</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" defaultValue="John" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" defaultValue="Doe" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea id="bio" placeholder="Tell us about yourself" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Preferences</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notifications">Email notifications</Label>
                        <Switch id="notifications" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="marketing">Marketing emails</Label>
                        <Switch id="marketing" />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 