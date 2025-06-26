'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { HelpCircle, Settings, FileText, User } from 'lucide-react';

// Live Accordion Preview Component
function LiveAccordionPreview({ 
  type, 
  collapsible, 
  variant, 
  itemCount 
}: {
  type: 'single' | 'multiple';
  collapsible: boolean;
  variant: 'default' | 'ghost' | 'outline';
  itemCount: number;
}) {
  const accordionProps = type === 'single' 
    ? { type: 'single' as const, collapsible } 
    : { type: 'multiple' as const };

  const variantClasses = {
    default: '',
    ghost: 'border-none shadow-none bg-transparent',
    outline: 'border border-border rounded-lg'
  };

  const items = [
    {
      value: 'item-1',
      trigger: 'Getting Started',
      content: 'Learn the basics of our platform with step-by-step guides and tutorials to help you get up and running quickly.'
    },
    {
      value: 'item-2', 
      trigger: 'Account Settings',
      content: 'Manage your profile, preferences, and security settings. Update your information and customize your experience.'
    },
    {
      value: 'item-3',
      trigger: 'Billing & Payments',
      content: 'View your subscription details, payment history, and manage billing information. Upgrade or downgrade your plan as needed.'
    },
    {
      value: 'item-4',
      trigger: 'Support & Help',
      content: 'Find answers to common questions, contact support, and access our knowledge base for detailed documentation.'
    }
  ].slice(0, itemCount);

  return (
    <div className="w-full max-w-md">
      <Accordion {...accordionProps} className={variantClasses[variant]}>
        {items.map((item) => (
          <AccordionItem key={item.value} value={item.value}>
            <AccordionTrigger>{item.trigger}</AccordionTrigger>
            <AccordionContent>
              {item.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// Properties Panel Component
function AccordionPropertiesPanel({ 
  type, 
  setType, 
  collapsible, 
  setCollapsible, 
  variant, 
  setVariant, 
  itemCount, 
  setItemCount 
}: {
  type: 'single' | 'multiple';
  setType: (type: 'single' | 'multiple') => void;
  collapsible: boolean;
  setCollapsible: (collapsible: boolean) => void;
  variant: 'default' | 'ghost' | 'outline';
  setVariant: (variant: 'default' | 'ghost' | 'outline') => void;
  itemCount: number;
  setItemCount: (count: number) => void;
}) {
  const resetToDefaults = () => {
    setType('single');
    setCollapsible(false);
    setVariant('default');
    setItemCount(3);
  };

  return (
    <div className="space-y-6 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Properties</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetToDefaults}
          className="text-xs"
        >
          Reset
        </Button>
      </div>

      <div className="space-y-4">
        {/* Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Type</Label>
          <Select value={type} onValueChange={(value: 'single' | 'multiple') => setType(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="multiple">Multiple</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Collapsible (only for single type) */}
        {type === 'single' && (
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Collapsible</Label>
            <Switch checked={collapsible} onCheckedChange={setCollapsible} />
          </div>
        )}

        {/* Variant */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Variant</Label>
          <Select value={variant} onValueChange={(value: 'default' | 'ghost' | 'outline') => setVariant(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="ghost">Ghost</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Item Count */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Items: {itemCount}</Label>
          <Input
            type="range"
            min="1"
            max="4"
            value={itemCount}
            onChange={(e) => setItemCount(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

export default function AccordionComponentPage() {
  // Interactive example state
  const [type, setType] = useState<'single' | 'multiple'>('single');
  const [collapsible, setCollapsible] = useState(false);
  const [variant, setVariant] = useState<'default' | 'ghost' | 'outline'>('default');
  const [itemCount, setItemCount] = useState(3);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Accordion</h1>
          <Badge variant="outline">Layout Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A vertically stacked set of interactive headings that each reveal a section of content.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Accordion Preview</CardTitle>
            <CardDescription>
              Customize the accordion properties and see changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2 flex items-start justify-center p-8 border rounded-lg bg-muted/30 h-full min-h-[500px]">
                <LiveAccordionPreview
                  type={type}
                  collapsible={collapsible}
                  variant={variant}
                  itemCount={itemCount}
                />
              </div>

              {/* Properties Panel */}
              <div className="space-y-4 p-4 border rounded-lg bg-background h-full min-h-[500px]">
                <AccordionPropertiesPanel
                  type={type}
                  setType={setType}
                  collapsible={collapsible}
                  setCollapsible={setCollapsible}
                  variant={variant}
                  setVariant={setVariant}
                  itemCount={itemCount}
                  setItemCount={setItemCount}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Single vs Multiple */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Single vs Multiple</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Single</CardTitle>
              <CardDescription>Only one item can be open at a time</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    <HelpCircle className="w-4 h-4 mr-2" />
                    What is included?
                  </AccordionTrigger>
                  <AccordionContent>
                    All premium features, priority support, and unlimited access.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    <Settings className="w-4 h-4 mr-2" />
                    How to configure?
                  </AccordionTrigger>
                  <AccordionContent>
                    Go to settings and follow the setup wizard.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Multiple</CardTitle>
              <CardDescription>Multiple items can be open simultaneously</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple">
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    <FileText className="w-4 h-4 mr-2" />
                    Documentation
                  </AccordionTrigger>
                  <AccordionContent>
                    Comprehensive guides and API references.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    <User className="w-4 h-4 mr-2" />
                    User Management
                  </AccordionTrigger>
                  <AccordionContent>
                    Add, edit, and manage user accounts and permissions.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">FAQ Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>Common questions and their answers</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1">
                <AccordionTrigger>How do I reset my password?</AccordionTrigger>
                <AccordionContent>
                  Click on the "Forgot Password" link on the login page and follow the instructions sent to your email.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2">
                <AccordionTrigger>Can I change my subscription plan?</AccordionTrigger>
                <AccordionContent>
                  Yes, you can upgrade or downgrade your plan anytime from your account settings. Changes take effect immediately.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-3">
                <AccordionTrigger>Is there a mobile app available?</AccordionTrigger>
                <AccordionContent>
                  Currently, we offer a responsive web application. Native mobile apps for iOS and Android are in development.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-4">
                <AccordionTrigger>How do I contact support?</AccordionTrigger>
                <AccordionContent>
                  You can reach our support team through the help desk, email at support@example.com, or live chat available 24/7.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 