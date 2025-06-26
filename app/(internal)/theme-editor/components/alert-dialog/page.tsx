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
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Trash2, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  Save,
  Download,
  Upload,
  LogOut,
  Settings,
  RefreshCw
} from 'lucide-react';

// Properties interface
interface AlertDialogProperties {
  triggerVariant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  triggerText: string;
  dialogType: 'confirm' | 'destructive' | 'info' | 'warning' | 'success' | 'custom';
  title: string;
  description: string;
  primaryActionText: string;
  cancelActionText: string;
  showIcon: boolean;
  customWidth: boolean;
  maxWidth: number;
}

// Properties Panel Component
function AlertDialogPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: AlertDialogProperties;
  onChange: (key: keyof AlertDialogProperties, value: any) => void;
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
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="destructive">Destructive</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
              <SelectItem value="ghost">Ghost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trigger Text */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trigger Text</Label>
          <Input
            value={properties.triggerText}
            onChange={(e) => onChange('triggerText', e.target.value)}
            placeholder="Open Dialog"
          />
        </div>

        {/* Dialog Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Dialog Type</Label>
          <Select value={properties.dialogType} onValueChange={(value) => onChange('dialogType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirm">Confirmation</SelectItem>
              <SelectItem value="destructive">Destructive Action</SelectItem>
              <SelectItem value="info">Information</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="success">Success</SelectItem>
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
            placeholder="Dialog Title"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Description</Label>
          <Textarea
            value={properties.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Dialog description..."
            rows={3}
          />
        </div>

        {/* Primary Action Text */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Primary Action Text</Label>
          <Input
            value={properties.primaryActionText}
            onChange={(e) => onChange('primaryActionText', e.target.value)}
            placeholder="Continue"
          />
        </div>

        {/* Cancel Action Text */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Cancel Action Text</Label>
          <Input
            value={properties.cancelActionText}
            onChange={(e) => onChange('cancelActionText', e.target.value)}
            placeholder="Cancel"
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

        {/* Custom Width */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Custom Width</Label>
          <Switch 
            checked={properties.customWidth} 
            onCheckedChange={(checked) => onChange('customWidth', checked)}
          />
        </div>

        {/* Max Width */}
        {properties.customWidth && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Max Width: {properties.maxWidth}px</Label>
            <Input
              type="range"
              min="300"
              max="800"
              value={properties.maxWidth}
              onChange={(e) => onChange('maxWidth', parseInt(e.target.value))}
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateAlertDialogCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveAlertDialogPreview({ properties }: { properties: AlertDialogProperties }) {
  const getDialogIcon = () => {
    if (!properties.showIcon) return null;
    
    switch (properties.dialogType) {
      case 'destructive':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />;
      case 'confirm':
        return <HelpCircle className="h-6 w-6 text-blue-500" />;
      default:
        return <Info className="h-6 w-6 text-gray-500" />;
    }
  };

  const getPrimaryActionVariant = () => {
    switch (properties.dialogType) {
      case 'destructive':
        return 'destructive';
      case 'success':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="flex items-center justify-center p-8">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant={properties.triggerVariant}>
            {properties.triggerText}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent style={properties.customWidth ? { maxWidth: `${properties.maxWidth}px` } : undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              {getDialogIcon()}
              {properties.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {properties.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{properties.cancelActionText}</AlertDialogCancel>
            <AlertDialogAction variant={getPrimaryActionVariant()}>
              {properties.primaryActionText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Generate code function
function generateAlertDialogCode(props: AlertDialogProperties): string {
  const iconCode = props.showIcon ? `
              <AlertTriangle className="h-6 w-6" />` : '';
  
  return `<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="${props.triggerVariant}">
      ${props.triggerText}
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent${props.customWidth ? ` style={{ maxWidth: "${props.maxWidth}px" }}` : ''}>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-3">${iconCode}
        ${props.title}
      </AlertDialogTitle>
      <AlertDialogDescription>
        ${props.description}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>${props.cancelActionText}</AlertDialogCancel>
      <AlertDialogAction${props.dialogType === 'destructive' ? ' variant="destructive"' : ''}>
        ${props.primaryActionText}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`;
}

export default function AlertDialogComponentPage() {
  const [alertDialogProperties, setAlertDialogProperties] = useState<AlertDialogProperties>({
    triggerVariant: 'destructive',
    triggerText: 'Delete Account',
    dialogType: 'destructive',
    title: 'Are you absolutely sure?',
    description: 'This action cannot be undone. This will permanently delete your account and remove your data from our servers.',
    primaryActionText: 'Delete Account',
    cancelActionText: 'Cancel',
    showIcon: true,
    customWidth: false,
    maxWidth: 500,
  });

  const handlePropertyChange = (key: keyof AlertDialogProperties, value: any) => {
    setAlertDialogProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setAlertDialogProperties({
      triggerVariant: 'destructive',
      triggerText: 'Delete Account',
      dialogType: 'destructive',
      title: 'Are you absolutely sure?',
      description: 'This action cannot be undone. This will permanently delete your account and remove your data from our servers.',
      primaryActionText: 'Delete Account',
      cancelActionText: 'Cancel',
      showIcon: true,
      customWidth: false,
      maxWidth: 500,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Alert Dialog</h1>
          <Badge variant="outline">Interactive Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A modal dialog that interrupts the user with important content and expects a response. 
          Perfect for confirmations, warnings, and critical information that requires user acknowledgment.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Click the trigger button to open the alert dialog. Customize properties below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveAlertDialogPreview properties={alertDialogProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <AlertDialogPropertiesPanel 
                    properties={alertDialogProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Dialog Types Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Dialog Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Destructive Actions
              </CardTitle>
              <CardDescription>
                For dangerous actions like delete, remove, or clear
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Critical confirmations that cannot be undone. Uses red styling to emphasize danger.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-500" />
                Confirmations
              </CardTitle>
              <CardDescription>
                Standard confirmations for important actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                General purpose confirmations for actions that need user approval.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Information
              </CardTitle>
              <CardDescription>
                Important information that requires acknowledgment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Critical updates, notices, or information that users must see.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Best Practices Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Best Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Do
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">• Use clear, descriptive titles</p>
              <p className="text-sm">• Explain consequences clearly</p>
              <p className="text-sm">• Use appropriate button variants</p>
              <p className="text-sm">• Keep content concise and focused</p>
              <p className="text-sm">• Use icons to reinforce message type</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Don't
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">• Overuse for non-critical actions</p>
              <p className="text-sm">• Use vague or confusing language</p>
              <p className="text-sm">• Make destructive actions too easy</p>
              <p className="text-sm">• Include too much content</p>
              <p className="text-sm">• Stack multiple alert dialogs</p>
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
              <CardTitle>Data Deletion</CardTitle>
              <CardDescription>
                Confirm permanent removal of user data or content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Critical for preventing accidental data loss. Always clearly explain what will be deleted 
                and that the action cannot be undone.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Sign out, deactivate, or delete account confirmations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Important user account changes that affect access or data. Provide clear information 
                about the consequences of each action.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form Submission</CardTitle>
              <CardDescription>
                Confirm submission of important forms or applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                For forms with significant consequences like job applications, payments, or legal documents. 
                Allow users to review before final submission.
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
                Proper focus management, ARIA attributes, and keyboard navigation. Traps focus within the dialog.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Modal Behavior</h4>
              <p className="text-sm text-muted-foreground">
                Blocks interaction with the underlying page. Cannot be dismissed by clicking outside.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Responsive Design</h4>
              <p className="text-sm text-muted-foreground">
                Automatically adapts to different screen sizes with appropriate spacing and layout adjustments.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 