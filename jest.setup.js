import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock LanguageSwitcher component
jest.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">Language Switcher</div>
}))

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (namespace) => (key, values) => {
    // Mock translations for onboarding
    const translations = {
      'onboarding.welcome.title': 'Welcome {name}!',
      'onboarding.welcome.subtitle': 'Let\'s get started with your workspace',
      'onboarding.welcome.card.title': 'Do you want to create',
      'onboarding.welcome.card.subtitle': 'a new workspace?',
      'onboarding.welcome.card.free': 'It\'s free!',
      'onboarding.welcome.card.limit': 'up to 3 users',
      'onboarding.welcome.cta': 'Create new workspace',
      'onboarding.choose.title': 'Welcome {name}!',
      'onboarding.choose.subtitle': 'Let\'s get started with your workspace',
      'onboarding.choose.invitation.title': 'You\'ve been invited',
      'onboarding.choose.invitation.subtitle': 'to workspace:',
      'onboarding.choose.invitation.accept': 'Accept invitation',
      'onboarding.choose.invitation.accepting': 'Accepting...',
      'onboarding.choose.create.title': 'Do you want to create',
      'onboarding.choose.create.subtitle': 'a new workspace?',
      'onboarding.choose.create.free': 'It\'s free!',
      'onboarding.choose.create.limit': 'up to 3 users',
      'onboarding.choose.create.cta': 'Create new workspace',
      'onboarding.createWorkspace.back': 'Back',
      'onboarding.createWorkspace.title': 'Create new workspace',
      'onboarding.createWorkspace.form.name.label': 'Organization Name',
      'onboarding.createWorkspace.form.language.label': 'Main language',
      'onboarding.createWorkspace.form.language.description': 'This will be the language used in the management panel.',
      'onboarding.createWorkspace.form.country.label': 'Holiday calendar',
      'onboarding.createWorkspace.form.country.description': 'Calendar settings will be automatically adjusted for the selected country',
      'onboarding.createWorkspace.form.submit': 'Create and let\'s get started',
      'onboarding.createWorkspace.form.submitting': 'Creating...',
      'onboarding.multi.title': 'Welcome {name}!',
      'onboarding.multi.subtitle': 'Let\'s get started with your workspace',
      'onboarding.multi.invitation.title': 'You\'ve been invited',
      'onboarding.multi.invitation.subtitle': 'to workspace:',
      'onboarding.multi.invitation.accept': 'Accept invitation',
      'onboarding.multi.invitation.accepting': 'Accepting...',
      'onboarding.multi.workspace.title': 'Your workspace:',
      'onboarding.multi.workspace.enter': 'Enter workspace',
      'onboarding.multi.workspace.entering': 'Entering...',
      'onboarding.multi.create.title': 'Do you want to create',
      'onboarding.multi.create.subtitle': 'a new workspace?',
      'onboarding.multi.create.free': 'It\'s free!',
      'onboarding.multi.create.limit': 'up to 3 users',
      'onboarding.multi.create.cta': 'Create new workspace',
    }
    
    const fullKey = `${namespace}.${key}`
    let translation = translations[fullKey] || fullKey
    
    if (values && typeof values === 'object') {
      Object.entries(values).forEach(([placeholder, value]) => {
        translation = translation.replace(`{${placeholder}}`, value)
      })
    }
    
    return translation
  },
  useFormatter: () => ({
    dateTime: (date) => date.toLocaleDateString(),
    number: (number) => number.toString(),
  }),
  useLocale: () => 'en',
  NextIntlClientProvider: ({ children }) => children,
}))

// Environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.LEMONSQUEEZY_API_KEY = 'test-api-key';
process.env.LEMONSQUEEZY_STORE_ID = 'test-store-id';
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';

// Global test setup
global.console = {
  ...console,
  // Suppress console.log in tests unless JEST_VERBOSE is set
  log: process.env.JEST_VERBOSE ? console.log : jest.fn(),
  debug: process.env.JEST_VERBOSE ? console.debug : jest.fn(),
  info: process.env.JEST_VERBOSE ? console.info : jest.fn(),
  warn: console.warn,
  error: console.error,
}