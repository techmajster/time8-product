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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard,
  Building,
  Globe,
  Lock,
  Save,
  AlertCircle,
  CheckCircle,
  Settings
} from 'lucide-react';

// Properties interface
interface FormProperties {
  formType: 'profile' | 'contact' | 'settings' | 'registration';
  showLabels: boolean;
  showDescriptions: boolean;
  showValidation: boolean;
  layout: 'vertical' | 'horizontal';
  fieldSpacing: 'compact' | 'normal' | 'relaxed';
  submitText: string;
  showRequired: boolean;
}

// Form schemas for different types
const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  urgent: z.boolean().default(false),
});

const settingsSchema = z.object({
  notifications: z.boolean().default(true),
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string(),
  autoSave: z.boolean().default(true),
});

const registrationSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, 'You must accept the terms'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Properties Panel Component
function FormPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: FormProperties;
  onChange: (key: keyof FormProperties, value: any) => void;
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
        {/* Form Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Form Type</Label>
          <Select value={properties.formType} onValueChange={(value) => onChange('formType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profile">Profile Form</SelectItem>
              <SelectItem value="contact">Contact Form</SelectItem>
              <SelectItem value="settings">Settings Form</SelectItem>
              <SelectItem value="registration">Registration Form</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Layout */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Layout</Label>
          <Select value={properties.layout} onValueChange={(value) => onChange('layout', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vertical">Vertical</SelectItem>
              <SelectItem value="horizontal">Horizontal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Field Spacing */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Field Spacing</Label>
          <Select value={properties.fieldSpacing} onValueChange={(value) => onChange('fieldSpacing', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="relaxed">Relaxed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Submit Text */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Submit Button Text</Label>
          <Input
            value={properties.submitText}
            onChange={(e) => onChange('submitText', e.target.value)}
            placeholder="Submit"
          />
        </div>

        {/* Show Labels */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Labels</Label>
          <Switch 
            checked={properties.showLabels} 
            onCheckedChange={(checked) => onChange('showLabels', checked)}
          />
        </div>

        {/* Show Descriptions */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Descriptions</Label>
          <Switch 
            checked={properties.showDescriptions} 
            onCheckedChange={(checked) => onChange('showDescriptions', checked)}
          />
        </div>

        {/* Show Validation */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Validation</Label>
          <Switch 
            checked={properties.showValidation} 
            onCheckedChange={(checked) => onChange('showValidation', checked)}
          />
        </div>

        {/* Show Required */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Required Indicators</Label>
          <Switch 
            checked={properties.showRequired} 
            onCheckedChange={(checked) => onChange('showRequired', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateFormCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveFormPreview({ properties }: { properties: FormProperties }) {
  const getSchema = () => {
    switch (properties.formType) {
      case 'profile': return profileSchema;
      case 'contact': return contactSchema;
      case 'settings': return settingsSchema;
      case 'registration': return registrationSchema;
      default: return profileSchema;
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      bio: '',
      name: '',
      subject: '',
      message: '',
      urgent: false,
      notifications: true,
      theme: 'system',
      language: 'en',
      autoSave: true,
      username: '',
      password: '',
      confirmPassword: '',
      terms: false,
    }
  });

  const onSubmit = (data: any) => {
    console.log('Form submitted:', data);
  };

  const getSpacingClass = () => {
    switch (properties.fieldSpacing) {
      case 'compact': return 'space-y-3';
      case 'normal': return 'space-y-4';
      case 'relaxed': return 'space-y-6';
      default: return 'space-y-4';
    }
  };

  const renderProfileForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={getSpacingClass()}>
        <div className={properties.layout === 'horizontal' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                {properties.showLabels && (
                  <FormLabel>
                    First Name {properties.showRequired && <span className="text-red-500">*</span>}
                  </FormLabel>
                )}
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                {properties.showDescriptions && (
                  <FormDescription>Enter your first name</FormDescription>
                )}
                {properties.showValidation && <FormMessage />}
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                {properties.showLabels && (
                  <FormLabel>
                    Last Name {properties.showRequired && <span className="text-red-500">*</span>}
                  </FormLabel>
                )}
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                {properties.showDescriptions && (
                  <FormDescription>Enter your last name</FormDescription>
                )}
                {properties.showValidation && <FormMessage />}
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && (
                <FormLabel>
                  Email {properties.showRequired && <span className="text-red-500">*</span>}
                </FormLabel>
              )}
              <FormControl>
                <Input placeholder="john@example.com" type="email" {...field} />
              </FormControl>
              {properties.showDescriptions && (
                <FormDescription>We'll never share your email</FormDescription>
              )}
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && <FormLabel>Phone</FormLabel>}
              <FormControl>
                <Input placeholder="+1 (555) 123-4567" {...field} />
              </FormControl>
              {properties.showDescriptions && (
                <FormDescription>Optional phone number</FormDescription>
              )}
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && <FormLabel>Bio</FormLabel>}
              <FormControl>
                <Textarea placeholder="Tell us about yourself..." {...field} />
              </FormControl>
              {properties.showDescriptions && (
                <FormDescription>Brief description about yourself</FormDescription>
              )}
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {properties.submitText}
        </Button>
      </form>
    </Form>
  );

  const renderContactForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={getSpacingClass()}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && (
                <FormLabel>
                  Name {properties.showRequired && <span className="text-red-500">*</span>}
                </FormLabel>
              )}
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && (
                <FormLabel>
                  Email {properties.showRequired && <span className="text-red-500">*</span>}
                </FormLabel>
              )}
              <FormControl>
                <Input placeholder="your@email.com" type="email" {...field} />
              </FormControl>
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && (
                <FormLabel>
                  Subject {properties.showRequired && <span className="text-red-500">*</span>}
                </FormLabel>
              )}
              <FormControl>
                <Input placeholder="What's this about?" {...field} />
              </FormControl>
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && (
                <FormLabel>
                  Message {properties.showRequired && <span className="text-red-500">*</span>}
                </FormLabel>
              )}
              <FormControl>
                <Textarea placeholder="Your message..." rows={4} {...field} />
              </FormControl>
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="urgent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                {properties.showLabels && <FormLabel>Urgent</FormLabel>}
                {properties.showDescriptions && (
                  <FormDescription>Mark this message as urgent</FormDescription>
                )}
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          <Mail className="mr-2 h-4 w-4" />
          {properties.submitText}
        </Button>
      </form>
    </Form>
  );

  const renderSettingsForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={getSpacingClass()}>
        <FormField
          control={form.control}
          name="notifications"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                {properties.showLabels && <FormLabel className="text-base">Email Notifications</FormLabel>}
                {properties.showDescriptions && (
                  <FormDescription>Receive emails about your account activity</FormDescription>
                )}
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && <FormLabel>Theme</FormLabel>}
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              {properties.showDescriptions && (
                <FormDescription>Choose your preferred theme</FormDescription>
              )}
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && <FormLabel>Language</FormLabel>}
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          <Settings className="mr-2 h-4 w-4" />
          {properties.submitText}
        </Button>
      </form>
    </Form>
  );

  const renderRegistrationForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={getSpacingClass()}>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && (
                <FormLabel>
                  Username {properties.showRequired && <span className="text-red-500">*</span>}
                </FormLabel>
              )}
              <FormControl>
                <Input placeholder="username" {...field} />
              </FormControl>
              {properties.showDescriptions && (
                <FormDescription>This will be your unique identifier</FormDescription>
              )}
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && (
                <FormLabel>
                  Email {properties.showRequired && <span className="text-red-500">*</span>}
                </FormLabel>
              )}
              <FormControl>
                <Input placeholder="email@example.com" type="email" {...field} />
              </FormControl>
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && (
                <FormLabel>
                  Password {properties.showRequired && <span className="text-red-500">*</span>}
                </FormLabel>
              )}
              <FormControl>
                <Input placeholder="••••••••" type="password" {...field} />
              </FormControl>
              {properties.showDescriptions && (
                <FormDescription>Must be at least 8 characters</FormDescription>
              )}
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              {properties.showLabels && (
                <FormLabel>
                  Confirm Password {properties.showRequired && <span className="text-red-500">*</span>}
                </FormLabel>
              )}
              <FormControl>
                <Input placeholder="••••••••" type="password" {...field} />
              </FormControl>
              {properties.showValidation && <FormMessage />}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                {properties.showLabels && (
                  <FormLabel>
                    Accept terms and conditions {properties.showRequired && <span className="text-red-500">*</span>}
                  </FormLabel>
                )}
                {properties.showDescriptions && (
                  <FormDescription>
                    You agree to our Terms of Service and Privacy Policy
                  </FormDescription>
                )}
                {properties.showValidation && <FormMessage />}
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          <User className="mr-2 h-4 w-4" />
          {properties.submitText}
        </Button>
      </form>
    </Form>
  );

  const renderForm = () => {
    switch (properties.formType) {
      case 'profile': return renderProfileForm();
      case 'contact': return renderContactForm();
      case 'settings': return renderSettingsForm();
      case 'registration': return renderRegistrationForm();
      default: return renderProfileForm();
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {renderForm()}
      </div>
    </div>
  );
}

