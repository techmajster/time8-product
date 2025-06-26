'use client';

import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Filter out non-icon exports from Lucide
const getAllIcons = () => {
  const excludedNames = new Set([
    'icons', 'createLucideIcon', 'Icon', 'LucideIcon', 'LucideProps', 'default'
  ]);
  
  const iconEntries = Object.entries(LucideIcons).filter(([name, component]) => {
    return (
      !excludedNames.has(name) &&
      typeof component === 'function' &&
      name[0] === name[0].toUpperCase() && // Icon names start with uppercase
      name.length > 1 // Ensure it's a proper name
    );
  }) as [string, React.ComponentType<any>][];
  
  return iconEntries;
};

export default function IconsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIcon, setCopiedIcon] = useState<string | null>(null);
  
  const allIcons = useMemo(() => getAllIcons(), []);
  
  const filteredIcons = useMemo(() => {
    if (!searchQuery) return allIcons;
    
    return allIcons.filter(([name]) =>
      name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allIcons, searchQuery]);

  const copyImportStatement = async (iconName: string) => {
    const importStatement = `import { ${iconName} } from 'lucide-react';`;
    
    try {
      await navigator.clipboard.writeText(importStatement);
      setCopiedIcon(iconName);
      toast.success(`Copied ${iconName} import statement!`);
      
      // Reset feedback after 2 seconds
      setTimeout(() => setCopiedIcon(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Icons</h1>
          <p className="text-muted-foreground">
            Browse and copy Lucide React icons for your project
          </p>
        </div>

        {/* Search and Stats */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
              >
                ×
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              {filteredIcons.length} icons
            </Badge>
            {searchQuery && (
              <Badge variant="outline" className="text-sm">
                Showing results for "{searchQuery}"
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Icon Grid */}
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 2xl:grid-cols-16 gap-3">
        {filteredIcons.map(([iconName, IconComponent]) => {
          const isCopied = copiedIcon === iconName;
          
          return (
            <Card
              key={iconName}
              className={`
                group relative p-3 cursor-pointer transition-all duration-200 hover:shadow-md
                ${isCopied 
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                  : 'hover:bg-accent'
                }
              `}
              onClick={() => copyImportStatement(iconName)}
            >
              {/* Icon */}
              <div className="flex items-center justify-center mb-2">
                <IconComponent 
                  size={24} 
                  className={`
                    transition-colors duration-200
                    ${isCopied 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-foreground group-hover:text-primary'
                    }
                  `}
                />
              </div>
              
              {/* Icon Name */}
              <div className="text-xs text-center text-muted-foreground group-hover:text-foreground truncate">
                {iconName}
              </div>
              
              {/* Copy Feedback */}
              {isCopied && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-50/90 dark:bg-green-950/40 rounded-md">
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Check size={16} />
                    <span className="text-xs font-medium">Copied!</span>
                  </div>
                </div>
              )}
              
              {/* Hover Copy Icon */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="bg-background/90 backdrop-blur-sm rounded p-1">
                  <Copy size={12} className="text-muted-foreground" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* No Results */}
      {filteredIcons.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Search size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No icons found</h3>
            <p>No icons match your search for "{searchQuery}"</p>
          </div>
          <Button variant="outline" onClick={clearSearch}>
            Clear search
          </Button>
        </div>
      )}

      {/* Usage Instructions */}
      <Card className="p-6">
        <h3 className="font-semibold mb-2">How to use</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Click any icon to copy its import statement to your clipboard</p>
          <p>• Use the search bar to quickly find specific icons</p>
          <p>• Icons will show green feedback when successfully copied</p>
          <p>• All icons are from the Lucide React library</p>
        </div>
        
        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground mb-1">Example usage:</p>
          <code className="text-xs">
            import &#123; Search &#125; from 'lucide-react';<br/>
            &lt;Search size=&#123;24&#125; /&gt;
          </code>
        </div>
      </Card>
    </div>
  );
} 