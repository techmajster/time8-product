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
import { Slider } from '@/components/ui/slider';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  GripVertical,
  GripHorizontal,
  FileText,
  Folder,
  Settings,
  Terminal,
  Eye,
  Code,
  Database,
  Monitor,
  Layers,
  Search,
  Mail,
  Calendar,
  Users,
  BarChart3
} from 'lucide-react';

// Properties interface
interface ResizableProperties {
  direction: 'horizontal' | 'vertical';
  panelCount: 2 | 3 | 4;
  showHandle: boolean;
  autoSaveId: string;
  minSize: number;
  maxSize: number;
  defaultSize: number;
  layout: 'ide' | 'dashboard' | 'email' | 'split';
  collapsible: boolean;
  nested: boolean;
}

// Properties Panel Component
function ResizablePropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: ResizableProperties;
  onChange: (key: keyof ResizableProperties, value: any) => void;
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
        {/* Direction */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Direction</Label>
          <Select value={properties.direction} onValueChange={(value) => onChange('direction', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Layout Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Layout Type</Label>
          <Select value={properties.layout} onValueChange={(value) => onChange('layout', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ide">IDE Layout</SelectItem>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="email">Email Client</SelectItem>
              <SelectItem value="split">Simple Split</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Panel Count */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Panel Count</Label>
          <Select value={properties.panelCount.toString()} onValueChange={(value) => onChange('panelCount', parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Panels</SelectItem>
              <SelectItem value="3">3 Panels</SelectItem>
              <SelectItem value="4">4 Panels</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Size (%): {properties.defaultSize}</Label>
          <Slider
            value={[properties.defaultSize]}
            onValueChange={(value) => onChange('defaultSize', value[0])}
            max={80}
            min={10}
            step={5}
            className="w-full"
          />
        </div>

        {/* Min Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Min Size (%): {properties.minSize}</Label>
          <Slider
            value={[properties.minSize]}
            onValueChange={(value) => onChange('minSize', value[0])}
            max={50}
            min={5}
            step={5}
            className="w-full"
          />
        </div>

        {/* Max Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Max Size (%): {properties.maxSize}</Label>
          <Slider
            value={[properties.maxSize]}
            onValueChange={(value) => onChange('maxSize', value[0])}
            max={95}
            min={50}
            step={5}
            className="w-full"
          />
        </div>

        {/* Show Handle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Handle</Label>
          <Switch 
            checked={properties.showHandle} 
            onCheckedChange={(checked) => onChange('showHandle', checked)}
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

        {/* Nested */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Nested Panels</Label>
          <Switch 
            checked={properties.nested} 
            onCheckedChange={(checked) => onChange('nested', checked)}
          />
        </div>

        {/* Auto Save ID */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Auto Save ID</Label>
          <Input
            value={properties.autoSaveId}
            onChange={(e) => onChange('autoSaveId', e.target.value)}
            placeholder="layout-id"
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateResizableCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveResizablePreview({ properties }: { properties: ResizableProperties }) {
  const getLayoutByType = () => {
    switch (properties.layout) {
      case 'ide':
        return (
          <ResizablePanelGroup 
            direction={properties.direction}
            autoSaveId={properties.autoSaveId || 'ide-layout'}
            className="h-full rounded-lg border"
          >
            <ResizablePanel 
              defaultSize={20} 
              minSize={properties.minSize}
              maxSize={40}
              collapsible={properties.collapsible}
            >
              <div className="h-full p-4 bg-muted/20">
                <div className="flex items-center space-x-2 mb-4">
                  <Folder className="h-4 w-4" />
                  <span className="font-medium">Explorer</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>App.tsx</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>index.css</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Folder className="h-3 w-3" />
                    <span>components/</span>
                  </div>
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle={properties.showHandle} />
            
            <ResizablePanel 
              defaultSize={properties.defaultSize}
              minSize={properties.minSize}
              maxSize={properties.maxSize}
            >
              {properties.nested ? (
                <ResizablePanelGroup direction={properties.direction === 'horizontal' ? 'vertical' : 'horizontal'}>
                  <ResizablePanel defaultSize={70}>
                    <div className="h-full p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Code className="h-4 w-4" />
                        <span className="font-medium">Editor</span>
                      </div>
                      <div className="bg-muted/30 rounded p-4 font-mono text-sm">
                        <div className="text-blue-600">import</div>
                        <div className="text-gray-600">{'// Your code here'}</div>
                        <div className="text-green-600">function App() {'{'}</div>
                        <div className="ml-4">return &lt;div&gt;Hello&lt;/div&gt;</div>
                        <div className="text-green-600">{'}'}</div>
                      </div>
                    </div>
                  </ResizablePanel>
                  
                  <ResizableHandle withHandle={properties.showHandle} />
                  
                  <ResizablePanel defaultSize={30}>
                    <div className="h-full p-4 bg-muted/20">
                      <div className="flex items-center space-x-2 mb-4">
                        <Terminal className="h-4 w-4" />
                        <span className="font-medium">Terminal</span>
                      </div>
                      <div className="bg-black text-green-400 rounded p-2 font-mono text-xs">
                        <div>$ npm run dev</div>
                        <div>✓ Ready in 1.2s</div>
                      </div>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <div className="h-full p-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Code className="h-4 w-4" />
                    <span className="font-medium">Main Content</span>
                  </div>
                  <div className="bg-muted/30 rounded p-4 h-32">
                    <p className="text-sm text-muted-foreground">
                      Main content area. This panel can be resized by dragging the handle.
                    </p>
                  </div>
                </div>
              )}
            </ResizablePanel>
            
            {properties.panelCount >= 3 && (
              <>
                <ResizableHandle withHandle={properties.showHandle} />
                <ResizablePanel 
                  defaultSize={25}
                  minSize={properties.minSize}
                  maxSize={50}
                  collapsible={properties.collapsible}
                >
                  <div className="h-full p-4 bg-muted/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <Settings className="h-4 w-4" />
                      <span className="font-medium">Properties</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="p-2 bg-background rounded">Property 1</div>
                      <div className="p-2 bg-background rounded">Property 2</div>
                      <div className="p-2 bg-background rounded">Property 3</div>
                    </div>
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        );

      case 'dashboard':
        return (
          <ResizablePanelGroup 
            direction={properties.direction}
            autoSaveId={properties.autoSaveId || 'dashboard-layout'}
            className="h-full rounded-lg border"
          >
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <div className="h-full p-4 bg-muted/20">
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium">Analytics</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-background rounded p-3">
                    <div className="text-2xl font-bold">1,234</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  <div className="bg-background rounded p-3">
                    <div className="text-2xl font-bold">567</div>
                    <div className="text-sm text-muted-foreground">Active Sessions</div>
                  </div>
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle={properties.showHandle} />
            
            <ResizablePanel defaultSize={50}>
              <div className="h-full p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Monitor className="h-4 w-4" />
                  <span className="font-medium">Main Dashboard</span>
                </div>
                <div className="grid grid-cols-2 gap-4 h-32">
                  <div className="bg-muted/30 rounded p-4">Chart 1</div>
                  <div className="bg-muted/30 rounded p-4">Chart 2</div>
                  <div className="bg-muted/30 rounded p-4">Chart 3</div>
                  <div className="bg-muted/30 rounded p-4">Chart 4</div>
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle={properties.showHandle} />
            
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <div className="h-full p-4 bg-muted/20">
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Activity Feed</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-background rounded">User joined</div>
                  <div className="p-2 bg-background rounded">New order</div>
                  <div className="p-2 bg-background rounded">Payment received</div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        );

      case 'email':
        return (
          <ResizablePanelGroup 
            direction="horizontal"
            autoSaveId={properties.autoSaveId || 'email-layout'}
            className="h-full rounded-lg border"
          >
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30} collapsible>
              <div className="h-full p-4 bg-muted/20">
                <div className="flex items-center space-x-2 mb-4">
                  <Folder className="h-4 w-4" />
                  <span className="font-medium">Folders</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="p-2 bg-background rounded">Inbox (12)</div>
                  <div className="p-2 hover:bg-background rounded">Sent</div>
                  <div className="p-2 hover:bg-background rounded">Drafts</div>
                  <div className="p-2 hover:bg-background rounded">Trash</div>
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle={properties.showHandle} />
            
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              <div className="h-full p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">Message List</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="font-medium">John Doe</div>
                    <div className="text-sm text-muted-foreground">Project Update</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <div className="font-medium">Jane Smith</div>
                    <div className="text-sm text-muted-foreground">Meeting Tomorrow</div>
                  </div>
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle={properties.showHandle} />
            
            <ResizablePanel defaultSize={50}>
              <div className="h-full p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">Message Preview</span>
                </div>
                <div className="bg-muted/30 rounded p-4 h-40">
                  <div className="mb-2">
                    <div className="font-medium">Subject: Project Update</div>
                    <div className="text-sm text-muted-foreground">From: john@example.com</div>
                  </div>
                  <div className="text-sm">
                    Hi team, I wanted to provide an update on our current project status...
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        );

      default: // split
        return (
          <ResizablePanelGroup 
            direction={properties.direction}
            autoSaveId={properties.autoSaveId || 'split-layout'}
            className="h-full rounded-lg border"
          >
            <ResizablePanel 
              defaultSize={properties.defaultSize}
              minSize={properties.minSize}
              maxSize={properties.maxSize}
              collapsible={properties.collapsible}
            >
              <div className="h-full p-4 bg-blue-50/50">
                <h3 className="font-medium mb-2">Panel 1</h3>
                <p className="text-sm text-muted-foreground">
                  This is the first panel. You can resize it by dragging the handle between panels.
                </p>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle={properties.showHandle} />
            
            <ResizablePanel 
              defaultSize={100 - properties.defaultSize}
              minSize={properties.minSize}
              maxSize={properties.maxSize}
            >
              <div className="h-full p-4 bg-green-50/50">
                <h3 className="font-medium mb-2">Panel 2</h3>
                <p className="text-sm text-muted-foreground">
                  This is the second panel. The panels maintain their proportions and remember sizes.
                </p>
              </div>
            </ResizablePanel>

            {properties.panelCount >= 3 && (
              <>
                <ResizableHandle withHandle={properties.showHandle} />
                <ResizablePanel 
                  defaultSize={25}
                  minSize={properties.minSize}
                  maxSize={50}
                  collapsible={properties.collapsible}
                >
                  <div className="h-full p-4 bg-yellow-50/50">
                    <h3 className="font-medium mb-2">Panel 3</h3>
                    <p className="text-sm text-muted-foreground">
                      Additional panel for more complex layouts.
                    </p>
                  </div>
                </ResizablePanel>
              </>
            )}

            {properties.panelCount === 4 && (
              <>
                <ResizableHandle withHandle={properties.showHandle} />
                <ResizablePanel 
                  defaultSize={20}
                  minSize={properties.minSize}
                  maxSize={40}
                  collapsible={properties.collapsible}
                >
                  <div className="h-full p-4 bg-purple-50/50">
                    <h3 className="font-medium mb-2">Panel 4</h3>
                    <p className="text-sm text-muted-foreground">
                      Fourth panel for complex multi-pane layouts.
                    </p>
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-8">
      <div className="space-y-8 w-full max-w-5xl">
        {/* Main Resizable Layout */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center">Interactive Resizable Layout</h3>
          <div className="h-96 w-full">
            {getLayoutByType()}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Drag the handles to resize panels. Layout state is automatically saved and restored.
          </p>
        </div>

        <Separator />

        {/* Example Patterns */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-center">Common Layout Patterns</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Simple Two-Pane */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Simple Two-Pane</h4>
              <div className="h-32 border rounded">
                <ResizablePanelGroup direction="horizontal">
                  <ResizablePanel defaultSize={40}>
                    <div className="h-full bg-blue-100/50 p-2 text-xs">
                      Sidebar
                    </div>
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={60}>
                    <div className="h-full bg-green-100/50 p-2 text-xs">
                      Main Content
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </div>

            {/* Vertical Split */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Vertical Split</h4>
              <div className="h-32 border rounded">
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={60}>
                    <div className="h-full bg-yellow-100/50 p-2 text-xs">
                      Top Panel
                    </div>
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={40}>
                    <div className="h-full bg-purple-100/50 p-2 text-xs">
                      Bottom Panel
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate code function
function generateResizableCode(props: ResizableProperties): string {
  return `<ResizablePanelGroup 
  direction="${props.direction}"
  ${props.autoSaveId ? `autoSaveId="${props.autoSaveId}"` : ''}
  className="h-full rounded-lg border"
>
  <ResizablePanel 
    defaultSize={${props.defaultSize}}
    minSize={${props.minSize}}
    maxSize={${props.maxSize}}
    ${props.collapsible ? 'collapsible' : ''}
  >
    <div className="h-full p-4">
      Panel 1 Content
    </div>
  </ResizablePanel>
  
  <ResizableHandle${props.showHandle ? ' withHandle' : ''} />
  
  <ResizablePanel defaultSize={${100 - props.defaultSize}}>
    <div className="h-full p-4">
      Panel 2 Content
    </div>
  </ResizablePanel>
</ResizablePanelGroup>`;
}

export default function ResizableComponentPage() {
  const [resizableProperties, setResizableProperties] = useState<ResizableProperties>({
    direction: 'horizontal',
    panelCount: 2,
    showHandle: true,
    autoSaveId: 'example-layout',
    minSize: 10,
    maxSize: 80,
    defaultSize: 50,
    layout: 'split',
    collapsible: false,
    nested: false,
  });

  const handlePropertyChange = (key: keyof ResizableProperties, value: any) => {
    setResizableProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setResizableProperties({
      direction: 'horizontal',
      panelCount: 2,
      showHandle: true,
      autoSaveId: 'example-layout',
      minSize: 10,
      maxSize: 80,
      defaultSize: 50,
      layout: 'split',
      collapsible: false,
      nested: false,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Resizable</h1>
          <Badge variant="outline">Layout Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Accessible resizable panel groups and layouts. Create professional applications with 
          draggable panel divisions, persistent sizing, and responsive design.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Explore different resizable layout configurations. Drag handles to resize panels and see persistence in action.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px] p-4">
                  <LiveResizablePreview properties={resizableProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <ResizablePropertiesPanel 
                    properties={resizableProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Layout Types Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Layout Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                IDE Layout
              </CardTitle>
              <CardDescription>
                Development environment with sidebar, editor, and terminal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for code editors, development tools, and professional applications requiring 
                multiple content areas with flexible sizing.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Dashboard Layout
              </CardTitle>
              <CardDescription>
                Analytics dashboard with charts and sidebar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ideal for business intelligence tools, admin panels, and data visualization 
                applications with multiple content sections.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Client
              </CardTitle>
              <CardDescription>
                Three-pane email interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Classic three-pane layout for email clients, file browsers, and applications 
                requiring folder navigation with preview.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Simple Split
              </CardTitle>
              <CardDescription>
                Basic two or multi-panel layout
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Flexible split layout for comparison views, before/after displays, and any 
                application needing side-by-side content presentation.
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
                <GripVertical className="h-5 w-5" />
                Persistent State
              </CardTitle>
              <CardDescription>
                Automatic layout saving and restoration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Remember user preferences across sessions:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Panel sizes automatically saved</li>
                <li>• Restored on page reload</li>
                <li>• Unique layouts per page/component</li>
                <li>• Local storage persistence</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Responsive Design
              </CardTitle>
              <CardDescription>
                Mobile and desktop optimized
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                Works seamlessly across devices:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Touch-friendly drag handles</li>
                <li>• Keyboard navigation support</li>
                <li>• Responsive panel sizing</li>
                <li>• Mobile layout adaptations</li>
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
              <CardTitle>Development Tools</CardTitle>
              <CardDescription>
                Code editors and IDEs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create professional development environments with file explorers, code editors, terminal panels, 
                and debug windows. Users can customize their workspace layout and have it persist across sessions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Applications</CardTitle>
              <CardDescription>
                Analytics and business intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Build flexible dashboards where users can resize chart areas, adjust sidebar widths, and customize 
                their view of complex data. Perfect for BI tools and admin interfaces.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>
                CMS and document editing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enable users to adjust preview panes, resize editing areas, and customize their content creation 
                workflow. Ideal for CMS platforms and document editors.
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
              <h4 className="font-medium mb-2">Performance</h4>
              <p className="text-sm text-muted-foreground">
                Optimized for smooth resizing with efficient DOM updates and minimal reflows. 
                Built on react-resizable-panels for production-ready performance.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Accessibility</h4>
              <p className="text-sm text-muted-foreground">
                Full keyboard support with arrow keys for resizing, focus management, and screen reader 
                announcements for size changes and panel states.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Persistence</h4>
              <p className="text-sm text-muted-foreground">
                Automatic layout persistence using localStorage with configurable autoSaveId. 
                Panel sizes and collapsed states are saved and restored automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 