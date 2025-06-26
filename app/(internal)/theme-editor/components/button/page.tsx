'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Plus, 
  ArrowRight, 
  Mail, 
  Settings, 
  Trash2, 
  Edit, 
  Save,
  Upload,
  RefreshCw,
  Check,
  X,
  Heart,
  Star,
  ShoppingCart
} from 'lucide-react';

export default function ButtonComponentPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Button</h1>
          <Badge variant="secondary">Component</Badge>
        </div>
        <p className="text-gray-600 text-lg">
          A versatile button component that supports multiple variants, sizes, states, and icon configurations.
          See how your theme changes affect every variation in real-time.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              This button uses your current theme settings. Adjust colors, typography, spacing, or border radius in the Theme editor to see live changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12 bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200">
              <Button size="lg">
                <Download className="w-4 h-4 mr-2" />
                Download Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Variants Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Variants</h2>
        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
            <CardDescription>
              Different visual styles for various use cases and hierarchies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Primary Variants */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Primary</h3>
                <div className="space-y-3">
                  <div className="flex flex-col items-start gap-2">
                    <Button variant="default">Default</Button>
                    <code className="text-xs text-gray-500">variant="default"</code>
                  </div>
                </div>
              </div>

              {/* Secondary Variants */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Secondary</h3>
                <div className="space-y-3">
                  <div className="flex flex-col items-start gap-2">
                    <Button variant="secondary">Secondary</Button>
                    <code className="text-xs text-gray-500">variant="secondary"</code>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <Button variant="outline">Outline</Button>
                    <code className="text-xs text-gray-500">variant="outline"</code>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <Button variant="ghost">Ghost</Button>
                    <code className="text-xs text-gray-500">variant="ghost"</code>
                  </div>
                </div>
              </div>

              {/* Special Variants */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Special</h3>
                <div className="space-y-3">
                  <div className="flex flex-col items-start gap-2">
                    <Button variant="destructive">Destructive</Button>
                    <code className="text-xs text-gray-500">variant="destructive"</code>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <Button variant="link">Link</Button>
                    <code className="text-xs text-gray-500">variant="link"</code>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sizes Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Sizes</h2>
        <Card>
          <CardHeader>
            <CardTitle>Button Sizes</CardTitle>
            <CardDescription>
              Different sizes for various layouts and use cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex flex-col items-center gap-2">
                  <Button size="sm">Small</Button>
                  <code className="text-xs text-gray-500">size="sm"</code>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button size="default">Default</Button>
                  <code className="text-xs text-gray-500">size="default"</code>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button size="lg">Large</Button>
                  <code className="text-xs text-gray-500">size="lg"</code>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <code className="text-xs text-gray-500">size="icon"</code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* States Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">States</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Disabled State */}
          <Card>
            <CardHeader>
              <CardTitle>Disabled</CardTitle>
              <CardDescription>
                Buttons in disabled state cannot be interacted with
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex flex-col items-center gap-2">
                    <Button disabled>Disabled</Button>
                    <code className="text-xs text-gray-500">disabled</code>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Button variant="secondary" disabled>Secondary</Button>
                    <code className="text-xs text-gray-500">variant + disabled</code>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Button variant="outline" disabled>Outline</Button>
                    <code className="text-xs text-gray-500">outline + disabled</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          <Card>
            <CardHeader>
              <CardTitle>Loading</CardTitle>
              <CardDescription>
                Buttons showing loading state with spinner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex flex-col items-center gap-2">
                    <Button disabled>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </Button>
                    <code className="text-xs text-gray-500">with spinner</code>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Button variant="secondary" disabled>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing
                    </Button>
                    <code className="text-xs text-gray-500">secondary loading</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Icons Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">With Icons</h2>
        <Card>
          <CardHeader>
            <CardTitle>Icon Combinations</CardTitle>
            <CardDescription>
              Buttons with leading icons, trailing icons, or icon-only variants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Leading Icons */}
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-4">Leading Icons</h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                  <Button variant="secondary">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Trailing Icons */}
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-4">Trailing Icons</h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <Button>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="secondary">
                    Send Email
                    <Mail className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline">
                    Settings
                    <Settings className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

              {/* Icon Only */}
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-4">Icon Only</h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <Button size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="secondary">
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Real-world Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Real-world Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Form Actions</CardTitle>
              <CardDescription>
                Common button combinations in forms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline">Cancel</Button>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                  <Button variant="ghost">Cancel</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* E-commerce Actions */}
          <Card>
            <CardHeader>
              <CardTitle>E-commerce Actions</CardTitle>
              <CardDescription>
                Shopping and product-related buttons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button size="lg">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Button variant="outline" size="lg">
                    <Heart className="w-4 h-4 mr-2" />
                    Wishlist
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Button variant="secondary">
                    <Star className="w-4 h-4 mr-2" />
                    Add Review
                  </Button>
                  <Button variant="ghost">Share</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Theme Integration Note */}
      <section>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-blue-900">🎨 Live Theme Integration</CardTitle>
            <CardDescription className="text-blue-700">
              All buttons on this page automatically reflect your current theme settings. 
              Try adjusting colors, typography, spacing, border radius, or shadows in the Theme editor 
              to see how they affect each button variant, size, and state in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Check className="w-4 h-4" />
              <span>Colors from your semantic color palette</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Check className="w-4 h-4" />
              <span>Typography scale from your font settings</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Check className="w-4 h-4" />
              <span>Spacing and padding from your spacing tokens</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Check className="w-4 h-4" />
              <span>Border radius from your border radius settings</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Check className="w-4 h-4" />
              <span>Shadows from your elevation system</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 