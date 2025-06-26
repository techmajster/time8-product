'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Edit, Trash2, MoreHorizontal, ArrowUpDown } from 'lucide-react';

const sampleData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', status: 'Active' },
];

// Live Table Preview Component
function LiveTablePreview({ 
  variant, 
  showHeader, 
  showActions, 
  selectable, 
  striped 
}: {
  variant: 'default' | 'compact' | 'spacious';
  showHeader: boolean;
  showActions: boolean;
  selectable: boolean;
  striped: boolean;
}) {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const toggleRowSelection = (id: number) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const toggleAllSelection = () => {
    if (selectedRows.length === sampleData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(sampleData.map(row => row.id));
    }
  };

  const rowClasses = {
    default: '',
    compact: 'text-sm',
    spacious: 'py-4'
  };

  return (
    <div className="w-full">
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedRows.length === sampleData.length}
                    onCheckedChange={toggleAllSelection}
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {showActions && <TableHead className="w-20">Actions</TableHead>}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {sampleData.map((row, index) => (
            <TableRow 
              key={row.id} 
              className={`${rowClasses[variant]} ${striped && index % 2 === 0 ? 'bg-muted/50' : ''}`}
            >
              {selectable && (
                <TableCell>
                  <Checkbox 
                    checked={selectedRows.includes(row.id)}
                    onCheckedChange={() => toggleRowSelection(row.id)}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.role}</TableCell>
              <TableCell>
                <Badge variant={row.status === 'Active' ? 'default' : 'secondary'}>
                  {row.status}
                </Badge>
              </TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Properties Panel Component
function TablePropertiesPanel({ 
  variant, 
  setVariant, 
  showHeader, 
  setShowHeader, 
  showActions, 
  setShowActions, 
  selectable, 
  setSelectable, 
  striped, 
  setStriped 
}: {
  variant: 'default' | 'compact' | 'spacious';
  setVariant: (variant: 'default' | 'compact' | 'spacious') => void;
  showHeader: boolean;
  setShowHeader: (show: boolean) => void;
  showActions: boolean;
  setShowActions: (show: boolean) => void;
  selectable: boolean;
  setSelectable: (selectable: boolean) => void;
  striped: boolean;
  setStriped: (striped: boolean) => void;
}) {
  const resetToDefaults = () => {
    setVariant('default');
    setShowHeader(true);
    setShowActions(true);
    setSelectable(false);
    setStriped(false);
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
        {/* Variant */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Variant</Label>
          <Select value={variant} onValueChange={(value: 'default' | 'compact' | 'spacious') => setVariant(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="spacious">Spacious</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show Header */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Header</Label>
          <Switch checked={showHeader} onCheckedChange={setShowHeader} />
        </div>

        {/* Show Actions */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Actions</Label>
          <Switch checked={showActions} onCheckedChange={setShowActions} />
        </div>

        {/* Selectable */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Selectable Rows</Label>
          <Switch checked={selectable} onCheckedChange={setSelectable} />
        </div>

        {/* Striped */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Striped Rows</Label>
          <Switch checked={striped} onCheckedChange={setStriped} />
        </div>
      </div>
    </div>
  );
}

export default function TableComponentPage() {
  // Interactive example state
  const [variant, setVariant] = useState<'default' | 'compact' | 'spacious'>('default');
  const [showHeader, setShowHeader] = useState(true);
  const [showActions, setShowActions] = useState(true);
  const [selectable, setSelectable] = useState(false);
  const [striped, setStriped] = useState(false);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Table</h1>
          <Badge variant="outline">Layout Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A responsive table component for displaying tabular data with support for sorting, selection, and actions.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Table Preview</CardTitle>
            <CardDescription>
              Customize the table properties and see changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-3 p-4 border rounded-lg bg-muted/30 overflow-auto">
                <LiveTablePreview
                  variant={variant}
                  showHeader={showHeader}
                  showActions={showActions}
                  selectable={selectable}
                  striped={striped}
                />
              </div>

              {/* Properties Panel */}
              <div className="space-y-4 p-4 border rounded-lg bg-background">
                <TablePropertiesPanel
                  variant={variant}
                  setVariant={setVariant}
                  showHeader={showHeader}
                  setShowHeader={setShowHeader}
                  showActions={showActions}
                  setShowActions={setShowActions}
                  selectable={selectable}
                  setSelectable={setSelectable}
                  striped={striped}
                  setStriped={setStriped}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Basic Table */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Basic Table</h2>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">INV001</TableCell>
                  <TableCell>Paid</TableCell>
                  <TableCell>Credit Card</TableCell>
                  <TableCell className="text-right">$250.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">INV002</TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell>PayPal</TableCell>
                  <TableCell className="text-right">$150.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">INV003</TableCell>
                  <TableCell>Unpaid</TableCell>
                  <TableCell>Bank Transfer</TableCell>
                  <TableCell className="text-right">$350.00</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Table with Actions */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Table with Actions</h2>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleData.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
} 