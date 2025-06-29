'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Search, Mail, Lock, User, Calendar, Phone, CreditCard, MapPin, Building } from 'lucide-react';
import { InputPropertiesPanel, type InputProperties } from '../input-properties-panel';

// Live Input Preview Component
function LiveInputPreview({ properties }: { properties: InputProperties }) {
  const [showPassword, setShowPassword] = useState(false);
  
  const iconMap: Record<string, any> = {
    none: null,
    search: Search,
    mail: Mail,
    lock: Lock,
    user: User,
    calendar: Calendar,
    phone: Phone,
    credit_card: CreditCard,
    map_pin: MapPin,
    building: Building,
    eye: Eye,
  };

  const IconComponent = iconMap[properties.icon];
  const isPassword = properties.type === 'password';
  const displayType = isPassword && showPassword ? 'text' : properties.type;

  const sizeClasses = {
    sm: 'h-8 px-2 text-xs',
    default: 'h-9 px-3 text-sm',
    lg: 'h-11 px-4 text-base'
  };

  const variantClasses = {
    default: 'border-input bg-background',
    ghost: 'border-transparent bg-transparent hover:bg-accent',
    filled: 'border-transparent bg-muted'
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Left Icon */}
      {IconComponent && properties.iconPosition === 'left' && (
        <div className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <IconComponent className="h-4 w-4" />
        </div>
      )}
      
      <Input
        type={displayType}
        placeholder={properties.placeholder}
        disabled={properties.disabled}
        required={properties.required}
        value={properties.value}
        readOnly
        className={`
          ${sizeClasses[properties.size]}
          ${variantClasses[properties.variant]}
          ${IconComponent && properties.iconPosition === 'left' ? 'pl-9' : ''}
          ${(IconComponent && properties.iconPosition === 'right') || isPassword ? 'pr-9' : ''}
          min-w-[200px] max-w-[300px]
        `}
      />
      
      {/* Right Icon or Password Toggle */}
      {isPassword ? (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      ) : IconComponent && properties.iconPosition === 'right' ? (
        <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <IconComponent className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );
}

export default function InputComponentPage() {
  const [inputProperties, setInputProperties] = useState<InputProperties>({
    type: 'text',
    placeholder: 'Enter text...',
    disabled: false,
    required: false,
    size: 'default',
    variant: 'default',
    icon: 'none',
    iconPosition: 'left',
    value: '',
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Input</h1>
          <Badge variant="outline">Form Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A form input component for collecting user text input. Supports various types, icons, and validation states.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Customize the input properties below and see changes in real-time. This demonstrates how your theme settings affect the component.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed border-border h-full min-h-[500px]">
                  <LiveInputPreview properties={inputProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-muted/50">
                  <InputPropertiesPanel 
                    properties={inputProperties}
                    onPropertiesChange={setInputProperties}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Types Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Input Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { type: 'text', label: 'Text', placeholder: 'Enter text...', icon: User },
            { type: 'email', label: 'Email', placeholder: 'Enter email...', icon: Mail },
            { type: 'password', label: 'Password', placeholder: 'Enter password...', icon: Lock },
            { type: 'search', label: 'Search', placeholder: 'Search...', icon: Search },
            { type: 'tel', label: 'Phone', placeholder: 'Enter phone...', icon: Phone },
            { type: 'url', label: 'URL', placeholder: 'https://...', icon: Building },
          ].map((item) => (
            <Card key={item.type}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type={item.type}
                  placeholder={item.placeholder}
                  className="w-full"
                />
                <div className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded">
                  type="{item.type}"
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Sizes Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Sizes</h2>
        <Card>
          <CardHeader>
            <CardTitle>Size Variants</CardTitle>
            <CardDescription>
              Available size options for different use cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { size: 'sm', label: 'Small', class: 'h-8 px-2 text-xs' },
                { size: 'default', label: 'Default', class: 'h-9 px-3 text-sm' },
                { size: 'lg', label: 'Large', class: 'h-11 px-4 text-base' },
              ].map((item) => (
                <div key={item.size} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium">{item.label}</div>
                  <Input
                    placeholder={`${item.label} input...`}
                    className={item.class + ' max-w-xs'}
                  />
                  <Badge variant="outline" className="font-mono text-xs">
                    {item.class}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* States Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">States</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Normal</Label>
                <Input placeholder="Normal state" />
              </div>
              <div className="space-y-2">
                <Label>Focused</Label>
                <Input placeholder="Click to focus" autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Disabled</Label>
                <Input placeholder="Disabled state" disabled />
              </div>
              <div className="space-y-2">
                <Label>Required</Label>
                <Input placeholder="Required field" required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>With Icons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search with left icon</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search..." className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email with right icon</Label>
                <div className="relative">
                  <Input placeholder="Enter email" className="pr-9" />
                  <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password with toggle</Label>
                <div className="relative">
                  <Input type="password" placeholder="Enter password" className="pr-9" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
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
              <CardTitle>Login Form</CardTitle>
              <CardDescription>Real-world form example</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    className="pl-9 pr-9"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button className="w-full">Sign In</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
              <CardDescription>Search functionality examples</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Global Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search anything..."
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quick Filter</Label>
                <Input
                  placeholder="Filter results..."
                  className="h-8 px-2 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label>Location Search</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Enter location..."
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
} 