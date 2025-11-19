import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST() {
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log('🔄 Starting migration: Remove customer organization unique constraint');

    // Step 1: Drop composite foreign key constraint
    const { error: fkError } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE subscriptions
        DROP CONSTRAINT IF EXISTS subscriptions_customer_organization_match;
      `
    });

    if (fkError) {
      console.error('❌ Error dropping FK constraint:', fkError);
      return NextResponse.json({
        error: 'Failed to drop foreign key constraint',
        details: fkError
      }, { status: 500 });
    }
    console.log('✅ Dropped subscriptions_customer_organization_match constraint');

    // Step 2: Drop UNIQUE constraint on customers.organization_id
    const { error: uniqueError } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE customers
        DROP CONSTRAINT IF EXISTS customers_organization_id_key;
      `
    });

    if (uniqueError) {
      console.error('❌ Error dropping UNIQUE constraint:', uniqueError);
      return NextResponse.json({
        error: 'Failed to drop unique constraint',
        details: uniqueError
      }, { status: 500 });
    }
    console.log('✅ Dropped customers_organization_id_key constraint');

    // Step 3: Make organization_id nullable
    const { error: nullError } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE customers
        ALTER COLUMN organization_id DROP NOT NULL;
      `
    });

    if (nullError) {
      console.error('❌ Error making organization_id nullable:', nullError);
      return NextResponse.json({
        error: 'Failed to make organization_id nullable',
        details: nullError
      }, { status: 500 });
    }
    console.log('✅ Made customers.organization_id nullable');

    console.log('✅ Migration completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      steps: [
        'Dropped subscriptions_customer_organization_match constraint',
        'Dropped customers_organization_id_key constraint',
        'Made customers.organization_id nullable'
      ]
    });
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error.message
    }, { status: 500 });
  }
}
