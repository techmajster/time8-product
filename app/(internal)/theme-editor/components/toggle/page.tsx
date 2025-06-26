'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export default function ToggleComponentPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Toggle</h1>
          <Badge variant="outline">Action Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A two-state button that can be either on or off. Perfect for formatting controls, settings, and feature toggles.
        </p>
      </div>

      {/* Basic Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Basic Usage</h2>
        <Card>
          <CardHeader>
            <CardTitle>Toggle States</CardTitle>
            <CardDescription>
              Click the toggles to see their pressed/unpressed states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Toggle aria-label="Toggle bold">
                <Bold className="h-4 w-4" />
              </Toggle>
              <Toggle aria-label="Toggle italic" pressed>
                <Italic className="h-4 w-4" />
              </Toggle>
              <Toggle aria-label="Toggle underline">
                <Underline className="h-4 w-4" />
              </Toggle>
              <Toggle aria-label="Toggle strikethrough" disabled>
                <Strikethrough className="h-4 w-4" />
              </Toggle>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sizes */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Sizes</h2>
        <Card>
          <CardHeader>
            <CardTitle>Size Variants</CardTitle>
            <CardDescription>Available size options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Toggle size="sm" aria-label="Small toggle">
                <Bold className="h-3 w-3" />
              </Toggle>
              <Toggle size="default" aria-label="Default toggle">
                <Bold className="h-4 w-4" />
              </Toggle>
              <Toggle size="lg" aria-label="Large toggle">
                <Bold className="h-5 w-5" />
              </Toggle>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Variants</h2>
        <Card>
          <CardHeader>
            <CardTitle>Toggle Variants</CardTitle>
            <CardDescription>Different visual styles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium">Default</span>
                <Toggle variant="default" aria-label="Default variant">
                  <Bold className="h-4 w-4" />
                </Toggle>
                <Toggle variant="default" pressed aria-label="Default pressed">
                  <Italic className="h-4 w-4" />
                </Toggle>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium">Outline</span>
                <Toggle variant="outline" aria-label="Outline variant">
                  <Bold className="h-4 w-4" />
                </Toggle>
                <Toggle variant="outline" pressed aria-label="Outline pressed">
                  <Italic className="h-4 w-4" />
                </Toggle>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Usage Examples</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Text Formatting</CardTitle>
              <CardDescription>Rich text editor controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-2 border rounded">
                <Toggle aria-label="Bold">
                  <Bold className="h-4 w-4" />
                </Toggle>
                <Toggle aria-label="Italic">
                  <Italic className="h-4 w-4" />
                </Toggle>
                <Toggle aria-label="Underline">
                  <Underline className="h-4 w-4" />
                </Toggle>
                <Toggle aria-label="Strikethrough">
                  <Strikethrough className="h-4 w-4" />
                </Toggle>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Text Alignment</CardTitle>
              <CardDescription>Document alignment controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-2 border rounded">
                <Toggle aria-label="Align left" pressed>
                  <AlignLeft className="h-4 w-4" />
                </Toggle>
                <Toggle aria-label="Align center">
                  <AlignCenter className="h-4 w-4" />
                </Toggle>
                <Toggle aria-label="Align right">
                  <AlignRight className="h-4 w-4" />
                </Toggle>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
} 