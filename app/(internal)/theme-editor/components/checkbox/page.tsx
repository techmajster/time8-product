'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function CheckboxComponentPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Checkbox</h1>
          <Badge variant="outline">Form Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A control that allows users to toggle between checked and unchecked states.
        </p>
      </div>

      {/* Basic Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Basic Usage</h2>
        <Card>
          <CardHeader>
            <CardTitle>Default Checkbox</CardTitle>
            <CardDescription>Basic checkbox control</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" />
              <Label htmlFor="terms">Accept terms and conditions</Label>
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
              <div className="flex items-center space-x-2">
                <Checkbox id="unchecked" />
                <Label htmlFor="unchecked">Unchecked</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="checked" defaultChecked />
                <Label htmlFor="checked">Checked</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="disabled" disabled />
                <Label htmlFor="disabled" className="text-muted-foreground">Disabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="disabled-checked" disabled defaultChecked />
                <Label htmlFor="disabled-checked" className="text-muted-foreground">Disabled & Checked</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Indeterminate State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="indeterminate" checked="indeterminate" />
                <Label htmlFor="indeterminate">Indeterminate (partial)</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Used when some but not all sub-items are selected
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
              <CardTitle>Settings Form</CardTitle>
              <CardDescription>User preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="notifications" defaultChecked />
                  <Label htmlFor="notifications">Email notifications</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="marketing" />
                  <Label htmlFor="marketing">Marketing emails</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="security" defaultChecked />
                  <Label htmlFor="security">Security alerts</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="newsletter" />
                  <Label htmlFor="newsletter">Weekly newsletter</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
              <CardDescription>Enable/disable features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="dark-mode" />
                  <Label htmlFor="dark-mode">Dark mode</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="beta-features" />
                  <Label htmlFor="beta-features">Beta features</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="analytics" defaultChecked />
                  <Label htmlFor="analytics">Analytics tracking</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="auto-save" defaultChecked />
                  <Label htmlFor="auto-save">Auto-save documents</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Advanced Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Advanced Examples</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-select List</CardTitle>
              <CardDescription>Select multiple items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="font-medium text-sm">Available permissions:</div>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="read" defaultChecked />
                    <Label htmlFor="read">Read access</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="write" defaultChecked />
                    <Label htmlFor="write">Write access</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="delete" />
                    <Label htmlFor="delete">Delete access</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="admin" />
                    <Label htmlFor="admin">Admin access</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agreement Form</CardTitle>
              <CardDescription>Terms and conditions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox id="terms-service" className="mt-1" />
                  <div>
                    <Label htmlFor="terms-service" className="text-sm">
                      I agree to the Terms of Service
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      By checking this box, you agree to our terms and conditions.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="privacy-policy" className="mt-1" />
                  <div>
                    <Label htmlFor="privacy-policy" className="text-sm">
                      I agree to the Privacy Policy
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      We'll handle your data according to our privacy policy.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="age-verification" className="mt-1" />
                  <div>
                    <Label htmlFor="age-verification" className="text-sm">
                      I confirm I am 18 years or older
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Age verification is required for this service.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
} 