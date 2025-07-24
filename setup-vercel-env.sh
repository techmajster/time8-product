#!/bin/bash

echo "Setting up Vercel environment variables for Time8..."

# Supabase Configuration (from MCP)
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://odbjrxsbgvmohdnvjjil.supabase.co"
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmpyeHNiZ3Ztb2hkbnZqamlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NTk2MjcsImV4cCI6MjA2NTAzNTYyN30.B-nQucvOunePfPqrt63Kbgws0v0sbfTQmPTbdyLumyc"
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kYmpyeHNiZ3Ztb2hkbnZqamlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTQ1OTYyNywiZXhwIjoyMDY1MDM1NjI3fQ.eXLCYlC8GlJhIV9fdieueX6PDi4DacPlNK4pWn8o6kA"

# App Configuration  
npx vercel env add NEXT_PUBLIC_APP_URL production <<< "https://app.time8.io"

# JWT Secret for email verification
npx vercel env add JWT_SECRET production <<< "a8cb1cc2262765c8c0847dcda87a1985c53f59b10872a50448f5035b6af9a86bc32777fbb8bb8363e4910e1dc8aab186bba700bd0ec794eeab35dd8f22941130"

# Email Configuration (Time8) - using your current values
npx vercel env add RESEND_API_KEY production <<< "re_ZyHwiT8f_32aJ37uYjF8rbW4PBSLVfLVk"
npx vercel env add FROM_EMAIL production <<< "onboarding@time8.io"
npx vercel env add BRAND_EMAIL production <<< "noreply@time8.io"
npx vercel env add NOTIFICATION_EMAIL production <<< "notifications@time8.io"

echo "✅ Supabase environment variables configured!"
echo "📧 Please add your Resend API key manually in Vercel dashboard" 