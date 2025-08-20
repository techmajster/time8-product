export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col items-center justify-center p-0">
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  )
} 