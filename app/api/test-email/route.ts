import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const testEmail = url.searchParams.get('email')
    
    if (!testEmail) {
      return NextResponse.json({ 
        success: true,
        config: {
          hasResendKey: !!process.env.RESEND_API_KEY,
          fromEmail: process.env.FROM_EMAIL,
          timestamp: new Date().toISOString(),
          message: 'Add ?email=your-email@domain.com to test actual email sending'
        }
      })
    }

    // Test actual email sending
    console.log('🧪 Testing actual email send to:', testEmail)
    
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@time8.io',
      to: testEmail,
      subject: 'Test Email from Vercel - Invitation System Debug',
      html: `
        <h1>Email Test Successful!</h1>
        <p>This email was sent from Vercel at ${new Date().toISOString()}</p>
        <p>Your invitation system email configuration is working properly.</p>
        <ul>
          <li>FROM_EMAIL: ${process.env.FROM_EMAIL}</li>
          <li>Resend API: Connected ✅</li>
          <li>Domain: time8.io verified ✅</li>
        </ul>
      `
    })

    console.log('🧪 Email send result:', JSON.stringify(result, null, 2))

    if (result.error) {
      return NextResponse.json({ 
        success: false, 
        error: result.error.message,
        details: result.error 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      emailSent: true,
      messageId: result.data?.id,
      to: testEmail,
      timestamp: new Date().toISOString()
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