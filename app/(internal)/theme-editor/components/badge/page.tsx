'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, Star, Zap, AlertTriangle } from 'lucide-react';

export default function BadgeComponentPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Badge</h1>
          <Badge variant="outline">Display Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Small labels for status indicators, categories, and metadata.
        </p>
      </div>

      {/* Basic Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Basic Usage</h2>
        <Card>
          <CardHeader>
            <CardTitle>Default Badge</CardTitle>
            <CardDescription>Basic badge variations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>All Variants</CardTitle>
              <CardDescription>Complete set of badge styles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="default">Default</Badge>
                  <span className="text-sm text-muted-foreground">Primary badge style</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">Secondary</Badge>
                  <span className="text-sm text-muted-foreground">Muted badge style</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Outline</Badge>
                  <span className="text-sm text-muted-foreground">Border-only style</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="destructive">Destructive</Badge>
                  <span className="text-sm text-muted-foreground">Error/warning style</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>With Icons</CardTitle>
              <CardDescription>Badges enhanced with icons</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="default">
                    <Check className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="destructive">
                    <X className="w-3 h-3 mr-1" />
                    Failed
                  </Badge>
                </div>
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
              <CardTitle>Status Indicators</CardTitle>
              <CardDescription>Show item states and statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Order #1234</span>
                  <Badge variant="default">
                    <Check className="w-3 h-3 mr-1" />
                    Delivered
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Order #1235</span>
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    Processing
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Order #1236</span>
                  <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Cancelled
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categories & Tags</CardTitle>
              <CardDescription>Organize content with labels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Blog Post: "Getting Started with React"</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">React</Badge>
                    <Badge variant="outline">JavaScript</Badge>
                    <Badge variant="outline">Tutorial</Badge>
                    <Badge variant="outline">Beginner</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Course: "Advanced TypeScript"</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">
                      <Zap className="w-3 h-3 mr-1" />
                      Premium
                    </Badge>
                    <Badge variant="outline">TypeScript</Badge>
                    <Badge variant="outline">Advanced</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Interactive Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Examples</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Badges</CardTitle>
              <CardDescription>Show counts and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" className="justify-start">
                    Messages
                  </Button>
                  <Badge variant="destructive">5</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" className="justify-start">
                    Notifications
                  </Button>
                  <Badge variant="secondary">12</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" className="justify-start">
                    Updates
                  </Button>
                  <Badge variant="outline">New</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Roles</CardTitle>
              <CardDescription>Display user permissions and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">John Doe</div>
                    <div className="text-sm text-muted-foreground">john@example.com</div>
                  </div>
                  <Badge variant="default">Admin</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">Jane Smith</div>
                    <div className="text-sm text-muted-foreground">jane@example.com</div>
                  </div>
                  <Badge variant="secondary">Editor</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">Bob Johnson</div>
                    <div className="text-sm text-muted-foreground">bob@example.com</div>
                  </div>
                  <Badge variant="outline">Viewer</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Custom Styling */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Custom Styling</h2>
        <Card>
          <CardHeader>
            <CardTitle>Custom Badge Styles</CardTitle>
            <CardDescription>Examples with custom colors and styling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                Success
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                Warning
              </Badge>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                Info
              </Badge>
              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                Premium
              </Badge>
              <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                Hot
              </Badge>
              <Badge className="bg-gradient-to-r from-pink-500 to-violet-500 text-white">
                Gradient
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 