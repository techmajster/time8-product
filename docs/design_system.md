Cursor Implementation Instructions: Design System Tool
Project Goal
Create an internal design system tool for the SaaS Leave Management System that allows developers to view components, edit theme tokens, and browse icons with inline editing capabilities similar to Subframe.
Prerequisites

Existing Next.js 15.3.3 app with shadcn/ui components installed
Tailwind CSS configured
TypeScript setup

Step 1: Install Dependencies
bashpnpm add react-colorful @lucide/react cmdk
Step 2: Create Directory Structure
Create the following directory structure under app/:
app/
├── (internal)/
│   └── theme-editor/
│       ├── page.tsx
│       ├── layout.tsx
│       ├── theme/
│       │   └── page.tsx
│       ├── icons/
│       │   └── page.tsx
│       └── components/
│           ├── sidebar-nav.tsx
│           ├── overview/
│           │   └── component-grid.tsx
│           ├── theme/
│           │   ├── color-tokens.tsx
│           │   ├── typography.tsx
│           │   ├── borders.tsx
│           │   ├── corners.tsx
│           │   └── shadows.tsx
│           ├── icons/
│           │   └── icon-grid.tsx
│           └── editors/
│               ├── inline-color-picker.tsx
│               ├── inline-number-input.tsx
│               └── shadow-layer-editor.tsx
Step 3: Create the Layout
File: app/(internal)/theme-editor/layout.tsx
typescript'use client';

import { SidebarNav } from './components/sidebar-nav';

const sidebarNavItems = [
  { title: 'Overview', href: '/theme-editor' },
  { title: 'Theme', href: '/theme-editor/theme' },
  { title: 'Icons', href: '/theme-editor/icons' },
];

export default function ThemeEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 border-r bg-gray-50/50">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Theme</h2>
        </div>
        <SidebarNav items={sidebarNavItems} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-white">
        {children}
      </div>
    </div>
  );
}
Step 4: Create Sidebar Navigation Component
File: app/(internal)/theme-editor/components/sidebar-nav.tsx
typescript'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  items: {
    title: string;
    href: string;
  }[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="px-3 py-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
            pathname === item.href
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
Step 5: Create Inline Editors
File: app/(internal)/theme-editor/components/editors/inline-color-picker.tsx
typescript'use client';

import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface InlineColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function InlineColorPicker({ 
  value, 
  onChange, 
  label,
  size = 'md' 
}: InlineColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="group relative focus:outline-none">
          <div 
            className={cn(
              sizeClasses[size],
              "rounded-lg border-2 border-gray-200 cursor-pointer",
              "hover:border-gray-400 transition-all duration-200",
              "focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            )}
            style={{ backgroundColor: value }}
          />
          <div className="mt-2 text-center">
            <div className="text-xs font-medium text-gray-700">{label}</div>
            <div className="text-xs text-gray-500">{value}</div>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <HexColorPicker color={value} onChange={onChange} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="#000000"
        />
      </PopoverContent>
    </Popover>
  );
}
File: app/(internal)/theme-editor/components/editors/inline-number-input.tsx
typescript'use client';

interface InlineNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  label?: string;
}

export function InlineNumberInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = '',
  label
}: InlineNumberInputProps) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-gray-600">{label}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-16 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
    </div>
  );
}
Step 6: Create Overview Component Grid
File: app/(internal)/theme-editor/components/overview/component-grid.tsx
typescript'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';

