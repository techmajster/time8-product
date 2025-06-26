'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info, Bell, Mail, Download, Upload, Save, Trash, Settings, User, Heart, Share, Copy, Edit } from 'lucide-react';

// Properties interface
interface SonnerProperties {
  toastType: 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading' | 'custom';
  title: string;
  description: string;
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  duration: number;
  dismissible: boolean;
  showAction: boolean;
  actionText: string;
  showCloseButton: boolean;
  richColors: boolean;
  icon: string;
}

// Toast icons
const toastIcons = [
  { value: 'none', label: 'No Icon', icon: null },
  { value: 'check', label: 'Check Circle', icon: CheckCircle },
  { value: 'x', label: 'X Circle', icon: XCircle },
  { value: 'warning', label: 'Warning', icon: AlertTriangle },
  { value: 'info', label: 'Info', icon: Info },
  { value: 'bell', label: 'Bell', icon: Bell },
  { value: 'mail', label: 'Mail', icon: Mail },
  { value: 'download', label: 'Download', icon: Download },
  { value: 'upload', label: 'Upload', icon: Upload },
  { value: 'save', label: 'Save', icon: Save },
  { value: 'trash', label: 'Trash', icon: Trash },
  { value: 'settings', label: 'Settings', icon: Settings },
  { value: 'user', label: 'User', icon: User },
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'share', label: 'Share', icon: Share },
  { value: 'copy', label: 'Copy', icon: Copy },
  { value: 'edit', label: 'Edit', icon: Edit },
];

