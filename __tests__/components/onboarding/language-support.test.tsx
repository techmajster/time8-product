/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { ChoiceScreen } from '@/components/onboarding/ChoiceScreen'
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen'
import { MultiOptionScreen } from '@/components/onboarding/MultiOptionScreen'

// Import messages directly for testing
import enMessages from '@/messages/en.json'
import plMessages from '@/messages/pl.json'

// Mock next/navigation
const mockPush = jest.fn()
const mockBack = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack
  })
}))

// Mock Time8Logo component
jest.mock('@/components/ui/time8-logo', () => ({
  Time8Logo: () => <div data-testid="time8-logo">Time8 Logo</div>
}))

// Mock Alert component
jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, ...props }: any) => (
    <div data-testid="alert" data-variant={variant} {...props}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>
}))

// Mock fetch
global.fetch = jest.fn()

// Helper function to render with IntlProvider
function renderWithIntl(
  component: React.ReactElement,
  locale: 'en' | 'pl' = 'en'
) {
  const messages = locale === 'en' ? enMessages : plMessages
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {component}
    </NextIntlClientProvider>
  )
}

describe('Onboarding Language Support', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('WelcomeScreen Language Support', () => {
    const defaultProps = {
      userName: 'Jane'
    }

    it('should display English text when locale is en', () => {
      renderWithIntl(<WelcomeScreen {...defaultProps} />, 'en')
      
      expect(screen.getByText('Welcome Jane!')).toBeInTheDocument()
      expect(screen.getByText("Let's get started with your workspace")).toBeInTheDocument()
      expect(screen.getByText('Do you want to create')).toBeInTheDocument()
      expect(screen.getByText('a new workspace?')).toBeInTheDocument()
      expect(screen.getByText("It's free!")).toBeInTheDocument()
      expect(screen.getByText('up to 3 users')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create new workspace/i })).toBeInTheDocument()
    })

    it('should display Polish text when locale is pl', () => {
      renderWithIntl(<WelcomeScreen {...defaultProps} />, 'pl')
      
      expect(screen.getByText('Witaj Jane!')).toBeInTheDocument()
      expect(screen.getByText('Zacznijmy z Twoim obszarem roboczym')).toBeInTheDocument()
      expect(screen.getByText('Czy chcesz utworzyć')).toBeInTheDocument()
      expect(screen.getByText('nowy obszar roboczy?')).toBeInTheDocument()
      expect(screen.getByText('To bezpłatne!')).toBeInTheDocument()
      expect(screen.getByText('do 3 użytkowników')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /utwórz nowy obszar roboczy/i })).toBeInTheDocument()
    })
  })

  describe('ChoiceScreen Language Support', () => {
    const mockInvitation = {
      id: 'inv-1',
      organizationId: 'org-1',
      organizationName: 'Test Company',
      organizationInitials: 'TC',
      inviterName: 'John Doe',
      inviterEmail: 'john@test.com',
      token: 'test-token-123'
    }

    const defaultProps = {
      userName: 'Jane',
      invitation: mockInvitation
    }

    it('should display English text when locale is en', () => {
      renderWithIntl(<ChoiceScreen {...defaultProps} />, 'en')
      
      expect(screen.getByText('Welcome Jane!')).toBeInTheDocument()
      expect(screen.getByText("Let's get started with your workspace")).toBeInTheDocument()
      expect(screen.getByText('You have been invited')).toBeInTheDocument()
      expect(screen.getByText('to workspace:')).toBeInTheDocument()
      expect(screen.getByText('Do you want to create')).toBeInTheDocument()
      expect(screen.getByText('a new workspace?')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /accept invitation/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create new workspace/i })).toBeInTheDocument()
    })

    it('should display Polish text when locale is pl', () => {
      renderWithIntl(<ChoiceScreen {...defaultProps} />, 'pl')
      
      expect(screen.getByText('Witaj Jane!')).toBeInTheDocument()
      expect(screen.getByText('Zacznijmy z Twoim obszarem roboczym')).toBeInTheDocument()
      expect(screen.getByText('Zostałeś zaproszony')).toBeInTheDocument()
      expect(screen.getByText('do obszaru roboczego:')).toBeInTheDocument()
      expect(screen.getByText('Czy chcesz utworzyć')).toBeInTheDocument()
      expect(screen.getByText('nowy obszar roboczy?')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /zaakceptuj zaproszenie/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /utwórz nowy obszar roboczy/i })).toBeInTheDocument()
    })
  })

  describe('MultiOptionScreen Language Support', () => {
    const mockWorkspace = {
      id: 'workspace-1',
      name: 'Test Workspace',
      memberCount: 3,
      memberAvatars: [
        { id: 'user-1', avatar_url: null, full_name: 'User One' },
        { id: 'user-2', avatar_url: null, full_name: 'User Two' }
      ]
    }

    const mockInvitation = {
      id: 'inv-1',
      organizationId: 'org-1',
      organizationName: 'Test Company',
      organizationInitials: 'TC',
      inviterName: 'John Doe',
      inviterEmail: 'john@test.com',
      token: 'test-token-123'
    }

    const defaultProps = {
      userName: 'Jane',
      userWorkspaces: [mockWorkspace],
      pendingInvitations: [mockInvitation]
    }

    it('should display English text when locale is en', () => {
      renderWithIntl(<MultiOptionScreen {...defaultProps} />, 'en')
      
      expect(screen.getByText('Welcome Jane!')).toBeInTheDocument()
      expect(screen.getByText("Let's get started with your workspace")).toBeInTheDocument()
      expect(screen.getByText('You have been invited')).toBeInTheDocument()
      expect(screen.getByText('Your workspace:')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /accept invitation/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /enter workspace/i })).toBeInTheDocument()
    })

    it('should display Polish text when locale is pl', () => {
      renderWithIntl(<MultiOptionScreen {...defaultProps} />, 'pl')
      
      expect(screen.getByText('Witaj Jane!')).toBeInTheDocument()
      expect(screen.getByText('Zacznijmy z Twoim obszarem roboczym')).toBeInTheDocument()
      expect(screen.getByText('Zostałeś zaproszony')).toBeInTheDocument()
      expect(screen.getByText('Twój obszar roboczy:')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /zaakceptuj zaproszenie/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /wejdź do obszaru roboczego/i })).toBeInTheDocument()
    })
  })

  describe('Language Switching', () => {
    it('should handle dynamic language switching', () => {
      const { rerender } = renderWithIntl(<WelcomeScreen userName="Test" />, 'en')
      
      // Initially English
      expect(screen.getByText('Welcome Test!')).toBeInTheDocument()
      
      // Switch to Polish
      rerender(
        <NextIntlClientProvider locale="pl" messages={plMessages}>
          <WelcomeScreen userName="Test" />
        </NextIntlClientProvider>
      )
      
      expect(screen.getByText('Witaj Test!')).toBeInTheDocument()
      expect(screen.queryByText('Welcome Test!')).not.toBeInTheDocument()
    })
  })

  describe('Translation Keys Validation', () => {
    it('should have matching translation keys between languages', () => {
      // Check that all English onboarding keys exist in Polish
      const englishOnboarding = enMessages.onboarding
      const polishOnboarding = plMessages.onboarding
      
      function checkKeys(enObj: any, plObj: any, keyPath = '') {
        Object.keys(enObj).forEach(key => {
          const currentPath = keyPath ? `${keyPath}.${key}` : key
          expect(plObj).toHaveProperty(key, expect.any(Object))
          
          if (typeof enObj[key] === 'object' && enObj[key] !== null) {
            checkKeys(enObj[key], plObj[key], currentPath)
          }
        })
      }
      
      checkKeys(englishOnboarding, polishOnboarding)
    })

    it('should have all required onboarding translation keys in both languages', () => {
      const requiredKeys = [
        'welcome.title',
        'welcome.subtitle', 
        'welcome.cta',
        'createWorkspace.title',
        'createWorkspace.back',
        'choose.title',
        'choose.subtitle'
      ]

      requiredKeys.forEach(keyPath => {
        const keys = keyPath.split('.')
        let enValue = enMessages.onboarding
        let plValue = plMessages.onboarding

        keys.forEach(key => {
          enValue = enValue[key]
          plValue = plValue[key]
        })

        expect(enValue).toBeDefined()
        expect(plValue).toBeDefined()
        expect(typeof enValue).toBe('string')
        expect(typeof plValue).toBe('string')
      })
    })
  })

  describe('Fallback Behavior', () => {
    it('should handle missing translation gracefully', () => {
      // This test ensures components don't crash with missing translations
      const incompleteMessages = {
        onboarding: {
          welcome: {
            title: 'Test Title'
            // Missing other keys
          }
        }
      }

      expect(() => {
        render(
          <NextIntlClientProvider locale="en" messages={incompleteMessages}>
            <WelcomeScreen userName="Test" />
          </NextIntlClientProvider>
        )
      }).not.toThrow()
    })
  })
})