const components = [
  { 
    name: 'Button', 
    category: 'Actions',
    preview: (
      <div className="flex gap-2">
        <Button size="sm">Primary</Button>
        <Button size="sm" variant="outline">Outline</Button>
      </div>
    )
  },
  { 
    name: 'Input', 
    category: 'Form',
    preview: <Input placeholder="Enter text..." className="max-w-xs" />
  },
  { 
    name: 'Card', 
    category: 'Layout',
    preview: (
      <Card className="p-4 w-full">
        <p className="text-sm text-gray-600">Card content</p>
      </Card>
    )
  },
  { 
    name: 'Badge', 
    category: 'Display',
    preview: (
      <div className="flex gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Error</Badge>
      </div>
    )
  },
  { 
    name: 'Checkbox', 
    category: 'Form',
    preview: (
      <div className="flex items-center gap-2">
        <Checkbox id="terms" />
        <label htmlFor="terms" className="text-sm">Accept terms</label>
      </div>
    )
  },
  { 
    name: 'Select', 
    category: 'Form',
    preview: (
      <Select>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
          <SelectItem value="2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    )
  },
  { 
    name: 'Switch', 
    category: 'Form',
    preview: <Switch />
  },
  { 
    name: 'Avatar', 
    category: 'Display',
    preview: (
      <div className="flex gap-2">
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      </div>
    )
  },
  { 
    name: 'Alert', 
    category: 'Feedback',
    preview: (
      <Alert className="max-w-sm">
        <AlertDescription>This is an alert message</AlertDescription>
      </Alert>
    )
  },
];

export function ComponentGrid() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Your component library</h1>
        <p className="text-gray-600">Browse and preview all available UI components</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {components.map((component) => (
          <div 
            key={component.name} 
            className="group border rounded-lg p-6 hover:shadow-md transition-all duration-200 hover:border-gray-300 bg-white"
          >
            <div className="mb-4 h-24 flex items-center justify-center">
              {component.preview}
            </div>
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900">{component.name}</h3>
              <p className="text-sm text-gray-500">{component.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
Step 7: Create Theme Components
File: app/(internal)/theme-editor/components/theme/color-tokens.tsx
typescript'use client';

import { useState } from 'react';
import { InlineColorPicker } from '../editors/inline-color-picker';

export function ColorTokens() {
  const [colors, setColors] = useState({
    brand: {
      50: '#ecfccb',
      100: '#d9f99d',
      200: '#bef264',
      300: '#a3e635',
      400: '#84cc16',
      500: '#65a30d',
      600: '#4d7c0f',
      700: '#3f6212',
      800: '#365314',
      900: '#1a2e05',
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    warning: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#eab308',
      600: '#ca8a04',
      700: '#a16207',
      800: '#854d0e',
      900: '#713f12',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    }
  });

  const colorGroups = Object.entries(colors);

  return (
    <div className="space-y-12">
      <div>
        <h3 className="text-lg font-medium mb-6">Color Tokens</h3>
        
        {colorGroups.map(([groupName, groupColors]) => (
          <div key={groupName} className="mb-8">
            <h4 className="text-sm font-medium text-gray-700 mb-4 capitalize">
              {groupName}
            </h4>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(groupColors).map(([shade, color]) => (
                <InlineColorPicker
                  key={`${groupName}-${shade}`}
                  value={color}
                  onChange={(newColor) => 
                    setColors(prev => ({
                      ...prev,
                      [groupName]: { ...prev[groupName], [shade]: newColor }
                    }))
                  }
                  label={`${shade}`}
                  size="md"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
File: app/(internal)/theme-editor/components/theme/typography.tsx
typescript'use client';

import { Button } from '@/components/ui/button';

export function Typography() {
  const textStyles = [
    { 
      name: 'Display', 
      size: '48px', 
      weight: '700', 
      lineHeight: '1.2',
      example: 'Display Text' 
    },
    { 
      name: 'Heading 1', 
      size: '32px', 
      weight: '600', 
      lineHeight: '1.25',
      example: 'Heading 1' 
    },
    { 
      name: 'Heading 2', 
      size: '24px', 
      weight: '600', 
      lineHeight: '1.3',
      example: 'Heading 2' 
    },
    { 
      name: 'Heading 3', 
      size: '20px', 
      weight: '600', 
      lineHeight: '1.4',
      example: 'Heading 3' 
    },
    { 
      name: 'Body Large', 
      size: '16px', 
      weight: '400', 
      lineHeight: '1.5',
      example: 'Body text large' 
    },
    { 
      name: 'Body', 
      size: '14px', 
      weight: '400', 
      lineHeight: '1.5',
      example: 'Body text regular' 
    },
    { 
      name: 'Body Bold', 
      size: '14px', 
      weight: '600', 
      lineHeight: '1.5',
      example: 'Body text bold' 
    },
    { 
      name: 'Caption', 
      size: '12px', 
      weight: '400', 
      lineHeight: '1.4',
      example: 'Caption text' 
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium">Typography</h3>
        <Button variant="outline" size="sm">
          Upload font
        </Button>
      </div>
      
      <div className="space-y-4">
        {textStyles.map((style) => (
          <div 
            key={style.name} 
            className="flex items-baseline justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">{style.name}</div>
              <div 
                style={{ 
                  fontSize: style.size, 
                  fontWeight: style.weight,
                  lineHeight: style.lineHeight
                }}
              >
                {style.example}
              </div>
            </div>
            <div className="text-xs text-gray-400 text-right">
              <div>{style.size}</div>
              <div>Weight: {style.weight}</div>
              <div>Line: {style.lineHeight}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
File: app/(internal)/theme-editor/components/theme/borders.tsx
typescript'use client';

import { useState } from 'react';
import { InlineColorPicker } from '../editors/inline-color-picker';
import { InlineNumberInput } from '../editors/inline-number-input';

export function Borders() {
  const [borders, setBorders] = useState([
    { 
      name: 'Primary Border Style', 
      width: 1, 
      style: 'solid', 
      color: '#e5e5e5ff' 
    },
    { 
      name: 'Neutral Border Style', 
      width: 1, 
      style: 'solid', 
      color: '#a5a5a5ff' 
    },
  ]);

  return (
    <div>
      <h3 className="text-lg font-medium mb-6">Borders</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {borders.map((border, index) => (
          <div key={border.name} className="p-6 border rounded-lg bg-white">
            <div className="flex items-start gap-4 mb-4">
              <div 
                className="w-24 h-24 rounded-lg bg-gray-50"
                style={{ 
                  border: `${border.width}px ${border.style} ${border.color}` 
                }}
              />
              <div className="flex-1">
                <h4 className="font-medium mb-1">{border.name}</h4>
                <p className="text-sm text-gray-500">
                  {border.color} {border.width} solid
                </p>
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-4">
                <select 
                  value={border.style}
                  onChange={(e) => {
                    const newBorders = [...borders];
                    newBorders[index].style = e.target.value;
                    setBorders(newBorders);
                  }}
                  className="flex-1 px-3 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="solid">solid</option>
                  <option value="dashed">dashed</option>
                  <option value="dotted">dotted</option>
                </select>
                
                <InlineNumberInput
                  value={border.width}
                  onChange={(value) => {
                    const newBorders = [...borders];
                    newBorders[index].width = value;
                    setBorders(newBorders);
                  }}
                  min={0}
                  max={10}
                  suffix="px"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <InlineColorPicker
                  value={border.color.slice(0, 7)}
                  onChange={(color) => {
                    const newBorders = [...borders];
                    newBorders[index].color = color + 'ff';
                    setBorders(newBorders);
                  }}
                  label="Border color"
                  size="sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
File: app/(internal)/theme-editor/components/theme/corners.tsx
typescript'use client';

import { useState } from 'react';
import { InlineNumberInput } from '../editors/inline-number-input';

export function Corners() {
  const [corners, setCorners] = useState([
    { name: 'None', value: 0 },
    { name: 'Rounded Small', value: 4 },
    { name: 'Rounded Medium', value: 8 },
    { name: 'Rounded Large', value: 16 },
    { name: 'Rounded XL', value: 24 },
  ]);

  return (
    <div>
      <h3 className="text-lg font-medium mb-6">Corners</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {corners.map((corner, index) => (
          <div key={corner.name} className="text-center">
            <div 
              className="w-24 h-24 bg-gray-200 border-2 border-gray-300 mx-auto mb-3"
              style={{ borderRadius: `${corner.value}px` }}
            />
            <h4 className="text-sm font-medium mb-1">{corner.name}</h4>
            <div className="text-xs text-gray-500 mb-2">{corner.value}</div>
            <InlineNumberInput
              value={corner.value}
              onChange={(value) => {
                const newCorners = [...corners];
                newCorners[index].value = value;
                setCorners(newCorners);
              }}
              min={0}
              max={48}
              suffix="px"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
File: app/(internal)/theme-editor/components/theme/shadows.tsx
typescript'use client';

import { useState } from 'react';
import { InlineNumberInput } from '../editors/inline-number-input';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';

interface ShadowLayer {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

interface Shadow {
  name: string;
  layers: ShadowLayer[];
}

export function Shadows() {
  const [shadows, setShadows] = useState<Shadow[]>([
    { 
      name: 'Shadow Small', 
      layers: [
        { x: 0, y: 1, blur: 2, spread: 0, color: '#000000', opacity: 5 }
      ]
    },
    { 
      name: 'Shadow Medium', 
      layers: [
        { x: 0, y: 4, blur: 6, spread: -1, color: '#000000', opacity: 10 },
        { x: 0, y: 2, blur: 4, spread: -1, color: '#000000', opacity: 5 }
      ]
    },
    { 
      name: 'Shadow Large', 
      layers: [
        { x: 0, y: 20, blur: 25, spread: -5, color: '#000000', opacity: 10 },
        { x: 0, y: 10, blur: 10, spread: -5, color: '#000000', opacity: 4 }
      ]
    },
  ]);

  const generateShadowCSS = (shadow: Shadow) => {
    return shadow.layers
      .map(layer => 
        `${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px rgba(0, 0, 0, ${layer.opacity / 100})`
      )
      .join(', ');
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-6">Shadows</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shadows.map((shadow, shadowIndex) => (
          <div key={shadow.name} className="border rounded-lg p-6 bg-white">
            <div className="mb-4">
              <div 
                className="w-full h-32 bg-white rounded-lg border flex items-center justify-center"
                style={{ boxShadow: generateShadowCSS(shadow) }}
              >
                <span className="text-sm text-gray-500">Preview</span>
              </div>
            </div>
            
            <h4 className="font-medium mb-4">{shadow.name}</h4>
            
            <div className="space-y-4">
              {shadow.layers.map((layer, layerIndex) => (
                <div key={layerIndex} className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Layer {layerIndex + 1}</span>
                    {shadow.layers.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newShadows = [...shadows];
                          newShadows[shadowIndex].layers = shadow.layers.filter((_, i) => i !== layerIndex);
                          setShadows(newShadows);
                        }}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <InlineNumberInput
                      label="X"
                      value={layer.x}
                      onChange={(value) => {
                        const newShadows = [...shadows];
                        newShadows[shadowIndex].layers[layerIndex].x = value;
                        setShadows(newShadows);
                      }}
                      min={-50}
                      max={50}
                    />
                    <InlineNumberInput
                      label="Y"
                      value={layer.y}
                      onChange={(value) => {
                        const newShadows = [...shadows];
                        newShadows[shadowIndex].layers[layerIndex].y = value;
                        setShadows(newShadows);
                      }}
                      min={-50}
                      max={50}
                    />
                    <InlineNumberInput
                      label="Blur"
                      value={layer.blur}
                      onChange={(value) => {
                        const newShadows = [...shadows];
                        newShadows[shadowIndex].layers[layerIndex].blur = value;
                        setShadows(newShadows);
                      }}
                      min={0}
                      max={100}
                    />
                    <InlineNumberInput
                      label="Spread"
                      value={layer.spread}
                      onChange={(value) => {
                        const newShadows = [...shadows];
                        newShadows[shadowIndex].layers[layerIndex].spread = value;
                        setShadows(newShadows);
                      }}
                      min={-50}
                      max={50}
                    />
                  </div>
                  
                  <InlineNumberInput
                    label="Opacity"
                    value={layer.opacity}
                    onChange={(value) => {
                      const newShadows = [...shadows];
                      newShadows[shadowIndex].layers[layerIndex].opacity = value;
                      setShadows(newShadows);
                    }}
                    min={0}
                    max={100}
                    suffix="%"
                  />
                </div>
              ))}
              
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const newShadows = [...shadows];
                  newShadows[shadowIndex].layers.push({
                    x: 0, y: 4, blur: 6, spread: -1, color: '#000000', opacity: 10
                  });
                  setShadows(newShadows);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Layer
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
Step 8: Create Icons Grid
File: app/(internal)/theme-editor/components/icons/icon-grid.tsx
typescript'use client';

import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function IconGrid() {
  const [search, setSearch] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  // Filter out non-icon exports
  const icons = Object.entries(LucideIcons).filter(
    ([name, component]) => 
      typeof component === 'function' && 
      name !== 'createLucideIcon' &&
      name !== 'default' &&
      !name.startsWith('Lucide')
  );

  const filteredIcons = icons.filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const copyToClipboard = (iconName: string) => {
    const importStatement = `import { ${iconName} } from 'lucide-react';`;
    navigator.clipboard.writeText(importStatement);
    setSelectedIcon(iconName);
    setTimeout(() => setSelectedIcon(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Icons</h1>
        <p className="text-gray-600 mb-4">lucide-react</p>
        
        <Input
          type="text"
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        {filteredIcons.length} icons found
      </div>
      
      <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
        {filteredIcons.map(([name, Icon]) => (
          <button
            key={name}
            onClick={() => copyToClipboard(name)}
            className={cn(
              "p-4 border rounded-lg transition-all duration-200",
              "hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              selectedIcon === name && "bg-green-50 border-green-500"
            )}
            title={name}
          >
            <Icon className="w-5 h-5 mx-auto mb-1" />
            <div className="text-xs text-gray-600 truncate">
              {name}
            </div>
            {selectedIcon === name && (
              <div className="text-xs text-green-600 mt-1">Copied!</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
Step 9: Create Page Routes
File: app/(internal)/theme-editor/page.tsx
typescriptimport { ComponentGrid } from './components/overview/component-grid';

export default function ThemeEditorPage() {
  return <ComponentGrid />;
}
File: app/(internal)/theme-editor/theme/page.tsx
typescriptimport { ColorTokens } from '../components/theme/color-tokens';
import { Typography } from '../components/theme/typography';
import { Borders } from '../components/theme/borders';
import { Corners } from '../components/theme/corners';
import { Shadows } from '../components/theme/shadows';

export default function ThemePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Theme</h1>
      </div>
      
      <div className="space-y-16">
        <ColorTokens />
        <Typography />
        <Borders />
        <Corners />
        <Shadows />
      </div>
    </div>
  );
}
File: app/(internal)/theme-editor/icons/page.tsx
typescriptimport { IconGrid } from '../components/icons/icon-grid';

export default function IconsPage() {
  return <IconGrid />;
}
Step 10: Add Access Control (Optional)
Add middleware to protect the internal route:
File: middleware.ts (update existing or create new)
typescriptimport { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if the path starts with /theme-editor
  if (request.nextUrl.pathname.startsWith('/theme-editor')) {
    // Add your authentication check here
    // For now, we'll just check for a specific header or cookie
    const isInternalUser = request.cookies.get('internal-access') === 'true';
    
    if (!isInternalUser) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/theme-editor/:path*',
};
Step 11: Import Missing Utilities
Make sure you have the cn utility in your lib/utils.ts:
typescriptimport { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
Testing Instructions

Navigate to /theme-editor to see the component overview
Click on "Theme" in the sidebar to edit colors, typography, borders, corners, and shadows
Click on "Icons" to browse and search Lucide icons
Test inline editing by clicking on color swatches and adjusting values
Verify that all interactive elements work properly

Next Steps
After implementing the basic version:

Add persistence by saving theme configurations to Supabase
Add export functionality to generate CSS variables or Tailwind config
Add more advanced features like gradient editor, animation presets
Implement theme presets and the ability to switch between them
Add version control for theme changes

This implementation provides a solid foundation for your internal design system tool with inline editing capabilities similar to Subframe.