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
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Bell, 
  Zap, 
  Settings, 
  Download,
  Upload,
  Trash2,
  Save,
  Mail,
  MessageSquare,
  Heart,
  Star,
  Clock,
  Calendar
} from 'lucide-react';
import { useSonnerToast, useLeaveSystemToasts } from '@/hooks/use-sonner-toast';
import { toast } from 'sonner';

// Properties Panel Component
function ToastPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: ToastProperties;
  onChange: (key: keyof ToastProperties, value: any) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6 h-full">
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
          <Select value={properties.type} onValueChange={(value: ToastProperties['type']) => onChange('type', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="loading">Loading</SelectItem>
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

        {/* Duration */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Duration: {properties.duration}ms</Label>
          <Slider
            value={[properties.duration]}
            onValueChange={(value) => onChange('duration', value[0])}
            max={10000}
            min={1000}
            step={500}
            className="w-full"
          />
        </div>

        {/* Show Icon */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Icon</Label>
          <Switch 
            checked={properties.showIcon} 
            onCheckedChange={(checked) => onChange('showIcon', checked)}
          />
        </div>

        {/* Show Action Button */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Action Button</Label>
          <Switch 
            checked={properties.showAction} 
            onCheckedChange={(checked) => onChange('showAction', checked)}
          />
        </div>

        {properties.showAction && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Action Label</Label>
            <Input
              value={properties.actionLabel}
              onChange={(e) => onChange('actionLabel', e.target.value)}
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
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateToastCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveToastPreview({ properties }: { properties: ToastProperties }) {
  const { showSuccess, showError, showWarning, showInfo } = useSonnerToast(properties.showIcon);

  const triggerToast = () => {
    const baseOptions = {
      duration: properties.duration,
      description: properties.description || undefined,
      action: properties.showAction ? {
        label: properties.actionLabel,
        onClick: () => toast.info('Action clicked!')
      } : undefined,
      cancel: properties.dismissible ? {
        label: 'Dismiss',
        onClick: () => {}
      } : undefined,
    };

    switch (properties.type) {
      case 'success':
        showSuccess(properties.title, baseOptions);
        break;
      case 'error':
        showError(properties.title, baseOptions);
        break;
      case 'warning':
        showWarning(properties.title, baseOptions);
        break;
      case 'info':
        showInfo(properties.title, baseOptions);
        break;
      case 'loading':
        toast.loading(properties.title, baseOptions);
        break;
      default:
        toast(properties.title, baseOptions);
        break;
    }
  };

  const getTypeIcon = () => {
    switch (properties.type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'error': return <XCircle className="w-5 h-5 text-destructive" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'info': return <Info className="w-5 h-5 text-info" />;
      case 'loading': return <Clock className="w-5 h-5 text-muted-foreground animate-spin" />;
      default: return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTypeColor = () => {
    switch (properties.type) {
      case 'success': return 'border-success/20 bg-success/5';
      case 'error': return 'border-destructive/20 bg-destructive/5';
      case 'warning': return 'border-warning/20 bg-warning/5';
      case 'info': return 'border-info/20 bg-info/5';
      case 'loading': return 'border-border bg-muted/50';
      default: return 'border-border bg-muted/50';
    }
  };

  return (
    <div className="h-full min-h-[500px] flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Toast Preview</h3>
          <p className="text-sm text-muted-foreground">
            Click the button to trigger a {properties.type} toast notification
          </p>
        </div>

        {/* Preview Card */}
        <div className={`p-4 rounded-lg border-2 border-dashed ${getTypeColor()}`}>
          <div className="flex items-start gap-3">
            {properties.showIcon && getTypeIcon()}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-foreground">
                {properties.title}
              </div>
              {properties.description && (
                <div className="text-xs text-muted-foreground mt-1">
                  {properties.description}
                </div>
              )}
              {properties.showAction && (
                <Button size="sm" variant="outline" className="mt-2 h-6 text-xs">
                  {properties.actionLabel}
                </Button>
              )}
            </div>
            {properties.dismissible && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <XCircle className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Trigger Button */}
        <Button onClick={triggerToast} className="w-full">
          {getTypeIcon()}
          <span className="ml-2">Show {properties.type} Toast</span>
        </Button>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => showSuccess('Quick Success!', { duration: 2000 })}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Quick Success
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => showError('Quick Error!', { duration: 2000 })}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Quick Error
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ToastProperties {
  type: 'success' | 'error' | 'warning' | 'info' | 'default' | 'loading';
  title: string;
  description: string;
  duration: number;
  showIcon: boolean;
  showAction: boolean;
  actionLabel: string;
  dismissible: boolean;
}

const defaultProperties: ToastProperties = {
  type: 'success',
  title: 'Success!',
  description: 'Your action was completed successfully.',
  duration: 4000,
  showIcon: true,
  showAction: false,
  actionLabel: 'View Details',
  dismissible: true,
};

function generateToastCode(props: ToastProperties): string {
  const hookName = props.showIcon ? 'useSonnerToast(true)' : 'useSonnerToast()';
  const methodName = props.type === 'default' ? 'toast' : 
                    props.type === 'loading' ? 'toast.loading' :
                    `show${props.type.charAt(0).toUpperCase() + props.type.slice(1)}`;

  const options = [];
  if (props.duration !== 4000) options.push(`duration: ${props.duration}`);
  if (props.description) options.push(`description: "${props.description}"`);
  if (props.showAction) {
    options.push(`action: {
    label: "${props.actionLabel}",
    onClick: () => console.log('Action clicked')
  }`);
  }

  const optionsStr = options.length > 0 ? `, {\n  ${options.join(',\n  ')}\n}` : '';

  if (props.type === 'default' || props.type === 'loading') {
    return `import { toast } from 'sonner';

// Trigger toast
${methodName}("${props.title}"${optionsStr});`;
  }

  return `import { ${hookName.split('(')[0]} } from '@/hooks/use-sonner-toast';

// In component
const { ${methodName} } = ${hookName};

// Trigger toast
${methodName}("${props.title}"${optionsStr});`;
}

export default function ToastNotificationsComponentPage() {
  const [properties, setProperties] = useState<ToastProperties>(defaultProperties);
  const leaveToasts = useLeaveSystemToasts(properties.showIcon);

  const handlePropertyChange = (key: keyof ToastProperties, value: any) => {
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
          <h1 className="text-3xl font-bold">Toast Notifications</h1>
          <Badge variant="outline">Feedback Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Real-time notification system built with Sonner for displaying success, error, warning, and info messages.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              Customize the toast properties and trigger notifications in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <LiveToastPreview properties={properties} />
              </div>
              <div className="col-span-1 border-l pl-6">
                <ToastPropertiesPanel
                  properties={properties}
                  onChange={handlePropertyChange}
                  onReset={handleReset}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Pre-built Toast Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Pre-built Toast Examples</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Leave System Toasts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Leave System Notifications
              </CardTitle>
              <CardDescription>Pre-configured toasts for leave management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => leaveToasts.leaveRequestSubmitted()}
                className="w-full justify-start"
              >
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                Leave Request Submitted
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => leaveToasts.leaveRequestApproved()}
                className="w-full justify-start"
              >
                <Star className="w-4 h-4 mr-2 text-yellow-500" />
                Leave Request Approved
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => leaveToasts.insufficientBalance()}
                className="w-full justify-start"
              >
                <XCircle className="w-4 h-4 mr-2 text-red-500" />
                Insufficient Balance
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => leaveToasts.overlappingDates()}
                className="w-full justify-start"
              >
                <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
                Overlapping Dates Warning
              </Button>
            </CardContent>
          </Card>

          {/* System Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Action Toasts
              </CardTitle>
              <CardDescription>Common system notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.loading('Saving changes...', { duration: 2000 })}
                className="w-full justify-start"
              >
                <Save className="w-4 h-4 mr-2 text-blue-500" />
                Saving Loading State
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success('File uploaded successfully!', { 
                  description: 'Your document has been processed',
                  action: { label: 'View', onClick: () => toast.info('View clicked!') }
                })}
                className="w-full justify-start"
              >
                <Upload className="w-4 h-4 mr-2 text-green-500" />
                Upload Success with Action
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.error('Failed to delete item', {
                  description: 'The item is being used by other resources',
                  duration: 6000
                })}
                className="w-full justify-start"
              >
                <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                Delete Error with Long Duration
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast('New message received', {
                  description: 'From: john@example.com',
                  action: { label: 'Reply', onClick: () => toast.info('Opening compose...') }
                })}
                className="w-full justify-start"
              >
                <Mail className="w-4 h-4 mr-2 text-gray-500" />
                Message Notification
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Toast Types Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Toast Types</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { type: 'success', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 border-green-200' },
            { type: 'error', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
            { type: 'warning', icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
            { type: 'info', icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
            { type: 'loading', icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
            { type: 'default', icon: Bell, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
          ].map(({ type, icon: Icon, color, bg }) => (
            <Card key={type} className={`${bg} border text-center`}>
              <CardContent className="p-4">
                <Icon className={`w-8 h-8 mx-auto mb-2 ${color}`} />
                <div className="font-medium text-sm capitalize">{type}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {type === 'success' && 'Positive feedback'}
                  {type === 'error' && 'Error messages'}
                  {type === 'warning' && 'Cautionary alerts'}
                  {type === 'info' && 'Informational notes'}
                  {type === 'loading' && 'Process indicators'}
                  {type === 'default' && 'General notifications'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Advanced Features */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Features</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Promise Handling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Promise Integration
              </CardTitle>
              <CardDescription>Handle async operations with toast states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    const promise = new Promise((resolve) => {
                      setTimeout(resolve, 3000);
                    });
                    
                    toast.promise(promise, {
                      loading: 'Saving data...',
                      success: 'Data saved successfully!',
                      error: 'Failed to save data',
                    });
                  }}
                  className="w-full"
                >
                  Demo Promise Toast
                </Button>
                <p className="text-xs text-muted-foreground">
                  Automatically transitions from loading to success state
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Rich Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Rich Content
              </CardTitle>
              <CardDescription>Custom JSX content in toasts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.custom((t) => (
                      <div className="bg-white border rounded-lg p-4 shadow-lg">
                        <div className="flex items-center gap-3">
                          <Heart className="w-5 h-5 text-red-500" />
                          <div>
                            <div className="font-medium">Custom Toast</div>
                            <div className="text-sm text-gray-600">With custom JSX content</div>
                          </div>
                        </div>
                      </div>
                    ));
                  }}
                  className="w-full"
                >
                  Show Custom Toast
                </Button>
                <p className="text-xs text-muted-foreground">
                  Full control over toast appearance and content
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Implementation Notes */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Implementation Notes</h2>
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
            <CardDescription>Important considerations when using Toast Notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Setup Requirements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Install sonner package</li>
                  <li>• Add Toaster component to root layout</li>
                  <li>• Configure theme integration</li>
                  <li>• Import toast hooks for type-specific functions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Best Practices</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use appropriate toast types for context</li>
                  <li>• Keep messages concise and actionable</li>
                  <li>• Set reasonable durations (2-6 seconds)</li>
                  <li>• Provide actions for important notifications</li>
                </ul>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Accessibility</h4>
              <p className="text-sm text-muted-foreground">
                Sonner toasts are automatically announced to screen readers and support keyboard navigation. 
                They follow ARIA guidelines and respect user motion preferences.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 