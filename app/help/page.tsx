import { AppLayout } from '@/components/app-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HelpCircle, BookOpen, MessageCircle, Phone, Mail } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function HelpPage() {
  const t = await getTranslations()

  const helpSections = [
    {
      title: "Getting Started",
      description: "Learn the basics of using the leave management system",
      icon: BookOpen,
      badge: "Popular"
    },
    {
      title: "Request Leave",
      description: "Step-by-step guide to submitting leave requests",
      icon: HelpCircle,
      badge: null
    },
    {
      title: "Calendar & Schedule",
      description: "Understanding your schedule and leave calendar",
      icon: MessageCircle,
      badge: null
    },
    {
      title: "Contact Support",
      description: "Get in touch with our support team",
      icon: Phone,
      badge: null
    }
  ]

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <PageHeader
              title={t('navigation.help')}
              description="Find answers to your questions and get help with the system"
            />

            {/* Help Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {helpSections.map((section, index) => {
                const IconComponent = section.icon
                return (
                  <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{section.title}</CardTitle>
                          </div>
                        </div>
                        {section.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {section.badge}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        {section.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Need More Help?
                </CardTitle>
                <CardDescription>
                  Can't find what you're looking for? Contact our support team for assistance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Support Email</h4>
                    <p className="text-sm text-muted-foreground">support@yourcompany.com</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Phone Support</h4>
                    <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Support hours: Monday - Friday, 9:00 AM - 5:00 PM
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>
                  Frequently accessed pages and resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Leave Management</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Submit new leave request</li>
                      <li>• Check leave balance</li>
                      <li>• View request history</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Calendar</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• View your schedule</li>
                      <li>• Check team availability</li>
                      <li>• Upcoming leaves</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Profile</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Update personal info</li>
                      <li>• Change preferences</li>
                      <li>• Notification settings</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
} 