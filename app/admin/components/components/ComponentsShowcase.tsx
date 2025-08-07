'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem, RadioGroupItemLabel, RadioGroupItemDescription } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Calendar } from '@/components/ui/calendar'
import { CalendarWithDropdowns } from '@/components/ui/calendar-with-dropdowns'
import { DatePicker, DatePickerWithDropdowns } from '@/components/ui/date-picker'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { 
  Search, 
  Settings, 
  User, 
  Edit, 
  Trash2, 
  Plus, 
  ChevronDown,
  AlertTriangle,
  Info,
  Star,
  Download,
  Calendar as CalendarIcon
} from 'lucide-react'

export function ComponentsShowcase() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedDropdownDate, setSelectedDropdownDate] = useState<Date>()
  const [progressValue, setProgressValue] = useState(60)
  const [switchValue, setSwitchValue] = useState(false)
  const [checkboxValue, setCheckboxValue] = useState(false)
  const [radioValue, setRadioValue] = useState('option1')
  const [selectValue, setSelectValue] = useState('')

  const componentSections = [
    {
      title: 'Buttons & Actions',
      components: [
        {
          name: 'Button',
          description: 'Trigger actions with various styles and states',
          component: (
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                With Icon
              </Button>
            </div>
          )
        },
        {
          name: 'DropdownMenu',
          description: 'Context menus and action dropdowns',
          component: (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Options
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      ]
    },
    {
      title: 'Form Controls',
      components: [
        {
          name: 'Input',
          description: 'Text input fields with various states',
          component: (
            <div className="space-y-3 max-w-sm">
              <div>
                <Label htmlFor="text-input">Text Input</Label>
                <Input id="text-input" placeholder="Enter text..." />
              </div>
              <div>
                <Label htmlFor="email-input">Email Input</Label>
                <Input id="email-input" type="email" placeholder="user@example.com" />
              </div>
              <div>
                <Label htmlFor="search-input">Search Input</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="search-input" className="pl-10" placeholder="Search..." />
                </div>
              </div>
              <div>
                <Label htmlFor="disabled-input">Disabled Input</Label>
                <Input id="disabled-input" disabled placeholder="Disabled input" />
              </div>
            </div>
          )
        },
        {
          name: 'Textarea',
          description: 'Multi-line text input areas',
          component: (
            <div className="max-w-sm">
              <Label htmlFor="textarea">Message</Label>
              <Textarea id="textarea" placeholder="Enter your message..." />
            </div>
          )
        },
        {
          name: 'Select',
          description: 'Dropdown selection components',
          component: (
            <div className="max-w-sm">
              <Label>Framework</Label>
              <Select value={selectValue} onValueChange={setSelectValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a framework" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next">Next.js</SelectItem>
                  <SelectItem value="react">React</SelectItem>
                  <SelectItem value="vue">Vue.js</SelectItem>
                  <SelectItem value="svelte">Svelte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )
        },
        {
          name: 'Checkbox',
          description: 'Binary choice controls',
          component: (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="checkbox-default" 
                  checked={checkboxValue}
                  onCheckedChange={(checked) => setCheckboxValue(checked === true)}
                />
                <Label htmlFor="checkbox-default">Accept terms and conditions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="checkbox-disabled" disabled />
                <Label htmlFor="checkbox-disabled">Disabled checkbox</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="checkbox-checked" defaultChecked />
                <Label htmlFor="checkbox-checked">Default checked</Label>
              </div>
            </div>
          )
        },
        {
          name: 'RadioGroup',
          description: 'Single choice from multiple options with default and box styles',
          component: (
            <div className="space-y-6">
              {/* Default Style */}
              <div className="max-w-sm">
                <Label className="text-sm font-medium mb-2 block">Default Style</Label>
                <RadioGroup value={radioValue} onValueChange={setRadioValue}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option1" id="default-option1" />
                    <Label htmlFor="default-option1">All notifications</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option2" id="default-option2" />
                    <Label htmlFor="default-option2">Important only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option3" id="default-option3" />
                    <Label htmlFor="default-option3">None</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Box Style */}
              <div className="max-w-md">
                <Label className="text-sm font-medium mb-2 block">Box Style</Label>
                <RadioGroup value={radioValue} onValueChange={setRadioValue} style="box">
                  <RadioGroupItem value="option1" id="box-option1">
                    <RadioGroupItemLabel>All notifications</RadioGroupItemLabel>
                    <RadioGroupItemDescription>
                      Receive all notifications including updates, mentions, and system alerts.
                    </RadioGroupItemDescription>
                  </RadioGroupItem>
                  <RadioGroupItem value="option2" id="box-option2">
                    <RadioGroupItemLabel>Important only</RadioGroupItemLabel>
                    <RadioGroupItemDescription>
                      Only receive critical notifications and direct mentions.
                    </RadioGroupItemDescription>
                  </RadioGroupItem>
                  <RadioGroupItem value="option3" id="box-option3">
                    <RadioGroupItemLabel>None</RadioGroupItemLabel>
                    <RadioGroupItemDescription>
                      Turn off all notifications. You can still check updates manually.
                    </RadioGroupItemDescription>
                  </RadioGroupItem>
                </RadioGroup>
              </div>
            </div>
          )
        },
        {
          name: 'Switch',
          description: 'Toggle between two states',
          component: (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="switch-notifications" 
                  checked={switchValue}
                  onCheckedChange={setSwitchValue}
                />
                <Label htmlFor="switch-notifications">Enable notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="switch-disabled" disabled />
                <Label htmlFor="switch-disabled">Disabled switch</Label>
              </div>
            </div>
          )
        }
      ]
    },
    {
      title: 'Data Display',
      components: [
        {
          name: 'Table',
          description: 'Structured data presentation',
          component: (
            <div className="max-w-2xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">John Doe</TableCell>
                    <TableCell>john@example.com</TableCell>
                    <TableCell>Admin</TableCell>
                    <TableCell>
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Jane Smith</TableCell>
                    <TableCell>jane@example.com</TableCell>
                    <TableCell>Manager</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Pending</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Bob Wilson</TableCell>
                    <TableCell>bob@example.com</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell>
                      <Badge variant="destructive">Inactive</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )
        },
        {
          name: 'Badge',
          description: 'Small status indicators and labels',
          component: (
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge>
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            </div>
          )
        },
        {
          name: 'Avatar',
          description: 'User profile pictures and initials',
          component: (
            <div className="flex gap-2">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <Avatar className="h-12 w-12">
                <AvatarImage src="https://github.com/vercel.png" />
                <AvatarFallback>VC</AvatarFallback>
              </Avatar>
            </div>
          )
        },
        {
          name: 'Progress',
          description: 'Show completion status',
          component: (
            <div className="max-w-sm space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{progressValue}%</span>
                </div>
                <Progress value={progressValue} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Complete</span>
                  <span>100%</span>
                </div>
                <Progress value={100} />
              </div>
            </div>
          )
        },
        {
          name: 'Skeleton',
          description: 'Loading placeholders',
          component: (
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )
        }
      ]
    },
    {
      title: 'Feedback',
      components: [
        {
          name: 'Alert',
          description: 'Important messages and notifications',
          component: (
            <div className="space-y-3">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Info</AlertTitle>
                <AlertDescription>
                  This is an informational alert message.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Something went wrong. Please try again.
                </AlertDescription>
              </Alert>
            </div>
          )
        },
        {
          name: 'Toast',
          description: 'Temporary notification messages',
          component: (
            <div className="flex gap-2">
              <Button onClick={() => toast.success('Success! Operation completed.')}>
                Success Toast
              </Button>
              <Button onClick={() => toast.error('Error! Something went wrong.')}>
                Error Toast
              </Button>
              <Button onClick={() => toast('Info message with details.')}>
                Info Toast
              </Button>
            </div>
          )
        }
      ]
    },
    {
      title: 'Navigation',
      components: [
        {
          name: 'Tabs',
          description: 'Switch between different views',
          component: (
            <Tabs defaultValue="account" className="max-w-md">
              <TabsList>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="account" className="p-4 border rounded-md mt-2">
                <h4 className="font-medium mb-2">Account Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Manage your account information and preferences.
                </p>
              </TabsContent>
              <TabsContent value="password" className="p-4 border rounded-md mt-2">
                <h4 className="font-medium mb-2">Password Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Update your password and security settings.
                </p>
              </TabsContent>
              <TabsContent value="settings" className="p-4 border rounded-md mt-2">
                <h4 className="font-medium mb-2">General Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Configure application preferences.
                </p>
              </TabsContent>
            </Tabs>
          )
        },
        {
          name: 'Breadcrumb',
          description: 'Show current page location',
          component: (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin/components">Components</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>UI Library</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )
        },
        {
          name: 'Accordion',
          description: 'Collapsible content sections',
          component: (
            <Accordion type="single" collapsible className="max-w-md">
              <AccordionItem value="item-1">
                <AccordionTrigger>Getting Started</AccordionTrigger>
                <AccordionContent>
                  Learn the basics of using our component library and design system.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Customization</AccordionTrigger>
                <AccordionContent>
                  Customize components to match your brand and requirements.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Best Practices</AccordionTrigger>
                <AccordionContent>
                  Follow these guidelines for optimal performance and accessibility.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )
        }
      ]
    },
    {
      title: 'Overlays',
      components: [
        {
          name: 'Dialog',
          description: 'Modal dialogs and overlays',
          component: (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Action</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to perform this action? This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        },
        {
          name: 'AlertDialog',
          description: 'Important confirmation dialogs',
          component: (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Item</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the item.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        },
        {
          name: 'Sheet',
          description: 'Side panel overlays',
          component: (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Settings Panel</SheetTitle>
                  <SheetDescription>
                    Configure your application settings here.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sheet-name">Name</Label>
                    <Input id="sheet-name" placeholder="Enter your name" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="sheet-notifications" />
                    <Label htmlFor="sheet-notifications">Enable notifications</Label>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )
        },
        {
          name: 'Popover',
          description: 'Floating content containers',
          component: (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Open Popover</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Quick Actions</h4>
                  <p className="text-sm text-muted-foreground">
                    Perform common tasks quickly from here.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm">Edit</Button>
                    <Button size="sm" variant="outline">Share</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )
        },
        {
          name: 'Tooltip',
          description: 'Helpful hints and information',
          component: (
            <TooltipProvider>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open settings</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <User className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View profile</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )
        }
      ]
    },
    {
      title: 'Date & Time',
      components: [
        {
          name: 'Calendar',
          description: 'Basic date selection component',
          component: (
            <div className="max-w-fit">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </div>
          )
        },
        {
          name: 'CalendarWithDropdowns',
          description: 'Date selection component with integrated month/year dropdowns',
          component: (
            <div className="max-w-fit">
              <CalendarWithDropdowns
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </div>
          )
        },
        {
          name: 'DatePicker',
          description: 'Input field with date picker',
          component: (
            <div className="max-w-sm">
              <Label>Select Date</Label>
              <DatePicker
                value={selectedDate}
                onDateChange={setSelectedDate}
                placeholder="Pick a date"
              />
            </div>
          )
        },
        {
          name: 'DateRangePicker',
          description: 'Select date ranges',
          component: (
            <div className="max-w-sm">
              <Label>Date Range</Label>
              <DateRangePicker
                placeholder="Select date range"
                className="mt-1"
              />
            </div>
          )
        },
        {
          name: 'DatePickerWithDropdowns',
          description: 'Date picker with year/month dropdown navigation',
          component: (
            <div className="max-w-sm">
              <Label>Date with Dropdowns</Label>
              <DatePickerWithDropdowns
                value={selectedDropdownDate}
                onDateChange={setSelectedDropdownDate}
                placeholder="Pick a date"
              />
            </div>
          )
        }
      ]
    },
    {
      title: 'Utility',
      components: [
        {
          name: 'Separator',
          description: 'Visual dividers',
          component: (
            <div className="space-y-4 max-w-sm">
              <div>
                <p className="text-sm">Horizontal separator</p>
                <Separator className="my-2" />
                <p className="text-sm">Content after separator</p>
              </div>
              <div className="flex items-center space-x-4">
                <p className="text-sm">Vertical</p>
                <Separator orientation="vertical" className="h-8" />
                <p className="text-sm">Separator</p>
              </div>
            </div>
          )
        },
        {
          name: 'ScrollArea',
          description: 'Scrollable content containers',
          component: (
            <ScrollArea className="h-32 w-48 rounded-md border p-4">
              <div className="space-y-2">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="text-sm">
                    Scrollable item {i + 1}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )
        },
        {
          name: 'Command',
          description: 'Command palette and search',
          component: (
            <div className="max-w-sm">
              <Command className="rounded-lg border shadow-md">
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    <CommandItem>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      <span>Calendar</span>
                    </CommandItem>
                    <CommandItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Search Users</span>
                    </CommandItem>
                    <CommandItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )
        }
      ]
    }
  ]

  const filteredSections = componentSections.map(section => ({
    ...section,
    components: section.components.filter(component =>
      component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.components.length > 0)

  return (
    <>
      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Components Showcase */}
      <div className="space-y-8">
        {filteredSections.map((section) => (
          <div key={section.title} className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
            <div className="grid gap-6">
              {section.components.map((component) => (
                <Card key={component.name} className="border border-neutral-200 rounded-[10px] shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold text-neutral-950">
                          {component.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-neutral-500 mt-1">
                          {component.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        @/components/ui/{component.name.toLowerCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="p-6 bg-neutral-50 rounded-lg border">
                      {component.component}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No components found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search query to find the components you're looking for.
          </p>
        </div>
      )}
    </>
  )
} 