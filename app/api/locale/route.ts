import { NextRequest, NextResponse } from 'next/server';
import { setUserLocale, isValidLocale } from '@/lib/i18n-utils';

export async function POST(request: NextRequest) {
  try {
    const { locale } = await request.json();

    if (!locale || !isValidLocale(locale)) {
      return NextResponse.json(
        { error: 'Invalid locale provided' },
        { status: 400 }
      );
    }

    const result = await setUserLocale(locale);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to update locale' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in locale API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 