"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Circle, Plus, Download, Trash2, Settings, ArrowRight, Save, Edit } from "lucide-react"

export default function ComponentsShowcase() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const handleLoadingDemo = (key: string) => {
    setLoadingStates(prev => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [key]: false }))
    }, 2000)
  }

  const ButtonGrid = ({ variant, title, description }: { 
    variant: "default" | "secondary" | "ghost" | "link" | "outline" | "destructive", 
    title: string, 
    description: string 
  }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-4">
          {/* Header Row */}
          <div className="font-medium text-sm text-muted-foreground">State/Size</div>
          <div className="font-medium text-sm text-muted-foreground text-center">Small</div>
          <div className="font-medium text-sm text-muted-foreground text-center">Default</div>
          <div className="font-medium text-sm text-muted-foreground text-center">Large</div>
          <div className="font-medium text-sm text-muted-foreground text-center">Icon</div>

          {/* Default State */}
          <div className="font-medium text-sm text-muted-foreground">Default</div>
          <Button variant={variant} size="sm">Button</Button>
          <Button variant={variant} size="default">Button</Button>
          <Button variant={variant} size="lg">Button</Button>
          <Button variant={variant} size="icon">
            <Circle className="h-4 w-4" />
          </Button>

          {/* Hover State (visual only) */}
          <div className="font-medium text-sm text-muted-foreground">Hover</div>
          <div className="text-xs text-muted-foreground col-span-4 flex items-center">
            Hover over buttons above to see hover state
          </div>

          {/* Focus State (visual only) */}
          <div className="font-medium text-sm text-muted-foreground">Focus</div>
          <div className="text-xs text-muted-foreground col-span-4 flex items-center">
            Tab to buttons or click to see focus ring
          </div>

          {/* Disabled State */}
          <div className="font-medium text-sm text-muted-foreground">Disabled</div>
          <Button variant={variant} size="sm" disabled>Button</Button>
          <Button variant={variant} size="default" disabled>Button</Button>
          <Button variant={variant} size="lg" disabled>Button</Button>
          <Button variant={variant} size="icon" disabled>
            <Circle className="h-4 w-4" />
          </Button>

          {/* Loading State */}
          <div className="font-medium text-sm text-muted-foreground">Loading</div>
          <Button 
            variant={variant} 
            size="sm" 
            loading={loadingStates[`${variant}-sm`]}
            onClick={() => handleLoadingDemo(`${variant}-sm`)}
          >
            Button
          </Button>
          <Button 
            variant={variant} 
            size="default" 
            loading={loadingStates[`${variant}-default`]}
            onClick={() => handleLoadingDemo(`${variant}-default`)}
          >
            Button
          </Button>
          <Button 
            variant={variant} 
            size="lg" 
            loading={loadingStates[`${variant}-lg`]}
            onClick={() => handleLoadingDemo(`${variant}-lg`)}
          >
            Button
          </Button>
          <Button 
            variant={variant} 
            size="icon" 
            loading={loadingStates[`${variant}-icon`]}
            onClick={() => handleLoadingDemo(`${variant}-icon`)}
          >
            <Circle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto p-8 space-y-12">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Button Component System</h1>
        <p className="text-muted-foreground text-lg">
          Complete implementation based on Figma design specifications
        </p>
        <p className="text-sm text-muted-foreground">
          All variants, states, and sizes as defined in the design system
        </p>
      </div>

      {/* All Button Variants */}
      <div className="space-y-8">
        <ButtonGrid 
          variant="default" 
          title="Default (Primary)" 
          description="Dark background with white text - primary actions"
        />

        <ButtonGrid 
          variant="secondary" 
          title="Secondary" 
          description="Light gray background - secondary actions"
        />

        <ButtonGrid 
          variant="ghost" 
          title="Ghost" 
          description="Transparent background, shows on hover - subtle actions"
        />

        <ButtonGrid 
          variant="link" 
          title="Link" 
          description="Text-only with underline on hover - navigation actions"
        />

        <ButtonGrid 
          variant="outline" 
          title="Outline" 
          description="Bordered with white background - alternative actions"
        />

        <ButtonGrid 
          variant="destructive" 
          title="Destructive" 
          description="Red background for dangerous actions - delete, remove"
        />
      </div>

      {/* Real-world Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Real-world Usage Examples</CardTitle>
          <CardDescription>Common button combinations and use cases</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Form Actions */}
          <div className="space-y-4">
            <h3 className="font-medium">Form Actions</h3>
            <div className="flex items-center gap-3">
              <Button>Save Changes</Button>
              <Button variant="outline">Cancel</Button>
            </div>
          </div>

          {/* CRUD Operations */}
          <div className="space-y-4">
            <h3 className="font-medium">CRUD Operations</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <Button>
                <Plus className="h-4 w-4" />
                Create New
              </Button>
              <Button variant="ghost">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline">
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h3 className="font-medium">Navigation & Links</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="link">Learn More</Button>
              <Button variant="ghost">
                View Details
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          {/* Icon Only Actions */}
          <div className="space-y-4">
            <h3 className="font-medium">Icon-only Actions</h3>
            <div className="flex items-center gap-3">
              <Button size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Loading States Demo */}
          <div className="space-y-4">
            <h3 className="font-medium">Interactive Loading Demo</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <Button 
                loading={loadingStates.saveDemo}
                onClick={() => handleLoadingDemo('saveDemo')}
              >
                <Save className="h-4 w-4" />
                {loadingStates.saveDemo ? 'Saving...' : 'Save Document'}
              </Button>
              <Button 
                variant="destructive"
                loading={loadingStates.deleteDemo}
                onClick={() => handleLoadingDemo('deleteDemo')}
              >
                <Trash2 className="h-4 w-4" />
                {loadingStates.deleteDemo ? 'Deleting...' : 'Delete Item'}
              </Button>
              <Button 
                variant="outline"
                loading={loadingStates.downloadDemo}
                onClick={() => handleLoadingDemo('downloadDemo')}
              >
                <Download className="h-4 w-4" />
                {loadingStates.downloadDemo ? 'Downloading...' : 'Download File'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Design Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Design Specifications</CardTitle>
          <CardDescription>Technical details from Figma design system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Colors</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Primary: neutral-900 (#171717)</li>
                <li>• Secondary: neutral-100 (#f5f5f5)</li>
                <li>• Destructive: red-600 (#dc2626)</li>
                <li>• Text: neutral-50/neutral-950</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Sizes</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Small: h-8, px-3, text-xs</li>
                <li>• Default: h-9, px-4, text-sm</li>
                <li>• Large: h-10, px-8, text-sm</li>
                <li>• Icon: 36x36px (h-9 w-9)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Effects</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Shadow: 0px 1px 2px rgba(0,0,0,0.05)</li>
                <li>• Border radius: 8px (rounded-lg)</li>
                <li>• Font: Geist Medium</li>
                <li>• Focus ring: 2px with offset</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 