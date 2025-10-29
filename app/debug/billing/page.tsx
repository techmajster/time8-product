/**
 * Billing Debug Page
 * 
 * Debug utilities for testing Lemon Squeezy integration.
 * Access at: http://localhost:3000/debug/billing
 */

'use client';

import { useState } from 'react';

interface DebugResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export default function BillingDebugPage() {
  const [results, setResults] = useState<{ [key: string]: DebugResult }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  const logResult = (testName: string, result: DebugResult) => {
    setResults(prev => ({
      ...prev,
      [testName]: result
    }));
  };

  const setTestLoading = (testName: string, isLoading: boolean) => {
    setLoading(prev => ({
      ...prev,
      [testName]: isLoading
    }));
  };

  // Test webhook endpoint health
  const testWebhookHealth = async () => {
    const testName = 'webhook-health';
    setTestLoading(testName, true);
    
    try {
      const response = await fetch('/api/webhooks/lemonsqueezy');
      const data = await response.json();
      
      logResult(testName, {
        success: response.ok,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logResult(testName, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setTestLoading(testName, false);
    }
  };

  // Test products endpoint
  const testProductsEndpoint = async () => {
    const testName = 'products-endpoint';
    setTestLoading(testName, true);
    
    try {
      const response = await fetch('/api/billing/products');
      const data = await response.json();
      
      logResult(testName, {
        success: response.ok,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logResult(testName, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setTestLoading(testName, false);
    }
  };

  // Test subscription endpoint (requires organization_id)
  const testSubscriptionEndpoint = async () => {
    const testName = 'subscription-endpoint';
    setTestLoading(testName, true);
    
    const orgId = prompt('Enter organization ID to test:');
    if (!orgId) {
      setTestLoading(testName, false);
      return;
    }
    
    try {
      const response = await fetch(`/api/billing/subscription?organization_id=${orgId}`);
      const data = await response.json();
      
      logResult(testName, {
        success: response.ok,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logResult(testName, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setTestLoading(testName, false);
    }
  };

  // Test customer portal endpoint
  const testCustomerPortal = async () => {
    const testName = 'customer-portal';
    setTestLoading(testName, true);
    
    const orgId = prompt('Enter organization ID to test:');
    if (!orgId) {
      setTestLoading(testName, false);
      return;
    }
    
    try {
      const response = await fetch(`/api/billing/customer-portal?organization_id=${orgId}`);
      const data = await response.json();
      
      logResult(testName, {
        success: response.ok,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logResult(testName, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setTestLoading(testName, false);
    }
  };

  // Test checkout creation
  const testCheckoutCreation = async () => {
    const testName = 'checkout-creation';
    setTestLoading(testName, true);
    
    const orgId = prompt('Enter organization ID:');
    const variantId = prompt('Enter variant ID:');
    
    if (!orgId || !variantId) {
      setTestLoading(testName, false);
      return;
    }
    
    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variant_id: variantId,
          organization_id: orgId,
          return_url: 'http://localhost:3000/debug/billing?checkout=success'
        })
      });
      
      const data = await response.json();
      
      logResult(testName, {
        success: response.ok,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logResult(testName, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setTestLoading(testName, false);
    }
  };

  // Database connection test
  const testDatabaseTables = async () => {
    const testName = 'database-tables';
    setTestLoading(testName, true);
    
    try {
      const response = await fetch('/api/debug/database');
      const data = await response.json();
      
      logResult(testName, {
        success: response.ok,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logResult(testName, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setTestLoading(testName, false);
    }
  };

  const renderResult = (testName: string) => {
    const result = results[testName];
    if (!result) return null;

    return (
      <div className={`mt-2 p-3 rounded-md text-sm ${
        result.success 
          ? 'bg-green-50 border border-green-200 text-green-800' 
          : 'bg-red-50 border border-red-200 text-red-800'
      }`}>
        <div className="font-medium">
          {result.success ? '✅ Success' : '❌ Failed'}
          <span className="ml-2 font-normal text-muted-foreground">
            {new Date(result.timestamp).toLocaleTimeString()}
          </span>
        </div>
        {result.error && (
          <div className="mt-1 font-mono text-red-600">
            Error: {result.error}
          </div>
        )}
        {result.data && (
          <details className="mt-2">
            <summary className="cursor-pointer font-medium">Response Data</summary>
            <pre className="mt-1 overflow-x-auto bg-gray-100 p-2 rounded text-xs">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Billing System Debug Panel</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
        <h3 className="font-medium text-yellow-800">⚠️ Debug Mode</h3>
        <p className="text-yellow-700 text-sm">
          This page is for testing the billing integration. Do not use in production.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Webhook Tests */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Webhook Tests</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Webhook Health Check</h3>
                  <p className="text-sm text-muted-foreground">Test if webhook endpoint is responding</p>
                </div>
                <button
                  onClick={testWebhookHealth}
                  disabled={loading['webhook-health']}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading['webhook-health'] ? 'Testing...' : 'Test Webhook'}
                </button>
              </div>
              {renderResult('webhook-health')}
            </div>
          </div>
        </section>

        {/* Database Tests */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Database Tests</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Database Tables</h3>
                  <p className="text-sm text-muted-foreground">Check if billing tables exist</p>
                </div>
                <button
                  onClick={testDatabaseTables}
                  disabled={loading['database-tables']}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading['database-tables'] ? 'Testing...' : 'Test Database'}
                </button>
              </div>
              {renderResult('database-tables')}
            </div>
          </div>
        </section>

        {/* API Endpoint Tests */}
        <section>
          <h2 className="text-xl font-semibold mb-4">API Endpoint Tests</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Products Endpoint</h3>
                  <p className="text-sm text-muted-foreground">Test product and variant retrieval</p>
                </div>
                <button
                  onClick={testProductsEndpoint}
                  disabled={loading['products-endpoint']}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading['products-endpoint'] ? 'Testing...' : 'Test Products'}
                </button>
              </div>
              {renderResult('products-endpoint')}
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Subscription Endpoint</h3>
                  <p className="text-sm text-muted-foreground">Test subscription retrieval (requires org ID)</p>
                </div>
                <button
                  onClick={testSubscriptionEndpoint}
                  disabled={loading['subscription-endpoint']}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading['subscription-endpoint'] ? 'Testing...' : 'Test Subscription'}
                </button>
              </div>
              {renderResult('subscription-endpoint')}
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Customer Portal</h3>
                  <p className="text-sm text-muted-foreground">Test customer portal URL generation</p>
                </div>
                <button
                  onClick={testCustomerPortal}
                  disabled={loading['customer-portal']}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading['customer-portal'] ? 'Testing...' : 'Test Portal'}
                </button>
              </div>
              {renderResult('customer-portal')}
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Checkout Creation</h3>
                  <p className="text-sm text-muted-foreground">Test checkout session creation (requires org + variant ID)</p>
                </div>
                <button
                  onClick={testCheckoutCreation}
                  disabled={loading['checkout-creation']}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {loading['checkout-creation'] ? 'Testing...' : 'Test Checkout'}
                </button>
              </div>
              {renderResult('checkout-creation')}
            </div>
          </div>
        </section>

        {/* Environment Info */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Environment Information</h2>
          <div className="border rounded-lg p-4 bg-gray-50">
            <pre className="text-sm">
              {`Current URL: ${typeof window !== 'undefined' ? window.location.href : 'Loading...'}
Environment: ${process.env.NODE_ENV || 'development'}
Webhook URL: ${typeof window !== 'undefined' ? window.location.origin + '/api/webhooks/lemonsqueezy' : 'Loading...'}
`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}