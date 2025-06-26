'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Bell, Moon, Wifi, Volume2, Shield, Eye } from 'lucide-react';

// Live Switch Preview Component
function LiveSwitchPreview({ 
  size, 
  disabled, 
  label, 
  description, 
  defaultChecked 
}: {
  size: 'sm' | 'default' | 'lg';
  disabled: boolean;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  const sizeClasses = {
    sm: 'scale-75',
    default: '',
    lg: 'scale-125'
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Switch 
          id="preview-switch"
          checked={checked}
          onCheckedChange={setChecked}
          disabled={disabled}
          className={sizeClasses[size]}
        />
        <Label htmlFor="preview-switch" className="text-sm font-medium">
          {label}
        </Label>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground pl-6">
          {description}
        </p>
      )}
    </div>
  );
}

// Properties Panel Component
function SwitchPropertiesPanel({ 
  size, 
  setSize, 
  disabled, 
  setDisabled, 
  label, 
  setLabel, 
  description, 
  setDescription, 
  defaultChecked, 
  setDefaultChecked 
}: {
  size: 'sm' | 'default' | 'lg';
  setSize: (size: 'sm' | 'default' | 'lg') => void;
  disabled: boolean;
  setDisabled: (disabled: boolean) => void;
  label: string;
  setLabel: (label: string) => void;
  description: string;
  setDescription: (description: string) => void;
  defaultChecked: boolean;
  setDefaultChecked: (checked: boolean) => void;
}) {
  const resetToDefaults = () => {
    setSize('default');
    setDisabled(false);
    setLabel('Enable notifications');
    setDescription('Receive push notifications on your device');
    setDefaultChecked(false);
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
        {/* Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Size</Label>
          <Select value={size} onValueChange={(value: 'sm' | 'default' | 'lg') => setSize(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Label */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Label</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Switch label"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Switch description"
          />
        </div>

        <Separator />

        {/* Default Checked */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Default Checked</Label>
          <Switch checked={defaultChecked} onCheckedChange={setDefaultChecked} />
        </div>

        {/* Disabled */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Disabled</Label>
          <Switch checked={disabled} onCheckedChange={setDisabled} />
        </div>
      </div>

      {/* Code Preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
          <pre>{`<div className="flex items-center space-x-2">
  <Switch 
    id="switch"${defaultChecked ? '\n    defaultChecked' : ''}${disabled ? '\n    disabled' : ''}${size !== 'default' ? `\n    className="${size === 'sm' ? 'scale-75' : 'scale-125'}"` : ''}
  />
  <Label htmlFor="switch">
    ${label}
  </Label>
</div>`}</pre>
        </div>
      </div>
    </div>
  );
}

export default function SwitchComponentPage() {
  // Interactive example state
  const [size, setSize] = useState<'sm' | 'default' | 'lg'>('default');
  const [disabled, setDisabled] = useState(false);
  const [label, setLabel] = useState('Enable notifications');
  const [description, setDescription] = useState('Receive push notifications on your device');
  const [defaultChecked, setDefaultChecked] = useState(false);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Switch</h1>
          <Badge variant="outline">Form Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A control that allows the user to toggle between checked and not checked states.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Switch Preview</CardTitle>
            <CardDescription>
              Customize the switch properties and see changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2 flex items-center justify-center p-8 border rounded-lg bg-muted/30 h-full min-h-[500px]">
                <LiveSwitchPreview
                  size={size}
                  disabled={disabled}
                  label={label}
                  description={description}
                  defaultChecked={defaultChecked}
                />
              </div>

              {/* Properties Panel */}
              <div className="space-y-4 p-4 border rounded-lg bg-background h-full min-h-[500px]">
                <SwitchPropertiesPanel
                  size={size}
                  setSize={setSize}
                  disabled={disabled}
                  setDisabled={setDisabled}
                  label={label}
                  setLabel={setLabel}
                  description={description}
                  setDescription={setDescription}
                  defaultChecked={defaultChecked}
                  setDefaultChecked={setDefaultChecked}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Size Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Size Variants</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch className="scale-75" />
                <Label className="text-sm">Small switch</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch />
                <Label className="text-sm">Default switch</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch className="scale-125" />
                <Label className="text-sm">Large switch</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Common Patterns */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Common Patterns</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings Panel</CardTitle>
              <CardDescription>Common application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Push Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive notifications about important updates
                  </p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark Mode
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Switch to dark theme
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    Auto-sync
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync data when connected
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control your privacy preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Profile Visibility
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Make your profile visible to others
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Two-Factor Auth
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Add an extra layer of security
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    Sound Effects
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Play sounds for interactions
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* States */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Switch States</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-medium">Interactive States</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Switch />
                    <Label className="text-sm">Default (unchecked)</Label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Switch defaultChecked />
                    <Label className="text-sm">Checked</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Disabled States</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Switch disabled />
                    <Label className="text-sm text-muted-foreground">Disabled (unchecked)</Label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Switch disabled defaultChecked />
                    <Label className="text-sm text-muted-foreground">Disabled (checked)</Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Form Integration */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Form Integration</h2>
        <Card>
          <CardHeader>
            <CardTitle>Preferences Form</CardTitle>
            <CardDescription>Example of switches in a form context</CardDescription>
          </CardHeader>
          <CardContent>
            <PreferencesForm />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// Preferences Form Example
function PreferencesForm() {
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: false,
    securityAlerts: true,
    autoSave: true,
    darkMode: false
  });

  const updatePreference = (key: keyof typeof preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-medium">Notification Preferences</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch 
              checked={preferences.emailNotifications}
              onCheckedChange={() => updatePreference('emailNotifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">SMS Notifications</Label>
              <p className="text-xs text-muted-foreground">Receive urgent updates via SMS</p>
            </div>
            <Switch 
              checked={preferences.smsNotifications}
              onCheckedChange={() => updatePreference('smsNotifications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Marketing Emails</Label>
              <p className="text-xs text-muted-foreground">Receive promotional content</p>
            </div>
            <Switch 
              checked={preferences.marketingEmails}
              onCheckedChange={() => updatePreference('marketingEmails')}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium">Application Settings</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Security Alerts</Label>
              <p className="text-xs text-muted-foreground">Important security notifications</p>
            </div>
            <Switch 
              checked={preferences.securityAlerts}
              onCheckedChange={() => updatePreference('securityAlerts')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-save</Label>
              <p className="text-xs text-muted-foreground">Automatically save changes</p>
            </div>
            <Switch 
              checked={preferences.autoSave}
              onCheckedChange={() => updatePreference('autoSave')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Use dark theme</p>
            </div>
            <Switch 
              checked={preferences.darkMode}
              onCheckedChange={() => updatePreference('darkMode')}
            />
          </div>
        </div>
      </div>

      <div className="pt-4">
        <Button>Save Preferences</Button>
      </div>
    </div>
  );
} 