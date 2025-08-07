import { createAdminClient } from '@/lib/supabase/server'
import { DatabaseQueryAnalyzer } from '@/lib/performance/query-analyzer'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Verify admin access (you may want to add proper auth here)
    const supabase = createAdminClient()
    
    const analyzer = new DatabaseQueryAnalyzer()
    const analysis = await analyzer.analyzePerformance()
    
    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Database analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze database performance' },
      { status: 500 }
    )
  }
}