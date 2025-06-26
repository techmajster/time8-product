'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Quote, Image as ImageIcon, Play, ShoppingCart, Heart, Share, ChevronLeft, ChevronRight, Circle, Dot } from 'lucide-react';

// Properties interface
interface CarouselProperties {
  carouselType: 'images' | 'testimonials' | 'products' | 'content' | 'cards';
  itemCount: number;
  showNavigation: boolean;
  showDots: boolean;
  autoplay: boolean;
  orientation: 'horizontal' | 'vertical';
  itemsPerView: number;
  spacing: 'none' | 'sm' | 'md' | 'lg';
  rounded: boolean;
  height: 'auto' | 'sm' | 'md' | 'lg';
}

// Sample data for different carousel types
const sampleData = {
  images: [
    { id: 1, title: 'Mountain Lake', src: '/placeholder-landscape.jpg', alt: 'Beautiful mountain lake' },
    { id: 2, title: 'Forest Path', src: '/placeholder-forest.jpg', alt: 'Peaceful forest path' },
    { id: 3, title: 'Ocean Sunset', src: '/placeholder-ocean.jpg', alt: 'Stunning ocean sunset' },
    { id: 4, title: 'City Skyline', src: '/placeholder-city.jpg', alt: 'Modern city skyline' },
    { id: 5, title: 'Desert Dunes', src: '/placeholder-desert.jpg', alt: 'Rolling desert dunes' },
  ],
  testimonials: [
    { id: 1, name: 'Sarah Johnson', role: 'Product Manager', company: 'TechCorp', content: 'This product has completely transformed how our team collaborates. The intuitive interface and powerful features make it a joy to use every day.', rating: 5 },
    { id: 2, name: 'Michael Chen', role: 'Designer', company: 'Creative Studio', content: 'The attention to detail and user experience is exceptional. It feels like the developers really understand what designers need.', rating: 5 },
    { id: 3, name: 'Emily Rodriguez', role: 'Developer', company: 'StartupXYZ', content: 'Integration was seamless and the documentation is excellent. Our team was up and running in no time.', rating: 4 },
  ],
  products: [
    { id: 1, name: 'Wireless Headphones', price: '$299', oldPrice: '$399', rating: 4.8, reviews: 2847, image: 'headphones' },
    { id: 2, name: 'Smart Watch', price: '$199', oldPrice: null, rating: 4.6, reviews: 1205, image: 'watch' },
    { id: 3, name: 'Laptop Stand', price: '$89', oldPrice: '$129', rating: 4.9, reviews: 892, image: 'stand' },
    { id: 4, name: 'USB-C Hub', price: '$49', oldPrice: null, rating: 4.7, reviews: 567, image: 'hub' },
  ],
  content: [
    { id: 1, title: 'Getting Started Guide', description: 'Learn the basics and get up to speed quickly with our comprehensive guide.', category: 'Documentation', readTime: '5 min' },
    { id: 2, title: 'Advanced Features', description: 'Discover powerful features that will take your productivity to the next level.', category: 'Tutorial', readTime: '12 min' },
    { id: 3, title: 'Best Practices', description: 'Tips and tricks from experienced users to help you make the most of the platform.', category: 'Guide', readTime: '8 min' },
  ]
};

