'use client'

import * as React from 'react'
import { Loader2, AlertCircle, TrendingUp, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface PricingInfo {
  monthlyPricePerSeat: number
  annualPricePerSeat: number
  currency: string
  monthlyVariantId: string
  yearlyVariantId: string
}

interface UpgradePromptProps {
  currentSeats: number
  requiredSeats: number
  organizationId: string
  organizationName: string
  onUpgrade: (data: { tier: 'monthly' | 'annual'; userCount: number; variantId: string }) => void
  isLoading?: boolean
  error?: string | null
  className?: string
}

export function UpgradePrompt({
  currentSeats,
  requiredSeats,
  organizationId,
  organizationName,
  onUpgrade,
  isLoading = false,
  error = null,
  className
}: UpgradePromptProps) {
  const [selectedTier, setSelectedTier] = React.useState<'monthly' | 'annual'>('monthly')
  const [pricing, setPricing] = React.useState<PricingInfo | null>(null)
  const [loadingPricing, setLoadingPricing] = React.useState(true)

  // Fetch pricing on mount
  React.useEffect(() => {
    async function fetchPricing() {
      try {
        const response = await fetch('/api/billing/pricing')
        const data = await response.json()

        if (data.success && data.pricing) {
          setPricing(data.pricing)
        } else {
          // Use fallback pricing
          setPricing({
            monthlyPricePerSeat: 10.0,
            annualPricePerSeat: 8.0,
            currency: 'PLN',
            monthlyVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634',
            yearlyVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635'
          })
        }
      } catch (err) {
        console.error('Failed to fetch pricing:', err)
        // Use fallback pricing
        setPricing({
          monthlyPricePerSeat: 10.0,
          annualPricePerSeat: 8.0,
          currency: 'PLN',
          monthlyVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634',
          yearlyVariantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_YEARLY_VARIANT_ID || '972635'
        })
      } finally {
        setLoadingPricing(false)
      }
    }

    fetchPricing()
  }, [])

  const handleUpgrade = () => {
    if (!pricing) return

    const variantId = selectedTier === 'monthly' ? pricing.monthlyVariantId : pricing.yearlyVariantId

    onUpgrade({
      tier: selectedTier,
      userCount: requiredSeats,
      variantId
    })
  }

  // Calculate pricing
  const monthlyTotal = pricing ? requiredSeats * pricing.monthlyPricePerSeat : 0
  const annualTotal = pricing ? requiredSeats * pricing.annualPricePerSeat * 12 : 0
  const annualSavingsPercent = pricing
    ? Math.round(((monthlyTotal * 12 - annualTotal) / (monthlyTotal * 12)) * 100)
    : 0

  const formatPrice = (amount: number, currency: string = 'PLN') => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  if (loadingPricing) {
    return (
      <Card className={cn('border-orange-200 bg-orange-50', className)}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
            <p className="text-sm text-orange-700">Ładowanie cen...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-orange-200 bg-orange-50', className)}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-orange-100 p-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg text-orange-900">
              Niewystarczająca liczba miejsc
            </CardTitle>
            <CardDescription className="text-orange-700">
              Ulepszenie planu wymagane do wysłania wszystkich zaproszeń
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error banner */}
        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-3"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Seat information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-orange-200 bg-white p-3">
            <p className="text-xs text-gray-600 mb-1">Aktualne miejsca</p>
            <p className="text-2xl font-bold text-orange-900">{currentSeats}</p>
          </div>
          <div className="rounded-lg border border-orange-200 bg-white p-3">
            <p className="text-xs text-gray-600 mb-1">Potrzebne miejsca</p>
            <p className="text-2xl font-bold text-orange-900">{requiredSeats}</p>
          </div>
        </div>

        {/* Pricing options */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-orange-900">
            Wybierz plan rozliczeniowy
          </Label>
          <RadioGroup
            value={selectedTier}
            onValueChange={(value) => setSelectedTier(value as 'monthly' | 'annual')}
            className="space-y-3"
            role="radiogroup"
            aria-label="Plan rozliczeniowy"
          >
            {/* Monthly option */}
            <div
              className={cn(
                'relative flex items-start gap-3 rounded-lg border-2 bg-white p-4 cursor-pointer transition-colors',
                selectedTier === 'monthly'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
              onClick={() => setSelectedTier('monthly')}
            >
              <RadioGroupItem
                value="monthly"
                id="tier-monthly"
                className="mt-0.5"
                aria-label="Miesięczny plan rozliczeniowy"
              />
              <div className="flex-1">
                <Label
                  htmlFor="tier-monthly"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="font-semibold text-gray-900">Miesięczny</span>
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  {formatPrice(monthlyTotal, pricing?.currency)} / miesiąc
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {requiredSeats} {requiredSeats === 1 ? 'miejsce' : 'miejsc'} ×{' '}
                  {formatPrice(pricing?.monthlyPricePerSeat || 0, pricing?.currency)}
                </p>
              </div>
              {selectedTier === 'monthly' && (
                <Check className="h-5 w-5 text-orange-600" />
              )}
            </div>

            {/* Annual option */}
            <div
              className={cn(
                'relative flex items-start gap-3 rounded-lg border-2 bg-white p-4 cursor-pointer transition-colors',
                selectedTier === 'annual'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
              onClick={() => setSelectedTier('annual')}
            >
              <RadioGroupItem
                value="annual"
                id="tier-annual"
                className="mt-0.5"
                aria-label="Roczny plan rozliczeniowy"
              />
              <div className="flex-1">
                <Label
                  htmlFor="tier-annual"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="font-semibold text-gray-900">Roczny</span>
                  {annualSavingsPercent > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Oszczędzasz {annualSavingsPercent}%
                    </Badge>
                  )}
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  {formatPrice(annualTotal, pricing?.currency)} / rok
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {requiredSeats} {requiredSeats === 1 ? 'miejsce' : 'miejsc'} ×{' '}
                  {formatPrice(pricing?.annualPricePerSeat || 0, pricing?.currency)} × 12 miesięcy
                </p>
              </div>
              {selectedTier === 'annual' && (
                <Check className="h-5 w-5 text-orange-600" />
              )}
            </div>
          </RadioGroup>
        </div>

        {/* Information note */}
        <div className="rounded-lg border border-orange-200 bg-white p-3">
          <p className="text-sm text-gray-700">
            Po ulepszeniu Twoje zaproszenia zostaną automatycznie wysłane, a nowi użytkownicy
            otrzymają e-mail z linkiem do dołączenia do <strong>{organizationName}</strong>.
          </p>
        </div>

        {/* Upgrade button */}
        <Button
          onClick={handleUpgrade}
          disabled={isLoading || !pricing}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Przetwarzanie...
            </>
          ) : (
            <>
              Ulepsz i wyślij zaproszenia
              {selectedTier === 'monthly' && ` (${formatPrice(monthlyTotal, pricing?.currency)}/mies.)`}
              {selectedTier === 'annual' && ` (${formatPrice(annualTotal, pricing?.currency)}/rok)`}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
