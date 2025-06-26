'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { 
  ChevronRight, 
  Slash,
  ArrowRight,
  Home,
  Folder,
  File,
  Settings,
  Users,
  Database,
  FolderOpen,
  FileText
} from 'lucide-react';

// Properties interface
interface BreadcrumbProperties {
  separatorType: 'chevron' | 'slash' | 'arrow';
  maxItems: number;
  showHome: boolean;
  collapsible: boolean;
  itemCount: number;
  size: 'sm' | 'default' | 'lg';
  variant: 'default' | 'outline' | 'ghost';
  showIcons: boolean;
}

// Properties Panel Component
function BreadcrumbPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: BreadcrumbProperties;
  onChange: (key: keyof BreadcrumbProperties, value: any) => void;
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
        {/* Separator Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Separator Type</Label>
          <Select value={properties.separatorType} onValueChange={(value) => onChange('separatorType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chevron">Chevron (&gt;)</SelectItem>
              <SelectItem value="slash">Slash (/)</SelectItem>
              <SelectItem value="arrow">Arrow (→)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Item Count */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Item Count: {properties.itemCount}</Label>
          <Input
            type="range"
            min="2"
            max="8"
            value={properties.itemCount}
            onChange={(e) => onChange('itemCount', parseInt(e.target.value))}
          />
        </div>

        {/* Max Items */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Max Visible Items: {properties.maxItems}</Label>
          <Input
            type="range"
            min="2"
            max="6"
            value={properties.maxItems}
            onChange={(e) => onChange('maxItems', parseInt(e.target.value))}
          />
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

        {/* Show Home */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Home Icon</Label>
          <Switch 
            checked={properties.showHome} 
            onCheckedChange={(checked) => onChange('showHome', checked)}
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

        {/* Collapsible */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Collapsible</Label>
          <Switch 
            checked={properties.collapsible} 
            onCheckedChange={(checked) => onChange('collapsible', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateBreadcrumbCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveBreadcrumbPreview({ properties }: { properties: BreadcrumbProperties }) {
  const getSeparatorIcon = () => {
    switch (properties.separatorType) {
      case 'slash':
        return <Slash className="h-4 w-4" />;
      case 'arrow':
        return <ArrowRight className="h-4 w-4" />;
      default:
        return <ChevronRight className="h-4 w-4" />;
    }
  };

  const breadcrumbItems = [
    { label: 'Home', icon: Home, href: '/' },
    { label: 'Dashboard', icon: Database, href: '/dashboard' },
    { label: 'Projects', icon: Folder, href: '/projects' },
    { label: 'React App', icon: FolderOpen, href: '/projects/react-app' },
    { label: 'Components', icon: Folder, href: '/projects/react-app/components' },
    { label: 'Button', icon: FileText, href: '/projects/react-app/components/button' },
    { label: 'Documentation', icon: File },
    { label: 'Current Page', icon: FileText },
  ];

  const visibleItems = breadcrumbItems.slice(0, properties.itemCount);
  const shouldCollapse = properties.collapsible && visibleItems.length > properties.maxItems;

  const renderBreadcrumb = () => {
    let itemsToShow = visibleItems;
    let showEllipsis = false;

    if (shouldCollapse) {
      const firstItems = visibleItems.slice(0, 1);
      const lastItems = visibleItems.slice(-(properties.maxItems - 2));
      itemsToShow = [...firstItems, ...lastItems];
      showEllipsis = true;
    }

    return (
      <Breadcrumb>
        <BreadcrumbList>
          {shouldCollapse && itemsToShow.length > 2 && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href={itemsToShow[0].href || '#'}>
                  {properties.showHome && properties.showIcons && (
                    React.createElement(itemsToShow[0].icon, { className: "h-4 w-4 mr-1" })
                  )}
                  {itemsToShow[0].label}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>{getSeparatorIcon()}</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbEllipsis />
              </BreadcrumbItem>
              <BreadcrumbSeparator>{getSeparatorIcon()}</BreadcrumbSeparator>
              {itemsToShow.slice(1).map((item, index) => {
                const isLast = index === itemsToShow.slice(1).length - 1;
                const ItemIcon = item.icon;
                
                return (
                  <React.Fragment key={index}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>
                          {properties.showIcons && (
                            <ItemIcon className="h-4 w-4 mr-1" />
                          )}
                          {item.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.href || '#'}>
                          {properties.showIcons && (
                            <ItemIcon className="h-4 w-4 mr-1" />
                          )}
                          {item.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator>{getSeparatorIcon()}</BreadcrumbSeparator>}
                  </React.Fragment>
                );
              })}
            </>
          )}

          {!shouldCollapse && itemsToShow.map((item, index) => {
            const isLast = index === itemsToShow.length - 1;
            const ItemIcon = item.icon;
            
            return (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>
                      {properties.showIcons && (
                        <ItemIcon className="h-4 w-4 mr-1" />
                      )}
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href || '#'}>
                      {(index === 0 && properties.showHome && properties.showIcons) || (index > 0 && properties.showIcons) ? (
                        <ItemIcon className="h-4 w-4 mr-1" />
                      ) : null}
                      {item.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator>{getSeparatorIcon()}</BreadcrumbSeparator>}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="space-y-8 w-full max-w-4xl">
        {/* Main Example */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Navigation Breadcrumb</h3>
          <div className="flex justify-center">
            {renderBreadcrumb()}
          </div>
        </div>

        <Separator />

        {/* Use Case Examples */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-center">Common Patterns</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">File System Navigation</h4>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">
                      <Home className="h-4 w-4 mr-1" />
                      Root
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Documents</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Projects</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>README.md</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">E-commerce Category</h4>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Store</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator><Slash className="h-4 w-4" /></BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Electronics</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator><Slash className="h-4 w-4" /></BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Smartphones</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator><Slash className="h-4 w-4" /></BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage>iPhone 15 Pro</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Admin Panel</h4>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">
                      <Settings className="h-4 w-4 mr-1" />
                      Admin
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator><ArrowRight className="h-4 w-4" /></BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">
                      <Users className="h-4 w-4 mr-1" />
                      Users
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator><ArrowRight className="h-4 w-4" /></BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage>John Doe</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate code function
function generateBreadcrumbCode(props: BreadcrumbProperties): string {
  const separator = props.separatorType === 'slash' ? '<Slash className="h-4 w-4" />' : 
                   props.separatorType === 'arrow' ? '<ArrowRight className="h-4 w-4" />' : 
                   '<ChevronRight className="h-4 w-4" />';

  return `<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="#">
        ${props.showHome && props.showIcons ? '<Home className="h-4 w-4 mr-1" />' : ''}
        Home
      </BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator>
      ${separator}
    </BreadcrumbSeparator>
    <BreadcrumbItem>
      <BreadcrumbLink href="#">
        ${props.showIcons ? '<Folder className="h-4 w-4 mr-1" />' : ''}
        Category
      </BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator>
      ${separator}
    </BreadcrumbSeparator>
    ${props.collapsible && props.itemCount > props.maxItems ? `<BreadcrumbItem>
      <BreadcrumbEllipsis />
    </BreadcrumbItem>
    <BreadcrumbSeparator>
      ${separator}
    </BreadcrumbSeparator>` : ''}
    <BreadcrumbItem>
      <BreadcrumbPage>Current Page</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`;
}

export default function BreadcrumbComponentPage() {
  const [breadcrumbProperties, setBreadcrumbProperties] = useState<BreadcrumbProperties>({
    separatorType: 'chevron',
    maxItems: 4,
    showHome: true,
    collapsible: true,
    itemCount: 6,
    size: 'default',
    variant: 'default',
    showIcons: true,
  });

  const handlePropertyChange = (key: keyof BreadcrumbProperties, value: any) => {
    setBreadcrumbProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setBreadcrumbProperties({
      separatorType: 'chevron',
      maxItems: 4,
      showHome: true,
      collapsible: true,
      itemCount: 6,
      size: 'default',
      variant: 'default',
      showIcons: true,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Breadcrumb</h1>
          <Badge variant="outline">Layout Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Displays the path to the current resource using a hierarchy of links. Perfect for showing 
          navigation context and helping users understand their location within your application.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Explore different breadcrumb configurations and patterns. Customize properties below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LiveBreadcrumbPreview properties={breadcrumbProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <BreadcrumbPropertiesPanel 
                    properties={breadcrumbProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Smart Truncation
              </CardTitle>
              <CardDescription>
                Automatic ellipsis for long paths
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatically collapses long breadcrumb trails with ellipsis while keeping first and last items visible for context.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChevronRight className="h-5 w-5" />
                Custom Separators
              </CardTitle>
              <CardDescription>
                Flexible separator styling options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Choose from chevrons, slashes, arrows, or custom icons to match your design language and visual hierarchy.
              </p>
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
              <CardTitle>File Management</CardTitle>
              <CardDescription>
                Document browsers, file explorers, media galleries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Show folder hierarchy with home icon, use slash separators for familiar file path feel, 
                and enable truncation for deep folder structures.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>E-commerce Navigation</CardTitle>
              <CardDescription>
                Product categories, search results, checkout flows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Guide users through category hierarchies, show current product context, 
                and provide easy navigation back to broader categories.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin Dashboards</CardTitle>
              <CardDescription>
                Settings panels, user management, system configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Show administrative context with icons, use arrow separators for clear hierarchy, 
                and maintain breadcrumbs across complex workflows.
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
                Includes proper ARIA labels, semantic navigation structure, and screen reader support for breadcrumb context.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">SEO Benefits</h4>
              <p className="text-sm text-muted-foreground">
                Structured data markup for breadcrumbs improves search engine understanding and may display rich snippets.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Mobile Considerations</h4>
              <p className="text-sm text-muted-foreground">
                Responsive design with appropriate touch targets and smart truncation for smaller screens.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 