import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { cookies } from 'next/headers';
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { LeaveRequestProvider } from "@/components/providers/LeaveRequestProvider";
import { GlobalLeaveRequestSheet } from "@/components/GlobalLeaveRequestSheet";

// Force dynamic rendering due to cookie usage for internationalization
export const dynamic = 'force-dynamic';

// Import translation messages statically
import plMessages from '@/messages/pl.json';
import enMessages from '@/messages/en.json';

type Locale = 'pl' | 'en';

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "System Zarządzania Urlopami",
  description: "Uspraw zarządzanie urlopami w swojej organizacji dzięki naszemu kompleksowemu rozwiązaniu SaaS",
};

// Safe cookie-only locale detection to avoid OAuth interference
async function getLayoutLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('locale')?.value as Locale;
    
    if (cookieLocale === 'pl' || cookieLocale === 'en') {
      return cookieLocale;
    }
  } catch (error) {
    // If cookies fail, use default
    console.log('Layout cookie locale detection failed, using default:', error);
  }
  
  return 'pl'; // Default to Polish
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLayoutLocale();
  const messages = locale === 'pl' ? plMessages : enMessages;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable}`}>
        <QueryProvider>
          <ThemeProvider>
            <LeaveRequestProvider>
              <NextIntlClientProvider 
                locale={locale} 
                messages={messages}
                >
                  {children}
                  <Toaster />
                  <GlobalLeaveRequestSheet />
              </NextIntlClientProvider>
            </LeaveRequestProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
