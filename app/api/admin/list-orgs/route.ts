import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET() {
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

  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name, created_at')
    .order('created_at');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ organizations: orgs });
}