// Properties Panel Component
function CarouselPropertiesPanel({ 
  properties, 
  onChange, 
  onReset 
}: {
  properties: CarouselProperties;
  onChange: (key: keyof CarouselProperties, value: any) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6 h-full min-h-[500px]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Properties</h3>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>
      
      <div className="space-y-4">
        {/* Carousel Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Carousel Type</Label>
          <Select value={properties.carouselType} onValueChange={(value) => onChange('carouselType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="images">Image Gallery</SelectItem>
              <SelectItem value="testimonials">Testimonials</SelectItem>
              <SelectItem value="products">Product Showcase</SelectItem>
              <SelectItem value="content">Content Cards</SelectItem>
              <SelectItem value="cards">Feature Cards</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Item Count */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Items: {properties.itemCount}</Label>
          <Input
            type="range"
            min="3"
            max="8"
            value={properties.itemCount}
            onChange={(e) => onChange('itemCount', Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Items Per View */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Items Per View</Label>
          <Select value={properties.itemsPerView.toString()} onValueChange={(value) => onChange('itemsPerView', Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Item</SelectItem>
              <SelectItem value="2">2 Items</SelectItem>
              <SelectItem value="3">3 Items</SelectItem>
              <SelectItem value="4">4 Items</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orientation */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Orientation</Label>
          <Select value={properties.orientation} onValueChange={(value) => onChange('orientation', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="horizontal">Horizontal</SelectItem>
              <SelectItem value="vertical">Vertical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Height */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Height</Label>
          <Select value={properties.height} onValueChange={(value) => onChange('height', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="sm">Small (200px)</SelectItem>
              <SelectItem value="md">Medium (300px)</SelectItem>
              <SelectItem value="lg">Large (400px)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Spacing */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Item Spacing</Label>
          <Select value={properties.spacing} onValueChange={(value) => onChange('spacing', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show Navigation */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Navigation</Label>
          <Switch 
            checked={properties.showNavigation} 
            onCheckedChange={(checked) => onChange('showNavigation', checked)}
          />
        </div>

        {/* Show Dots */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Show Dots</Label>
          <Switch 
            checked={properties.showDots} 
            onCheckedChange={(checked) => onChange('showDots', checked)}
          />
        </div>

        {/* Autoplay */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Autoplay</Label>
          <Switch 
            checked={properties.autoplay} 
            onCheckedChange={(checked) => onChange('autoplay', checked)}
          />
        </div>

        {/* Rounded */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Rounded Corners</Label>
          <Switch 
            checked={properties.rounded} 
            onCheckedChange={(checked) => onChange('rounded', checked)}
          />
        </div>
      </div>

      <Separator />

      {/* Generated Code */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Generated Code</Label>
        <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-40">
          <pre>{generateCarouselCode(properties)}</pre>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
function LiveCarouselPreview({ properties }: { properties: CarouselProperties }) {
  const getHeightClass = () => {
    switch (properties.height) {
      case 'sm': return 'h-[200px]';
      case 'md': return 'h-[300px]';
      case 'lg': return 'h-[400px]';
      default: return 'h-auto';
    }
  };

  const getSpacingClass = () => {
    switch (properties.spacing) {
      case 'sm': return 'pl-2';
      case 'md': return 'pl-4';
      case 'lg': return 'pl-6';
      default: return '';
    }
  };

  const renderCarouselItem = (item: any, index: number) => {
    const baseClasses = `${properties.rounded ? 'rounded-lg' : ''} ${getHeightClass()}`;

    switch (properties.carouselType) {
      case 'images':
        return (
          <div className={`${baseClasses} relative overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500`}>
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-4 left-4 text-white">
              <h3 className="font-semibold">{item?.title || `Image ${index + 1}`}</h3>
              <p className="text-sm opacity-90">{item?.alt || 'Beautiful landscape'}</p>
            </div>
            <div className="absolute top-4 right-4">
              <ImageIcon className="h-6 w-6 text-white/80" />
            </div>
          </div>
        );

      case 'testimonials':
        const testimonial = sampleData.testimonials[index % sampleData.testimonials.length];
        return (
          <Card className={`${baseClasses} p-6`}>
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                ))}
              </div>
              <Quote className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm leading-relaxed">{testimonial.content}</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role} at {testimonial.company}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'products':
        const product = sampleData.products[index % sampleData.products.length];
        return (
          <Card className={`${baseClasses} overflow-hidden`}>
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-400 text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">{product.name}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="absolute top-2 right-2 h-8 w-8 p-0">
                <Heart className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-lg">{product.price}</span>
                {product.oldPrice && (
                  <span className="text-sm text-muted-foreground line-through">{product.oldPrice}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{product.rating}</span>
                <span className="text-muted-foreground">({product.reviews})</span>
              </div>
            </CardContent>
          </Card>
        );

      case 'content':
        const content = sampleData.content[index % sampleData.content.length];
        return (
          <Card className={`${baseClasses} p-6`}>
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{content.category}</Badge>
                <span className="text-xs text-muted-foreground">{content.readTime}</span>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{content.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{content.description}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                Read More
              </Button>
            </CardContent>
          </Card>
        );

      case 'cards':
        return (
          <Card className={`${baseClasses} p-6 text-center`}>
            <CardContent className="p-0 space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Circle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Feature {index + 1}</h3>
                <p className="text-sm text-muted-foreground">
                  This is a sample feature card that showcases key benefits and capabilities.
                </p>
              </div>
              <Button variant="outline" size="sm">
                Learn More
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return (
          <div className={`${baseClasses} bg-muted border-2 border-dashed flex items-center justify-center`}>
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Carousel Item {index + 1}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full min-h-[500px] flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-1">
              {properties.carouselType.charAt(0).toUpperCase() + properties.carouselType.slice(1)} Carousel
            </h3>
            <p className="text-sm text-muted-foreground">
              {properties.itemsPerView > 1 ? `Showing ${properties.itemsPerView} items` : 'Single item view'}
            </p>
          </div>
          
          <Carousel 
            className="w-full"
            orientation={properties.orientation}
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent className={properties.orientation === 'vertical' ? 'h-[400px]' : ''}>
              {Array.from({ length: properties.itemCount }).map((_, index) => (
                <CarouselItem 
                  key={index} 
                  className={`${properties.orientation === 'vertical' ? 'basis-1/3' : 
                    properties.itemsPerView === 1 ? 'basis-full' :
                    properties.itemsPerView === 2 ? 'basis-1/2' :
                    properties.itemsPerView === 3 ? 'basis-1/3' : 'basis-1/4'
                  } ${getSpacingClass()}`}
                >
                  {renderCarouselItem(null, index)}
                </CarouselItem>
              ))}
            </CarouselContent>
            
            {properties.showNavigation && (
              <>
                <CarouselPrevious />
                <CarouselNext />
              </>
            )}
          </Carousel>

          {properties.showDots && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: Math.ceil(properties.itemCount / properties.itemsPerView) }).map((_, index) => (
                <div 
                  key={index} 
                  className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const defaultProperties: CarouselProperties = {
  carouselType: 'images',
  itemCount: 5,
  showNavigation: true,
  showDots: true,
  autoplay: false,
  orientation: 'horizontal',
  itemsPerView: 1,
  spacing: 'md',
  rounded: true,
  height: 'auto'
};

function generateCarouselCode(props: CarouselProperties): string {
  const spacingClass = props.spacing === 'sm' ? 'pl-2' : props.spacing === 'md' ? 'pl-4' : props.spacing === 'lg' ? 'pl-6' : '';
  const basisClass = props.itemsPerView === 1 ? 'basis-full' :
                    props.itemsPerView === 2 ? 'basis-1/2' :
                    props.itemsPerView === 3 ? 'basis-1/3' : 'basis-1/4';

  return `<Carousel${props.orientation === 'vertical' ? ' orientation="vertical"' : ''} className="w-full">
  <CarouselContent${props.orientation === 'vertical' ? ' className="h-[400px]"' : ''}>
    {items.map((item, index) => (
      <CarouselItem key={index} className="${basisClass}${spacingClass ? ` ${spacingClass}` : ''}">
        {/* Your item content here */}
      </CarouselItem>
    ))}
  </CarouselContent>
  ${props.showNavigation ? `<CarouselPrevious />
  <CarouselNext />` : ''}
</Carousel>`;
}

export default function CarouselComponentPage() {
  const [properties, setProperties] = useState<CarouselProperties>(defaultProperties);

  const handlePropertyChange = (key: keyof CarouselProperties, value: any) => {
    setProperties(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setProperties(defaultProperties);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">Carousel</h1>
          <Badge variant="outline">Interactive Component</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A flexible carousel component for displaying multiple items in a scrollable container. Perfect for image galleries, testimonials, product showcases, and content highlights.
        </p>
      </div>

      {/* Interactive Example */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Example</h2>
        <Card>
          <CardHeader>
            <CardTitle>Live Carousel Preview</CardTitle>
            <CardDescription>
              Customize the carousel properties and see changes in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Preview */}
              <div className="lg:col-span-2 flex items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 h-full min-h-[500px]">
                <LiveCarouselPreview properties={properties} />
              </div>

              {/* Properties Panel */}
              <div className="space-y-4 p-4 border rounded-lg bg-background h-full min-h-[500px]">
                <CarouselPropertiesPanel
                  properties={properties}
                  onChange={handlePropertyChange}
                  onReset={handleReset}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Carousel Types */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Carousel Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Image Gallery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for showcasing photo collections, portfolio images, or product photography.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Quote className="h-5 w-5" />
                Testimonials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Display customer reviews and testimonials with ratings, photos, and detailed feedback.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Product Showcase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Feature products with pricing, ratings, and quick action buttons for e-commerce.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Use Cases */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Common Use Cases</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Hero Sections</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Create engaging hero sections with multiple slides showcasing key features or promotions.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Feature announcements</li>
                <li>• Product launches</li>
                <li>• Promotional campaigns</li>
                <li>• Brand storytelling</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Discovery</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Help users discover related content, featured articles, or recommended products.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Related articles</li>
                <li>• Featured blog posts</li>
                <li>• Recommended products</li>
                <li>• Team member highlights</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Technical Notes */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Technical Implementation</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Touch & Swipe Support</h4>
                <p className="text-sm text-muted-foreground">
                  Built-in touch and swipe gestures for mobile devices with smooth animations and momentum scrolling.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Responsive Design</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically adjusts item count and spacing based on screen size with configurable breakpoints.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Accessibility</h4>
                <p className="text-sm text-muted-foreground">
                  Includes keyboard navigation, ARIA attributes, and screen reader support for inclusive user experience.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}