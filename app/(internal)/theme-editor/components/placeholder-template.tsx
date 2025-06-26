'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Construction } from 'lucide-react';

interface PlaceholderComponentPageProps {
  componentName: string;
  category: string;
  description: string;
  comingSoon?: boolean;
}

export function PlaceholderComponentPage({ 
  componentName, 
  category, 
  description, 
  comingSoon = true 
}: PlaceholderComponentPageProps) {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">{componentName}</h1>
          <Badge variant="outline">{category}</Badge>
          {comingSoon && <Badge variant="secondary">Coming Soon</Badge>}
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          {description}
        </p>
      </div>

      {/* Coming Soon Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            Documentation In Progress
          </CardTitle>
          <CardDescription>
            We're currently working on comprehensive documentation for this component.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This component is part of our design system and is available for use. 
            Detailed documentation including examples, props, and usage patterns will be added soon.
          </p>
          <div className="bg-muted/30 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Quick Tip:</strong> You can find this component in{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                @/components/ui/{componentName.toLowerCase()}
              </code>{' '}
              and use it directly in your projects.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 