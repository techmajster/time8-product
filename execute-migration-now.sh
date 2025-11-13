#!/bin/bash

# Load environment variables
source .env.local

# SQL statements to execute
SQL1="ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_type_check;"

SQL2="ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billing_type_check CHECK (billing_type IN ('volume', 'usage_based', 'quantity_based'));"

SQL3="COMMENT ON COLUMN subscriptions.billing_type IS 'Billing model: - \"volume\": Legacy subscriptions (pre-usage-based billing, to be cleaned up) - \"usage_based\": Monthly subscriptions using Usage Records API (pay at end of period) - \"quantity_based\": Yearly subscriptions using quantity updates with immediate proration (pay upfront) Determines which billing logic to apply when adding/removing seats.';"

echo "🚀 Executing migration via Supabase REST API..."
echo ""

# Execute SQL via the PostgREST /rpc endpoint (if you have a custom function)
# Or use psql if available

# Try with psql if available
if command -v psql &> /dev/null; then
    echo "📊 Using psql..."

    # Get database connection details
    DB_HOST=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co||').supabase.co
    DB_PORT=5432

    # Execute migrations
    echo "$SQL1" | psql "postgresql://postgres:$SUPABASE_DB_PASSWORD@db.$DB_HOST:$DB_PORT/postgres" 2>&1
    echo "$SQL2" | psql "postgresql://postgres:$SUPABASE_DB_PASSWORD@db.$DB_HOST:$DB_PORT/postgres" 2>&1
    echo "$SQL3" | psql "postgresql://postgres:$SUPABASE_DB_PASSWORD@db.$DB_HOST:$DB_PORT/postgres" 2>&1

    echo ""
    echo "✅ Migration executed!"
else
    echo "❌ psql not found. Please run the SQL manually in Supabase dashboard."
    echo ""
    echo "Copy this file: migration-to-run-in-dashboard.sql"
    echo "And run it in: https://supabase.com/dashboard/project/odbjrxsbgvmohdnvjjil/sql/new"
fi
