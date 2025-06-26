'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Grid, List, BarChart } from 'lucide-react';

export default function ToggleGroupComponentPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Toggle Group</h1>
          <Badge variant="outline">Action Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A set of two-state buttons that can be toggled individually or work together as a group.
        </p>
      </div>

      {/* Basic Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Basic Usage</h2>
        <Card>
          <CardHeader>
            <CardTitle>Single Selection</CardTitle>
            <CardDescription>Only one item can be selected at a time</CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleGroup type="single" defaultValue="center">
              <ToggleGroupItem value="left" aria-label="Left aligned">
                <AlignLeft className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="center" aria-label="Center aligned">
                <AlignCenter className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="right" aria-label="Right aligned">
                <AlignRight className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </CardContent>
        </Card>
      </section>

      <section className="mb-12">
        <Card>
          <CardHeader>
            <CardTitle>Multiple Selection</CardTitle>
            <CardDescription>Multiple items can be selected at once</CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleGroup type="multiple" defaultValue={["bold", "italic"]}>
              <ToggleGroupItem value="bold" aria-label="Bold">
                <Bold className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" aria-label="Italic">
                <Italic className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="underline" aria-label="Underline">
                <Underline className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
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
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Small</div>
                <ToggleGroup type="single" size="sm">
                  <ToggleGroupItem value="grid">
                    <Grid className="h-3 w-3" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list">
                    <List className="h-3 w-3" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Default</div>
                <ToggleGroup type="single">
                  <ToggleGroupItem value="grid">
                    <Grid className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Large</div>
                <ToggleGroup type="single" size="lg">
                  <ToggleGroupItem value="grid">
                    <Grid className="h-5 w-5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list">
                    <List className="h-5 w-5" />
                  </ToggleGroupItem>
                </ToggleGroup>
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
              <CardTitle>View Toggle</CardTitle>
              <CardDescription>Switch between different view modes</CardDescription>
            </CardHeader>
            <CardContent>
              <ToggleGroup type="single" defaultValue="grid">
                <ToggleGroupItem value="grid">
                  <Grid className="h-4 w-4 mr-2" />
                  Grid
                </ToggleGroupItem>
                <ToggleGroupItem value="list">
                  <List className="h-4 w-4 mr-2" />
                  List
                </ToggleGroupItem>
                <ToggleGroupItem value="chart">
                  <BarChart className="h-4 w-4 mr-2" />
                  Chart
                </ToggleGroupItem>
              </ToggleGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Text Formatting</CardTitle>
              <CardDescription>Multiple text formatting options</CardDescription>
            </CardHeader>
            <CardContent>
              <ToggleGroup type="multiple">
                <ToggleGroupItem value="bold">
                  <Bold className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="italic">
                  <Italic className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="underline">
                  <Underline className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
} 