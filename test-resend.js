const { Resend } = require('resend');

const resend = new Resend('re_ZyHwiT8f_32aJ37uYjF8rbW4PBSLVfLVk');

async function testEmail() {
  try {
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'admin@bb8.pl',
      subject: 'Test Email from Resend',
      html: '<h1>Test Email</h1><p>This is a test email to verify Resend is working correctly.</p>',
    });

    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

testEmail(); 