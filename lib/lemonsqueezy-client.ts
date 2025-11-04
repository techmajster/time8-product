/**
 * Lemon Squeezy API Client
 *
 * Provides methods for interacting with the Lemon Squeezy API
 * with built-in retry logic, error handling, and logging.
 */

export interface LemonSqueezyConfig {
  maxRetries?: number
  retryDelay?: number
}

export interface LemonSqueezyError {
  status: string
  detail: string
}

export interface LemonSqueezyResponse<T = any> {
  data: T
  errors?: LemonSqueezyError[]
}

export class LemonSqueezyClient {
  private apiKey: string
  private baseUrl = 'https://api.lemonsqueezy.com/v1'
  private maxRetries: number
  private retryDelay: number

  constructor(apiKey: string, config: LemonSqueezyConfig = {}) {
    if (!apiKey) {
      throw new Error('Lemon Squeezy API key is required')
    }

    this.apiKey = apiKey
    this.maxRetries = config.maxRetries ?? 3
    this.retryDelay = config.retryDelay ?? 1000
  }

  /**
   * Updates a subscription item's quantity
   *
   * @param subscriptionItemId - The Lemon Squeezy subscription item ID
   * @param quantity - The new quantity (number of seats)
   * @returns The updated subscription item data
   */
  async updateSubscriptionItem(
    subscriptionItemId: string,
    quantity: number
  ): Promise<LemonSqueezyResponse> {
    const url = `${this.baseUrl}/subscription-items/${subscriptionItemId}`
    const body = {
      data: {
        type: 'subscription-items',
        id: subscriptionItemId,
        attributes: {
          quantity,
          disable_prorations: true
        }
      }
    }

    return this.makeRequest('PATCH', url, body, 'update subscription item')
  }

  /**
   * Fetches a subscription item by ID
   *
   * @param subscriptionItemId - The Lemon Squeezy subscription item ID
   * @returns The subscription item data
   */
  async getSubscriptionItem(subscriptionItemId: string): Promise<LemonSqueezyResponse> {
    const url = `${this.baseUrl}/subscription-items/${subscriptionItemId}`
    return this.makeRequest('GET', url, null, 'get subscription item')
  }

  /**
   * Fetches a subscription by ID
   *
   * @param subscriptionId - The Lemon Squeezy subscription ID
   * @returns The subscription data
   */
  async getSubscription(subscriptionId: string): Promise<LemonSqueezyResponse> {
    const url = `${this.baseUrl}/subscriptions/${subscriptionId}`
    return this.makeRequest('GET', url, null, 'get subscription')
  }

  /**
   * Makes an HTTP request to the Lemon Squeezy API with retry logic
   *
   * @private
   */
  private async makeRequest(
    method: 'GET' | 'PATCH',
    url: string,
    body: any | null,
    operation: string
  ): Promise<LemonSqueezyResponse> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Log API call
        const logPrefix = `[LemonSqueezy] ${method} ${url.replace(this.baseUrl, '')}`
        console.log(logPrefix, {
          attempt,
          body: body ? JSON.stringify(body) : undefined
        })

        const options: RequestInit = {
          method,
          headers: {
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }

        if (body) {
          options.body = JSON.stringify(body)
        }

        const response = await fetch(url, options)

        // Parse response
        const data = await response.json()

        // Handle API errors
        if (!response.ok) {
          const errorDetail = data.errors?.[0]?.detail || response.statusText
          const error = new Error(`Lemon Squeezy API error: ${errorDetail}`)

          console.log(`${logPrefix.replace('[LemonSqueezy]', '[LemonSqueezy] ERROR')}`, {
            status: response.status,
            error: errorDetail
          })

          throw error
        }

        // Success - log and return
        console.log(`${logPrefix} ✓`, {
          status: response.status,
          data: JSON.stringify(data).substring(0, 200)
        })

        return data
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't retry on API errors (4xx), only on network errors
        if (error instanceof Error && error.message.includes('Lemon Squeezy API error')) {
          throw error
        }

        // Retry on network errors
        if (attempt < this.maxRetries) {
          console.warn(
            `[LemonSqueezy] Retry ${attempt}/${this.maxRetries} for ${method} ${url.replace(this.baseUrl, '')}`,
            lastError.message
          )
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt))
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to ${operation} after ${this.maxRetries} attempts: ${lastError?.message}`
    )
  }
}

/**
 * Creates a Lemon Squeezy client instance using the environment API key
 */
export function createLemonSqueezyClient(config?: LemonSqueezyConfig): LemonSqueezyClient {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY

  if (!apiKey) {
    throw new Error('LEMONSQUEEZY_API_KEY environment variable is not set')
  }

  return new LemonSqueezyClient(apiKey, config)
}
