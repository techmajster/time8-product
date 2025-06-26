'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { PlayCircle, PauseCircle, RotateCcw } from 'lucide-react';

// Live Progress Preview Component
function LiveProgressPreview({ 
  value, 
  size, 
  variant, 
  animated, 
  showLabel 
}: {
  value: number;
  size: 'sm' | 'default' | 'lg';
  variant: 'default' | 'success' | 'warning' | 'destructive';
  animated: boolean;
  showLabel: boolean;
}) {
  const sizeClasses = {
    sm: 'h-2',
    default: 'h-4',
    lg: 'h-6'
  };

  const variantClasses = {
    default: '',
    success: '[&>*]:bg-green-500',
    warning: '[&>*]:bg-yellow-500',
    destructive: '[&>*]:bg-red-500'
  };

  return (
    <div className="w-full max-w-md space-y-2">
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{value}%</span>
        </div>
      )}
      <Progress 
        value={value} 
        className={`${sizeClasses[size]} ${variantClasses[variant]} ${animated ? 'animate-pulse' : ''}`}
      />
    </div>
  );
}

// Properties Panel Component
function ProgressPropertiesPanel({ 
  value, 
  setValue, 
  size, 
  setSize, 
  variant, 
  setVariant, 
  animated, 
  setAnimated, 
  showLabel, 
  setShowLabel 
}: {
  value: number;
  setValue: (value: number) => void;
  size: 'sm' | 'default' | 'lg';
  setSize: (size: 'sm' | 'default' | 'lg') => void;
  variant: 'default' | 'success' | 'warning' | 'destructive';
  setVariant: (variant: 'default' | 'success' | 'warning' | 'destructive') => void;
  animated: boolean;
  setAnimated: (animated: boolean) => void;
  showLabel: boolean;
  setShowLabel: (showLabel: boolean) => void;
}) {
  const resetToDefaults = () => {
    setValue(50);
    setSize('default');
    setVariant('default');
    setAnimated(false);
    setShowLabel(true);
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
        {/* Value */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Value: {value}%</Label>
          <Input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Size */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Size</Label>
          <Select value={size} onValueChange={(value: 'sm' | 'default' | 'lg') => setSize(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Variant */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Variant</Label>
          <Select value={variant} onValueChange={(value: 'default' | 'success' | 'warning' | 'destructive') => setVariant(value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="destructive">Destructive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Show Label */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Label</Label>
          <Switch checked={showLabel} onCheckedChange={setShowLabel} />
        </div>

        {/* Animated */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Animated</Label>
          <Switch checked={animated} onCheckedChange={setAnimated} />
        </div>
      </div>

      {/* Code Preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
          <pre>{`${showLabel ? `<div className="flex justify-between text-sm">
  <span>Progress</span>
  <span>${value}%</span>
</div>` : ''}
<Progress 
  value={${value}}${size !== 'default' || variant !== 'default' || animated ? `
  className="${size === 'sm' ? 'h-2' : size === 'lg' ? 'h-6' : 'h-4'}${variant === 'success' ? ' [&>*]:bg-green-500' : variant === 'warning' ? ' [&>*]:bg-yellow-500' : variant === 'destructive' ? ' [&>*]:bg-red-500' : ''}${animated ? ' animate-pulse' : ''}"` : ''}
/>`}</pre>
        </div>
      </div>
    </div>
  );
}

export default function ProgressComponentPage() {
  // Interactive example state
  const [value, setValue] = useState(50);
  const [size, setSize] = useState<'sm' | 'default' | 'lg'>('default');
  const [variant, setVariant] = useState<'default' | 'success' | 'warning' | 'destructive'>('default');
  const [animated, setAnimated] = useState(false);
  const [showLabel, setShowLabel] = useState(true);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Progress</h1>
          <Badge variant="outline">Display Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Progress Preview</CardTitle>
            <CardDescription>
              Customize the progress properties and see changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2 flex items-center justify-center p-8 border rounded-lg bg-muted/30 h-full min-h-[500px]">
                <LiveProgressPreview
                  value={value}
                  size={size}
                  variant={variant}
                  animated={animated}
                  showLabel={showLabel}
                />
              </div>

              {/* Properties Panel */}
              <div className="space-y-4 p-4 border rounded-lg bg-background h-full min-h-[500px]">
                <ProgressPropertiesPanel
                  value={value}
                  setValue={setValue}
                  size={size}
                  setSize={setSize}
                  variant={variant}
                  setVariant={setVariant}
                  animated={animated}
                  setAnimated={setAnimated}
                  showLabel={showLabel}
                  setShowLabel={setShowLabel}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Size Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Size Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Small</CardTitle>
              <CardDescription>Compact progress bar</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={33} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default</CardTitle>
              <CardDescription>Standard progress bar</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={66} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Large</CardTitle>
              <CardDescription>Prominent progress bar</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={80} className="h-6" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Color Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Color Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Default</CardTitle>
              <CardDescription>Standard blue progress</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={45} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Success</CardTitle>
              <CardDescription>Green for completed tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={100} className="[&>*]:bg-green-500" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Warning</CardTitle>
              <CardDescription>Yellow for caution states</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={75} className="[&>*]:bg-yellow-500" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Destructive</CardTitle>
              <CardDescription>Red for error states</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={25} className="[&>*]:bg-red-500" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Common Patterns */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Common Patterns</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>With Labels</CardTitle>
              <CardDescription>Progress bars with descriptive text</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>File Upload</span>
                  <span>45%</span>
                </div>
                <Progress value={45} />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Processing</span>
                  <span>78%</span>
                </div>
                <Progress value={78} className="[&>*]:bg-yellow-500" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Complete</span>
                  <span>100%</span>
                </div>
                <Progress value={100} className="[&>*]:bg-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Animated Progress</CardTitle>
              <CardDescription>Live updating progress indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatedProgressExample />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Usage Examples</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Step Form</CardTitle>
              <CardDescription>Progress through form steps</CardDescription>
            </CardHeader>
            <CardContent>
              <MultiStepProgressExample />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Upload</CardTitle>
              <CardDescription>Upload progress indicator</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadProgressExample />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

// Animated Progress Example
function AnimatedProgressExample() {
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsRunning(false);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <Progress value={progress} />
      
      <div className="flex gap-2">
        <Button 
          size="sm" 
          onClick={handleStart} 
          disabled={isRunning || progress >= 100}
        >
          <PlayCircle className="w-4 h-4 mr-1" />
          Start
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handlePause} 
          disabled={!isRunning}
        >
          <PauseCircle className="w-4 h-4 mr-1" />
          Pause
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleReset}
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
}

// Multi-Step Progress Example
function MultiStepProgressExample() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const steps = [
    'Personal Info',
    'Account Details',
    'Verification',
    'Complete'
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm">
        <span>Step {currentStep} of {totalSteps}: {steps[currentStep - 1]}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} />
      
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        <Button 
          size="sm" 
          onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
          disabled={currentStep === totalSteps}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// File Upload Progress Example
function FileUploadProgressExample() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const simulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);

    const timer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          setIsUploading(false);
          clearInterval(timer);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  };

  const getProgressColor = () => {
    if (uploadProgress === 100) return '[&>*]:bg-green-500';
    if (uploadProgress > 75) return '[&>*]:bg-yellow-500';
    return '';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm">
        <span>document.pdf</span>
        <span>{Math.round(uploadProgress)}%</span>
      </div>
      <Progress value={uploadProgress} className={getProgressColor()} />
      
      {uploadProgress === 100 && (
        <p className="text-sm text-green-600">✓ Upload complete!</p>
      )}
      
      <Button 
        size="sm" 
        onClick={simulateUpload} 
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : 'Start Upload'}
      </Button>
    </div>
  );
} 