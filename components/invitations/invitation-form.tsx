'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, AlertCircle, Users, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

// Zod validation schema
const invitationFormSchema = z.object({
  emails: z.string()
    .min(1, 'Email jest wymagany')
    .refine(
      (value) => {
        const emails = value.split(',').map(e => e.trim()).filter(Boolean)
        return emails.every(email => z.string().email().safeParse(email).success)
      },
      { message: 'Nieprawidłowy format email. Użyj przecinków aby rozdzielić wiele adresów.' }
    )
    .refine(
      (value) => {
        const emails = value.split(',').map(e => e.trim()).filter(Boolean)
        const uniqueEmails = new Set(emails.map(e => e.toLowerCase()))
        return uniqueEmails.size === emails.length
      },
      { message: 'Duplikat email wykryty. Każdy adres email musi być unikalny.' }
    ),
  fullName: z.string().optional(),
  role: z.enum(['admin', 'manager', 'employee'], {
    required_error: 'Rola jest wymagana'
  }),
  teamId: z.string().optional(),
  personalMessage: z.string().max(500, 'Maksymalnie 500 znaków').optional()
})

type InvitationFormData = z.infer<typeof invitationFormSchema>

interface Team {
  id: string
  name: string
}

interface InvitationFormProps {
  organizationId: string
  availableSeats: number
  teams?: Team[]
  onSubmit: (data: { invitations: Array<{
    email: string
    fullName?: string
    role: 'admin' | 'manager' | 'employee'
    teamId?: string
    personalMessage?: string
  }> }) => void
  isSubmitting?: boolean
  error?: string | null
  resetForm?: boolean
  className?: string
}

const roleOptions = [
  { value: 'employee', label: 'Pracownik' },
  { value: 'manager', label: 'Menadżer' },
  { value: 'admin', label: 'Administrator' }
]

export function InvitationForm({
  organizationId,
  availableSeats,
  teams = [],
  onSubmit,
  isSubmitting = false,
  error = null,
  resetForm = false,
  className
}: InvitationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: {
      emails: '',
      fullName: '',
      role: 'employee',
      teamId: undefined,
      personalMessage: ''
    }
  })

  const emailsValue = watch('emails')
  const roleValue = watch('role')
  const teamIdValue = watch('teamId')
  const personalMessageValue = watch('personalMessage')

  // Parse emails from input
  const parsedEmails = React.useMemo(() => {
    if (!emailsValue) return []
    return emailsValue.split(',').map(e => e.trim()).filter(Boolean)
  }, [emailsValue])

  const emailCount = parsedEmails.length
  const seatsRequired = emailCount
  const seatsExceeded = seatsRequired > availableSeats
  const messageLength = personalMessageValue?.length || 0

  // Reset form when resetForm prop changes
  React.useEffect(() => {
    if (resetForm) {
      reset()
    }
  }, [resetForm, reset])

  const onFormSubmit = (data: InvitationFormData) => {
    // Parse emails and create invitation objects
    const emails = data.emails.split(',').map(e => e.trim()).filter(Boolean)

    const invitations = emails.map(email => ({
      email,
      fullName: data.fullName || undefined,
      role: data.role,
      teamId: data.teamId || undefined,
      personalMessage: data.personalMessage || undefined
    }))

    onSubmit({ invitations })
  }

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className={cn('space-y-6', className)}
    >
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

      {/* Available seats indicator */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Dostępne miejsca: {availableSeats}
          </span>
        </div>
        {emailCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Potrzebne: {seatsRequired}</span>
            <Badge variant={seatsExceeded ? 'destructive' : 'secondary'}>
              {seatsExceeded ? 'Za dużo zaproszeń' : 'OK'}
            </Badge>
          </div>
        )}
      </div>

      {/* Email input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="emails">
            Email <span className="text-red-500">*</span>
          </Label>
          {emailCount > 1 && (
            <Badge variant="secondary" className="text-xs">
              {emailCount}
            </Badge>
          )}
        </div>
        <Input
          id="emails"
          type="text"
          placeholder="uzytkownik@example.com, inny@example.com"
          {...register('emails')}
          aria-invalid={!!errors.emails}
          aria-describedby={errors.emails ? 'emails-error' : undefined}
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-500">
          Możesz podać wiele adresów email oddzielonych przecinkami
        </p>
        {errors.emails && (
          <p
            id="emails-error"
            className="text-sm text-red-600"
            role="alert"
          >
            {errors.emails.message}
          </p>
        )}
      </div>

      {/* Seat validation warning */}
      {seatsExceeded && (
        <div
          className="rounded-lg border border-orange-200 bg-orange-50 p-3"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-orange-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-900">
                Za dużo zaproszeń
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Próbujesz zaprosić {seatsRequired} {seatsRequired === 1 ? 'osobę' : 'osób'},
                ale masz tylko {availableSeats} {availableSeats === 1 ? 'dostępne miejsce' : 'dostępnych miejsc'}.
                Usuń {seatsRequired - availableSeats} {seatsRequired - availableSeats === 1 ? 'email' : 'emaile'} lub
                ulepsz swój plan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full name input */}
      <div className="space-y-2">
        <Label htmlFor="fullName">
          Imię i nazwisko
          <span className="text-xs text-gray-500 ml-1">(opcjonalne)</span>
        </Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Jan Kowalski"
          {...register('fullName')}
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-500">
          Jeśli podasz, zostanie użyte dla wszystkich zaproszeń
        </p>
      </div>

      {/* Role selector */}
      <div className="space-y-2">
        <Label htmlFor="role">
          Rola <span className="text-red-500">*</span>
        </Label>
        <Select
          value={roleValue}
          onValueChange={(value) => setValue('role', value as 'admin' | 'manager' | 'employee')}
          disabled={isSubmitting}
        >
          <SelectTrigger id="role" aria-label="Rola">
            <SelectValue placeholder="Wybierz rolę" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.role && (
          <p className="text-sm text-red-600" role="alert">
            {errors.role.message}
          </p>
        )}
      </div>

      {/* Team selector (optional) */}
      {teams.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="teamId">
            Zespół
            <span className="text-xs text-gray-500 ml-1">(opcjonalne)</span>
          </Label>
          <Select
            value={teamIdValue || 'none'}
            onValueChange={(value) => setValue('teamId', value === 'none' ? undefined : value)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="teamId" aria-label="Zespół">
              <SelectValue placeholder="Wybierz zespół" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Brak</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Personal message */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="personalMessage">
            Wiadomość osobista
            <span className="text-xs text-gray-500 ml-1">(opcjonalne)</span>
          </Label>
          <span className="text-xs text-gray-500">
            {messageLength} / 500
          </span>
        </div>
        <Textarea
          id="personalMessage"
          placeholder="Dodaj osobistą wiadomość do zaproszenia..."
          rows={4}
          {...register('personalMessage')}
          aria-invalid={!!errors.personalMessage}
          aria-describedby={errors.personalMessage ? 'personalMessage-error' : undefined}
          disabled={isSubmitting}
        />
        {errors.personalMessage && (
          <p
            id="personalMessage-error"
            className="text-sm text-red-600"
            role="alert"
          >
            {errors.personalMessage.message}
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || seatsExceeded || emailCount === 0}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Wysyłanie...
          </>
        ) : (
          <>
            Wyślij zaproszenia {emailCount > 0 && `(${emailCount})`}
          </>
        )}
      </Button>
    </form>
  )
}
