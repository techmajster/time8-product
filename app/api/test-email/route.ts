import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function GET(request: NextRequest) {
  try {
    // Simple test that doesn't require body
    const testEmail = 'test@example.com'
    
    console.log('🧪 Testing email configuration:', {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'MISSING',
      FROM_EMAIL: process.env.FROM_EMAIL,
    })

    return NextResponse.json({ 
      success: true,
      config: {
        hasResendKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.FROM_EMAIL,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('🧪 Test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    console.log('🧪 Testing email send with:', {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'MISSING',
      FROM_EMAIL: process.env.FROM_EMAIL,
      to: email
    })

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: 'Test Email from Vercel',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email sent from Vercel at ${new Date().toISOString()}</p>
        <p>Environment check:</p>
        <ul>
          <li>FROM_EMAIL: ${process.env.FROM_EMAIL}</li>
          <li>RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'SET' : 'MISSING'}</li>
        </ul>
      `
    })

    console.log('🧪 Resend result:', JSON.stringify(result, null, 2))

    if (result.error) {
      console.error('🧪 Resend error:', result.error)
      return NextResponse.json({ 
        success: false, 
        error: result.error.message,
        details: result.error 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      messageId: result.data?.id,
      result: result.data 
    })

  } catch (error) {
    console.error('🧪 Test email error:', error)
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 })
  }
}