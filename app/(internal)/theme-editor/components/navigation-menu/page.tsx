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
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { 
  ChevronDown,
  Home,
  Users,
  Settings,
  FileText,
  Star,
  Zap,
  Shield,
  Globe,
  Mail,
  Phone,
  HelpCircle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

// Properties interface
interface NavigationMenuProperties {
  orientation: 'horizontal' | 'vertical';
  trigger: 'hover' | 'click';
  showIcons: boolean;
  delayDuration: number;
  skipDelayDuration: number;
  size: 'sm' | 'default' | 'lg';
  variant: 'default' | 'outline' | 'ghost';
  indicatorPosition: 'top' | 'bottom' | 'left' | 'right';
  maxWidth: number;
}

// Properties Panel Component
function NavigationMenuPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: NavigationMenuProperties;
  onChange: (key: keyof NavigationMenuProperties, value: any) => void;
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
        {/* Orientation */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Orientation</Label>
          <Select value={properties.orientation} onValueChange={(value) => onChange('orientation', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trigger */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Trigger</Label>
          <Select value={properties.trigger} onValueChange={(value) => onChange('trigger', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hover">Hover</SelectItem>
              <SelectItem value="click">Click</SelectItem>
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

        {/* Delay Duration */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Delay Duration: {properties.delayDuration}ms</Label>
          <Input
            type="range"
            min="0"
            max="1000"
            step="50"
            value={properties.delayDuration}
            onChange={(e) => onChange('delayDuration', parseInt(e.target.value))}
          />
        </div>

        {/* Skip Delay Duration */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Skip Delay: {properties.skipDelayDuration}ms</Label>
          <Input
            type="range"
            min="0"
            max="500"
            step="50"
            value={properties.skipDelayDuration}
            onChange={(e) => onChange('skipDelayDuration', parseInt(e.target.value))}
          />
        </div>

        {/* Max Width */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Max Width: {properties.maxWidth}px</Label>
          <Input
            type="range"
            min="200"
            max="600"
            step="50"
            value={properties.maxWidth}
            onChange={(e) => onChange('maxWidth', parseInt(e.target.value))}
          />
        </div>

        {/* Show Icons */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Icons</Label>
          <Switch 
            checked={properties.showIcons} 
            onCheckedChange={(checked) => onChange('showIcons', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateNavigationMenuCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveNavigationMenuPreview({ properties }: { properties: NavigationMenuProperties }) {
  const renderNavigationMenu = () => {
    return (
      <NavigationMenu orientation={properties.orientation}>
        <NavigationMenuList className={properties.orientation === 'vertical' ? 'flex-col space-y-1' : ''}>
          <NavigationMenuItem>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              {properties.showIcons && <Home className="mr-2 h-4 w-4" />}
              Home
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuTrigger>
              {properties.showIcons && <FileText className="mr-2 h-4 w-4" />}
              Products
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="grid gap-3 p-6 w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                <div className="row-span-3">
                  <NavigationMenuLink asChild>
                    <a
                      className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                      href="#"
                    >
                      <Zap className="h-6 w-6" />
                      <div className="mb-2 mt-4 text-lg font-medium">
                        Featured Product
                      </div>
                      <p className="text-sm leading-tight text-muted-foreground">
                        Discover our latest and most innovative solution for modern businesses.
                      </p>
                    </a>
                  </NavigationMenuLink>
                </div>
                <div className="grid gap-1">
                  <NavigationMenuLink asChild>
                    <a className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground" href="#">
                      <div className="text-sm font-medium leading-none flex items-center">
                        <Star className="mr-2 h-4 w-4" />
                        Premium
                      </div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Advanced features for enterprise customers
                      </p>
                    </a>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <a className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground" href="#">
                      <div className="text-sm font-medium leading-none flex items-center">
                        <Shield className="mr-2 h-4 w-4" />
                        Security
                      </div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Enterprise-grade security and compliance
                      </p>
                    </a>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <a className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground" href="#">
                      <div className="text-sm font-medium leading-none flex items-center">
                        <Globe className="mr-2 h-4 w-4" />
                        Global
                      </div>
                      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                        Worldwide availability and support
                      </p>
                    </a>
                  </NavigationMenuLink>
                </div>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuTrigger>
              {properties.showIcons && <Users className="mr-2 h-4 w-4" />}
              Company
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="grid gap-3 p-4 w-[500px] grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">About Us</h3>
                  <div className="grid gap-1">
                    <NavigationMenuLink asChild>
                      <a className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground" href="#">
                        <div className="text-sm font-medium leading-none">Our Story</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Learn about our journey and mission
                        </p>
                      </a>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <a className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground" href="#">
                        <div className="text-sm font-medium leading-none">Team</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Meet the people behind the product
                        </p>
                      </a>
                    </NavigationMenuLink>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Contact</h3>
                  <div className="grid gap-1">
                    <NavigationMenuLink asChild>
                      <a className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground" href="#">
                        <div className="text-sm font-medium leading-none flex items-center">
                          <Mail className="mr-2 h-4 w-4" />
                          Email
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Get in touch via email
                        </p>
                      </a>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <a className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground" href="#">
                        <div className="text-sm font-medium leading-none flex items-center">
                          <Phone className="mr-2 h-4 w-4" />
                          Phone
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Call our support team
                        </p>
                      </a>
                    </NavigationMenuLink>
                  </div>
                </div>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              {properties.showIcons && <HelpCircle className="mr-2 h-4 w-4" />}
              Support
            </NavigationMenuLink>
          </NavigationMenuItem>

          <NavigationMenuItem>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              {properties.showIcons && <Settings className="mr-2 h-4 w-4" />}
              Settings
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-8">
      <div className="space-y-8 w-full max-w-4xl">
        {/* Main Navigation */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Main Navigation</h3>
          <div className="flex justify-center">
            {renderNavigationMenu()}
          </div>
        </div>

        <Separator />

        {/* Example Patterns */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-center">Navigation Patterns</h3>
          
          <div className="space-y-6">
            {/* Simple Navigation */}
            <div>
              <h4 className="text-sm font-medium mb-3">Simple Links</h4>
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      Home
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      About
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      Services
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      Contact
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            {/* Compact Menu */}
            <div>
              <h4 className="text-sm font-medium mb-3">Compact with Icons</h4>
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="text-sm">
                      <FileText className="mr-1 h-3 w-3" />
                      Resources
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid gap-2 p-3 w-[300px]">
                        <NavigationMenuLink asChild>
                          <a className="block select-none rounded-md p-2 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground" href="#">
                            <div className="text-sm font-medium leading-none flex items-center">
                              <ArrowRight className="mr-2 h-3 w-3" />
                              Documentation
                            </div>
                          </a>
                        </NavigationMenuLink>
                        <NavigationMenuLink asChild>
                          <a className="block select-none rounded-md p-2 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground" href="#">
                            <div className="text-sm font-medium leading-none flex items-center">
                              <ExternalLink className="mr-2 h-3 w-3" />
                              API Reference
                            </div>
                          </a>
                        </NavigationMenuLink>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink className={`${navigationMenuTriggerStyle()} text-sm`}>
                      <HelpCircle className="mr-1 h-3 w-3" />
                      Help
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate code function
function generateNavigationMenuCode(props: NavigationMenuProperties): string {
  return `<NavigationMenu orientation="${props.orientation}">
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
        ${props.showIcons ? '<Home className="mr-2 h-4 w-4" />' : ''}
        Home
      </NavigationMenuLink>
    </NavigationMenuItem>
    
    <NavigationMenuItem>
      <NavigationMenuTrigger>
        ${props.showIcons ? '<FileText className="mr-2 h-4 w-4" />' : ''}
        Products
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <div className="grid gap-3 p-6 w-[400px]">
          <NavigationMenuLink asChild>
            <a href="#" className="block p-3 rounded-md hover:bg-accent">
              <div className="font-medium">Product Name</div>
              <p className="text-sm text-muted-foreground">
                Product description
              </p>
            </a>
          </NavigationMenuLink>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>`;
}

export default function NavigationMenuComponentPage() {
  const [navigationMenuProperties, setNavigationMenuProperties] = useState<NavigationMenuProperties>({
    orientation: 'horizontal',
    trigger: 'hover',
    showIcons: true,
    delayDuration: 200,
    skipDelayDuration: 300,
    size: 'default',
    variant: 'default',
    indicatorPosition: 'bottom',
    maxWidth: 400,
  });

  const handlePropertyChange = (key: keyof NavigationMenuProperties, value: any) => {
    setNavigationMenuProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setNavigationMenuProperties({
      orientation: 'horizontal',
      trigger: 'hover',
      showIcons: true,
      delayDuration: 200,
      skipDelayDuration: 300,
      size: 'default',
      variant: 'default',
      indicatorPosition: 'bottom',
      maxWidth: 400,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Navigation Menu</h1>
          <Badge variant="outline">Interactive Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A collection of links for navigating websites. Features dropdown menus, rich content areas, 
          and flexible layouts for building comprehensive navigation systems.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Explore navigation patterns with dropdowns and rich content. Hover over menu items to see dropdowns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveNavigationMenuPreview properties={navigationMenuProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <NavigationMenuPropertiesPanel 
                    properties={navigationMenuProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Navigation Types Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Navigation Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Simple Links
              </CardTitle>
              <CardDescription>
                Basic navigation with direct links
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for straightforward navigation needs with clear, direct paths to important pages.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChevronDown className="h-5 w-5" />
                Dropdown Menus
              </CardTitle>
              <CardDescription>
                Expandable menus with nested content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ideal for organizing related links and providing detailed information within menu panels.
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
                Menus with descriptions and visuals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Great for showcasing features, products, or services with rich descriptions and imagery.
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
                <Zap className="h-5 w-5" />
                Smart Interactions
              </CardTitle>
              <CardDescription>
                Hover and click triggers with timing controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Configurable interaction patterns for optimal user experience:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Hover activation with delay controls</li>
                <li>• Click-to-open for mobile optimization</li>
                <li>• Skip delay for rapid navigation</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Responsive Design
              </CardTitle>
              <CardDescription>
                Adapts to different screen sizes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Built-in responsive behavior for all devices:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Horizontal and vertical orientations</li>
                <li>• Mobile-first touch interactions</li>
                <li>• Flexible content sizing</li>
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
              <CardTitle>Main Site Navigation</CardTitle>
              <CardDescription>
                Primary website navigation with product showcases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use rich content dropdowns to showcase products or services, include compelling descriptions, 
                and guide users to key conversion points with featured content areas.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dashboard Navigation</CardTitle>
              <CardDescription>
                Application menus with organized feature access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Organize complex application features into logical groups, use icons for quick recognition, 
                and provide clear paths to frequently used functions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documentation Sites</CardTitle>
              <CardDescription>
                Hierarchical content organization with search integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Structure documentation into logical sections, provide quick access to popular topics, 
                and integrate search functionality within navigation dropdowns.
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
                Full keyboard navigation, ARIA attributes, focus management, and screen reader support for complex menu structures.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Performance</h4>
              <p className="text-sm text-muted-foreground">
                Optimized rendering with lazy-loaded content, efficient event handling, and minimal re-renders for smooth interactions.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Mobile Optimization</h4>
              <p className="text-sm text-muted-foreground">
                Touch-friendly interactions, appropriate sizing for mobile devices, and adaptive behavior for different input methods.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 