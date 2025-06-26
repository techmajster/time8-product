'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { 
  Shield, 
  Lock, 
  Phone, 
  Mail, 
  Key,
  CheckCircle,
  AlertCircle,
  Clock,
  Smartphone,
  Eye,
  EyeOff
} from 'lucide-react';

// Properties interface
interface InputOTPProperties {
  maxLength: number;
  groupSize: number;
  showSeparator: boolean;
  variant: 'default' | 'outline' | 'ghost';
  disabled: boolean;
  autoFocus: boolean;
  pattern: 'numeric' | 'alphanumeric' | 'alpha';
  placeholder: string;
  showValue: boolean;
  containerWidth: 'auto' | 'full';
}

// Properties Panel Component
function InputOTPPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: InputOTPProperties;
  onChange: (key: keyof InputOTPProperties, value: any) => void;
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
        {/* Max Length */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Length: {properties.maxLength}</Label>
          <Slider
            value={[properties.maxLength]}
            onValueChange={(value) => onChange('maxLength', value[0])}
            max={8}
            min={4}
            step={1}
            className="w-full"
          />
        </div>

        {/* Group Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Group Size: {properties.groupSize}</Label>
          <Slider
            value={[properties.groupSize]}
            onValueChange={(value) => onChange('groupSize', value[0])}
            max={4}
            min={1}
            step={1}
            className="w-full"
          />
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

        {/* Pattern */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Pattern</Label>
          <Select value={properties.pattern} onValueChange={(value) => onChange('pattern', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="numeric">Numeric (0-9)</SelectItem>
              <SelectItem value="alphanumeric">Alphanumeric (A-Z, 0-9)</SelectItem>
              <SelectItem value="alpha">Alpha (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Container Width */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Container Width</Label>
          <Select value={properties.containerWidth} onValueChange={(value) => onChange('containerWidth', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="full">Full Width</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Placeholder */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Placeholder Character</Label>
          <Input
            value={properties.placeholder}
            onChange={(e) => onChange('placeholder', e.target.value.slice(0, 1))}
            placeholder="·"
            maxLength={1}
          />
        </div>

        {/* Show Separator */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Separator</Label>
          <Switch 
            checked={properties.showSeparator} 
            onCheckedChange={(checked) => onChange('showSeparator', checked)}
          />
        </div>

        {/* Auto Focus */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Auto Focus</Label>
          <Switch 
            checked={properties.autoFocus} 
            onCheckedChange={(checked) => onChange('autoFocus', checked)}
          />
        </div>

        {/* Disabled */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Disabled</Label>
          <Switch 
            checked={properties.disabled} 
            onCheckedChange={(checked) => onChange('disabled', checked)}
          />
        </div>

        {/* Show Value */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Current Value</Label>
          <Switch 
            checked={properties.showValue} 
            onCheckedChange={(checked) => onChange('showValue', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateInputOTPCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveInputOTPPreview({ properties }: { properties: InputOTPProperties }) {
  const [value, setValue] = useState('');

  const renderSlots = () => {
    const slots = [];
    const totalSlots = properties.maxLength;
    const groupSize = properties.groupSize;
    const numGroups = Math.ceil(totalSlots / groupSize);

    for (let group = 0; group < numGroups; group++) {
      const groupSlots = [];
      const startIndex = group * groupSize;
      const endIndex = Math.min(startIndex + groupSize, totalSlots);

      for (let i = startIndex; i < endIndex; i++) {
        groupSlots.push(
          <InputOTPSlot 
            key={i} 
            index={i}
            className={`
              ${properties.variant === 'outline' ? 'border-2' : ''}
              ${properties.variant === 'ghost' ? 'border-0 bg-muted/50' : ''}
            `}
          />
        );
      }

      slots.push(
        <InputOTPGroup key={group}>
          {groupSlots}
        </InputOTPGroup>
      );

      // Add separator between groups (except for last group)
      if (properties.showSeparator && group < numGroups - 1) {
        slots.push(<InputOTPSeparator key={`separator-${group}`} />);
      }
    }

    return slots;
  };

  const getPatternRegex = () => {
    switch (properties.pattern) {
      case 'numeric': return /^[0-9]+$/;
      case 'alphanumeric': return /^[A-Z0-9]+$/i;
      case 'alpha': return /^[A-Z]+$/i;
      default: return /^[0-9]+$/;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className={properties.containerWidth === 'full' ? 'w-full' : 'w-auto'}>
        <InputOTP
          maxLength={properties.maxLength}
          value={value}
          onChange={setValue}
          disabled={properties.disabled}
          autoFocus={properties.autoFocus}
          pattern={getPatternRegex().source}
        >
          {renderSlots()}
        </InputOTP>
      </div>

      {properties.showValue && (
        <div className="text-center space-y-2">
          <div className="text-sm font-medium">Current Value:</div>
          <div className="text-lg font-mono bg-muted px-3 py-1 rounded">
            {value || '(empty)'}
          </div>
          <div className="text-xs text-muted-foreground">
            Length: {value.length}/{properties.maxLength}
          </div>
        </div>
      )}
    </div>
  );
}

// Generate code function
function generateInputOTPCode(props: InputOTPProperties): string {
  const groupSize = props.groupSize;
  const totalSlots = props.maxLength;
  const numGroups = Math.ceil(totalSlots / groupSize);
  
  let slotsCode = '';
  
  for (let group = 0; group < numGroups; group++) {
    slotsCode += '  <InputOTPGroup>\n';
    
    const startIndex = group * groupSize;
    const endIndex = Math.min(startIndex + groupSize, totalSlots);
    
    for (let i = startIndex; i < endIndex; i++) {
      slotsCode += `    <InputOTPSlot index={${i}} />\n`;
    }
    
    slotsCode += '  </InputOTPGroup>\n';
    
    if (props.showSeparator && group < numGroups - 1) {
      slotsCode += '  <InputOTPSeparator />\n';
    }
  }

  return `<InputOTP 
  maxLength={${props.maxLength}}
  value={value}
  onChange={setValue}${props.disabled ? '\n  disabled' : ''}${props.autoFocus ? '\n  autoFocus' : ''}
  pattern="${props.pattern === 'numeric' ? '^[0-9]+$' : props.pattern === 'alphanumeric' ? '^[A-Z0-9]+$' : '^[A-Z]+$'}"
>
${slotsCode}</InputOTP>`;
}

export default function InputOTPComponentPage() {
  const [otpProperties, setOtpProperties] = useState<InputOTPProperties>({
    maxLength: 6,
    groupSize: 3,
    showSeparator: true,
    variant: 'default',
    disabled: false,
    autoFocus: true,
    pattern: 'numeric',
    placeholder: '·',
    showValue: true,
    containerWidth: 'auto',
  });

  const handlePropertyChange = (key: keyof InputOTPProperties, value: any) => {
    setOtpProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setOtpProperties({
      maxLength: 6,
      groupSize: 3,
      showSeparator: true,
      variant: 'default',
      disabled: false,
      autoFocus: true,
      pattern: 'numeric',
      placeholder: '·',
      showValue: true,
      containerWidth: 'auto',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Input OTP</h1>
          <Badge variant="outline">Form Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A specialized input component for One-Time Passwords (OTP) and verification codes. 
          Provides an accessible, user-friendly interface for entering multi-digit codes.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Customize the OTP input properties below and see changes in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveInputOTPPreview properties={otpProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <InputOTPPropertiesPanel 
                    properties={otpProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Patterns Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Input Patterns</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Numeric
              </CardTitle>
              <CardDescription>Numbers only (0-9)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <InputOTP maxLength={6} pattern="^[0-9]+$">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground">
                  Perfect for SMS codes and PIN verification
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Alphanumeric
              </CardTitle>
              <CardDescription>Letters and numbers (A-Z, 0-9)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <InputOTP maxLength={4} pattern="^[A-Z0-9]+$">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground">
                  Ideal for security tokens and activation codes
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Alpha
              </CardTitle>
              <CardDescription>Letters only (A-Z)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <InputOTP maxLength={4} pattern="^[A-Z]+$">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-xs text-muted-foreground">
                  Useful for alphabetic confirmation codes
                </p>
              </div>
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
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                SMS Verification
              </CardTitle>
              <CardDescription>
                Phone number verification with 6-digit SMS code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm mb-3">Enter the 6-digit code sent to +1 (555) 123-4567</p>
                  <InputOTP maxLength={6}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-muted-foreground">
                      Didn't receive the code?
                    </p>
                    <Button variant="link" size="sm">Resend</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Verification
              </CardTitle>
              <CardDescription>
                Email confirmation with 8-character alphanumeric code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm mb-3">Enter the verification code from your email</p>
                  <InputOTP maxLength={8} pattern="^[A-Z0-9]+$">
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                      <InputOTPSlot index={6} />
                      <InputOTPSlot index={7} />
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-xs text-muted-foreground mt-3">
                    Check your spam folder if you don't see the email
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Authenticator App
              </CardTitle>
              <CardDescription>
                Two-factor authentication with 6-digit TOTP code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm mb-3">Enter the code from your authenticator app</p>
                  <InputOTP maxLength={6}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <div className="flex items-center gap-2 mt-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Code expires in 30 seconds
                    </p>
                  </div>
                </div>
              </div>
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
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Auto Navigation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatically moves to the next input field as you type, with backspace support.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                Pattern Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Built-in validation for numeric, alphanumeric, and alphabetic patterns.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                Accessibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Full keyboard navigation, screen reader support, and ARIA labels.
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
              <h4 className="font-medium mb-2">Keyboard Support</h4>
              <p className="text-sm text-muted-foreground">
                Arrow keys for navigation, backspace for deletion, and automatic focus management.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Paste Support</h4>
              <p className="text-sm text-muted-foreground">
                Smart paste handling that distributes characters across input slots automatically.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Security</h4>
              <p className="text-sm text-muted-foreground">
                Input masking options and secure value handling for sensitive verification codes.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 