// Generate code function
function generateFormCode(props: FormProperties): string {
  return `<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="${props.fieldSpacing === 'compact' ? 'space-y-3' : props.fieldSpacing === 'relaxed' ? 'space-y-6' : 'space-y-4'}">
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          ${props.showLabels ? `<FormLabel>Email ${props.showRequired ? '<span className="text-red-500">*</span>' : ''}</FormLabel>` : ''}
          <FormControl>
            <Input placeholder="email@example.com" {...field} />
          </FormControl>
          ${props.showDescriptions ? '<FormDescription>Enter your email address</FormDescription>' : ''}
          ${props.showValidation ? '<FormMessage />' : ''}
        </FormItem>
      )}
    />
    <Button type="submit">${props.submitText}</Button>
  </form>
</Form>`;
}

export default function FormComponentPage() {
  const [formProperties, setFormProperties] = useState<FormProperties>({
    formType: 'profile',
    showLabels: true,
    showDescriptions: true,
    showValidation: true,
    layout: 'vertical',
    fieldSpacing: 'normal',
    submitText: 'Save Changes',
    showRequired: true,
  });

  const handlePropertyChange = (key: keyof FormProperties, value: any) => {
    setFormProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFormProperties({
      formType: 'profile',
      showLabels: true,
      showDescriptions: true,
      showValidation: true,
      layout: 'vertical',
      fieldSpacing: 'normal',
      submitText: 'Save Changes',
      showRequired: true,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Form</h1>
          <Badge variant="outline">Form Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Building forms with React Hook Form and Zod validation. Provides a complete solution for form handling 
          with built-in validation, error messages, and accessibility features.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Customize the form properties below and see changes in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveFormPreview properties={formProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <FormPropertiesPanel 
                    properties={formProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Form Types Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Form Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Form
              </CardTitle>
              <CardDescription>
                User profile information with validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Collects personal information like name, email, phone, and bio with comprehensive validation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Form
              </CardTitle>
              <CardDescription>
                Contact form with message and urgency flag
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Standard contact form with name, email, subject, message, and urgency checkbox.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings Form
              </CardTitle>
              <CardDescription>
                Application settings with switches and selects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                User preferences including notifications, theme, language, and auto-save options.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Registration Form
              </CardTitle>
              <CardDescription>
                User registration with password confirmation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Complete registration flow with username, email, password confirmation, and terms acceptance.
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
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Built-in validation with Zod schema, real-time error messages, and form state management.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Accessibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Full accessibility support with ARIA labels, keyboard navigation, and screen reader compatibility.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5 text-purple-600" />
                Flexible Layout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Supports vertical and horizontal layouts with customizable spacing and field arrangements.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Examples</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-step Form</CardTitle>
              <CardDescription>
                Complex form broken into multiple steps with progress indication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div className="h-px bg-muted flex-1" />
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div className="h-px bg-muted flex-1" />
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use form context to manage state across multiple steps while maintaining validation.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dynamic Field Array</CardTitle>
              <CardDescription>
                Forms with dynamically added/removed fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use React Hook Form's useFieldArray for managing dynamic lists of fields like skills, 
                education history, or multiple addresses.
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
              <h4 className="font-medium mb-2">Dependencies</h4>
              <p className="text-sm text-muted-foreground">
                Requires React Hook Form and Zod for form handling and validation.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Performance</h4>
              <p className="text-sm text-muted-foreground">
                Optimized re-rendering with form state isolation and minimal updates.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Customization</h4>
              <p className="text-sm text-muted-foreground">
                Fully customizable styling with CSS variables and theme support.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 