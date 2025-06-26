'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share, Star, User, Calendar, MapPin } from 'lucide-react';

export default function CardComponentPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Card</h1>
          <Badge variant="outline">Layout Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A versatile container for grouping related content and actions.
        </p>
      </div>

      {/* Basic Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Basic Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Simple Card</CardTitle>
              <CardDescription>Basic card with header and content</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This is a simple card example with a title, description, and content area.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                A minimal card with just content - no header or footer.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Card Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Dashed Border</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Card with dashed border styling
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Enhanced Shadow</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Card with larger shadow for elevation
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10">
            <CardHeader>
              <CardTitle>Gradient Background</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Card with gradient background
              </p>
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
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">John Doe</CardTitle>
                  <CardDescription>Software Engineer</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Passionate developer with 5+ years of experience in React and TypeScript.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  San Francisco
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined 2019
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Statistics</CardTitle>
              <CardDescription>Overview of current project metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Tasks</span>
                  <Badge variant="secondary">24</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Completed</span>
                  <Badge variant="default">18</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">In Progress</span>
                  <Badge variant="outline">4</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Blocked</span>
                  <Badge variant="destructive">2</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Interactive Cards */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Cards</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle>Hoverable Card</CardTitle>
              <CardDescription>Card with hover effects</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                This card responds to hover with enhanced shadow and smooth transitions.
              </p>
              <Button className="w-full">Learn More</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media Post</CardTitle>
              <CardDescription>Example social card with actions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                Just shipped a new feature! Really excited to see how users interact with it. 🚀
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm">
                    <Heart className="h-4 w-4 mr-1" />
                    12
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    3
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" />
                  4.8
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Complex Layouts */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Complex Layouts</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Widget</CardTitle>
              <CardDescription>Complex card layout with multiple sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium">Revenue</h4>
                  <p className="text-2xl font-bold">$12,345</p>
                  <p className="text-xs text-green-600">+12% from last month</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Users</h4>
                  <p className="text-2xl font-bold">1,234</p>
                  <p className="text-xs text-blue-600">+5% from last month</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Conversion</h4>
                  <p className="text-2xl font-bold">23.4%</p>
                  <p className="text-xs text-red-600">-2% from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Current team overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Alice Johnson', role: 'Product Manager', status: 'online' },
                  { name: 'Bob Smith', role: 'Developer', status: 'busy' },
                  { name: 'Carol Davis', role: 'Designer', status: 'away' },
                ].map((member, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.role}</div>
                    </div>
                    <Badge 
                      variant={member.status === 'online' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {member.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
} 