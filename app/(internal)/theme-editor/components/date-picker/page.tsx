'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatePicker, DatePickerWithDropdown } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Calendar, CalendarDays, Clock, User, FileText, Settings, ChevronRight } from 'lucide-react';

// Properties Panel Component
function DatePickerPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: DatePickerProperties;
  onChange: (key: keyof DatePickerProperties, value: any) => void;
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
        {/* Variant */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Variant</Label>
          <Select value={properties.variant} onValueChange={(value: DatePickerProperties['variant']) => onChange('variant', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="dropdown">With Dropdown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Placeholder */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Placeholder</Label>
          <Input
            value={properties.placeholder}
            onChange={(e) => onChange('placeholder', e.target.value)}
            placeholder="Enter placeholder text"
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

        {/* Show Clear Button */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Clear Button</Label>
          <Switch 
            checked={properties.showClear} 
            onCheckedChange={(checked) => onChange('showClear', checked)}
          />
        </div>

        {/* Date Format */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Date Format</Label>
          <Select value={properties.dateFormat} onValueChange={(value) => onChange('dateFormat', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PPP">Full (January 1, 2024)</SelectItem>
              <SelectItem value="PP">Medium (Jan 1, 2024)</SelectItem>
              <SelectItem value="P">Short (01/01/2024)</SelectItem>
              <SelectItem value="dd.MM.yyyy">European (01.01.2024)</SelectItem>
              <SelectItem value="yyyy-MM-dd">ISO (2024-01-01)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Width */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Width</Label>
          <Select value={properties.width} onValueChange={(value) => onChange('width', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="sm">Small (200px)</SelectItem>
              <SelectItem value="md">Medium (280px)</SelectItem>
              <SelectItem value="lg">Large (350px)</SelectItem>
              <SelectItem value="full">Full Width</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateDatePickerCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveDatePickerPreview({ properties }: { properties: DatePickerProperties }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const getWidthClass = () => {
    switch (properties.width) {
      case 'sm': return 'w-[200px]';
      case 'md': return 'w-[280px]';
      case 'lg': return 'w-[350px]';
      case 'full': return 'w-full';
      default: return 'w-auto';
    }
  };

  const DatePickerComponent = properties.variant === 'dropdown' ? DatePickerWithDropdown : DatePicker;

  return (
    <div className="h-full min-h-[500px] flex items-center justify-center p-8">
      <div className={`${getWidthClass()}`}>
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Date Picker Preview</h3>
            <p className="text-sm text-muted-foreground">
              {properties.variant === 'dropdown' ? 'Date picker with dropdown navigation' : 'Standard date picker with calendar popup'}
            </p>
          </div>
          
          <DatePickerComponent
            date={selectedDate}
            onDateChange={setSelectedDate}
            placeholder={properties.placeholder}
            disabled={properties.disabled}
            className={getWidthClass()}
          />

          {properties.showClear && selectedDate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(undefined)}
              className="w-full"
            >
              Clear Selection
            </Button>
          )}

          {selectedDate && (
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-sm font-medium">Selected Date:</p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DatePickerProperties {
  variant: 'default' | 'dropdown';
  placeholder: string;
  disabled: boolean;
  showClear: boolean;
  dateFormat: string;
  width: 'auto' | 'sm' | 'md' | 'lg' | 'full';
}

const defaultProperties: DatePickerProperties = {
  variant: 'default',
  placeholder: 'Pick a date',
  disabled: false,
  showClear: true,
  dateFormat: 'PPP',
  width: 'md',
};

function generateDatePickerCode(props: DatePickerProperties): string {
  const ComponentName = props.variant === 'dropdown' ? 'DatePickerWithDropdown' : 'DatePicker';
  const widthClass = props.width !== 'auto' ? 
    (props.width === 'full' ? ' className="w-full"' : 
     props.width === 'sm' ? ' className="w-[200px]"' :
     props.width === 'md' ? ' className="w-[280px]"' :
     ' className="w-[350px]"') : '';

  return `<${ComponentName}
  date={selectedDate}
  onDateChange={setSelectedDate}${props.placeholder !== 'Pick a date' ? `
  placeholder="${props.placeholder}"` : ''}${props.disabled ? `
  disabled` : ''}${widthClass}
/>`;
}

export default function DatePickerComponentPage() {
  const [properties, setProperties] = useState<DatePickerProperties>(defaultProperties);

  const handlePropertyChange = (key: keyof DatePickerProperties, value: any) => {
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
          <h1 className="text-3xl font-bold">Date Picker</h1>
          <Badge variant="outline">Form Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A calendar-based date selection component with popup calendar and optional dropdown navigation.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              Customize the date picker properties and see the changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <LiveDatePickerPreview properties={properties} />
              </div>
              <div className="col-span-1 border-l pl-6">
                <DatePickerPropertiesPanel
                  properties={properties}
                  onChange={handlePropertyChange}
                  onReset={handleReset}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Usage Examples</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Form Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Form Integration
              </CardTitle>
              <CardDescription>Date picker in a form context with labels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="birth-date">Date of Birth</Label>
                <DatePicker placeholder="Select your birth date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <DatePickerWithDropdown placeholder="Choose start date" />
              </div>
            </CardContent>
          </Card>

          {/* Booking System */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Booking System
              </CardTitle>
              <CardDescription>Date selection for appointments and reservations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Appointment Booking</h4>
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="space-y-3">
                  <DatePicker placeholder="Select appointment date" className="w-full" />
                  <Button className="w-full">
                    Book Appointment
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Planning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Event Planning
              </CardTitle>
              <CardDescription>Multiple date selections for event management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Event Start Date</Label>
                  <DatePickerWithDropdown placeholder="Event starts on..." />
                </div>
                <div className="space-y-2">
                  <Label>Event End Date</Label>
                  <DatePickerWithDropdown placeholder="Event ends on..." />
                </div>
                <div className="space-y-2">
                  <Label>Registration Deadline</Label>
                  <DatePicker placeholder="Registration closes..." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Profile
              </CardTitle>
              <CardDescription>Personal information with date fields</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Date of Birth</Label>
                    <DatePicker placeholder="Select date of birth" className="w-full" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Settings className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Join Date</Label>
                    <DatePickerWithDropdown placeholder="When did you join?" className="w-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Features & Variants</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Standard Date Picker</CardTitle>
              <CardDescription>Basic calendar popup with month/year navigation</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Calendar popup interface</li>
                <li>• Month and year navigation arrows</li>
                <li>• Keyboard navigation support</li>
                <li>• Customizable date format</li>
                <li>• Disabled dates support</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dropdown Date Picker</CardTitle>
              <CardDescription>Enhanced with dropdown month/year selection</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Dropdown month selection</li>
                <li>• Dropdown year selection</li>
                <li>• Faster navigation for distant dates</li>
                <li>• Better UX for birth dates</li>
                <li>• Auto-close on selection</li>
              </ul>
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
            <CardDescription>Important considerations when using the Date Picker component</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Dependencies</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Built on Radix UI Calendar</li>
                  <li>• Uses date-fns for formatting</li>
                  <li>• Requires Lucide React icons</li>
                  <li>• Popover component dependency</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Accessibility</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Full keyboard navigation</li>
                  <li>• Screen reader compatible</li>
                  <li>• ARIA labels and descriptions</li>
                  <li>• Focus management</li>
                </ul>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Customization</h4>
              <p className="text-sm text-muted-foreground">
                The component accepts all standard input props and can be styled with Tailwind classes. 
                Custom date formatting is available through the date-fns format function.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 