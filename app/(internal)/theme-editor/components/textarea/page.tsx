'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function TextareaComponentPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Textarea</h1>
          <Badge variant="outline">Form Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A multi-line text input field for longer content like comments, descriptions, and messages.
        </p>
      </div>

      {/* Basic Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Basic Usage</h2>
        <Card>
          <CardHeader>
            <CardTitle>Default Textarea</CardTitle>
            <CardDescription>Basic multi-line text input</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea placeholder="Type your message here..." />
          </CardContent>
        </Card>
      </section>

      {/* Sizes */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Sizes & Rows</h2>
        <Card>
          <CardHeader>
            <CardTitle>Different Heights</CardTitle>
            <CardDescription>Control the visible rows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Small (3 rows)</Label>
                <Textarea placeholder="Short textarea..." rows={3} />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Default (4 rows)</Label>
                <Textarea placeholder="Default textarea..." />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Large (6 rows)</Label>
                <Textarea placeholder="Large textarea..." rows={6} />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* States */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">States</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Normal</Label>
                <Textarea placeholder="Normal state" />
              </div>
              <div className="space-y-2">
                <Label>Disabled</Label>
                <Textarea placeholder="Disabled state" disabled />
              </div>
              <div className="space-y-2">
                <Label>Required</Label>
                <Textarea placeholder="Required field" required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resize Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Resizable (default)</Label>
                <Textarea placeholder="Can be resized by user" />
              </div>
              <div className="space-y-2">
                <Label>No resize</Label>
                <Textarea placeholder="Fixed size" className="resize-none" />
              </div>
              <div className="space-y-2">
                <Label>Vertical only</Label>
                <Textarea placeholder="Resize vertically" className="resize-y" />
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
              <CardTitle>Comment Form</CardTitle>
              <CardDescription>User feedback form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comment">Leave a comment</Label>
                <Textarea
                  id="comment"
                  placeholder="Share your thoughts..."
                  rows={4}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">0/500 characters</span>
                <Button>Post Comment</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Compose</CardTitle>
              <CardDescription>Message composition form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  rows={6}
                  className="resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button className="flex-1">Send Message</Button>
                <Button variant="outline">Save Draft</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Features</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>With Character Limit</CardTitle>
              <CardDescription>Track input length</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="limited">Description (max 200 chars)</Label>
                <Textarea
                  id="limited"
                  placeholder="Enter description..."
                  maxLength={200}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auto-expanding</CardTitle>
              <CardDescription>Grows with content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auto">Auto-resize textarea</Label>
                <Textarea
                  id="auto"
                  placeholder="Start typing... this will grow with your content"
                  className="min-h-[80px] resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
} 