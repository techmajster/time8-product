import { NextRequest, NextResponse } from 'next/server';
import { isValidLocale } from '@/lib/i18n-utils';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { locale } = await request.json();

    if (!locale || !isValidLocale(locale)) {
      return NextResponse.json(
        { error: 'Invalid locale provided' },
        { status: 400 }
      );
    }

    // Create response
    const response = NextResponse.json({ success: true });

    // Set cookie in response
    response.cookies.set('locale', locale, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    // Update database if user is authenticated
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user_settings exists
        const { data: existingSettings } = await supabase
          .from('user_settings')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingSettings) {
          // Update existing
          await supabase
            .from('user_settings')
            .update({ locale, language: locale })
            .eq('user_id', user.id);
        } else {
          // Create new
          await supabase
            .from('user_settings')
            .insert({
              user_id: user.id,
              locale,
              language: locale,
            });
        }
      }
    } catch (dbError) {
      // Database update failed, but cookie is set, so still return success
      console.error('Failed to update database locale:', dbError);
    }

    return response;
  } catch (error) {
    console.error('Error in locale API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 