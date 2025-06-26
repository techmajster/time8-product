'use client';

import { useState } from 'react';
import { ColorPicker } from '../components/editors/ColorPicker';
import { NumberInput } from '../components/editors/NumberInput';
import { ShadowInput } from '../components/editors/ShadowInput';
import { ThemeApplier, exportThemeAsCSS, exportAsTailwindConfig } from '../components/theme-applier';
import { ThemeManager, type DesignTokens as ThemeManagerTokens } from '../components/theme/ThemeManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RotateCcw, Palette, Type, Grid, Eye, FileText, Code, Search, Calendar, CheckCircle, DollarSign, Upload, CreditCard, Users, Clock, Wrench, PieChart, Paintbrush } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Our actual design system tokens that connect to CSS variables
interface DesignSystemTokens {
  colors: {
    semantic: {
      background: string;
      foreground: string;
      primary: string;
      'primary-foreground': string;
      secondary: string;
      'secondary-foreground': string;
      muted: string;
      'muted-foreground': string;
      accent: string;
      'accent-foreground': string;
      destructive: string;
      'destructive-foreground': string;
      success: string;
      'success-foreground': string;
      warning: string;
      'warning-foreground': string;
      info: string;
      'info-foreground': string;
      border: string;
      input: string;
      ring: string;
    };
  };
  typography: {
    fontSize: {
      xs: number;
      sm: number;
      base: number;
      lg: number;
      xl: number;
      '2xl': number;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  shadows: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

// Default tokens based on our actual system
const defaultTokens: DesignSystemTokens = {
  colors: {
    semantic: {
      background: 'hsl(0, 0%, 100%)',
      foreground: 'hsl(240, 10%, 25%)',
      primary: 'hsl(267, 85%, 60%)',
      'primary-foreground': 'hsl(0, 0%, 100%)',
      secondary: 'hsl(240, 5%, 93%)',
      'secondary-foreground': 'hsl(240, 6%, 35%)',
      muted: 'hsl(0, 0%, 86.67%)',
      'muted-foreground': 'hsl(240, 4%, 54%)',
      accent: 'hsl(270, 8%, 92%)',
      'accent-foreground': 'hsl(240, 6%, 35%)',
      destructive: 'hsl(0, 84%, 60%)',
      'destructive-foreground': 'hsl(0, 0%, 100%)',
      success: 'hsl(142, 76%, 36%)',
      'success-foreground': 'hsl(0, 0%, 100%)',
      warning: 'hsl(48, 96%, 53%)',
      'warning-foreground': 'hsl(26, 83%, 14%)',
      info: 'hsl(200, 89%, 48%)',
      'info-foreground': 'hsl(0, 0%, 100%)',
      border: 'hsl(240, 6%, 87%)',
      input: 'hsl(240, 6%, 87%)',
      ring: 'hsl(267, 85%, 60%)',
    },
  },
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  borderRadius: {
    sm: 4,
    md: 6,
    lg: 8,
  },
  shadows: {
    xs: '0px 1px 2px 0px rgba(0, 0, 0, 0.05)',
    sm: '0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06)',
    md: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
};



// Live Preview Component
function LivePreviewDialog({ tokens }: { tokens: DesignSystemTokens }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Eye className="w-4 h-4 mr-2" />
          Live Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] h-[90vh] max-w-none overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Live Theme Preview</DialogTitle>
          <DialogDescription>
            See how your design tokens affect real components. Changes are also applied live to the entire application!
          </DialogDescription>
        </DialogHeader>
        
        {/* Subframe-style Dashboard using shadcn/ui components */}
        <div className="h-[calc(90vh-120px)] overflow-hidden bg-background">
          {/* Top Navigation */}
          <div className="border-b bg-background">
            <div className="flex items-center justify-between px-6 py-4">
              {/* Logo and Navigation */}
              <div className="flex items-center gap-8">
                <div className="w-6 h-6 bg-foreground rounded-sm" />
                
                <nav className="flex items-center">
                  {['Home', 'Inbox', 'Reports'].map((item, idx) => (
                    <Button
                      key={item}
                      variant={idx === 0 ? "ghost" : "ghost"}
                      className={cn(
                        "px-4 py-2 text-sm font-medium relative",
                        idx === 0 ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {item}
                      {idx === 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                      )}
                    </Button>
                  ))}
                </nav>
              </div>
              
              {/* Search and Profile */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search" className="pl-9 w-64" />
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6 h-[calc(100%-80px)] overflow-auto">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Monday, January 4</p>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - To-do (4 columns) */}
              <div className="col-span-4 space-y-6">
                {/* To-do Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">To-do</h2>
                    <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                      View all
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { icon: CheckCircle, title: 'Review requests', desc: 'Approve new requests in your inbox', time: 'Today' },
                      { icon: DollarSign, title: 'Process invoices', desc: 'You have 1 to review', time: 'Today' },
                      { icon: Upload, title: 'Upload additional documents', desc: 'We need a few more details', time: 'Today' },
                      { icon: CreditCard, title: 'Set up a payment method', desc: 'Avoid delaying invoices and payments', time: 'Yesterday' },
                      { icon: CheckCircle, title: 'Finish verification', desc: 'Verify your account securely', time: 'Yesterday' }
                    ].map((item, idx) => (
                      <Card key={idx} className="p-4">
                        <div className="flex items-start gap-3">
                          <item.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-foreground mb-1">
                              {item.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.desc}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {item.time}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Upcoming Events */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Upcoming events</h2>
                    <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                      View all
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { title: 'Department Offsite', date: 'Monday, Nov 13, 2023', time: 'All-day' },
                      { title: 'Quarterly Review', date: 'Tuesday, Nov 3, 2023', time: '9:00 AM' },
                      { title: 'Project kick-off', date: 'Monday, Nov 13, 2023', time: '3:00 PM' }
                    ].map((event, idx) => (
                      <Card key={idx} className="p-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-foreground mb-1">
                              {event.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {event.date}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {event.time}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Updates, Departments, Recently joined (8 columns) */}
              <div className="col-span-8 space-y-6">
                {/* Updates Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Updates</h2>
                    <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                      View all
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card className="p-4 bg-accent">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium text-sm">5 new members</div>
                          <div className="text-xs text-muted-foreground">1 onboarding now</div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4 bg-destructive/10">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-destructive" />
                        <div>
                          <div className="font-medium text-sm">3 reminders</div>
                          <div className="text-xs text-muted-foreground">2 overdue</div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Departments & Recently Joined */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Departments */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Departments</h2>
                      <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                        View all
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {[
                        { icon: Wrench, name: 'Engineering', count: 12 },
                        { icon: PieChart, name: 'Product', count: 5 },
                        { icon: Paintbrush, name: 'Design', count: 3 }
                      ].map((dept, idx) => (
                        <Card key={idx} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <dept.icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{dept.name}</span>
                            </div>
                            <Badge variant="secondary">{dept.count}</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Recently Joined */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Recently joined</h2>
                      <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                        View all
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {[
                        { name: 'Abigail', date: 'Oct 24', avatar: 'AB' },
                        { name: 'Jonah', date: 'Nov 5', avatar: 'JH' },
                        { name: 'Michael', date: 'Nov 23', avatar: 'MK' }
                      ].map((person, idx) => (
                        <Card key={idx} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">{person.avatar}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{person.name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {person.date}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export Command Component
function ExportCommand({ 
  exportTokens, 
  exportCSS, 
  exportTailwindConfig,
  exportTheme
}: {
  exportTokens: () => void;
  exportCSS: () => void;
  exportTailwindConfig: () => void;
  exportTheme: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="end">
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem onSelect={exportTokens}>
                <Download className="mr-2 h-4 w-4" />
                <span>Export JSON</span>
              </CommandItem>
              <CommandItem onSelect={exportCSS}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Export CSS</span>
              </CommandItem>
              <CommandItem onSelect={exportTailwindConfig}>
                <Code className="mr-2 h-4 w-4" />
                <span>Export Config</span>
              </CommandItem>
              <CommandItem onSelect={exportTheme}>
                <Palette className="mr-2 h-4 w-4" />
                <span>Export Theme</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ThemeEditorPage() {
  const [tokens, setTokens] = useState<DesignSystemTokens>(defaultTokens);

  const updateSemanticColor = (key: keyof DesignSystemTokens['colors']['semantic'], value: string) => {
    setTokens(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        semantic: {
          ...prev.colors.semantic,
          [key]: value,
        },
      },
    }));
  };

  const updateFontSize = (key: keyof DesignSystemTokens['typography']['fontSize'], value: number) => {
    setTokens(prev => ({
      ...prev,
      typography: {
        ...prev.typography,
        fontSize: {
          ...prev.typography.fontSize,
          [key]: value,
        },
      },
    }));
  };

  const updateSpacing = (key: keyof DesignSystemTokens['spacing'], value: number) => {
    setTokens(prev => ({
      ...prev,
      spacing: {
        ...prev.spacing,
        [key]: value,
      },
    }));
  };

  const updateBorderRadius = (key: keyof DesignSystemTokens['borderRadius'], value: number) => {
    setTokens(prev => ({
      ...prev,
      borderRadius: {
        ...prev.borderRadius,
        [key]: value,
      },
    }));
  };

  const updateShadow = (key: keyof DesignSystemTokens['shadows'], value: string) => {
    setTokens(prev => ({
      ...prev,
      shadows: {
        ...prev.shadows,
        [key]: value,
      },
    }));
  };

  const resetToDefaults = () => {
    setTokens(defaultTokens);
    toast.success("Theme reset to defaults", {
      description: "All design tokens have been restored to their original values",
      action: {
        label: "Undo",
        onClick: () => {
          // Could implement undo functionality here
          toast.info("Undo functionality coming soon");
        },
      },
    });
  };

  // Convert our tokens to ThemeManager format
  const convertToThemeManagerFormat = (tokens: DesignSystemTokens): ThemeManagerTokens => ({
    colors: Object.fromEntries(
      Object.entries(tokens.colors.semantic).map(([key, value]) => [key, value])
    ),
    typography: Object.fromEntries(
      Object.entries(tokens.typography.fontSize).map(([key, value]) => [key, `${value}px`])
    ),
    spacing: Object.fromEntries(
      Object.entries(tokens.spacing).map(([key, value]) => [key, `${value}px`])
    ),
    borderRadius: Object.fromEntries(
      Object.entries(tokens.borderRadius).map(([key, value]) => [key, `${value}px`])
    ),
    shadows: { ...tokens.shadows }
  });

  // Convert ThemeManager format back to our tokens  
  const convertFromThemeManagerFormat = (themeData: ThemeManagerTokens): DesignSystemTokens => ({
    colors: {
      semantic: {
        background: themeData.colors.background || 'hsl(0, 0%, 100%)',
        foreground: themeData.colors.foreground || 'hsl(240, 10%, 25%)',
        primary: themeData.colors.primary || 'hsl(267, 85%, 60%)',
        'primary-foreground': themeData.colors['primary-foreground'] || 'hsl(0, 0%, 100%)',
        secondary: themeData.colors.secondary || 'hsl(240, 5%, 93%)',
        'secondary-foreground': themeData.colors['secondary-foreground'] || 'hsl(240, 6%, 35%)',
        muted: themeData.colors.muted || 'hsl(0, 0%, 86.67%)',
        'muted-foreground': themeData.colors['muted-foreground'] || 'hsl(240, 4%, 54%)',
        accent: themeData.colors.accent || 'hsl(270, 8%, 92%)',
        'accent-foreground': themeData.colors['accent-foreground'] || 'hsl(240, 6%, 35%)',
        destructive: themeData.colors.destructive || 'hsl(0, 84%, 60%)',
        'destructive-foreground': themeData.colors['destructive-foreground'] || 'hsl(0, 0%, 100%)',
        success: themeData.colors.success || 'hsl(142, 76%, 36%)',
        'success-foreground': themeData.colors['success-foreground'] || 'hsl(0, 0%, 100%)',
        warning: themeData.colors.warning || 'hsl(48, 96%, 53%)',
        'warning-foreground': themeData.colors['warning-foreground'] || 'hsl(26, 83%, 14%)',
        info: themeData.colors.info || 'hsl(200, 89%, 48%)',
        'info-foreground': themeData.colors['info-foreground'] || 'hsl(0, 0%, 100%)',
        border: themeData.colors.border || 'hsl(240, 6%, 87%)',
        input: themeData.colors.input || 'hsl(240, 6%, 87%)',
        ring: themeData.colors.ring || 'hsl(267, 85%, 60%)',
      }
    },
    typography: {
      fontSize: {
        xs: parseInt(themeData.typography.xs?.replace('px', '') || '12'),
        sm: parseInt(themeData.typography.sm?.replace('px', '') || '14'),
        base: parseInt(themeData.typography.base?.replace('px', '') || '16'),
        lg: parseInt(themeData.typography.lg?.replace('px', '') || '18'),
        xl: parseInt(themeData.typography.xl?.replace('px', '') || '20'),
        '2xl': parseInt(themeData.typography['2xl']?.replace('px', '') || '24'),
      }
    },
    spacing: {
      xs: parseInt(themeData.spacing.xs?.replace('px', '') || '4'),
      sm: parseInt(themeData.spacing.sm?.replace('px', '') || '8'),
      md: parseInt(themeData.spacing.md?.replace('px', '') || '16'),
      lg: parseInt(themeData.spacing.lg?.replace('px', '') || '24'),
      xl: parseInt(themeData.spacing.xl?.replace('px', '') || '32'),
      '2xl': parseInt(themeData.spacing['2xl']?.replace('px', '') || '48'),
    },
    borderRadius: {
      sm: parseInt(themeData.borderRadius.sm?.replace('px', '') || '4'),
      md: parseInt(themeData.borderRadius.md?.replace('px', '') || '6'),
      lg: parseInt(themeData.borderRadius.lg?.replace('px', '') || '8'),
    },
    shadows: {
      xs: themeData.shadows.xs || '0px 1px 2px 0px rgba(0, 0, 0, 0.05)',
      sm: themeData.shadows.sm || '0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.06)',
      md: themeData.shadows.md || '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: themeData.shadows.lg || '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: themeData.shadows.xl || '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)',
      '2xl': themeData.shadows['2xl'] || '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
    }
  });

  const handleThemeLoad = (themeData: ThemeManagerTokens) => {
    const convertedTokens = convertFromThemeManagerFormat(themeData);
    setTokens(convertedTokens);
  };

  const exportTokens = () => {
    const dataStr = JSON.stringify(tokens, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'design-system-tokens.json');
    linkElement.click();
    
    toast.success("Design tokens exported", {
      description: "JSON file downloaded successfully",
    });
  };

  const exportCSS = () => {
    const cssContent = exportThemeAsCSS(tokens);
    const dataUri = 'data:text/css;charset=utf-8,'+ encodeURIComponent(cssContent);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'theme-variables.css');
    linkElement.click();
    
    toast.success("CSS variables exported", {
      description: "Ready-to-use CSS file downloaded",
    });
  };

  const exportTailwindConfig = () => {
    const configContent = exportAsTailwindConfig(tokens);
    const dataUri = 'data:text/javascript;charset=utf-8,'+ encodeURIComponent(configContent);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'tailwind.config.js');
    linkElement.click();
    
    toast.success("Tailwind config exported", {
      description: "Configuration file ready for your project",
    });
  };

  const exportTheme = () => {
    const themeExport = {
      name: 'Custom Theme',
      description: 'Exported theme from design system editor',
      theme_data: convertToThemeManagerFormat(tokens),
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(themeExport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-theme-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Theme exported successfully!');
  };



  return (
    <div className="p-8">
      {/* Apply theme changes to the actual CSS variables in real-time */}
      <ThemeApplier tokens={tokens} />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Design System Editor</h1>
            <p className="text-gray-600 mt-2">
              Edit design tokens and see changes applied in real-time to your entire application. 
              Connected directly to your shadcn/ui system.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-600 font-medium">Live editing active</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeManager 
              currentTheme={convertToThemeManagerFormat(tokens)}
              onThemeLoad={handleThemeLoad}
              onThemeReset={resetToDefaults}
            />
            <ExportCommand 
              exportTokens={exportTokens}
              exportCSS={exportCSS}
              exportTailwindConfig={exportTailwindConfig}
              exportTheme={exportTheme}
            />
            <LivePreviewDialog tokens={tokens} />
          </div>
        </div>
      </div>

      {/* Main Content - All sections visible at once */}
      <div className="space-y-12">
          {/* Colors Section */}
          <section id="colors" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Colors</h2>
              <p className="text-gray-600">Core design system colors that map to CSS variables</p>
            </div>

            {/* Semantic Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Semantic Colors
                </CardTitle>
                <CardDescription>
                  The foundation colors used throughout your design system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(tokens.colors.semantic).map(([key, value]) => (
                    <ColorPicker
                      key={key}
                      label={key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      value={value}
                      onChange={(newValue) => updateSemanticColor(key as keyof typeof tokens.colors.semantic, newValue)}
                      description={`CSS var: --${key}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Color Preview Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Color Palette Overview</CardTitle>
                <CardDescription>
                  Visual overview of your complete color system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Object.entries(tokens.colors.semantic).map(([name, value]) => (
                    <div key={name} className="space-y-2">
                      <div
                        className="w-full h-16 rounded-lg border shadow-sm"
                        style={{ backgroundColor: value }}
                      />
                      <div className="text-xs">
                        <div className="font-medium">{name}</div>
                        <div className="text-gray-500 font-mono">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Typography Section */}
          <section id="typography" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Typography</h2>
              <p className="text-gray-600">Font size scale and typography settings</p>
            </div>

            {/* Font Sizes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-5 h-5" />
                  Font Size Scale
                </CardTitle>
                <CardDescription>
                  Typographic scale for consistent sizing across components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(tokens.typography.fontSize).map(([key, value]) => (
                    <NumberInput
                      key={key}
                      label={key}
                      value={value}
                      onChange={(newValue) => updateFontSize(key as keyof typeof tokens.typography.fontSize, newValue)}
                      min={8}
                      max={72}
                      step={1}
                      unit="px"
                      description={`text-${key}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Typography Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Typography Scale Preview</CardTitle>
                <CardDescription>
                  See how your font sizes look in context
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(tokens.typography.fontSize).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div style={{ fontSize: `${value}px` }}>
                      The quick brown fox jumps over the lazy dog
                    </div>
                    <div className="text-sm text-gray-500 font-mono">
                      {key} • {value}px
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          {/* Layout Section */}
          <section id="layout" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Layout</h2>
              <p className="text-gray-600">Spacing, sizing, and layout tokens</p>
            </div>

            {/* Spacing Scale */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid className="w-5 h-5" />
                  Spacing Scale
                </CardTitle>
                <CardDescription>
                  Consistent spacing system for layouts and components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(tokens.spacing).map(([key, value]) => (
                    <NumberInput
                      key={key}
                      label={key}
                      value={value}
                      onChange={(newValue) => updateSpacing(key as keyof typeof tokens.spacing, newValue)}
                      min={0}
                      max={200}
                      step={4}
                      unit="px"
                      description={`space-${key}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Border Radius with Integrated Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Border Radius</CardTitle>
                <CardDescription>
                  Corner radius system for consistent roundness
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(tokens.borderRadius).map(([key, value]) => (
                    <div key={key} className="space-y-4">
                      {/* Visual Preview */}
                      <div className="bg-gray-50 p-6 rounded-lg border">
                        <div className="text-sm font-medium mb-3 text-gray-700">
                          {key.charAt(0).toUpperCase() + key.slice(1)} Radius
                        </div>
                        <div
                          className="w-20 h-20 bg-white border-2 border-gray-300 mx-auto shadow-sm"
                          style={{ borderRadius: `${value}px` }}
                        />
                        <div className="text-xs text-gray-500 text-center mt-2">
                          {value}px
                        </div>
                      </div>
                      
                      {/* Control */}
                      <NumberInput
                        label={`Radius ${key}`}
                        value={value}
                        onChange={(newValue) => updateBorderRadius(key as keyof typeof tokens.borderRadius, newValue)}
                        min={0}
                        max={50}
                        step={1}
                        unit="px"
                        description={`rounded-${key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Spacing Scale with Visual Bars */}
            <Card>
              <CardHeader>
                <CardTitle>Spacing Scale Preview</CardTitle>
                <CardDescription>
                  Visual representation of your spacing tokens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(tokens.spacing).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-16 text-sm font-mono font-medium">{key}</div>
                      <div
                        className="bg-blue-500 rounded"
                        style={{ height: '12px', width: `${Math.min(value, 200)}px` }}
                      />
                      <div className="text-sm text-gray-600 font-medium">{value}px</div>
                    </div>
                  ))}
                </div>
                            </CardContent>
            </Card>
          </section>

          {/* Shadows Section */}
          <section id="shadows" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Shadows</h2>
              <p className="text-gray-600">Elevation system using box shadows for depth and hierarchy</p>
            </div>

            {/* Shadow System with Integrated Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Shadow Scale
                </CardTitle>
                <CardDescription>
                  Complete elevation system from subtle to dramatic shadows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {Object.entries(tokens.shadows).map(([key, value]) => (
                    <ShadowInput
                      key={key}
                      label={`Shadow ${key.toUpperCase()}`}
                      value={value}
                      onChange={(newValue) => updateShadow(key as keyof typeof tokens.shadows, newValue)}
                      description={`shadow-${key}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shadow Scale Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Shadow Scale Overview</CardTitle>
                <CardDescription>
                  Visual comparison of your complete shadow system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {Object.entries(tokens.shadows).map(([name, value]) => (
                    <div key={name} className="text-center space-y-3">
                      <div
                        className="w-16 h-16 bg-white rounded-lg mx-auto border"
                        style={{ boxShadow: value }}
                      />
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{name}</div>
                        <div className="text-xs text-gray-500 font-mono break-all">
                          shadow-{name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    );
  } 