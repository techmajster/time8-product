'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal,
  ChevronsLeft,
  ChevronsRight,
  Hash,
  List,
  Grid3X3
} from 'lucide-react';

// Properties interface
interface PaginationProperties {
  totalPages: number;
  currentPage: number;
  siblingCount: number;
  showPreviousNext: boolean;
  showFirstLast: boolean;
  showPageNumbers: boolean;
  boundaryCount: number;
  showTotalCount: boolean;
  showPageSize: boolean;
  compact: boolean;
  disabled: boolean;
}

// Properties Panel Component
function PaginationPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: PaginationProperties;
  onChange: (key: keyof PaginationProperties, value: any) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6 h-full min-h-[500px] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Properties</h3>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Total Pages */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Total Pages: {properties.totalPages}</Label>
          <Input
            type="range"
            min="1"
            max="100"
            value={properties.totalPages}
            onChange={(e) => onChange('totalPages', parseInt(e.target.value))}
          />
        </div>

        {/* Current Page */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Current Page: {properties.currentPage}</Label>
          <Input
            type="range"
            min="1"
            max={properties.totalPages}
            value={properties.currentPage}
            onChange={(e) => onChange('currentPage', parseInt(e.target.value))}
          />
        </div>

        {/* Sibling Count */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sibling Count: {properties.siblingCount}</Label>
          <Input
            type="range"
            min="0"
            max="3"
            value={properties.siblingCount}
            onChange={(e) => onChange('siblingCount', parseInt(e.target.value))}
          />
        </div>

        {/* Show Previous/Next */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Previous/Next</Label>
          <Switch 
            checked={properties.showPreviousNext} 
            onCheckedChange={(checked) => onChange('showPreviousNext', checked)}
          />
        </div>

        {/* Show Page Numbers */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Page Numbers</Label>
          <Switch 
            checked={properties.showPageNumbers} 
            onCheckedChange={(checked) => onChange('showPageNumbers', checked)}
          />
        </div>

        {/* Compact */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Compact Mode</Label>
          <Switch 
            checked={properties.compact} 
            onCheckedChange={(checked) => onChange('compact', checked)}
          />
        </div>

        {/* Disabled */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Disabled</Label>
          <Switch 
            checked={properties.disabled} 
            onCheckedChange={(checked) => onChange('disabled', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generatePaginationCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LivePaginationPreview({ properties }: { properties: PaginationProperties }) {
  const [currentPage, setCurrentPage] = useState(properties.currentPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= properties.totalPages && !properties.disabled) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    if (properties.compact) {
      return (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1 || properties.disabled}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            </PaginationItem>
            
            <div className="flex items-center space-x-2 mx-4">
              <span className="text-sm">Page</span>
              <span className="font-medium">{currentPage}</span>
              <span className="text-sm">of</span>
              <span className="font-medium">{properties.totalPages}</span>
            </div>
            
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === properties.totalPages || properties.disabled}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      );
    }

    return (
      <Pagination>
        <PaginationContent>
          {properties.showPreviousNext && (
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage - 1);
                }}
                className={currentPage === 1 || properties.disabled ? 'opacity-50 pointer-events-none' : ''}
              />
            </PaginationItem>
          )}

          {properties.showPageNumbers && Array.from({ length: Math.min(properties.totalPages, 10) }, (_, i) => i + 1).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(page);
                }}
                isActive={currentPage === page}
                className={properties.disabled ? 'opacity-50 pointer-events-none' : ''}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {properties.totalPages > 10 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {properties.showPreviousNext && (
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(currentPage + 1);
                }}
                className={currentPage === properties.totalPages || properties.disabled ? 'opacity-50 pointer-events-none' : ''}
              />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="space-y-4 w-full max-w-4xl">
        <div className="flex justify-center">
          {renderPagination()}
        </div>
      </div>
    </div>
  );
}

// Generate code function
function generatePaginationCode(props: PaginationProperties): string {
  return `<Pagination>
  <PaginationContent>
    ${props.showPreviousNext ? `<PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>` : ''}
    
    ${props.showPageNumbers ? `{pageNumbers.map((page) => (
      <PaginationItem key={page}>
        <PaginationLink 
          href="#" 
          isActive={currentPage === page}
        >
          {page}
        </PaginationLink>
      </PaginationItem>
    ))}` : ''}
    
    ${props.showPreviousNext ? `<PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>` : ''}
  </PaginationContent>
</Pagination>`;
}

export default function PaginationComponentPage() {
  const [paginationProperties, setPaginationProperties] = useState<PaginationProperties>({
    totalPages: 20,
    currentPage: 5,
    siblingCount: 1,
    showPreviousNext: true,
    showFirstLast: false,
    showPageNumbers: true,
    boundaryCount: 1,
    showTotalCount: false,
    showPageSize: false,
    compact: false,
    disabled: false,
  });

  const handlePropertyChange = (key: keyof PaginationProperties, value: any) => {
    setPaginationProperties(prev => {
      const newProps = { ...prev, [key]: value };
      
      // Ensure current page is within bounds
      if (key === 'totalPages' && newProps.currentPage > value) {
        newProps.currentPage = value;
      }
      
      return newProps;
    });
  };

  const handleReset = () => {
    setPaginationProperties({
      totalPages: 20,
      currentPage: 5,
      siblingCount: 1,
      showPreviousNext: true,
      showFirstLast: false,
      showPageNumbers: true,
      boundaryCount: 1,
      showTotalCount: false,
      showPageSize: false,
      compact: false,
      disabled: false,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Pagination</h1>
          <Badge variant="outline">Layout Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Pagination with page navigation, next and previous links. Supports multiple layouts, 
          page size controls, and extensive customization for different data presentation needs.
        </p>
      </div>

      {/* Live Preview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Example</CardTitle>
            <CardDescription>
              Navigate through pages and customize pagination behavior. Test different configurations below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-center bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-200 h-full min-h-[500px]">
                  <LivePaginationPreview properties={paginationProperties} />
                </div>
              </div>
              
              {/* Properties Panel */}
              <div className="lg:col-span-1">
                <div className="h-full min-h-[500px] border rounded-lg bg-gray-50/50">
                  <PaginationPropertiesPanel 
                    properties={paginationProperties}
                    onChange={handlePropertyChange}
                    onReset={handleReset}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Pagination Types Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Pagination Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Numbered
              </CardTitle>
              <CardDescription>
                Traditional page numbers with navigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Best for browsing large datasets where users need to jump to specific pages or understand their position.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChevronLeft className="h-5 w-5" />
                Simple
              </CardTitle>
              <CardDescription>
                Previous/Next only navigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for sequential browsing, mobile interfaces, or when page count is not important to users.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Compact
              </CardTitle>
              <CardDescription>
                Minimal space-efficient design
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ideal for embedded contexts, dashboards, or mobile views where space is constrained.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Common Use Cases</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Tables</CardTitle>
              <CardDescription>
                Employee lists, transaction history, product catalogs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use numbered pagination with page size controls. Include total count and range information 
                to help users understand dataset scope and navigate efficiently.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                Product searches, document libraries, user directories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Implement smart ellipsis for large result sets, show total matches, 
                and consider infinite scroll for mobile or exploration-focused interfaces.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Technical Notes */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Technical Notes</h2>
        <Card>
          <CardHeader>
            <CardTitle>Implementation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Accessibility</h4>
              <p className="text-sm text-muted-foreground">
                Full keyboard navigation, ARIA labels, screen reader announcements, and focus management.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">URL Synchronization</h4>
              <p className="text-sm text-muted-foreground">
                Supports URL parameter binding for bookmarkable pagination states and browser history integration.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 