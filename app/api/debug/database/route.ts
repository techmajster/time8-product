/**
 * Database Debug Endpoint
 * 
 * Checks database connectivity and billing table structure.
 * Only available in development mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoints not available in production' },
      { status: 404 }
    );
  }
    try {
      const supabase = createClient();
      const results: any = {
        timestamp: new Date().toISOString(),
        database_connection: 'unknown',
        tables: {},
        environment_variables: {},
        sample_data: {}
      };

      // Check environment variables
      results.environment_variables = {
        LEMONSQUEEZY_API_KEY: process.env.LEMONSQUEEZY_API_KEY ? 'Set' : 'Missing',
        LEMONSQUEEZY_STORE_ID: process.env.LEMONSQUEEZY_STORE_ID ? 'Set' : 'Missing',
        LEMONSQUEEZY_WEBHOOK_SECRET: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ? 'Set' : 'Missing',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
      };

      // Test basic database connection
      try {
        const { data: connectionTest, error: connectionError } = await supabase
          .from('organizations')
          .select('count')
          .limit(1);

        if (connectionError) {
          results.database_connection = `Error: ${connectionError.message}`;
        } else {
          results.database_connection = 'Connected';
        }
      } catch (error) {
        results.database_connection = `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Check each billing table
      const billingTables = [
        'products',
        'price_variants', 
        'customers',
        'subscriptions',
        'billing_events'
      ];

      for (const tableName of billingTables) {
        try {
          const { data, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact' })
            .limit(1);

          if (error) {
            results.tables[tableName] = {
              exists: false,
              error: error.message,
              count: 0
            };
          } else {
            results.tables[tableName] = {
              exists: true,
              count: count || 0,
              sample_columns: data && data.length > 0 ? Object.keys(data[0]) : []
            };

            // Store sample data (first record only, excluding sensitive info)
            if (data && data.length > 0) {
              const sampleRecord = { ...data[0] };
              // Remove potentially sensitive fields
              delete sampleRecord.lemonsqueezy_api_key;
              delete sampleRecord.webhook_secret;
              results.sample_data[tableName] = sampleRecord;
            }
          }
        } catch (error) {
          results.tables[tableName] = {
            exists: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            count: 0
          };
        }
      }

      // Check organizations table for billing columns
      try {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, paid_seats, billing_override_seats, billing_override_expires_at')
          .limit(1);

        if (orgError) {
          results.tables.organizations_billing = {
            exists: false,
            error: orgError.message
          };
        } else {
          results.tables.organizations_billing = {
            exists: true,
            billing_columns_present: orgData && orgData.length > 0 ? 
              ['paid_seats', 'billing_override_seats', 'billing_override_expires_at'].every(
                col => col in orgData[0]
              ) : false,
            sample_data: orgData && orgData.length > 0 ? orgData[0] : null
          };
        }
      } catch (error) {
        results.tables.organizations_billing = {
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Test Lemon Squeezy API connection
      try {
        const { lemonSqueezySetup, listProducts } = await import('@lemonsqueezy/lemonsqueezy.js');
        
        lemonSqueezySetup({
          apiKey: process.env.LEMONSQUEEZY_API_KEY!,
        });

        if (process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID) {
          const products = await listProducts({
            filter: { storeId: process.env.LEMONSQUEEZY_STORE_ID }
          });

          results.lemon_squeezy_api = {
            connection: products.error ? 'Failed' : 'Connected',
            error: products.error?.message,
            products_found: products.data?.length || 0
          };
        } else {
          results.lemon_squeezy_api = {
            connection: 'Not configured',
            error: 'Missing API key or store ID'
          };
        }
      } catch (error) {
        results.lemon_squeezy_api = {
          connection: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      return NextResponse.json({
        success: true,
        debug_info: results
      });

    } catch (error) {
      console.error('Debug endpoint error:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
}

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export const PUT = POST;
export const DELETE = POST;
export const PATCH = POST;