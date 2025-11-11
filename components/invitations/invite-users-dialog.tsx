'use client'

import * as React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { UserCheck, UserPlus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SeatInfo {
  currentSeats: number
  maxSeats: number
  availableSeats: number  // Empty seats that can be filled
  freeTierSeats?: number  // Tier threshold (always 3)
  paidSeats?: number      // Number of paid seats
  pendingInvitations: number
  usersMarkedForRemoval: number
  plan: 'free' | 'business'
  billingCycle?: 'monthly' | 'yearly' | null
  pricePerSeat?: number
  currency?: string
}

export interface QueuedInvitation {
  id: string
  email: string
  status: 'paid' | 'unpaid'
  price?: number
}

export interface ActiveMember {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

export interface InviteUsersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  organizationName: string
  seatInfo: SeatInfo | null
  activeMembers?: ActiveMember[]
  onInviteSent?: () => void
  className?: string
}

export function InviteUsersDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  seatInfo,
  onInviteSent,
  className
}: InviteUsersDialogProps) {
  const [email, setEmail] = React.useState('')
  const [queuedInvitations, setQueuedInvitations] = React.useState<QueuedInvitation[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pricePerSeat, setPricePerSeat] = React.useState<number>(10.00) // Default fallback - correct PLN price
  const [currency, setCurrency] = React.useState<string>('PLN') // Default fallback - correct currency

  // Calculate how many seats are occupied and available
  const occupiedSeats = seatInfo ? seatInfo.currentSeats : 0
  const availableSeats = seatInfo ? seatInfo.availableSeats : 0  // Empty seats that can be filled
  const totalSeats = seatInfo ? seatInfo.maxSeats : 0

  // Fetch dynamic pricing when seatInfo is available
  React.useEffect(() => {
    // Use pricePerSeat from seatInfo if available
    if (seatInfo?.pricePerSeat) {
      setPricePerSeat(seatInfo.pricePerSeat)
    }
    // Use currency from seatInfo if available
    if (seatInfo?.currency) {
      setCurrency(seatInfo.currency)
    }
  }, [seatInfo])

  // Calculate total cost for unpaid invitations
  const unpaidInvitations = queuedInvitations.filter(inv => inv.status === 'unpaid')
  const totalCost = unpaidInvitations.reduce((sum, inv) => sum + (inv.price || 0), 0)
  const needsPayment = unpaidInvitations.length > 0

  // Handle adding email to queue
  const handleAddEmail = () => {
    if (!email.trim()) return

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Nieprawidłowy format adresu email')
      return
    }

    // Check for duplicates
    if (queuedInvitations.some(inv => inv.email === email.toLowerCase())) {
      setError('Ten adres email jest już na liście')
      return
    }

    // Check if we need to charge for this invitation
    // Calculate how many seats will be used AFTER adding this invitation
    const seatsAfterAdding = occupiedSeats + queuedInvitations.length + 1
    const needsPaymentForThis = seatsAfterAdding > totalSeats

    // Add to queue with dynamic pricing
    const newInvitation: QueuedInvitation = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      status: needsPaymentForThis ? 'unpaid' : 'paid',
      price: needsPaymentForThis ? pricePerSeat : 0
    }

    setQueuedInvitations([...queuedInvitations, newInvitation])
    setEmail('')
    setError(null)
  }

  // Handle removing invitation from queue
  const handleRemoveInvitation = (id: string) => {
    setQueuedInvitations(queuedInvitations.filter(inv => inv.id !== id))
  }

  // Handle sending invitations (free tier or already paid seats)
  const handleSendInvitations = async () => {
    if (queuedInvitations.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/invitations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            invitations: queuedInvitations.map(inv => ({
              email: inv.email,
              role: 'employee'
            }))
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Nie udało się wysłać zaproszeń')
      }

      // Success - clear queue and notify parent
      setQueuedInvitations([])
      onInviteSent?.()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle payment flow for additional seats
  const handleGoToPayment = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Store queued invitations in session storage
      sessionStorage.setItem(
        'queued_invitations',
        JSON.stringify({
          organizationId,
          invitations: queuedInvitations.map(inv => ({
            email: inv.email,
            role: 'employee'
          }))
        })
      )

      // Calculate required seats
      const requiredSeats = occupiedSeats + queuedInvitations.length

      // Check if organization has an existing active subscription
      // If yes, redirect to customer portal to upgrade seats
      // If no, create new checkout for initial subscription
      const subscriptionResponse = await fetch('/api/billing/subscription')
      const subscriptionData = await subscriptionResponse.json()

      // If subscription exists and is active, redirect to customer portal to upgrade
      if (subscriptionResponse.ok && subscriptionData.subscription && subscriptionData.subscription.status === 'active') {
        // Redirect to LemonSqueezy customer portal to update subscription quantity
        const portalResponse = await fetch('/api/billing/customer-portal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            return_url: `${window.location.origin}/admin/team-management`
          })
        })

        console.log('🔍 Portal request - return_url:', `${window.location.origin}/admin/team-management`)

        const portalData = await portalResponse.json()

        if (!portalResponse.ok) {
          throw new Error(portalData.error || 'Nie udało się uzyskać dostępu do portalu płatności')
        }

        // Show info message about what user needs to do
        alert(`Zostaniesz przekierowany do portalu płatności LemonSqueezy.\n\nAby dodać ${queuedInvitations.length} nowych użytkowników, zwiększ liczbę miejsc z ${seatInfo?.paidSeats || 0} do ${requiredSeats}.\n\nPo zaktualizowaniu subskrypcji, wróć tutaj aby wysłać zaproszenia.`)

        window.location.href = portalData.portal_url
      } else {
        // No active subscription - create new checkout for initial subscription
        const response = await fetch('/api/billing/create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            variant_id: process.env.NEXT_PUBLIC_LEMONSQUEEZY_MONTHLY_VARIANT_ID || '972634',
            organization_data: {
              id: organizationId,
              name: organizationName,
              slug: organizationName.toLowerCase().replace(/\s+/g, '-'),
              country_code: 'PL'
            },
            user_count: requiredSeats,
            tier: 'monthly',
            return_url: `${window.location.origin}/onboarding/payment-success`,
            failure_url: `${window.location.origin}/admin/team-management`
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Nie udało się utworzyć sesji płatności')
        }

        // Redirect to checkout
        if (data.checkout_url) {
          window.location.href = data.checkout_url
        } else {
          throw new Error('Nie otrzymano adresu URL płatności')
        }
      }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="content" className="overflow-y-auto">
        <div className="bg-background relative rounded-lg h-full">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col gap-1.5 px-6 pt-6 pb-4">
              <SheetTitle className="text-xl font-semibold text-foreground">
                Zaproś nowych użytkowników
              </SheetTitle>
            </div>

            <div className="px-6">
              <Separator className="mb-6" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6">
              <div className="flex flex-col gap-6">

                {/* Seat Information (NO Alert wrapper) */}
                <div>
                  <p className="font-semibold text-base text-foreground mb-3">
                    Masz {availableSeats}/{totalSeats} wolnych miejsc w Twoim planie {seatInfo?.plan === 'free' ? 'HOBBY' : 'PRO'}
                  </p>

                  {/* Seat Blocks */}
                  <div className="flex gap-3">
                    {/* Occupied Seats Block */}
                    <div className="flex-1 border border-border rounded-md bg-green-100 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck className="size-4" />
                          <span className="text-sm text-foreground">Zajęte</span>
                        </div>
                        <span className="text-base font-semibold text-card-foreground">
                          {occupiedSeats}
                        </span>
                      </div>
                    </div>

                    {/* Available Seats Block */}
                    <div className="flex-1 border border-dashed border-border rounded-md px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserPlus className="size-4" />
                          <span className="text-sm text-foreground">Wolne</span>
                        </div>
                        <span className="text-base font-semibold text-card-foreground">
                          {availableSeats}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add User Section */}
                <div className="space-y-3">
                  <p className="font-semibold text-base">Dodaj użytkownika</p>
                  <div className="flex gap-2 items-end">
                    <Input
                      type="email"
                      placeholder="Wpisz adres email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddEmail()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddEmail}
                      disabled={!email.trim()}
                      className="shrink-0"
                    >
                      Dodaj
                    </Button>
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>

                {/* Queued Invitations Section */}
                {queuedInvitations.length > 0 && (
                  <>
                    <div className="space-y-3">
                      <p className="font-semibold text-base">Do zaproszenia</p>

                      {/* Invitations Table */}
                      <div className="space-y-0">
                        {queuedInvitations.map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex items-center border-b border-border py-2"
                          >
                            {/* Email */}
                            <div className="flex-1 min-w-0 px-2">
                              <p className="text-sm font-medium text-foreground truncate">
                                {invitation.email}
                              </p>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center justify-end px-2">
                              {invitation.status === 'paid' ? (
                                <Badge className="bg-green-600 text-white">
                                  Opłacony
                                </Badge>
                              ) : (
                                <Badge className="bg-primary text-primary-foreground">
                                  +{invitation.price?.toFixed(2)} {currency}
                                </Badge>
                              )}
                            </div>

                            {/* Delete Button */}
                            <div className="flex items-center justify-end px-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-9 shrink-0"
                                onClick={() => handleRemoveInvitation(invitation.id)}
                                aria-label={`Usuń zaproszenie dla ${invitation.email}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Summary Row */}
                        {needsPayment && (
                          <div className="flex items-center py-2">
                            <div className="flex-1 px-2">
                              <p className="text-sm text-muted-foreground">
                                Podsumowanie
                              </p>
                            </div>
                            <div className="flex items-center justify-end px-2">
                              <p className="text-sm font-medium text-foreground">
                                +{totalCost.toFixed(2)} {currency}
                              </p>
                            </div>
                            <div className="w-[52px]" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Notice */}
                    {needsPayment && (
                      <div className="space-y-4">
                        <p className="text-sm font-medium text-muted-foreground">
                          Wszystkie zaproszenia zostaną wysłane po opłaceniu
                          dodatkowych użytkowników
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="px-6 mt-6">
              <Separator />
            </div>

            {/* Footer */}
            <div className="flex flex-row gap-2 items-center justify-between w-full px-6 pt-6 pb-4 bg-background">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="h-9"
              >
                Anuluj
              </Button>

              <Button
                onClick={needsPayment ? handleGoToPayment : handleSendInvitations}
                disabled={isLoading || queuedInvitations.length === 0}
                className="h-9"
              >
                {isLoading
                  ? 'Przetwarzanie...'
                  : needsPayment
                  ? 'Przejdź do płatności'
                  : 'Wyślij zaproszenia'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
