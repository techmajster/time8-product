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