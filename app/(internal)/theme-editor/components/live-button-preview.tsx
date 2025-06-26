'use client';

import { Button } from '@/components/ui/button';
import { 
  Accessibility,
  ArrowRight,
  Download,
  Plus,
  Settings,
  Upload,
  Mail,
  Heart,
  Star,
  ShoppingCart,
  RefreshCw
} from 'lucide-react';
import { ButtonProperties } from './properties-panel';

interface LiveButtonPreviewProps {
  properties: ButtonProperties;
}

// Map icon names to components
const ICON_MAP = {
  'accessibility': Accessibility,
  'arrow-right': ArrowRight,
  'download': Download,
  'plus': Plus,
  'settings': Settings,
  'upload': Upload,
  'mail': Mail,
  'heart': Heart,
  'star': Star,
  'shopping-cart': ShoppingCart,
};

export function LiveButtonPreview({ properties }: LiveButtonPreviewProps) {
  const getIconComponent = (iconName: string) => {
    if (iconName === 'none') return null;
    return ICON_MAP[iconName as keyof typeof ICON_MAP] || null;
  };

  const LeftIcon = getIconComponent(properties.icon);
  const RightIcon = getIconComponent(properties.iconRight);

  // Handle loading state
  if (properties.loading) {
    return (
      <Button 
        variant={properties.variant as any}
        size={properties.size as any}
        disabled={true}
      >
        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        {properties.size === 'icon' ? null : (properties.children || 'Loading...')}
      </Button>
    );
  }

  // Handle icon-only size
  if (properties.size === 'icon') {
    const IconToShow = LeftIcon || RightIcon || Plus; // Default to Plus if no icon selected
    return (
      <Button 
        variant={properties.variant as any}
        size="icon"
        disabled={properties.disabled}
      >
        <IconToShow className="h-4 w-4" />
      </Button>
    );
  }

  // Regular button with text and optional icons
  return (
    <Button 
      variant={properties.variant as any}
      size={properties.size as any}
      disabled={properties.disabled}
    >
      {LeftIcon && <LeftIcon className="w-4 h-4 mr-2" />}
      {properties.children || 'Button'}
      {RightIcon && <RightIcon className="w-4 h-4 ml-2" />}
    </Button>
  );
} 