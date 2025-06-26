'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Settings, CreditCard, Bell } from 'lucide-react';

export default function TabsComponentPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Tabs</h1>
          <Badge variant="outline">Layout Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A set of layered sections of content that display one panel at a time.
        </p>
      </div>

      {/* Basic Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Basic Usage</h2>
        <Card>
          <CardHeader>
            <CardTitle>Default Tabs</CardTitle>
            <CardDescription>Basic tab navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Overview Content</h3>
                  <p className="text-muted-foreground">
                    This is the overview tab content. It shows general information and key metrics.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="analytics" className="mt-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Analytics Content</h3>
                  <p className="text-muted-foreground">
                    Here you would find detailed analytics, charts, and data visualizations.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="reports" className="mt-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Reports Content</h3>
                  <p className="text-muted-foreground">
                    This section contains various reports and downloadable documents.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* With Icons */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">With Icons</h2>
        <Card>
          <CardHeader>
            <CardTitle>Icon Tabs</CardTitle>
            <CardDescription>Tabs enhanced with icons</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList>
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="billing" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your profile details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" defaultValue="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" defaultValue="john@example.com" />
                    </div>
                    <Button>Save Changes</Button>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="settings" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>Manage your account preferences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Settings content would go here - privacy options, security settings, etc.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="billing" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing & Subscriptions</CardTitle>
                    <CardDescription>Manage your billing information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Billing information, payment methods, and subscription details.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="notifications" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Choose what notifications you receive</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Email preferences, push notifications, and alert settings.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* Vertical Tabs */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Layout Variations</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Centered Tabs</CardTitle>
              <CardDescription>Center-aligned tab list</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tab1" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                  <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                  <TabsTrigger value="tab3">Tab 3</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1" className="mt-4">
                  <div className="p-4 text-center border rounded-lg">
                    <p className="text-muted-foreground">Content for Tab 1</p>
                  </div>
                </TabsContent>
                <TabsContent value="tab2" className="mt-4">
                  <div className="p-4 text-center border rounded-lg">
                    <p className="text-muted-foreground">Content for Tab 2</p>
                  </div>
                </TabsContent>
                <TabsContent value="tab3" className="mt-4">
                  <div className="p-4 text-center border rounded-lg">
                    <p className="text-muted-foreground">Content for Tab 3</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Full Width Tabs</CardTitle>
              <CardDescription>Tabs that stretch to full width</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="home" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="home">Home</TabsTrigger>
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                </TabsList>
                <TabsContent value="home" className="mt-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Welcome Home</h3>
                    <p className="text-muted-foreground">
                      Your personalized home dashboard with quick access to important information.
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="dashboard" className="mt-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Dashboard</h3>
                    <p className="text-muted-foreground">
                      Comprehensive overview of your account activity and metrics.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Advanced Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Examples</h2>
        <Card>
          <CardHeader>
            <CardTitle>Complex Tab Content</CardTitle>
            <CardDescription>Rich content within tabs</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="products" className="w-full">
              <TabsList>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="support">Support</TabsTrigger>
              </TabsList>
              <TabsContent value="products" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Product A</CardTitle>
                      <CardDescription>Essential features for small teams</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <Badge>$29/month</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Users:</span>
                          <span>Up to 10</span>
                        </div>
                        <Button className="w-full mt-4">Get Started</Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Product B</CardTitle>
                      <CardDescription>Advanced features for growing businesses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <Badge>$79/month</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Users:</span>
                          <span>Up to 50</span>
                        </div>
                        <Button className="w-full mt-4">Get Started</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="services" className="mt-4">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Consulting Services</h3>
                    <p className="text-muted-foreground mb-3">
                      Expert consultation to help you optimize your workflow and processes.
                    </p>
                    <Button variant="outline">Learn More</Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Implementation Support</h3>
                    <p className="text-muted-foreground mb-3">
                      Hands-on support to get your team up and running quickly.
                    </p>
                    <Button variant="outline">Learn More</Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="support" className="mt-4">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Contact Support</CardTitle>
                      <CardDescription>Get help from our support team</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Email Support</span>
                          <Badge variant="outline">24/7</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Live Chat</span>
                          <Badge variant="default">Online</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Phone Support</span>
                          <Badge variant="secondary">Business Hours</Badge>
                        </div>
                        <Button className="w-full">Contact Us</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 