// Properties Panel Component
function SonnerPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: SonnerProperties;
  onChange: (key: keyof SonnerProperties, value: any) => void;
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
        {/* Toast Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Toast Type</Label>
          <Select value={properties.toastType} onValueChange={(value) => onChange('toastType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="loading">Loading</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Title</Label>
          <Input
            value={properties.title}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="Toast title"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Description</Label>
          <Textarea
            value={properties.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Toast description"
            rows={2}
          />
        </div>

        {/* Position */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Position</Label>
          <Select value={properties.position} onValueChange={(value) => onChange('position', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top-left">Top Left</SelectItem>
              <SelectItem value="top-center">Top Center</SelectItem>
              <SelectItem value="top-right">Top Right</SelectItem>
              <SelectItem value="bottom-left">Bottom Left</SelectItem>
              <SelectItem value="bottom-center">Bottom Center</SelectItem>
              <SelectItem value="bottom-right">Bottom Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Duration: {properties.duration}ms</Label>
          <Input
            type="range"
            min="1000"
            max="10000"
            step="500"
            value={properties.duration}
            onChange={(e) => onChange('duration', Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Custom Icon (only for custom type) */}
        {properties.toastType === 'custom' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Icon</Label>
            <Select value={properties.icon} onValueChange={(value) => onChange('icon', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toastIcons.map((iconOption) => (
                  <SelectItem key={iconOption.value} value={iconOption.value}>
                    <div className="flex items-center gap-2">
                      {iconOption.icon && <iconOption.icon className="h-4 w-4" />}
                      {iconOption.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Action Text */}
        {properties.showAction && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Action Text</Label>
            <Input
              value={properties.actionText}
              onChange={(e) => onChange('actionText', e.target.value)}
              placeholder="Action button text"
            />
          </div>
        )}

        {/* Dismissible */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Dismissible</Label>
          <Switch 
            checked={properties.dismissible} 
            onCheckedChange={(checked) => onChange('dismissible', checked)}
          />
        </div>

        {/* Show Action */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Action Button</Label>
          <Switch 
            checked={properties.showAction} 
            onCheckedChange={(checked) => onChange('showAction', checked)}
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

        {/* Rich Colors */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Rich Colors</Label>
          <Switch 
            checked={properties.richColors} 
            onCheckedChange={(checked) => onChange('richColors', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateSonnerCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveSonnerPreview({ properties }: { properties: SonnerProperties }) {
  const triggerToast = () => {
    const options: any = {
      duration: properties.duration,
      dismissible: properties.dismissible,
      position: properties.position,
    };

    if (properties.showAction) {
      options.action = {
        label: properties.actionText,
        onClick: () => console.log('Action clicked'),
      };
    }

    if (properties.showCloseButton) {
      options.cancel = {
        label: 'Cancel',
        onClick: () => console.log('Cancel clicked'),
      };
    }

    if (properties.richColors) {
      options.richColors = true;
    }

    const getIcon = () => {
      if (properties.toastType === 'custom' && properties.icon !== 'none') {
        const iconConfig = toastIcons.find(i => i.value === properties.icon);
        return iconConfig?.icon ? iconConfig.icon : undefined;
      }
      return undefined;
    };

    const icon = getIcon();
    if (icon) {
      options.icon = icon;
    }

    switch (properties.toastType) {
      case 'success':
        toast.success(properties.title, {
          description: properties.description,
          ...options,
        });
        break;
      case 'error':
        toast.error(properties.title, {
          description: properties.description,
          ...options,
        });
        break;
      case 'warning':
        toast.warning(properties.title, {
          description: properties.description,
          ...options,
        });
        break;
      case 'info':
        toast.info(properties.title, {
          description: properties.description,
          ...options,
        });
        break;
      case 'loading':
        toast.loading(properties.title, {
          description: properties.description,
          ...options,
        });
        break;
      default:
        toast(properties.title, {
          description: properties.description,
          ...options,
        });
    }
  };

  return (
    <div className="h-full min-h-[500px] flex items-center justify-center p-8">
      <div className="text-center space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Toast Preview</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click the button below to trigger the toast with your configured settings
          </p>
        </div>
        
        <Button onClick={triggerToast} size="lg">
          Show Toast
        </Button>

        <div className="max-w-md mx-auto p-4 border rounded-lg bg-background shadow-sm">
          <div className="flex items-start gap-3">
            {properties.toastType === 'success' && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />}
            {properties.toastType === 'error' && <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />}
            {properties.toastType === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />}
            {properties.toastType === 'info' && <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />}
            {properties.toastType === 'custom' && properties.icon !== 'none' && (() => {
              const IconComponent = toastIcons.find(i => i.value === properties.icon)?.icon;
              return IconComponent ? <IconComponent className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" /> : null;
            })()}
            
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{properties.title}</div>
              {properties.description && (
                <div className="text-xs text-muted-foreground mt-1">{properties.description}</div>
              )}
              
              {properties.showAction && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    {properties.actionText}
                  </Button>
                  {properties.showCloseButton && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {properties.showCloseButton && !properties.showAction && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0">
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Preview shows how the toast will appear. Actual toast will show in the {properties.position.replace('-', ' ')} position.
        </p>
      </div>
    </div>
  );
}

const defaultProperties: SonnerProperties = {
  toastType: 'default',
  title: 'Notification',
  description: 'This is a sample toast notification.',
  position: 'bottom-right',
  duration: 4000,
  dismissible: true,
  showAction: false,
  actionText: 'Action',
  showCloseButton: true,
  richColors: false,
  icon: 'none'
};

function generateSonnerCode(props: SonnerProperties): string {
  const options: string[] = [];
  
  if (props.description) {
    options.push(`description: "${props.description}"`);
  }
  
  if (props.duration !== 4000) {
    options.push(`duration: ${props.duration}`);
  }
  
  if (!props.dismissible) {
    options.push(`dismissible: false`);
  }
  
  if (props.position !== 'bottom-right') {
    options.push(`position: "${props.position}"`);
  }
  
  if (props.richColors) {
    options.push(`richColors: true`);
  }
  
  if (props.showAction) {
    options.push(`action: {
    label: "${props.actionText}",
    onClick: () => console.log('Action clicked')
  }`);
  }
  
  if (props.showCloseButton && props.showAction) {
    options.push(`cancel: {
    label: "Cancel",
    onClick: () => console.log('Cancel clicked')
  }`);
  }

  const optionsString = options.length > 0 ? `, {
  ${options.join(',\n  ')}
}` : '';

  const method = props.toastType === 'default' ? 'toast' : `toast.${props.toastType}`;
  
  return `${method}("${props.title}"${optionsString});`;
}

export default function SonnerComponentPage() {
  const [properties, setProperties] = useState<SonnerProperties>(defaultProperties);

  const handlePropertyChange = (key: keyof SonnerProperties, value: any) => {
    setProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setProperties(defaultProperties);
  };

  const showExampleToasts = () => {
    toast.success('Success!', {
      description: 'Your changes have been saved successfully.',
      duration: 3000,
    });
    
    setTimeout(() => {
      toast.error('Error occurred', {
        description: 'Something went wrong. Please try again.',
        duration: 3000,
      });
    }, 500);
    
    setTimeout(() => {
      toast.warning('Warning', {
        description: 'Please review your settings before continuing.',
        duration: 3000,
      });
    }, 1000);
    
    setTimeout(() => {
      toast.info('Information', {
        description: 'New features are now available.',
        duration: 3000,
      });
    }, 1500);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Sonner (Toast)</h1>
          <Badge variant="outline">Feedback Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A beautiful and customizable toast notification system built with Sonner. Perfect for user feedback, system notifications, and action confirmations.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Toast Preview</CardTitle>
            <CardDescription>
              Customize the toast properties and see changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2 flex items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 h-full min-h-[500px]">
                <LiveSonnerPreview properties={properties} />
              </div>

              {/* Properties Panel */}
              <div className="space-y-4 p-4 border rounded-lg bg-background h-full min-h-[500px]">
                <SonnerPropertiesPanel
                  properties={properties}
                  onChange={handlePropertyChange}
                  onReset={handleReset}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Toast Types */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Toast Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Success
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Confirm successful actions and operations.
              </p>
              <Button 
                size="sm" 
                onClick={() => toast.success('Success!', { description: 'Operation completed successfully.' })}
                className="w-full"
              >
                Try Success
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Alert users to errors and failures.
              </p>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => toast.error('Error!', { description: 'Something went wrong.' })}
                className="w-full"
              >
                Try Error
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Warning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Warn users about potential issues.
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => toast.warning('Warning!', { description: 'Please check your input.' })}
                className="w-full"
              >
                Try Warning
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Share informational messages.
              </p>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => toast.info('Info', { description: 'Here\'s some useful information.' })}
                className="w-full"
              >
                Try Info
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-6 text-center">
          <Button onClick={showExampleToasts} variant="outline">
            Show All Toast Types
          </Button>
        </div>
      </section>

      {/* Use Cases */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Common Use Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Provide immediate feedback for form submissions and validation errors.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Successful form submissions</li>
                <li>• Validation error messages</li>
                <li>• Required field notifications</li>
                <li>• Data save confirmations</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Keep users informed about system status and important updates.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Connection status changes</li>
                <li>• Auto-save notifications</li>
                <li>• Update availability alerts</li>
                <li>• Background process completion</li>
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
                <h4 className="font-semibold mb-2">Performance</h4>
                <p className="text-sm text-muted-foreground">
                  Sonner is lightweight and performant, with minimal impact on bundle size and runtime performance.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Accessibility</h4>
                <p className="text-sm text-muted-foreground">
                  Includes proper ARIA attributes, focus management, and screen reader announcements for inclusive experience.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Customization</h4>
                <p className="text-sm text-muted-foreground">
                  Fully customizable styling with CSS variables, dark mode support, and theme integration.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}