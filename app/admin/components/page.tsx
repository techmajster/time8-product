import { AppLayout } from '@/components/app-layout'
import { PageHeader } from '@/components/ui/page-header'
import { ComponentsShowcase } from './components/ComponentsShowcase'

export default function ComponentsPage() {
  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        <PageHeader
          title="UI Components Library"
          description="Comprehensive showcase of all available UI components from our design system"
        />
        <ComponentsShowcase />
      </div>
    </AppLayout>
  )
} 