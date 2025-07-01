'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { DatePicker } from '@/components/ui/date-picker';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertCircle, CheckCircle, Info, Calendar, HelpCircle, Settings, Plus, ChevronDown, Search, Bold, Italic, Home, Users, FileText, AlertTriangle, XCircle, CheckCircle2, Bell } from 'lucide-react';
import { useSonnerToast, useLeaveSystemToasts } from '@/hooks/use-sonner-toast';

// Toast Preview Component
function ToastPreview() {
  const { showSuccess, showError, showWarning, showInfo } = useSonnerToast(true);
  const leaveToasts = useLeaveSystemToasts(true);

  return (
    <div className="space-y-2">
      {/* Basic Toast Types */}
      <div className="grid grid-cols-2 gap-2">
        <Button 
          size="sm"
          onClick={() => showSuccess("Success! Operation completed")}
          className="bg-success hover:bg-success/90 text-success-foreground text-xs"
        >
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Success
        </Button>
        
        <Button 
          size="sm"
          onClick={() => showError("Error! Something went wrong")}
          variant="destructive"
          className="text-xs"
        >
          <XCircle className="w-3 h-3 mr-1" />
          Error
        </Button>
        
        <Button 
          size="sm"
          onClick={() => showWarning("Warning! Check input")}
          className="bg-warning hover:bg-warning/90 text-warning-foreground text-xs"
        >
          <AlertTriangle className="w-3 h-3 mr-1" />
          Warning
        </Button>
        
        <Button 
          size="sm"
          onClick={() => showInfo("Info: Helpful information")}
          className="bg-info hover:bg-info/90 text-info-foreground text-xs"
        >
          <Info className="w-3 h-3 mr-1" />
          Info
        </Button>
      </div>

      {/* Advanced Features */}
      <div className="space-y-1">
        <Button 
          size="sm"
          variant="outline"
          onClick={() => showSuccess("With action button", {
            duration: 5000,
            action: {
              label: "View",
              onClick: () => alert("Action clicked!")
            }
          })}
          className="w-full text-xs"
        >
          With Action
        </Button>
        
        <Button 
          size="sm"
          variant="outline"
          onClick={() => leaveToasts.leaveRequestSubmitted()}
          className="w-full text-xs"
        >
          Leave System Toast
        </Button>
      </div>
    </div>
  );
}

