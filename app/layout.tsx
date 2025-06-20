import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getUserLocale } from '@/lib/i18n-utils';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "System Zarządzania Urlopami",
  description: "Uspraw zarządzanie urlopami w swojej organizacji dzięki naszemu kompleksowemu rozwiązaniu SaaS",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get the user's preferred locale
  const locale = await getUserLocale();
  
  // Get messages for the detected locale
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
