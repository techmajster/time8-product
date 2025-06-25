'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle, Info, Calendar, HelpCircle } from 'lucide-react';

const components = [
  // Actions
  { 
    name: 'Button', 
    category: 'Actions',
    description: 'Primary action component with multiple variants',
    preview: (
      <div className="flex gap-2 flex-wrap">
        <Button size="sm">Primary</Button>
        <Button size="sm" variant="outline">Outline</Button>
        <Button size="sm" variant="ghost">Ghost</Button>
        <Button size="sm" variant="destructive">Destructive</Button>
      </div>
    )
  },
  
  // Form Elements
  { 
    name: 'Input', 
    category: 'Form',
    description: 'Text input field with validation support',
    preview: (
      <div className="space-y-2 w-full">
        <Input placeholder="Enter text..." className="max-w-xs" />
        <Input placeholder="Disabled input" disabled className="max-w-xs" />
      </div>
    )
  },
  { 
    name: 'Textarea', 
    category: 'Form',
    description: 'Multi-line text input for longer content',
    preview: (
      <Textarea placeholder="Enter your message..." className="max-w-xs resize-none" rows={3} />
    )
  },
  { 
    name: 'Select', 
    category: 'Form',
    description: 'Dropdown selection component',
    preview: (
      <Select>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Select option..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
          <SelectItem value="option3">Option 3</SelectItem>
        </SelectContent>
      </Select>
    )
  },
  { 
    name: 'Checkbox', 
    category: 'Form',
    description: 'Binary choice input with label support',
    preview: (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Checkbox id="terms1" defaultChecked />
          <Label htmlFor="terms1" className="text-sm">Accept terms</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="terms2" />
          <Label htmlFor="terms2" className="text-sm">Subscribe to newsletter</Label>
        </div>
      </div>
    )
  },
  { 
    name: 'Radio Group', 
    category: 'Form',
    description: 'Single choice selection from multiple options',
    preview: (
      <RadioGroup defaultValue="option1" className="flex gap-4">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1" className="text-sm">Option 1</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option2" id="r2" />
          <Label htmlFor="r2" className="text-sm">Option 2</Label>
        </div>
      </RadioGroup>
    )
  },
  { 
    name: 'Switch', 
    category: 'Form',
    description: 'Toggle switch for boolean settings',
    preview: (
      <div className="flex items-center gap-2">
        <Switch />
        <Label className="text-sm">Enable notifications</Label>
      </div>
    )
  },
  { 
    name: 'Slider', 
    category: 'Form',
    description: 'Range input for numeric values',
    preview: (
      <div className="w-48">
        <Slider defaultValue={[50]} max={100} step={1} />
      </div>
    )
  },
  
  // Layout
  { 
    name: 'Card', 
    category: 'Layout',
    description: 'Container component with header and content areas',
    preview: (
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Card Title</CardTitle>
          <CardDescription className="text-sm">
            Card description goes here
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          This is the card content area.
        </CardContent>
      </Card>
    )
  },
  { 
    name: 'Separator', 
    category: 'Layout',
    description: 'Visual divider between content sections',
    preview: (
      <div className="w-full">
        <div className="text-sm text-gray-600 mb-2">Above separator</div>
        <Separator />
        <div className="text-sm text-gray-600 mt-2">Below separator</div>
      </div>
    )
  },
  { 
    name: 'Tabs', 
    category: 'Layout',
    description: 'Organize content into switchable panels',
    preview: (
      <Tabs defaultValue="tab1" className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tab1" className="text-xs">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" className="text-xs">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" className="text-sm text-gray-600 mt-2">
          Content for tab 1
        </TabsContent>
        <TabsContent value="tab2" className="text-sm text-gray-600 mt-2">
          Content for tab 2
        </TabsContent>
      </Tabs>
    )
  },
  
  // Display
  { 
    name: 'Badge', 
    category: 'Display',
    description: 'Small status indicators and labels',
    preview: (
      <div className="flex gap-2 flex-wrap">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Error</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
    )
  },
  { 
    name: 'Avatar', 
    category: 'Display',
    description: 'User profile images with fallback',
    preview: (
      <div className="flex gap-2">
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>MK</AvatarFallback>
        </Avatar>
      </div>
    )
  },
  { 
    name: 'Progress', 
    category: 'Display',
    description: 'Visual progress indicator',
    preview: (
      <div className="w-48 space-y-2">
        <Progress value={33} className="h-2" />
        <Progress value={66} className="h-2" />
      </div>
    )
  },
  { 
    name: 'Skeleton', 
    category: 'Display',
    description: 'Loading placeholder with shimmer effect',
    preview: (
      <div className="space-y-2 w-48">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
  },
  { 
    name: 'Tooltip', 
    category: 'Display',
    description: 'Contextual information on hover',
    preview: (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">
              <HelpCircle className="h-4 w-4 mr-1" />
              Hover me
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>This is a tooltip</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
  
  // Feedback
  { 
    name: 'Alert', 
    category: 'Feedback',
    description: 'Important messages and notifications',
    preview: (
      <div className="space-y-2">
        <Alert className="max-w-sm">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm">Info</AlertTitle>
          <AlertDescription className="text-xs">
            This is an informational message.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive" className="max-w-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-sm">Error</AlertTitle>
          <AlertDescription className="text-xs">
            Something went wrong.
          </AlertDescription>
        </Alert>
      </div>
    )
  },
];

export function ComponentGrid() {
  const categories = ['All', 'Actions', 'Form', 'Layout', 'Display', 'Feedback'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredComponents = selectedCategory === 'All' 
    ? components 
    : components.filter(component => component.category === selectedCategory);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Your component library</h1>
        <p className="text-gray-600 mb-4">Browse and preview all available UI components</p>
        
        {/* Stats */}
        <div className="flex gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <div className="text-sm font-medium text-blue-900">{components.length} Components</div>
            <div className="text-xs text-blue-600">Total available</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <div className="text-sm font-medium text-green-900">{categories.length - 1} Categories</div>
            <div className="text-xs text-green-600">Organized groups</div>
          </div>
        </div>
        
        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="text-sm"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Component Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredComponents.map((component) => (
          <div 
            key={component.name} 
            className="group border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 hover:border-gray-300 bg-white"
          >
            {/* Preview Area */}
            <div className="p-6 min-h-[140px] flex items-center justify-center bg-gray-50/50">
              <div className="w-full flex items-center justify-center">
                {component.preview}
              </div>
            </div>
            
            {/* Component Info */}
            <div className="p-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{component.name}</h3>
                <Badge variant="outline" className="text-xs">
                  {component.category}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                {component.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {filteredComponents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No components found in this category.</p>
        </div>
      )}
    </div>
  );
} 