'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Info, AlertTriangle, Terminal, XCircle, Zap, Heart, Star } from 'lucide-react';

// Live Alert Preview Component
function LiveAlertPreview({ 
  variant, 
  icon, 
  title, 
  description, 
  showIcon 
}: {
  variant: 'default' | 'destructive';
  icon: string;
  title: string;
  description: string;
  showIcon: boolean;
}) {
  const iconMap = {
    'info': Info,
    'check': CheckCircle,
    'alert-circle': AlertCircle,
    'alert-triangle': AlertTriangle,
    'terminal': Terminal,
    'x-circle': XCircle,
    'zap': Zap,
    'heart': Heart,
    'star': Star,
  };

  const IconComponent = iconMap[icon as keyof typeof iconMap] || Info;

  return (
    <div className="w-full max-w-md">
      <Alert variant={variant}>
        {showIcon && <IconComponent className="h-4 w-4" />}
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </div>
  );
}

// Properties Panel Component
function AlertPropertiesPanel({ 
  variant, 
  setVariant, 
  icon, 
  setIcon, 
  title, 
  setTitle, 
  description, 
  setDescription, 
  showIcon, 
  setShowIcon 
}: {
  variant: 'default' | 'destructive';
  setVariant: (variant: 'default' | 'destructive') => void;
  icon: string;
  setIcon: (icon: string) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  showIcon: boolean;
  setShowIcon: (showIcon: boolean) => void;
}) {
  const iconOptions = [
    { value: 'info', label: 'Info', icon: Info },
    { value: 'check', label: 'Check Circle', icon: CheckCircle },
    { value: 'alert-circle', label: 'Alert Circle', icon: AlertCircle },
    { value: 'alert-triangle', label: 'Alert Triangle', icon: AlertTriangle },
    { value: 'terminal', label: 'Terminal', icon: Terminal },
    { value: 'x-circle', label: 'X Circle', icon: XCircle },
    { value: 'zap', label: 'Zap', icon: Zap },
    { value: 'heart', label: 'Heart', icon: Heart },
    { value: 'star', label: 'Star', icon: Star },
  ];

  const resetToDefaults = () => {
    setVariant('default');
    setIcon('info');
    setTitle('Alert Title');
    setDescription('This is an alert description that provides additional context.');
    setShowIcon(true);
  };

  return (
    <div className="space-y-6 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Properties</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetToDefaults}
          className="text-xs"
        >
          Reset
        </Button>
      </div>

      <div className="space-y-4">
        {/* Variant */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Variant</Label>
          <Select value={variant} onValueChange={(value: 'default' | 'destructive') => setVariant(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="destructive">Destructive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show Icon */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Show Icon</Label>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showIcon"
              checked={showIcon}
              onChange={(e) => setShowIcon(e.target.checked)}
              className="rounded border border-input"
            />
            <Label htmlFor="showIcon" className="text-sm">Display icon</Label>
          </div>
        </div>

        {/* Icon Selection */}
        {showIcon && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Alert title"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Alert description"
            rows={3}
          />
        </div>
      </div>

      {/* Code Preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
          <pre>{`<Alert${variant !== 'default' ? ` variant="${variant}"` : ''}>
  ${showIcon ? `<${iconOptions.find(opt => opt.value === icon)?.label.replace(' ', '')} className="h-4 w-4" />` : ''}
  <AlertTitle>${title}</AlertTitle>
  <AlertDescription>
    ${description}
  </AlertDescription>
</Alert>`}</pre>
        </div>
      </div>
    </div>
  );
}

export default function AlertComponentPage() {
  // Interactive example state
  const [variant, setVariant] = useState<'default' | 'destructive'>('default');
  const [icon, setIcon] = useState('info');
  const [title, setTitle] = useState('Alert Title');
  const [description, setDescription] = useState('This is an alert description that provides additional context.');
  const [showIcon, setShowIcon] = useState(true);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Alert</h1>
          <Badge variant="outline">Feedback Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Displays a callout for user attention. Used to communicate important information, warnings, or confirmations.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Alert Preview</CardTitle>
            <CardDescription>
              Customize the alert properties and see changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2 flex items-center justify-center p-8 border rounded-lg bg-muted/30 h-full min-h-[500px]">
                <LiveAlertPreview
                  variant={variant}
                  icon={icon}
                  title={title}
                  description={description}
                  showIcon={showIcon}
                />
              </div>

              {/* Properties Panel */}
              <div className="space-y-4 p-4 border rounded-lg bg-background h-full min-h-[500px]">
                <AlertPropertiesPanel
                  variant={variant}
                  setVariant={setVariant}
                  icon={icon}
                  setIcon={setIcon}
                  title={title}
                  setTitle={setTitle}
                  description={description}
                  setDescription={setDescription}
                  showIcon={showIcon}
                  setShowIcon={setShowIcon}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Default</CardTitle>
              <CardDescription>Standard informational alert</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  This is a default alert for general information and updates.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Destructive</CardTitle>
              <CardDescription>For errors and critical warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  This is a destructive alert for errors and critical issues.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Common Icons */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Common Icon Usage</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Success States</CardTitle>
              <CardDescription>Positive feedback and confirmations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Your changes have been saved successfully.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <Star className="h-4 w-4" />
                <AlertTitle>Achievement</AlertTitle>
                <AlertDescription>
                  Congratulations! You've completed the setup.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Warning States</CardTitle>
              <CardDescription>Cautions and important notices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This action cannot be undone. Please proceed with caution.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Critical Error</AlertTitle>
                <AlertDescription>
                  Unable to connect to the server. Please try again later.
                </AlertDescription>
              </Alert>
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
              <CardTitle>Form Validation</CardTitle>
              <CardDescription>Error handling in forms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Error</AlertTitle>
                <AlertDescription>
                  Please fix the following errors:
                  <ul className="list-disc list-inside mt-2 text-sm">
                    <li>Email is required</li>
                    <li>Password must be at least 8 characters</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Service announcements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Scheduled Maintenance</AlertTitle>
                <AlertDescription>
                  Our system will be under maintenance from 2:00 AM to 4:00 AM UTC. 
                  Some features may be temporarily unavailable.
                </AlertDescription>
              </Alert>
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
              <CardTitle>Rich Content</CardTitle>
              <CardDescription>Alerts with additional elements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertTitle>New Feature Available</AlertTitle>
                <AlertDescription>
                  We've added dark mode support! 
                  <Button variant="link" className="p-0 h-auto ml-1 text-sm">
                    Learn more
                  </Button>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Styling</CardTitle>
              <CardDescription>Themed alert variations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Custom green-themed success alert.
                </AlertDescription>
              </Alert>

              <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Custom yellow-themed warning alert.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
} 