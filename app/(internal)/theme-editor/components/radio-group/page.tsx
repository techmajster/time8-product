'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

// Properties Panel Component
function RadioGroupPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: RadioGroupProperties;
  onChange: (key: keyof RadioGroupProperties, value: any) => void;
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
        {/* Value */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Value</Label>
          <Select value={properties.defaultValue || "none"} onValueChange={(value) => onChange('defaultValue', value === "none" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select default option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orientation */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Orientation</Label>
          <Select value={properties.orientation} onValueChange={(value) => onChange('orientation', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vertical">Vertical</SelectItem>
              <SelectItem value="horizontal">Horizontal</SelectItem>
            </SelectContent>
          </Select>
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

        {/* Options Count */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Number of Options</Label>
          <Select value={properties.optionsCount.toString()} onValueChange={(value) => onChange('optionsCount', parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Options</SelectItem>
              <SelectItem value="3">3 Options</SelectItem>
              <SelectItem value="4">4 Options</SelectItem>
              <SelectItem value="5">5 Options</SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateRadioGroupCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveRadioGroupPreview({ properties }: { properties: RadioGroupProperties }) {
  const options = Array.from({ length: properties.optionsCount }, (_, i) => ({
    value: `option${i + 1}`,
    label: `Option ${i + 1}`,
    description: `Description for option ${i + 1}`
  }));

  return (
    <div className="h-full min-h-[500px] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <RadioGroup
          defaultValue={properties.defaultValue}
          disabled={properties.disabled}
          required={properties.required}
          orientation={properties.orientation}
          className={properties.orientation === 'horizontal' ? 'flex flex-row gap-6' : 'space-y-2'}
        >
          {options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={option.value} />
              {properties.showLabels && (
                <div className="space-y-1">
                  <Label htmlFor={option.value} className="text-sm font-medium">
                    {option.label}
                  </Label>
                  {properties.showDescriptions && (
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

interface RadioGroupProperties {
  defaultValue: string;
  orientation: 'vertical' | 'horizontal';
  disabled: boolean;
  required: boolean;
  optionsCount: number;
  showLabels: boolean;
  showDescriptions: boolean;
}

const defaultProperties: RadioGroupProperties = {
  defaultValue: '',
  orientation: 'vertical',
  disabled: false,
  required: false,
  optionsCount: 3,
  showLabels: true,
  showDescriptions: false,
};

function generateRadioGroupCode(props: RadioGroupProperties): string {
  const options = Array.from({ length: props.optionsCount }, (_, i) => ({
    value: `option${i + 1}`,
    label: `Option ${i + 1}`,
    description: `Description for option ${i + 1}`
  }));

  const radioGroupProps = [
    props.defaultValue ? `defaultValue="${props.defaultValue}"` : '',
    props.disabled ? 'disabled' : '',
    props.required ? 'required' : '',
    props.orientation !== 'vertical' ? `orientation="${props.orientation}"` : '',
  ].filter(Boolean).join(' ');

  const className = props.orientation === 'horizontal' ? 'flex flex-row gap-6' : 'space-y-2';

  return `<RadioGroup${radioGroupProps ? ` ${radioGroupProps}` : ''}${props.orientation === 'horizontal' ? ` className="${className}"` : ''}>
${options.map(option => {
  let itemCode = `  <div className="flex items-center space-x-2">
    <RadioGroupItem value="${option.value}" id="${option.value}" />`;
  
  if (props.showLabels) {
    itemCode += `
    <div className="space-y-1">
      <Label htmlFor="${option.value}">${option.label}</Label>`;
    
    if (props.showDescriptions) {
      itemCode += `
      <p className="text-xs text-muted-foreground">
        ${option.description}
      </p>`;
    }
    
    itemCode += `
    </div>`;
  }
  
  itemCode += `
  </div>`;
  
  return itemCode;
}).join('\n')}
</RadioGroup>`;
}

export default function RadioGroupComponentPage() {
  const [properties, setProperties] = useState<RadioGroupProperties>(defaultProperties);

  const handlePropertyChange = (key: keyof RadioGroupProperties, value: any) => {
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
          <h1 className="text-3xl font-bold">Radio Group</h1>
          <Badge variant="outline">Form Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A set of checkable buttons—known as radio buttons—where no more than one can be checked at a time.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>
              Customize the radio group properties and see the changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <LiveRadioGroupPreview properties={properties} />
              </div>
              <div className="col-span-1 border-l pl-6">
                <RadioGroupPropertiesPanel
                  properties={properties}
                  onChange={handlePropertyChange}
                  onReset={handleReset}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Basic Usage */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Basic Usage</h2>
        <Card>
          <CardHeader>
            <CardTitle>Default Radio Group</CardTitle>
            <CardDescription>Basic radio group with multiple options</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup defaultValue="option1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option1" id="option1" />
                <Label htmlFor="option1">Option 1</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option2" id="option2" />
                <Label htmlFor="option2">Option 2</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option3" id="option3" />
                <Label htmlFor="option3">Option 3</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </section>

      {/* Orientations */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Orientations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Vertical (Default)</CardTitle>
              <CardDescription>Radio buttons stacked vertically</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup defaultValue="vertical1">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vertical1" id="vertical1" />
                  <Label htmlFor="vertical1">First option</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vertical2" id="vertical2" />
                  <Label htmlFor="vertical2">Second option</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vertical3" id="vertical3" />
                  <Label htmlFor="vertical3">Third option</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Horizontal</CardTitle>
              <CardDescription>Radio buttons arranged horizontally</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup defaultValue="horizontal1" className="flex flex-row gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="horizontal1" id="horizontal1" />
                  <Label htmlFor="horizontal1">Option 1</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="horizontal2" id="horizontal2" />
                  <Label htmlFor="horizontal2">Option 2</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="horizontal3" id="horizontal3" />
                  <Label htmlFor="horizontal3">Option 3</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* States */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">States</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">Normal</Label>
                <RadioGroup defaultValue="normal1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal1" id="normal1" />
                    <Label htmlFor="normal1">Selected option</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal2" id="normal2" />
                    <Label htmlFor="normal2">Unselected option</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Disabled</Label>
                <RadioGroup disabled defaultValue="disabled1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="disabled1" id="disabled1" />
                    <Label htmlFor="disabled1">Disabled selected</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="disabled2" id="disabled2" />
                    <Label htmlFor="disabled2">Disabled unselected</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>With Required Indicator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Preferred Contact Method <span className="text-destructive">*</span>
                </Label>
                <RadioGroup required>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="email" />
                    <Label htmlFor="email">Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="phone" />
                    <Label htmlFor="phone">Phone</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sms" id="sms" />
                    <Label htmlFor="sms">SMS</Label>
                  </div>
                </RadioGroup>
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
              <CardTitle>Settings Form</CardTitle>
              <CardDescription>User preference selection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Theme Preference</Label>
                <RadioGroup defaultValue="system">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="theme-light" />
                    <Label htmlFor="theme-light">Light</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="theme-dark" />
                    <Label htmlFor="theme-dark">Dark</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="system" id="theme-system" />
                    <Label htmlFor="theme-system">System</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Notification Frequency</Label>
                <RadioGroup defaultValue="daily">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="realtime" id="freq-realtime" />
                    <Label htmlFor="freq-realtime">Real-time</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="freq-daily" />
                    <Label htmlFor="freq-daily">Daily digest</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="freq-weekly" />
                    <Label htmlFor="freq-weekly">Weekly summary</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="never" id="freq-never" />
                    <Label htmlFor="freq-never">Never</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Checkout form example</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Payment Method <span className="text-destructive">*</span>
                </Label>
                <RadioGroup defaultValue="card" required>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="payment-card" />
                    <div className="space-y-1">
                      <Label htmlFor="payment-card">Credit Card</Label>
                      <p className="text-xs text-muted-foreground">
                        Pay with Visa, Mastercard, or American Express
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paypal" id="payment-paypal" />
                    <div className="space-y-1">
                      <Label htmlFor="payment-paypal">PayPal</Label>
                      <p className="text-xs text-muted-foreground">
                        Pay with your PayPal account
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="apple" id="payment-apple" />
                    <div className="space-y-1">
                      <Label htmlFor="payment-apple">Apple Pay</Label>
                      <p className="text-xs text-muted-foreground">
                        Pay with Touch ID or Face ID
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Advanced Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Examples</h2>
        <Card>
          <CardHeader>
            <CardTitle>Survey Question</CardTitle>
            <CardDescription>Complex form with detailed options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">
                  How would you rate your overall experience with our service?
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Please select the option that best describes your experience.
                </p>
              </div>
              
              <RadioGroup className="space-y-3">
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value="excellent" id="rating-excellent" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="rating-excellent" className="font-medium">
                      Excellent (5/5)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Exceeded expectations, would definitely recommend
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value="good" id="rating-good" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="rating-good" className="font-medium">
                      Good (4/5)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Met expectations, satisfied with the service
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value="average" id="rating-average" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="rating-average" className="font-medium">
                      Average (3/5)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Acceptable, but room for improvement
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value="poor" id="rating-poor" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="rating-poor" className="font-medium">
                      Poor (2/5)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Below expectations, encountered several issues
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value="terrible" id="rating-terrible" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="rating-terrible" className="font-medium">
                      Terrible (1/5)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Far below expectations, would not recommend
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 