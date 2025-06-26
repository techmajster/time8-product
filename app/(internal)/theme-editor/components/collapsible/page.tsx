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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Info,
  Settings,
  FileText,
  Users,
  Star,
  Calendar,
  Mail,
  Bell,
  Shield,
  Database,
  Folder,
  Eye,
  EyeOff
} from 'lucide-react';

// Properties interface
interface CollapsibleProperties {
  defaultOpen: boolean;
  disabled: boolean;
  animated: boolean;
  trigger: 'button' | 'icon' | 'text' | 'card';
  triggerPosition: 'left' | 'right' | 'center';
  content: 'simple' | 'rich' | 'form' | 'list' | 'settings';
  size: 'sm' | 'default' | 'lg';
  variant: 'default' | 'outline' | 'ghost';
  showIndicator: boolean;
  indicatorIcon: 'chevron' | 'plus' | 'arrow';
}

// Properties Panel Component
function CollapsiblePropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: CollapsibleProperties;
  onChange: (key: keyof CollapsibleProperties, value: any) => void;
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
        {/* Trigger Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trigger Type</Label>
          <Select value={properties.trigger} onValueChange={(value) => onChange('trigger', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="button">Button</SelectItem>
              <SelectItem value="icon">Icon Only</SelectItem>
              <SelectItem value="text">Text Link</SelectItem>
              <SelectItem value="card">Card Header</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trigger Position */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trigger Position</Label>
          <Select value={properties.triggerPosition} onValueChange={(value) => onChange('triggerPosition', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="right">Right</SelectItem>
              <SelectItem value="center">Center</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Content Type</Label>
          <Select value={properties.content} onValueChange={(value) => onChange('content', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple Text</SelectItem>
              <SelectItem value="rich">Rich Content</SelectItem>
              <SelectItem value="form">Form Fields</SelectItem>
              <SelectItem value="list">Item List</SelectItem>
              <SelectItem value="settings">Settings Panel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Size</Label>
          <Select value={properties.size} onValueChange={(value) => onChange('size', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Indicator Icon */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Indicator Icon</Label>
          <Select value={properties.indicatorIcon} onValueChange={(value) => onChange('indicatorIcon', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chevron">Chevron</SelectItem>
              <SelectItem value="plus">Plus/Minus</SelectItem>
              <SelectItem value="arrow">Arrow</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default Open */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Default Open</Label>
          <Switch 
            checked={properties.defaultOpen} 
            onCheckedChange={(checked) => onChange('defaultOpen', checked)}
          />
        </div>

        {/* Show Indicator */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Indicator</Label>
          <Switch 
            checked={properties.showIndicator} 
            onCheckedChange={(checked) => onChange('showIndicator', checked)}
          />
        </div>

        {/* Animated */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Animated</Label>
          <Switch 
            checked={properties.animated} 
            onCheckedChange={(checked) => onChange('animated', checked)}
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
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateCollapsibleCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveCollapsiblePreview({ properties }: { properties: CollapsibleProperties }) {
  const [isOpen, setIsOpen] = useState(properties.defaultOpen);

  const getIndicatorIcon = (isOpen: boolean) => {
    switch (properties.indicatorIcon) {
      case 'plus':
        return isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />;
      case 'arrow':
        return isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />;
      default:
        return <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />;
    }
  };

  const getContentByType = () => {
    switch (properties.content) {
      case 'rich':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">Featured Content</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This is a rich content area that can contain images, icons, formatted text, and other UI elements.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">Action 1</Button>
              <Button size="sm" variant="outline">Action 2</Button>
            </div>
          </div>
        );
      case 'form':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Enter your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            <Button size="sm">Submit</Button>
          </div>
        );
      case 'list':
        return (
          <div className="space-y-2">
            {[
              { icon: Users, label: 'Team Members', count: 12 },
              { icon: FileText, label: 'Documents', count: 24 },
              { icon: Calendar, label: 'Events', count: 8 },
              { icon: Settings, label: 'Settings', count: 3 },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                <div className="flex items-center space-x-2">
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </div>
                <Badge variant="secondary">{item.count}</Badge>
              </div>
            ))}
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span className="text-sm font-medium">Notifications</span>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Privacy Mode</span>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span className="text-sm font-medium">Auto Backup</span>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        );
      default:
        return (
          <p className="text-sm text-muted-foreground">
            This is the collapsible content area. It can contain any type of content including text, 
            images, forms, or other components.
          </p>
        );
    }
  };

  const getTriggerContent = () => {
    const indicatorIcon = properties.showIndicator ? getIndicatorIcon(isOpen) : null;
    
    switch (properties.trigger) {
      case 'icon':
        return (
          <Button variant="ghost" size="sm" className="p-2">
            {indicatorIcon || <ChevronDown className="h-4 w-4" />}
          </Button>
        );
      case 'text':
        return (
          <button className="flex items-center space-x-2 text-sm font-medium hover:text-foreground text-muted-foreground">
            <span>Show Details</span>
            {indicatorIcon}
          </button>
        );
      case 'card':
        return (
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
            <div className="flex items-center space-x-2">
              <Folder className="h-5 w-5" />
              <div>
                <h3 className="font-medium">Project Details</h3>
                <p className="text-sm text-muted-foreground">Click to expand</p>
              </div>
            </div>
            {indicatorIcon}
          </div>
        );
      default:
        return (
          <Button 
            variant={properties.variant as any} 
            size={properties.size} 
            className="flex items-center space-x-2"
          >
            <span>Toggle Content</span>
            {indicatorIcon}
          </Button>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-8">
      <div className="space-y-8 w-full max-w-2xl">
        {/* Main Collapsible */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Interactive Collapsible</h3>
          <Collapsible open={isOpen} onOpenChange={setIsOpen} disabled={properties.disabled}>
            <div className={`flex ${properties.triggerPosition === 'center' ? 'justify-center' : 
                              properties.triggerPosition === 'right' ? 'justify-end' : 'justify-start'}`}>
              <CollapsibleTrigger asChild>
                {getTriggerContent()}
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-4">
              <div className="p-4 border rounded-lg bg-muted/20">
                {getContentByType()}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <Separator />

        {/* Example Patterns */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-center">Common Patterns</h3>
          
          <div className="space-y-4">
            {/* FAQ Style */}
            <div>
              <h4 className="text-sm font-medium mb-3">FAQ Section</h4>
              <div className="space-y-2">
                {[
                  { q: "How do I reset my password?", a: "You can reset your password by clicking the 'Forgot Password' link on the login page." },
                  { q: "What payment methods do you accept?", a: "We accept all major credit cards, PayPal, and bank transfers." },
                  { q: "How can I contact support?", a: "You can reach our support team via email at support@example.com or through our chat widget." }
                ].map((faq, index) => (
                  <Collapsible key={index}>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center justify-between w-full p-3 text-left border rounded-lg hover:bg-muted/50">
                        <span className="font-medium">{faq.q}</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-3 text-sm text-muted-foreground">
                        {faq.a}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>

            {/* Sidebar Style */}
            <div>
              <h4 className="text-sm font-medium mb-3">Navigation Sidebar</h4>
              <div className="space-y-1 border rounded-lg p-2">
                <Collapsible defaultOpen>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full p-2 text-sm font-medium rounded hover:bg-muted">
                      <div className="flex items-center space-x-2">
                        <Folder className="h-4 w-4" />
                        <span>Projects</span>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 mt-1 space-y-1">
                      <button className="block w-full text-left p-2 text-sm text-muted-foreground hover:text-foreground rounded">Website Redesign</button>
                      <button className="block w-full text-left p-2 text-sm text-muted-foreground hover:text-foreground rounded">Mobile App</button>
                      <button className="block w-full text-left p-2 text-sm text-muted-foreground hover:text-foreground rounded">API Integration</button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate code function
function generateCollapsibleCode(props: CollapsibleProperties): string {
  const indicatorIcon = props.showIndicator ? 
    (props.indicatorIcon === 'plus' ? '<Plus className="h-4 w-4" />' :
     props.indicatorIcon === 'arrow' ? '<ChevronRight className="h-4 w-4" />' :
     '<ChevronDown className="h-4 w-4" />') : '';

  return `<Collapsible${props.defaultOpen ? ' defaultOpen' : ''}${props.disabled ? ' disabled' : ''}>
  <CollapsibleTrigger asChild>
    <Button variant="${props.variant}" size="${props.size}">
      <span>Toggle Content</span>
      ${indicatorIcon}
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div className="p-4 border rounded-lg">
      ${props.content === 'simple' ? 'Your collapsible content goes here...' :
        props.content === 'rich' ? 'Rich content with icons, buttons, and formatting...' :
        props.content === 'form' ? 'Form fields and inputs...' :
        props.content === 'list' ? 'List items with actions...' :
        'Settings and configuration options...'}
    </div>
  </CollapsibleContent>
</Collapsible>`;
}

export default function CollapsibleComponentPage() {
  const [collapsibleProperties, setCollapsibleProperties] = useState<CollapsibleProperties>({
    defaultOpen: false,
    disabled: false,
    animated: true,
    trigger: 'button',
    triggerPosition: 'left',
    content: 'simple',
    size: 'default',
    variant: 'default',
    showIndicator: true,
    indicatorIcon: 'chevron',
  });

  const handlePropertyChange = (key: keyof CollapsibleProperties, value: any) => {
    setCollapsibleProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setCollapsibleProperties({
      defaultOpen: false,
      disabled: false,
      animated: true,
      trigger: 'button',
      triggerPosition: 'left',
      content: 'simple',
      size: 'default',
      variant: 'default',
      showIndicator: true,
      indicatorIcon: 'chevron',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Collapsible</h1>
          <Badge variant="outline">Layout Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          An interactive component which expands/collapses a panel. Perfect for progressive disclosure, 
          FAQs, settings panels, and space-efficient content organization.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Explore different collapsible configurations and content types. Customize properties below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveCollapsiblePreview properties={collapsibleProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <CollapsiblePropertiesPanel 
                    properties={collapsibleProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Content Types Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Content Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Simple Content
              </CardTitle>
              <CardDescription>
                Basic text and simple elements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for basic descriptions, help text, or simple content that doesn't need complex layout.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Rich Content
              </CardTitle>
              <CardDescription>
                Media, buttons, and formatted content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ideal for feature showcases, product details, or any content requiring rich formatting and interactions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Interactive Forms
              </CardTitle>
              <CardDescription>
                Forms, controls, and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Great for advanced settings, configuration panels, or any scenario requiring user input.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChevronDown className="h-5 w-5" />
                Progressive Disclosure
              </CardTitle>
              <CardDescription>
                Show information when needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Reveal content progressively to reduce cognitive load:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Hide advanced options by default</li>
                <li>• Expand details on demand</li>
                <li>• Maintain clean interface hierarchy</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Flexible Triggers
              </CardTitle>
              <CardDescription>
                Multiple trigger styles and positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Customize trigger appearance and behavior:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Button, icon, text, or card triggers</li>
                <li>• Configurable indicator icons</li>
                <li>• Left, right, or center positioning</li>
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
              <CardTitle>FAQ Sections</CardTitle>
              <CardDescription>
                Frequently asked questions with expandable answers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create scannable FAQ lists where users can quickly find and expand specific questions. 
                Keeps the interface clean while providing detailed answers on demand.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings Panels</CardTitle>
              <CardDescription>
                Advanced configuration options and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hide advanced settings behind collapsible sections to maintain simplicity for basic users 
                while providing power users access to detailed configuration options.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Organization</CardTitle>
              <CardDescription>
                Hierarchical content structure and navigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Organize related content into expandable sections for better information architecture 
                and improved user navigation through complex content structures.
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
                Full ARIA support with proper expanded/collapsed states, keyboard navigation, and screen reader compatibility.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Performance</h4>
              <p className="text-sm text-muted-foreground">
                Efficient rendering with minimal DOM manipulation and smooth animations for optimal user experience.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Responsive Design</h4>
              <p className="text-sm text-muted-foreground">
                Mobile-optimized touch targets and responsive content layout for seamless cross-device functionality.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 