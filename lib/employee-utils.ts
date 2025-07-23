export interface EmployeeCreationData {
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'employee'
  team_id?: string
  personal_message?: string
  send_invitation: boolean
}

export interface EmployeeCreationResult {
  email: string
  full_name: string
  role: string
  team_id?: string
  status: 'created' | 'invited'
  profile_id?: string
  invitation_id?: string
  invitation_code?: string
  verification_sent?: boolean
  invitation_sent?: boolean
}

export interface EmployeeCreationError {
  email: string
  error: string
}

export function validateEmployee(employee: EmployeeCreationData): string | null {
  // Required fields validation
  if (!employee.email?.trim()) {
    return 'Email jest wymagany'
  }
  
  if (!employee.full_name?.trim()) {
    return 'Imię i nazwisko jest wymagane'
  }
  
  if (!employee.role) {
    return 'Rola jest wymagana'
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(employee.email.trim())) {
    return 'Nieprawidłowy format adresu email'
  }
  
  // Role validation
  if (!['admin', 'manager', 'employee'].includes(employee.role)) {
    return 'Nieprawidłowa rola. Dozwolone: admin, manager, employee'
  }
  
  return null
}

export function parseCSVContent(csvContent: string, defaultValues: Partial<EmployeeCreationData>): {
  employees: EmployeeCreationData[]
  errors: string[]
} {
  const lines = csvContent.trim().split('\n')
  const employees: EmployeeCreationData[] = []
  const errors: string[] = []
  
  if (lines.length === 0) {
    errors.push('Plik CSV jest pusty')
    return { employees, errors }
  }
  
  // Check if first line is header
  const firstLine = lines[0].toLowerCase()
  const hasHeader = firstLine.includes('email') || firstLine.includes('imię') || firstLine.includes('name')
  const startIndex = hasHeader ? 1 : 0
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    try {
      const columns = line.split(',').map(col => col.trim())
      
      if (columns.length < 2) {
        errors.push(`Linia ${i + 1}: Zbyt mało kolumn (wymagane: email, imię_nazwisko)`)
        continue
      }
      
      const [email, full_name, role, team_name] = columns
      
      if (!email || !full_name) {
        errors.push(`Linia ${i + 1}: Email i imię są wymagane`)
        continue
      }
      
      const employee: EmployeeCreationData = {
        email: email.toLowerCase(),
        full_name,
        role: (['admin', 'manager', 'employee'].includes(role)) ? role as any : defaultValues.role || 'employee',
        team_id: defaultValues.team_id,
        personal_message: defaultValues.personal_message || '',
        send_invitation: defaultValues.send_invitation ?? true
      }
      
      // Validate the employee data
      const validationError = validateEmployee(employee)
      if (validationError) {
        errors.push(`Linia ${i + 1}: ${validationError}`)
        continue
      }
      
      employees.push(employee)
      
    } catch (error) {
      errors.push(`Linia ${i + 1}: Błąd parsowania - ${error instanceof Error ? error.message : 'Nieznany błąd'}`)
    }
  }
  
  return { employees, errors }
}

export function generateTempPassword(): string {
  // Generate a secure temporary password
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const numbers = '23456789'
  const symbols = '!@#$%&*'
  
  let password = ''
  
  // At least 2 uppercase, 2 lowercase, 2 numbers, 1 symbol
  password += chars.substring(0, 26)[Math.floor(Math.random() * 26)] // uppercase
  password += chars.substring(0, 26)[Math.floor(Math.random() * 26)] // uppercase
  password += chars.substring(26)[Math.floor(Math.random() * 26)] // lowercase
  password += chars.substring(26)[Math.floor(Math.random() * 26)] // lowercase
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Add remaining random characters to reach 12 chars
  for (let i = password.length; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export function formatEmployeeCreationSummary(
  results: EmployeeCreationResult[], 
  errors: EmployeeCreationError[], 
  mode: 'direct' | 'invitation'
): string {
  const total = results.length + errors.length
  const successful = results.length
  const failed = errors.length
  
  if (failed === 0) {
    return `✅ Pomyślnie przetworzono ${successful} pracownik(ów) w trybie ${mode === 'direct' ? 'bezpośredniej kreacji' : 'zaproszeniowym'}`
  } else if (successful === 0) {
    return `❌ Wszystkie ${total} próby zakończone błędem`
  } else {
    return `⚠️ Przetworzono ${successful} z ${total} pracowników. ${failed} zakończono błędem.`
  }
}

export function createCSVTemplate(): string {
  return [
    'email,imię_nazwisko,rola,zespół',
    'jan.kowalski@example.com,Jan Kowalski,employee,Development',
    'anna.nowak@example.com,Anna Nowak,manager,Marketing',
    'piotr.smith@example.com,Piotr Smith,admin,'
  ].join('\n')
}

export interface ProcessingProgress {
  processed: number
  total: number
  current: string
  status: 'processing' | 'completed' | 'error'
}

export function calculateProcessingProgress(
  currentIndex: number, 
  total: number, 
  currentEmail: string
): ProcessingProgress {
  return {
    processed: currentIndex,
    total,
    current: currentEmail,
    status: currentIndex >= total ? 'completed' : 'processing'
  }
} 