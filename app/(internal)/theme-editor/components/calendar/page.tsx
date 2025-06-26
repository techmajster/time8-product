'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  Clock,
  Users,
  MapPin,
  Event,
  CalendarCheck
} from 'lucide-react';
import { format } from 'date-fns';

// Properties interface
interface CalendarProperties {
  mode: 'single' | 'multiple' | 'range';
  showOutsideDays: boolean;
  showWeekNumbers: boolean;
  captionLayout: 'dropdown' | 'label' | 'dropdown-years';
  buttonVariant: 'default' | 'outline' | 'ghost' | 'secondary';
  numberOfMonths: number;
  disabled: boolean;
  required: boolean;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  fixedWeeks: boolean;
  showYearNavigation: boolean;
  minDate: boolean;
  maxDate: boolean;
}

// Properties Panel Component
function CalendarPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: CalendarProperties;
  onChange: (key: keyof CalendarProperties, value: any) => void;
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
        {/* Mode */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Selection Mode</Label>
          <Select value={properties.mode} onValueChange={(value) => onChange('mode', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single Date</SelectItem>
              <SelectItem value="multiple">Multiple Dates</SelectItem>
              <SelectItem value="range">Date Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Caption Layout */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Caption Layout</Label>
          <Select value={properties.captionLayout} onValueChange={(value) => onChange('captionLayout', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="label">Label Only</SelectItem>
              <SelectItem value="dropdown">Month/Year Dropdowns</SelectItem>
              <SelectItem value="dropdown-years">Year Dropdown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Button Variant */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Button Variant</Label>
          <Select value={properties.buttonVariant} onValueChange={(value) => onChange('buttonVariant', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="ghost">Ghost</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Number of Months */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Number of Months: {properties.numberOfMonths}</Label>
          <Input
            type="range"
            min="1"
            max="3"
            value={properties.numberOfMonths}
            onChange={(e) => onChange('numberOfMonths', parseInt(e.target.value))}
          />
        </div>

        {/* Week Starts On */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Week Starts On</Label>
          <Select value={properties.weekStartsOn.toString()} onValueChange={(value) => onChange('weekStartsOn', parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sunday</SelectItem>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="2">Tuesday</SelectItem>
              <SelectItem value="3">Wednesday</SelectItem>
              <SelectItem value="4">Thursday</SelectItem>
              <SelectItem value="5">Friday</SelectItem>
              <SelectItem value="6">Saturday</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show Outside Days */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Outside Days</Label>
          <Switch 
            checked={properties.showOutsideDays} 
            onCheckedChange={(checked) => onChange('showOutsideDays', checked)}
          />
        </div>

        {/* Show Week Numbers */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Week Numbers</Label>
          <Switch 
            checked={properties.showWeekNumbers} 
            onCheckedChange={(checked) => onChange('showWeekNumbers', checked)}
          />
        </div>

        {/* Fixed Weeks */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Fixed Weeks</Label>
          <Switch 
            checked={properties.fixedWeeks} 
            onCheckedChange={(checked) => onChange('fixedWeeks', checked)}
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

        {/* Required */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Required</Label>
          <Switch 
            checked={properties.required} 
            onCheckedChange={(checked) => onChange('required', checked)}
          />
        </div>

        {/* Date Limits */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Min/Max Date Limits</Label>
          <Switch 
            checked={properties.minDate} 
            onCheckedChange={(checked) => onChange('minDate', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateCalendarCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveCalendarPreview({ properties }: { properties: CalendarProperties }) {
  const [date, setDate] = useState<Date | Date[] | undefined>(new Date());
  const [isOpen, setIsOpen] = useState(false);

  const getCalendarProps = () => {
    const baseProps: any = {
      mode: properties.mode,
      showOutsideDays: properties.showOutsideDays,
      showWeekNumbers: properties.showWeekNumbers,
      captionLayout: properties.captionLayout,
      buttonVariant: properties.buttonVariant,
      numberOfMonths: properties.numberOfMonths,
      weekStartsOn: properties.weekStartsOn,
      fixedWeeks: properties.fixedWeeks,
      disabled: properties.disabled,
      selected: date,
      onSelect: setDate,
    };

    if (properties.minDate) {
      baseProps.fromDate = new Date();
      baseProps.toDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
    }

    return baseProps;
  };

  const formatSelectedDate = () => {
    if (!date) return 'Select date...';
    if (Array.isArray(date)) {
      if (date.length === 0) return 'Select dates...';
      if (date.length === 1) return format(date[0], 'PPP');
      return `${date.length} dates selected`;
    }
    if (properties.mode === 'range' && date) {
      return `${format(date, 'PPP')} - ${format(date, 'PPP')}`;
    }
    return format(date, 'PPP');
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      {/* Inline Calendar */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-center">Inline Calendar</h3>
        <div className="flex justify-center">
          <Calendar {...getCalendarProps()} />
        </div>
        <div className="text-center text-sm text-muted-foreground">
          Selected: {formatSelectedDate()}
        </div>
      </div>

      <Separator />

      {/* Popover Calendar */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-center">Popover Calendar</h3>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-60 justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatSelectedDate()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar {...getCalendarProps()} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// Generate code function
function generateCalendarCode(props: CalendarProperties): string {
  const propsArray = [
    `mode="${props.mode}"`,
    props.showOutsideDays ? 'showOutsideDays' : 'showOutsideDays={false}',
    props.showWeekNumbers ? 'showWeekNumbers' : '',
    `captionLayout="${props.captionLayout}"`,
    `buttonVariant="${props.buttonVariant}"`,
    props.numberOfMonths > 1 ? `numberOfMonths={${props.numberOfMonths}}` : '',
    props.weekStartsOn !== 0 ? `weekStartsOn={${props.weekStartsOn}}` : '',
    props.fixedWeeks ? 'fixedWeeks' : '',
    props.disabled ? 'disabled' : '',
    props.minDate ? 'fromDate={new Date()}\n    toDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}' : '',
  ].filter(Boolean);

  return `<Calendar
  ${propsArray.join('\n  ')}
  selected={date}
  onSelect={setDate}
/>`;
}

export default function CalendarComponentPage() {
  const [calendarProperties, setCalendarProperties] = useState<CalendarProperties>({
    mode: 'single',
    showOutsideDays: true,
    showWeekNumbers: false,
    captionLayout: 'dropdown',
    buttonVariant: 'ghost',
    numberOfMonths: 1,
    disabled: false,
    required: false,
    weekStartsOn: 0,
    fixedWeeks: false,
    showYearNavigation: true,
    minDate: false,
    maxDate: false,
  });

  const handlePropertyChange = (key: keyof CalendarProperties, value: any) => {
    setCalendarProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setCalendarProperties({
      mode: 'single',
      showOutsideDays: true,
      showWeekNumbers: false,
      captionLayout: 'dropdown',
      buttonVariant: 'ghost',
      numberOfMonths: 1,
      disabled: false,
      required: false,
      weekStartsOn: 0,
      fixedWeeks: false,
      showYearNavigation: true,
      minDate: false,
      maxDate: false,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Calendar</h1>
          <Badge variant="outline">Form Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A date field component that allows users to enter and edit dates. Supports single date selection, 
          multiple dates, date ranges, and extensive customization options for different use cases.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Interact with both inline and popover calendar variants. Customize properties below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveCalendarPreview properties={calendarProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <CalendarPropertiesPanel 
                    properties={calendarProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Selection Modes Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Selection Modes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Single Date
              </CardTitle>
              <CardDescription>
                Select one date at a time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for birthdays, deadlines, appointments, and any scenario requiring a single date.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5" />
                Multiple Dates
              </CardTitle>
              <CardDescription>
                Select multiple individual dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ideal for selecting meeting availability, multiple deadlines, or event dates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Event className="h-5 w-5" />
                Date Range
              </CardTitle>
              <CardDescription>
                Select a continuous date range
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for vacation bookings, project timelines, and reporting periods.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChevronLeft className="h-5 w-5" />
                Navigation Controls
              </CardTitle>
              <CardDescription>
                Flexible month and year navigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Multiple navigation styles to suit different use cases:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Arrow buttons for month navigation</li>
                <li>• Dropdown menus for quick month/year selection</li>
                <li>• Keyboard navigation support</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Date Constraints
              </CardTitle>
              <CardDescription>
                Control selectable date ranges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Set boundaries for date selection:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Minimum and maximum date limits</li>
                <li>• Disable specific dates or date ranges</li>
                <li>• Weekend/holiday restrictions</li>
              </ul>
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
              <CardTitle>Booking Systems</CardTitle>
              <CardDescription>
                Hotel reservations, appointment scheduling, resource booking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use date range mode for check-in/check-out dates, disable unavailable dates, 
                and set minimum/maximum booking windows to control availability.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event Planning</CardTitle>
              <CardDescription>
                Meeting scheduling, event dates, deadline management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Multiple date selection for availability polling, single date for deadlines, 
                and range selection for event durations with team coordination.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Analysis</CardTitle>
              <CardDescription>
                Report generation, analytics periods, data filtering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Date range selection for analytics periods, quick preset buttons for common ranges, 
                and validation to ensure logical date ordering.
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
                Full keyboard navigation, ARIA labels, screen reader support, and focus management for all interactive elements.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Internationalization</h4>
              <p className="text-sm text-muted-foreground">
                Supports multiple locales, date formats, week start days, and right-to-left languages out of the box.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Performance</h4>
              <p className="text-sm text-muted-foreground">
                Optimized rendering with virtual scrolling for year navigation and efficient date calculations.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 