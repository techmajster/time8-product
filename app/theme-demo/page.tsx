"use client"

import * as React from "react"
import { Search, Settings, Info, AlertCircle, ChevronDown, Plus, Download, Trash2 } from "lucide-react"
import { useState } from "react"
import dynamic from 'next/dynamic'
import { useSonnerToast, useLeaveSystemToasts } from "@/hooks/use-sonner-toast"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { CalendarDemo } from "@/components/ui/calendar-demo"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { DatePicker, DatePickerWithDropdown } from "@/components/ui/date-picker"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Progress } from "@/components/ui/progress"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  CalendarIcon, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Home,
  Users,
  FileText,
  BarChart3,
  Bell,
  Menu,
  X,
  MessageSquare,
  ThumbsUp,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Zap,
  Shield,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  User,
  Building,
  CreditCard,
  Key,
  Palette,
  Monitor,
  Smartphone,
  Tablet
} from "lucide-react"

// ✅ OPTIMIZATION: Lazy load heavy components that are not immediately visible
const HeavyUIComponents = dynamic(() => 
  Promise.resolve(() => (
    <div className="space-y-6">
      {/* Calendar Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Calendar & Date Components</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarDemo />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Date Range Picker</CardTitle>
            </CardHeader>
            <CardContent>
              <DateRangePicker />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )), 
  { 
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    ),
    ssr: false
  }
)

export default function ThemeDemo() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [dateRange, setDateRange] = React.useState<any>()
  const [progress, setProgress] = React.useState(13)
  const [sliderValue, setSliderValue] = React.useState([50])
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [iconsEnabled, setIconsEnabled] = useState(false) // New state for icon control
  
  // Toast notification hooks
  const { showSuccess, showError, showWarning, showInfo } = useSonnerToast(iconsEnabled)
  const leaveToasts = useLeaveSystemToasts(iconsEnabled)

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500)
    return () => clearTimeout(timer)
  }, [])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const toggleLoading = (key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }))

    // Auto-clear loading state after 3 seconds
    setTimeout(() => {
      setLoadingStates(prev => ({
        ...prev,
        [key]: false
      }))
    }, 3000)
  }

  const handleLoadingDemo = (key: string) => {
    setLoadingStates(prev => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [key]: false }))
    }, 2000)
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-8 space-y-12">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Complete shadcn/ui Demo</h1>
            <p className="text-muted-foreground">All 47 components with clean-slate theme</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Enhanced Buttons from Figma Design */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Enhanced Button System</h2>
          <div className="grid gap-6">
            {/* Variants Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Button Variants (Figma Design)</CardTitle>
                <CardDescription>All variants with exact Figma specifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Default */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Default (Primary)</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon"><Settings className="h-4 w-4" /></Button>
                    <Button disabled>Disabled</Button>
                    <Button 
                      loading={loadingStates.default}
                      onClick={() => handleLoadingDemo('default')}
                    >
                      {loadingStates.default ? 'Loading...' : 'Click for Loading'}
                    </Button>
                  </div>
                </div>

                {/* Secondary */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Secondary</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="secondary" size="sm">Small</Button>
                    <Button variant="secondary" size="default">Default</Button>
                    <Button variant="secondary" size="lg">Large</Button>
                    <Button variant="secondary" size="icon"><Settings className="h-4 w-4" /></Button>
                    <Button variant="secondary" disabled>Disabled</Button>
                    <Button 
                      variant="secondary"
                      loading={loadingStates.secondary}
                      onClick={() => handleLoadingDemo('secondary')}
                    >
                      {loadingStates.secondary ? 'Loading...' : 'Click for Loading'}
                    </Button>
                  </div>
                </div>

                {/* Ghost */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Ghost</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="ghost" size="sm">Small</Button>
                    <Button variant="ghost" size="default">Default</Button>
                    <Button variant="ghost" size="lg">Large</Button>
                    <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
                    <Button variant="ghost" disabled>Disabled</Button>
                    <Button 
                      variant="ghost"
                      loading={loadingStates.ghost}
                      onClick={() => handleLoadingDemo('ghost')}
                    >
                      {loadingStates.ghost ? 'Loading...' : 'Click for Loading'}
                    </Button>
                  </div>
                </div>

                {/* Link */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Link</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="link" size="sm">Small Link</Button>
                    <Button variant="link" size="default">Default Link</Button>
                    <Button variant="link" size="lg">Large Link</Button>
                    <Button variant="link" disabled>Disabled</Button>
                    <Button 
                      variant="link"
                      loading={loadingStates.link}
                      onClick={() => handleLoadingDemo('link')}
                    >
                      {loadingStates.link ? 'Loading...' : 'Click for Loading'}
                    </Button>
                  </div>
                </div>

                {/* Outline */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Outline</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="outline" size="sm">Small</Button>
                    <Button variant="outline" size="default">Default</Button>
                    <Button variant="outline" size="lg">Large</Button>
                    <Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button>
                    <Button variant="outline" disabled>Disabled</Button>
                    <Button 
                      variant="outline"
                      loading={loadingStates.outline}
                      onClick={() => handleLoadingDemo('outline')}
                    >
                      {loadingStates.outline ? 'Loading...' : 'Click for Loading'}
                    </Button>
                  </div>
                </div>

                {/* Destructive */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Destructive</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button variant="destructive" size="sm">Delete</Button>
                    <Button variant="destructive" size="default">Delete Item</Button>
                    <Button variant="destructive" size="lg">Delete Forever</Button>
                    <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                    <Button variant="destructive" disabled>Disabled</Button>
                    <Button 
                      variant="destructive"
                      loading={loadingStates.destructive}
                      onClick={() => handleLoadingDemo('destructive')}
                    >
                      {loadingStates.destructive ? 'Deleting...' : 'Click to Delete'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Examples */}
            <Card>
              <CardHeader>
                <CardTitle>Real-world Usage Examples</CardTitle>
                <CardDescription>Common button combinations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Form Actions */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Form Actions</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button>Save Changes</Button>
                    <Button variant="outline">Cancel</Button>
                    <Button variant="ghost">Preview</Button>
                  </div>
                </div>

                {/* With Icons */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">With Icons</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button>
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Form Controls */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Form Controls</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Input & Label</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Email" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Password" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Select & Textarea</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="orange">Orange</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea placeholder="Type your message here." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Checkbox & Switch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms">Accept terms</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="airplane-mode" />
                  <Label htmlFor="airplane-mode">Airplane Mode</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Date & Time */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Date & Time</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Date Picker (Standard)</CardTitle>
                <CardDescription>Official shadcn/ui style</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <DatePicker
                  date={date}
                  onDateChange={setDate}
                  placeholder="Pick a date"
                />
                <DatePickerWithDropdown
                  date={date}
                  onDateChange={setDate}
                  placeholder="Select date"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Date Range Picker</CardTitle>
                <CardDescription>Perfect for leave requests!</CardDescription>
              </CardHeader>
              <CardContent>
                <DateRangePicker
                  date={dateRange}
                  onDateChange={setDateRange}
                  placeholder="Pick date range"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Calendar (Enhanced)</CardTitle>
                <CardDescription>With dropdown navigation</CardDescription>
              </CardHeader>
              <CardContent>
                <CalendarDemo />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Data Display */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Data Display</h2>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Table</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>John Doe</TableCell>
                      <TableCell><Badge>Active</Badge></TableCell>
                      <TableCell>john@example.com</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Jane Smith</TableCell>
                      <TableCell><Badge variant="secondary">Inactive</Badge></TableCell>
                      <TableCell>jane@example.com</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle>Badge</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-muted-foreground">{progress}% complete</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Slider</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Slider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Value: {sliderValue[0]}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Navigation</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Breadcrumb</CardTitle>
              </CardHeader>
              <CardContent>
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/">Home</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/components">Components</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Theme Demo</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pagination</CardTitle>
              </CardHeader>
              <CardContent>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink href="#">1</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink href="#" isActive>2</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink href="#">3</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext href="#" />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Dialogs & Overlays */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Dialogs & Overlays</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Dialog</CardTitle>
              </CardHeader>
              <CardContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dialog Title</DialogTitle>
                      <DialogDescription>
                        This is a dialog description.
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Dialog</CardTitle>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sheet</CardTitle>
              </CardHeader>
              <CardContent>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">Open Sheet</Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Sheet Title</SheetTitle>
                      <SheetDescription>
                        Sheet description here.
                      </SheetDescription>
                    </SheetHeader>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Drawer</CardTitle>
              </CardHeader>
              <CardContent>
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline">Open Drawer</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Drawer Title</DrawerTitle>
                      <DrawerDescription>
                        Drawer description here.
                      </DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Specialized Components */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Specialized Components</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Avatar</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skeleton</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Input OTP</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Interactive Components */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Interactive Components</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Accordion</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Is it accessible?</AccordionTrigger>
                    <AccordionContent>
                      Yes. It adheres to the WAI-ARIA design pattern.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>Is it styled?</AccordionTrigger>
                    <AccordionContent>
                      Yes. It comes with default styles that match the other components.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collapsible</CardTitle>
              </CardHeader>
              <CardContent>
                <Collapsible open={isCollapsed} onOpenChange={setIsCollapsed}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span>View Details</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      This content is collapsible and can be toggled.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Toggle & Toggle Group</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Toggle aria-label="Toggle italic">
                  <Settings className="h-4 w-4" />
                </Toggle>
                <ToggleGroup type="multiple">
                  <ToggleGroupItem value="bold" aria-label="Toggle bold">
                    <strong>B</strong>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="italic" aria-label="Toggle italic">
                    <em>I</em>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="underline" aria-label="Toggle underline">
                    <u>U</u>
                  </ToggleGroupItem>
                </ToggleGroup>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Layout Components */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Layout Components</h2>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tabs</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="account" className="w-full">
                  <TabsList>
                    <TabsTrigger value="account">Account</TabsTrigger>
                    <TabsTrigger value="password">Password</TabsTrigger>
                  </TabsList>
                  <TabsContent value="account">
                    <p className="text-sm text-muted-foreground">
                      Make changes to your account here.
                    </p>
                  </TabsContent>
                  <TabsContent value="password">
                    <p className="text-sm text-muted-foreground">
                      Change your password here.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resizable Panels</CardTitle>
              </CardHeader>
              <CardContent>
                <ResizablePanelGroup direction="horizontal" className="h-[200px] rounded-lg border">
                  <ResizablePanel defaultSize={50}>
                    <div className="flex h-full items-center justify-center p-6">
                      <span className="font-semibold">Left Panel</span>
                    </div>
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={50}>
                    <div className="flex h-full items-center justify-center p-6">
                      <span className="font-semibold">Right Panel</span>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scroll Area</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  {Array.from({ length: 50 }, (_, i) => (
                    <div key={i} className="text-sm">
                      This is scrollable content item {i + 1}
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Alerts & Status */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Alerts & Status</h2>
          <div className="grid gap-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Info</AlertTitle>
              <AlertDescription>
                This is an informational alert with default styling.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                This is an error alert with destructive styling.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        {/* Command Menu */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">Command Menu</h2>
          <Card>
            <CardHeader>
              <CardTitle>Command</CardTitle>
              <CardDescription>Press ⌘K to open command dialog</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setCommandOpen(true)} variant="outline" className="w-full justify-start">
                <Search className="mr-2 h-4 w-4" />
                Search commands...
                <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
              <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    <CommandItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Calendar</span>
                    </CommandItem>
                    <CommandItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </CommandDialog>
            </CardContent>
          </Card>
        </section>

        {/* Toast Notifications */}
        <section className="space-y-6">
                      <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Toast Notifications (nextjs-toast-notify)</h2>
              <div className="flex items-center space-x-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log("=== TOAST DOM INSPECTION ===");
                    setTimeout(() => {
                      const toasts = document.querySelectorAll('[class*="toast"], [class*="notification"]');
                      toasts.forEach((toast, index) => {
                        console.log(`Toast ${index + 1}:`, toast);
                        console.log(`Classes:`, toast.className);
                        console.log(`HTML:`, toast.outerHTML);
                        console.log(`Children:`, Array.from(toast.children));
                        console.log("---");
                      });
                    }, 100);
                    showError("Inspect this toast in console!");
                  }}
                >
                  🔍 Inspect Toast
                </Button>
                <div className="flex items-center space-x-3">
                  <label htmlFor="icon-toggle" className="text-sm font-medium">
                    Show Icons:
                  </label>
                  <Switch
                    id="icon-toggle"
                    checked={iconsEnabled}
                    onCheckedChange={setIconsEnabled}
                  />
                </div>
              </div>
            </div>
          <div className="grid gap-6">
            {/* Toast Types */}
            <Card>
              <CardHeader>
                <CardTitle>Toast Types</CardTitle>
                <CardDescription>Different notification types with various styling</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Button 
                    onClick={() => showSuccess("¡Success! Operation completed successfully!")}
                    className="bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Success Toast
                  </Button>
                  
                  <Button 
                    onClick={() => showError("Error! Something went wrong.")}
                    variant="destructive"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Error Toast
                  </Button>
                  
                  <Button 
                    onClick={() => showWarning("Warning! Please check your input.")}
                    className="bg-warning hover:bg-warning/90 text-warning-foreground"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Warning Toast
                  </Button>
                  
                  <Button 
                    onClick={() => showInfo("Info: Here's some helpful information.")}
                    className="bg-info hover:bg-info/90 text-info-foreground"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Info Toast
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Toast Durations */}
            <Card>
              <CardHeader>
                <CardTitle>Toast Durations & Features</CardTitle>
                <CardDescription>Different durations and advanced features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Button 
                    variant="outline"
                    onClick={() => showSuccess("Duration: 2 seconds", {
                      duration: 2000,
                    })}
                  >
                    Short Duration
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => showSuccess("Duration: 5 seconds", {
                      duration: 5000,
                    })}
                  >
                    Medium Duration
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => showSuccess("Duration: 8 seconds", {
                      duration: 8000,
                    })}
                  >
                    Long Duration
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => showInfo("Persistent toast", {
                      duration: Infinity,
                    })}
                  >
                    Persistent
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => showInfo("With description", {
                      duration: 4000,
                      description: "This toast includes additional details"
                    })}
                  >
                    With Description
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => showSuccess("Dismissible toast", {
                      duration: 6000,
                      dismissible: true,
                    })}
                  >
                    Dismissible
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Toast Actions & Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Toast Actions & Buttons</CardTitle>
                <CardDescription>Toasts with action buttons and interactive features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Button 
                    variant="secondary"
                    onClick={() => showSuccess("Task completed!", {
                      duration: 5000,
                      action: {
                        label: "View",
                        onClick: () => alert("Viewing task!")
                      }
                    })}
                  >
                    With Action
                  </Button>
                  
                  <Button 
                    variant="secondary"
                    onClick={() => showWarning("Unsaved changes", {
                      duration: 8000,
                      action: {
                        label: "Save",
                        onClick: () => alert("Saving...")
                      },
                      cancel: {
                        label: "Discard",
                        onClick: () => alert("Discarded!")
                      }
                    })}
                  >
                    Save/Discard
                  </Button>
                  
                  <Button 
                    variant="secondary"
                    onClick={() => showInfo("File uploaded", {
                      duration: 6000,
                      description: "Your file has been uploaded successfully",
                      action: {
                        label: "Open",
                        onClick: () => alert("Opening file...")
                      }
                    })}
                  >
                    With Description
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Advanced Features */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Features</CardTitle>
                <CardDescription>Custom icons, IDs, and dismissal controls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Button 
                    onClick={() => showSuccess("Custom ID toast", {
                      duration: 5000,
                      id: "custom-toast-1",
                      icon: iconsEnabled ? '🚀' : false,
                    })}
                  >
                    Custom ID
                  </Button>
                  
                  <Button 
                    onClick={() => showInfo("Non-dismissible toast", {
                      duration: 3000,
                      dismissible: false,
                      icon: iconsEnabled ? '🔒' : false,
                    })}
                  >
                    No Dismiss
                  </Button>
                  
                  <Button 
                    onClick={() => showWarning("Long duration toast", {
                      duration: 8000,
                      description: "This toast will stay for 8 seconds",
                      icon: iconsEnabled ? '⏰' : false,
                    })}
                  >
                    Long Duration
                  </Button>
                  
                  <Button 
                    onClick={() => showError("Rich content toast", {
                      duration: 6000,
                      description: "This includes description and custom styling",
                      icon: iconsEnabled ? '✨' : false,
                      dismissible: true,
                    })}
                  >
                    Rich Content
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Real-world Examples */}
            <Card>
              <CardHeader>
                <CardTitle>Real-world Examples</CardTitle>
                <CardDescription>Common use cases in leave management system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Button 
                    onClick={leaveToasts.leaveRequestSubmitted}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Leave Request Submitted
                  </Button>
                  
                  <Button 
                    onClick={leaveToasts.leaveRequestApproved}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Leave Approved
                  </Button>
                  
                  <Button 
                    onClick={leaveToasts.insufficientBalance}
                    variant="destructive"
                  >
                    Insufficient Balance
                  </Button>
                  
                  <Button 
                    onClick={() => leaveToasts.pendingApprovals(3)}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Pending Reviews
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Custom Hook Examples */}
            <Card>
              <CardHeader>
                <CardTitle>Custom Hook Usage</CardTitle>
                <CardDescription>Demonstrating the useLeaveSystemToasts hook with more examples</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Button 
                    onClick={leaveToasts.profileUpdated}
                    variant="outline"
                  >
                    Profile Updated
                  </Button>
                  
                  <Button 
                    onClick={leaveToasts.settingsSaved}
                    variant="outline"
                  >
                    Settings Saved
                  </Button>
                  
                  <Button 
                    onClick={leaveToasts.invitationSent}
                    variant="outline"
                  >
                    Invitation Sent
                  </Button>
                  
                  <Button 
                    onClick={() => leaveToasts.upcomingLeave(7)}
                    variant="outline"
                  >
                    Upcoming Leave
                  </Button>
                  
                  <Button 
                    onClick={leaveToasts.overlappingDates}
                    variant="outline"
                  >
                    Overlapping Dates
                  </Button>
                  
                  <Button 
                    onClick={leaveToasts.leaveRequestRejected}
                    variant="outline"
                  >
                    Leave Rejected
                  </Button>
                  
                  <Button 
                    onClick={leaveToasts.networkError}
                    variant="outline"
                  >
                    Network Error
                  </Button>
                  
                  <Button 
                    onClick={leaveToasts.unexpectedError}
                    variant="outline"
                  >
                    Unexpected Error
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <div className="text-center text-muted-foreground mt-12">
          <p>Complete showcase of all shadcn/ui components + Sonner toasts</p>
          <p>With persistent dark mode and clean professional styling!</p>
        </div>
      </div>
    </TooltipProvider>
  )
} 