const components = [
  // Actions
  { 
    name: 'Button', 
    category: 'Actions',
    description: 'Primary action component with multiple variants',
    preview: (
      <div className="flex gap-2 flex-wrap">
        <Button size="sm">Primary</Button>
        <Button size="sm" variant="outline">Outline</Button>
        <Button size="sm" variant="ghost">Ghost</Button>
        <Button size="sm" variant="secondary">Secondary</Button>
        <Button size="sm" variant="destructive">Destructive</Button>
        <Button size="sm" variant="link">Link</Button>
      </div>
    )
  },
  { 
    name: 'Toggle', 
    category: 'Actions',
    description: 'Toggle button for binary state',
    preview: (
      <div className="flex gap-2">
        <Toggle>
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle pressed>
          <Italic className="h-4 w-4" />
        </Toggle>
      </div>
    )
  },
  { 
    name: 'Toggle Group', 
    category: 'Actions',
    description: 'Group of toggle buttons for multiple selection',
    preview: (
      <ToggleGroup type="multiple" className="flex gap-1">
        <ToggleGroupItem value="bold">
          <Bold className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic">
          <Italic className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    )
  },
  
  // Form Elements
  { 
    name: 'Input', 
    category: 'Form',
    description: 'Text input field with validation support',
    preview: (
      <div className="space-y-2 w-full">
        <Input placeholder="Enter text..." className="max-w-xs" />
        <Input placeholder="Disabled input" disabled className="max-w-xs" />
      </div>
    )
  },
  { 
    name: 'Textarea', 
    category: 'Form',
    description: 'Multi-line text input for longer content',
    preview: (
      <Textarea placeholder="Enter your message..." className="max-w-xs resize-none" rows={3} />
    )
  },
  { 
    name: 'Select', 
    category: 'Form',
    description: 'Dropdown selection component',
    preview: (
      <Select>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Select option..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
          <SelectItem value="option3">Option 3</SelectItem>
        </SelectContent>
      </Select>
    )
  },
  { 
    name: 'Checkbox', 
    category: 'Form',
    description: 'Binary choice input with label support',
    preview: (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Checkbox id="terms1" defaultChecked />
          <Label htmlFor="terms1" className="text-sm">Accept terms</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="terms2" />
          <Label htmlFor="terms2" className="text-sm">Subscribe to newsletter</Label>
        </div>
      </div>
    )
  },
  { 
    name: 'Radio Group', 
    category: 'Form',
    description: 'Single choice selection from multiple options',
    preview: (
      <RadioGroup defaultValue="option1" className="flex gap-4">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1" className="text-sm">Option 1</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option2" id="r2" />
          <Label htmlFor="r2" className="text-sm">Option 2</Label>
        </div>
      </RadioGroup>
    )
  },
  { 
    name: 'Switch', 
    category: 'Form',
    description: 'Toggle switch for boolean settings',
    preview: (
      <div className="flex items-center gap-2">
        <Switch />
        <Label className="text-sm">Enable notifications</Label>
      </div>
    )
  },
  { 
    name: 'Slider', 
    category: 'Form',
    description: 'Range input for numeric values',
    preview: (
      <div className="w-48">
        <Slider defaultValue={[50]} max={100} step={1} />
      </div>
    )
  },
  { 
    name: 'Input OTP', 
    category: 'Form',
    description: 'One-time password input component',
    preview: (
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    )
  },
  { 
    name: 'Date Picker', 
    category: 'Form',
    description: 'Calendar-based date selection',
    preview: (
      <DatePicker />
    )
  },
  
  // Layout
  { 
    name: 'Card', 
    category: 'Layout',
    description: 'Container component with header and content areas',
    preview: (
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Card Title</CardTitle>
          <CardDescription className="text-sm">
            Card description goes here
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          This is the card content area.
        </CardContent>
      </Card>
    )
  },
  { 
    name: 'Separator', 
    category: 'Layout',
    description: 'Visual divider between content sections',
    preview: (
      <div className="w-full">
        <div className="text-sm text-gray-600 mb-2">Above separator</div>
        <Separator />
        <div className="text-sm text-gray-600 mt-2">Below separator</div>
      </div>
    )
  },
  { 
    name: 'Tabs', 
    category: 'Layout',
    description: 'Organize content into switchable panels',
    preview: (
      <Tabs defaultValue="tab1" className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tab1" className="text-xs">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" className="text-xs">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" className="text-sm text-gray-600 mt-2">
          Content for tab 1
        </TabsContent>
        <TabsContent value="tab2" className="text-sm text-gray-600 mt-2">
          Content for tab 2
        </TabsContent>
      </Tabs>
    )
  },
  { 
    name: 'Accordion', 
    category: 'Layout',
    description: 'Collapsible content sections',
    preview: (
      <Accordion type="single" collapsible className="w-full max-w-sm">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-sm">Item 1</AccordionTrigger>
          <AccordionContent className="text-xs text-gray-600">
            Content for the first item.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger className="text-sm">Item 2</AccordionTrigger>
          <AccordionContent className="text-xs text-gray-600">
            Content for the second item.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  },
  { 
    name: 'Collapsible', 
    category: 'Layout',
    description: 'Simple collapsible content container',
    preview: (
      <Collapsible className="w-full max-w-sm">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            Toggle Content
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="text-sm text-gray-600 mt-2 p-2 border rounded">
          This is collapsible content that can be shown or hidden.
        </CollapsibleContent>
      </Collapsible>
    )
  },
  { 
    name: 'Scroll Area', 
    category: 'Layout',
    description: 'Custom scrollable container',
    preview: (
      <ScrollArea className="h-24 w-48 rounded-md border p-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="text-xs py-1">
            Scrollable item {i + 1}
          </div>
        ))}
      </ScrollArea>
    )
  },
  { 
    name: 'Resizable', 
    category: 'Layout',
    description: 'Resizable panel container',
    preview: (
      <ResizablePanelGroup direction="horizontal" className="h-20 w-48 rounded-lg border">
        <ResizablePanel defaultSize={50}>
          <div className="flex h-full items-center justify-center text-xs">
            Left
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50}>
          <div className="flex h-full items-center justify-center text-xs">
            Right
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
  },
  { 
    name: 'Table', 
    category: 'Layout',
    description: 'Structured data display',
    preview: (
      <div className="w-full max-w-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs">John</TableCell>
              <TableCell className="text-xs">Active</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-xs">Jane</TableCell>
              <TableCell className="text-xs">Inactive</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  },
  { 
    name: 'Breadcrumb', 
    category: 'Layout',
    description: 'Navigation breadcrumb trail',
    preview: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#" className="text-xs">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#" className="text-xs">Components</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs">Breadcrumb</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  },
  { 
    name: 'Pagination', 
    category: 'Layout',
    description: 'Page navigation component',
    preview: (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" className="text-xs" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" className="text-xs">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" className="text-xs" isActive>2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" className="text-xs">3</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" className="text-xs" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  },
  
  // Display
  { 
    name: 'Badge', 
    category: 'Display',
    description: 'Status indicators with semantic color system',
    preview: (
      <div className="flex gap-1 flex-wrap">
        <Badge>Primary</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Error</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge className="bg-success/10 text-success hover:bg-success/20 border-success/20">Success</Badge>
        <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-warning/20">Warning</Badge>
        <Badge className="bg-info/10 text-info hover:bg-info/20 border-info/20">Info</Badge>
      </div>
    )
  },
  { 
    name: 'Avatar', 
    category: 'Display',
    description: 'User profile images with fallback',
    preview: (
      <div className="flex gap-2">
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>MK</AvatarFallback>
        </Avatar>
      </div>
    )
  },
  { 
    name: 'Progress', 
    category: 'Display',
    description: 'Visual progress indicator',
    preview: (
      <div className="w-48 space-y-2">
        <Progress value={33} className="h-2" />
        <Progress value={66} className="h-2" />
      </div>
    )
  },
  { 
    name: 'Skeleton', 
    category: 'Display',
    description: 'Loading placeholder with shimmer effect',
    preview: (
      <div className="space-y-2 w-48">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
  },
  { 
    name: 'Tooltip', 
    category: 'Display',
    description: 'Contextual information on hover',
    preview: (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">
              <HelpCircle className="h-4 w-4 mr-1" />
              Hover me
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>This is a tooltip</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
  
  // Interactive/Overlay
  { 
    name: 'Dialog', 
    category: 'Interactive',
    description: 'Modal dialog overlay',
    preview: (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Dialog Title</DialogTitle>
            <DialogDescription className="text-xs">
              This is a dialog description.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  },
  { 
    name: 'Alert Dialog', 
    category: 'Interactive',
    description: 'Confirmation dialog with actions',
    preview: (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">Show Alert</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-xs">Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  },
  { 
    name: 'Sheet', 
    category: 'Interactive',
    description: 'Slide-out panel overlay',
    preview: (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">Open Sheet</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="text-sm">Sheet Title</SheetTitle>
            <SheetDescription className="text-xs">
              This is a sheet description.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
  },
  { 
    name: 'Drawer', 
    category: 'Interactive',
    description: 'Bottom slide-up overlay',
    preview: (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm">Open Drawer</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-sm">Drawer Title</DrawerTitle>
            <DrawerDescription className="text-xs">
              This is a drawer description.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" size="sm">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  },
  { 
    name: 'Command', 
    category: 'Interactive',
    description: 'Command palette interface',
    preview: (
      <div className="w-64">
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Type a command..." className="text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs">No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem className="text-xs">
                <Settings className="mr-2 h-3 w-3" />
                Settings
              </CommandItem>
              <CommandItem className="text-xs">
                <Users className="mr-2 h-3 w-3" />
                Users
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    )
  },
  
  // Feedback
  { 
    name: 'Alert', 
    category: 'Feedback',
    description: 'Important messages and notifications',
    preview: (
      <div className="space-y-2">
        <Alert className="max-w-sm">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm">Info</AlertTitle>
          <AlertDescription className="text-xs">
            This is an informational message.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive" className="max-w-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-sm">Error</AlertTitle>
          <AlertDescription className="text-xs">
            Something went wrong.
          </AlertDescription>
        </Alert>
      </div>
    )
  },
  { 
    name: 'Toast Notifications', 
    category: 'Feedback',
    description: 'Real-time notifications with Sonner',
    preview: <ToastPreview />
  },
  
  // Complex Combinations
  { 
    name: 'Status Card', 
    category: 'Complex',
    description: 'Card with status indicators and actions',
    preview: (
      <Card className="w-64">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Leave Request</CardTitle>
            <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>
          </div>
          <CardDescription className="text-xs">Dec 25-31, 2024</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">JD</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">John Doe</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground text-xs flex-1">
              Approve
            </Button>
            <Button size="sm" variant="destructive" className="text-xs flex-1">
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  },
  { 
    name: 'Settings Panel', 
    category: 'Complex',
    description: 'Form with multiple input types and actions',
    preview: (
      <Card className="w-72">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Notification Settings</CardTitle>
          <CardDescription className="text-xs">Manage your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Email notifications</Label>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Push notifications</Label>
            <Switch defaultChecked />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Frequency</Label>
            <Select>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="text-xs flex-1">Save</Button>
            <Button size="sm" variant="outline" className="text-xs">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    )
  },
  { 
    name: 'Data Table Row', 
    category: 'Complex',
    description: 'Table row with actions and status indicators',
    preview: (
      <div className="w-80 border rounded-lg overflow-hidden">
        <div className="p-3 border-b bg-muted/50">
          <div className="text-xs font-medium text-muted-foreground">Employee Schedule</div>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">AM</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">Anna Miller</div>
                <div className="text-xs text-muted-foreground">Product Manager</div>
              </div>
            </div>
            <Badge className="bg-success/10 text-success border-success/20 text-xs">Active</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Mon-Fri, 9:00 AM - 5:00 PM</span>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="text-xs h-7">
              <Settings className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7">
              <Users className="h-3 w-3 mr-1" />
              View Team
            </Button>
          </div>
        </div>
      </div>
    )
  },
  { 
    name: 'Alert Variants', 
    category: 'Complex',
    description: 'Alert components with semantic color variations',
    preview: (
      <div className="space-y-3 w-72">
        <Alert className="bg-info/10 border-info/20">
          <Info className="h-4 w-4 text-info" />
          <AlertTitle className="text-sm text-info">Information</AlertTitle>
          <AlertDescription className="text-xs text-info/80">
            New features have been added to your dashboard.
          </AlertDescription>
        </Alert>
        <Alert className="bg-success/10 border-success/20">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertTitle className="text-sm text-success">Success</AlertTitle>
          <AlertDescription className="text-xs text-success/80">
            Your changes have been saved successfully.
          </AlertDescription>
        </Alert>
        <Alert className="bg-warning/10 border-warning/20">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-sm text-warning">Warning</AlertTitle>
          <AlertDescription className="text-xs text-warning/80">
            Please review your settings before proceeding.
          </AlertDescription>
        </Alert>
      </div>
    )
  },
  { 
    name: 'Navigation Menu', 
    category: 'Complex',
    description: 'Multi-level navigation with icons and badges',
    preview: (
      <div className="w-56 border rounded-lg overflow-hidden bg-card">
        <div className="p-3 border-b">
          <div className="text-sm font-medium">Leave System</div>
          <div className="text-xs text-muted-foreground">Navigation Menu</div>
        </div>
        <div className="p-2 space-y-1">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/10 text-primary">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Dashboard</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 text-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">Requests</span>
            </div>
            <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">3</Badge>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 text-foreground">
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 text-foreground">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm">Notifications</span>
            </div>
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">!</Badge>
          </div>
        </div>
      </div>
    )
  },
];

export function ComponentGrid() {
  const categories = ['All', 'Actions', 'Form', 'Layout', 'Display', 'Interactive', 'Feedback', 'Complex'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredComponents = selectedCategory === 'All' 
    ? components 
    : components.filter(component => component.category === selectedCategory);

  return (
    <div className="p-8">
              <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Component Library</h1>
            <p className="text-muted-foreground mt-1">
              Browse and preview all available UI components
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-success/10 text-success text-xs font-medium">
              Phase 2
            </span>
            <span>Component Gallery</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span>Interactive component showcase</span>
        </div>
        
        {/* Stats */}
        <div className="flex gap-4 mb-6">
          <div className="bg-info/10 border border-info/20 rounded-lg px-4 py-2">
            <div className="text-sm font-medium text-info">{components.length} Components</div>
            <div className="text-xs text-muted-foreground">Total available</div>
          </div>
          <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-2">
            <div className="text-sm font-medium text-success">{categories.length - 1} Categories</div>
            <div className="text-xs text-muted-foreground">Organized groups</div>
          </div>
          <div className="bg-warning/10 border border-warning/20 rounded-lg px-4 py-2">
            <div className="text-sm font-medium text-warning">Live Demos</div>
            <div className="text-xs text-muted-foreground">Interactive previews</div>
          </div>
          <div className="bg-accent border border-accent rounded-lg px-4 py-2">
            <div className="text-sm font-medium text-accent-foreground">Semantic Colors</div>
            <div className="text-xs text-muted-foreground">Design system ready</div>
          </div>
        </div>
        
        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="text-sm"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Component Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredComponents.map((component) => (
          <div 
            key={component.name} 
            className="group border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 hover:border-primary/20 bg-card"
          >
            {/* Preview Area */}
            <div className="p-6 min-h-[140px] flex items-center justify-center bg-muted/50">
              <div className="w-full flex items-center justify-center">
                {component.preview}
              </div>
            </div>
            
            {/* Component Info */}
            <div className="p-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-foreground">{component.name}</h3>
                <Badge variant="outline" className="text-xs">
                  {component.category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {component.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {filteredComponents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No components found in this category.</p>
        </div>
      )}
    </div>
  );
} 