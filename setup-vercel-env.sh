#!/bin/bash

echo "Setting up Vercel environment variables for Time8..."

# Supabase Configuration (from MCP)
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://odbjrxsbgvmohdnvjjil.supabase.co"
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmpyeHNiZ3Ztb2hkbnZqamlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NTk2MjcsImV4cCI6MjA2NTAzNTYyN30.B-nQucvOunePfPqrt63Kbgws0v0sbfTQmPTbdyLumyc"

# App Configuration  
npx vercel env add NEXT_PUBLIC_APP_URL production <<< "https://app.time8.io"

# Email Configuration (Time8)
echo "Please add your email environment variables manually:"
echo "RESEND_API_KEY=your_resend_api_key"
echo "FROM_EMAIL=onboarding@resend.dev"
echo "BRAND_EMAIL=noreply@time8.io"
echo "NOTIFICATION_EMAIL=notifications@time8.io"

echo "✅ Supabase environment variables configured!"
echo "📧 Please add your Resend API key manually in Vercel dashboard" 