import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'

function hslStringToValues(hslString: string): string {
  // Extract the values from hsl() string and convert to space-separated format
  const matches = hslString.match(/hsl\(([^)]+)\)/)
  if (matches) {
    // Convert comma-separated to space-separated format for modern CSS
    return matches[1].replace(/,\s*/g, ' ')
  }
  return hslString
}

function generateCSSVariables(tokens: any): string {
  // Handle both old and new format
  let lightColors: Record<string, string>;
  let darkColors: Record<string, string>;
  
  if (tokens.colors.semantic.light && tokens.colors.semantic.dark) {
    // New format with light/dark separation
    lightColors = tokens.colors.semantic.light;
    darkColors = tokens.colors.semantic.dark;
  } else {
    // Old format - use semantic as light colors and generate dark variants
    lightColors = tokens.colors.semantic;
    // For now, use the light colors for dark mode too (can be enhanced later)
    darkColors = tokens.colors.semantic;
  }
  
  // Generate the replacement for the @layer base :root section
  return `@layer base {
  :root {
    --background: ${hslStringToValues(lightColors.background)};
    --foreground: var(--text-primary);
    --card: ${hslStringToValues(lightColors.background)};
    --card-foreground: var(--text-primary);
    --popover: ${hslStringToValues(lightColors.background)};
    --popover-foreground: var(--text-primary);
    --primary: ${hslStringToValues(lightColors.primary)};
    --primary-foreground: ${hslStringToValues(lightColors['primary-foreground'])};
    --secondary: ${hslStringToValues(lightColors.secondary)};
    --secondary-foreground: var(--text-secondary);
    --muted: ${hslStringToValues(lightColors.muted)};
    --muted-foreground: var(--text-tertiary);
    --accent: ${hslStringToValues(lightColors.accent)};
    --accent-foreground: var(--text-secondary);
    --destructive: ${hslStringToValues(lightColors.destructive)};
    --destructive-foreground: ${hslStringToValues(lightColors['destructive-foreground'])};
    --border: ${hslStringToValues(lightColors.border)};
    --input: ${hslStringToValues(lightColors.input)};
    --input-border: ${hslStringToValues(lightColors['input-border'] || lightColors.border)};
    --ring: ${hslStringToValues(lightColors.ring)};
    --chart-1: ${hslStringToValues(lightColors.primary)};
    --chart-2: 270 75% 55%;
    --chart-3: 273 65% 50%;
    --chart-4: 276 55% 45%;
    --chart-5: 279 45% 40%;
    --sidebar: 240 5% 96%;
    --sidebar-foreground: var(--text-primary);
    --sidebar-primary: ${hslStringToValues(lightColors.primary)};
    --sidebar-primary-foreground: ${hslStringToValues(lightColors['primary-foreground'])};
    --sidebar-accent: ${hslStringToValues(lightColors.accent)};
    --sidebar-accent-foreground: var(--text-secondary);
    --sidebar-border: ${hslStringToValues(lightColors.border)};
    --sidebar-ring: ${hslStringToValues(lightColors.ring)};
    --radius: ${tokens.borderRadius?.lg ? tokens.borderRadius.lg / 16 : 0.5}rem;

    /* Semantic colors for status states */
    --success: ${hslStringToValues(lightColors.success)};
    --success-foreground: ${hslStringToValues(lightColors['success-foreground'])};
    --warning: ${hslStringToValues(lightColors.warning)};
    --warning-foreground: ${hslStringToValues(lightColors['warning-foreground'])};
    --info: ${hslStringToValues(lightColors.info)};
    --info-foreground: ${hslStringToValues(lightColors['info-foreground'])};
    --sidebar-background: 0 0% 98%;
    
    /* Typography color tokens */
    --text-primary: ${hslStringToValues(lightColors['text-primary'] || lightColors.foreground)};
    --text-secondary: ${hslStringToValues(lightColors['text-secondary'] || lightColors['secondary-foreground'])};
    --text-tertiary: ${hslStringToValues(lightColors['text-tertiary'] || lightColors['muted-foreground'])};
    --text-disabled: ${hslStringToValues(lightColors['text-disabled'] || '240 3% 70%')};
    --text-inverse: ${hslStringToValues(lightColors['text-inverse'] || lightColors.background)};
    --text-link: ${hslStringToValues(lightColors['text-link'] || lightColors.primary)};
    --text-link-hover: ${hslStringToValues(lightColors['text-link-hover'] || lightColors.primary)};
    --text-placeholder: ${hslStringToValues(lightColors['text-placeholder'] || lightColors['muted-foreground'])};
    --heading-primary: ${hslStringToValues(lightColors['heading-primary'] || lightColors.foreground)};
    --heading-secondary: ${hslStringToValues(lightColors['heading-secondary'] || lightColors['secondary-foreground'])};
    
    --font-sans: Inter, sans-serif;
    --font-serif: Merriweather, serif;
    --font-mono: JetBrains Mono, monospace;
    --shadow-color: hsl(0 0% 0%);
    --shadow-opacity: 0.1;
    --shadow-blur: 8px;
    --shadow-spread: -1px;
    --shadow-offset-x: 0px;
    --shadow-offset-y: 4px;
    --letter-spacing: 0em;
    --spacing: 0.25rem;
    --shadow-2xs: 0px 4px 8px -1px hsl(0 0% 0% / 0.05);
    --shadow-xs: 0px 4px 8px -1px hsl(0 0% 0% / 0.05);
    --shadow-sm: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -2px hsl(0 0% 0% / 0.10);
    --shadow: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -2px hsl(0 0% 0% / 0.10);
    --shadow-md: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 2px 4px -2px hsl(0 0% 0% / 0.10);
    --shadow-lg: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 4px 6px -2px hsl(0 0% 0% / 0.10);
    --shadow-xl: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 8px 10px -2px hsl(0 0% 0% / 0.10);
    --shadow-2xl: 0px 4px 8px -1px hsl(0 0% 0% / 0.25);
    --tracking-normal: 0em;
  }

  .dark {
    --background: ${hslStringToValues(darkColors.background)};
    --foreground: var(--text-primary);
    --card: ${hslStringToValues(darkColors.background)};
    --card-foreground: var(--text-primary);
    --popover: ${hslStringToValues(darkColors.background)};
    --popover-foreground: var(--text-primary);
    --primary: ${hslStringToValues(darkColors.primary)};
    --primary-foreground: ${hslStringToValues(darkColors['primary-foreground'])};
    --secondary: ${hslStringToValues(darkColors.secondary)};
    --secondary-foreground: var(--text-secondary);
    --muted: ${hslStringToValues(darkColors.muted)};
    --muted-foreground: var(--text-tertiary);
    --accent: ${hslStringToValues(darkColors.accent)};
    --accent-foreground: var(--text-secondary);
    --destructive: ${hslStringToValues(darkColors.destructive)};
    --destructive-foreground: ${hslStringToValues(darkColors['destructive-foreground'])};
    --border: ${hslStringToValues(darkColors.border)};
    --input: ${hslStringToValues(darkColors.input)};
    --input-border: ${hslStringToValues(darkColors['input-border'] || darkColors.border)};
    --ring: ${hslStringToValues(darkColors.ring)};
    --chart-1: ${hslStringToValues(darkColors.primary)};
    --chart-2: 267 85% 60%;
    --chart-3: 270 75% 55%;
    --chart-4: 273 65% 50%;
    --chart-5: 276 55% 45%;
    --sidebar: ${hslStringToValues(darkColors.background)};
    --sidebar-foreground: var(--text-primary);
    --sidebar-primary: ${hslStringToValues(darkColors.primary)};
    --sidebar-primary-foreground: ${hslStringToValues(darkColors['primary-foreground'])};
    --sidebar-accent: ${hslStringToValues(darkColors.accent)};
    --sidebar-accent-foreground: var(--text-secondary);
    --sidebar-border: ${hslStringToValues(darkColors.border)};
    --sidebar-ring: ${hslStringToValues(darkColors.ring)};
    --radius: ${tokens.borderRadius?.lg ? tokens.borderRadius.lg / 16 : 0.5}rem;

    /* Semantic colors for status states (dark mode) */
    --success: ${hslStringToValues(darkColors.success)};
    --success-foreground: ${hslStringToValues(darkColors['success-foreground'])};
    --warning: ${hslStringToValues(darkColors.warning)};
    --warning-foreground: ${hslStringToValues(darkColors['warning-foreground'])};
    --info: ${hslStringToValues(darkColors.info)};
    --info-foreground: ${hslStringToValues(darkColors['info-foreground'])};
    --sidebar-background: ${hslStringToValues(darkColors.background)};
    
    /* Typography color tokens (dark mode) */
    --text-primary: ${hslStringToValues(darkColors['text-primary'] || darkColors.foreground)};
    --text-secondary: ${hslStringToValues(darkColors['text-secondary'] || darkColors['secondary-foreground'])};
    --text-tertiary: ${hslStringToValues(darkColors['text-tertiary'] || darkColors['muted-foreground'])};
    --text-disabled: ${hslStringToValues(darkColors['text-disabled'] || '240 4% 40%')};
    --text-inverse: ${hslStringToValues(darkColors['text-inverse'] || darkColors.background)};
    --text-link: ${hslStringToValues(darkColors['text-link'] || darkColors.primary)};
    --text-link-hover: ${hslStringToValues(darkColors['text-link-hover'] || darkColors.primary)};
    --text-placeholder: ${hslStringToValues(darkColors['text-placeholder'] || darkColors['muted-foreground'])};
    --heading-primary: ${hslStringToValues(darkColors['heading-primary'] || darkColors.foreground)};
    --heading-secondary: ${hslStringToValues(darkColors['heading-secondary'] || darkColors['secondary-foreground'])};
    
    --font-sans: Inter, sans-serif;
    --font-serif: Merriweather, serif;
    --font-mono: JetBrains Mono, monospace;
    --shadow-color: hsl(0 0% 0%);
    --shadow-opacity: 0.1;
    --shadow-blur: 8px;
    --shadow-spread: -1px;
    --shadow-offset-x: 0px;
    --shadow-offset-y: 4px;
    --letter-spacing: 0em;
    --spacing: 0.25rem;
    --shadow-2xs: 0px 4px 8px -1px hsl(0 0% 0% / 0.05);
    --shadow-xs: 0px 4px 8px -1px hsl(0 0% 0% / 0.05);
    --shadow-sm: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -2px hsl(0 0% 0% / 0.10);
    --shadow: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -2px hsl(0 0% 0% / 0.10);
    --shadow-md: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 2px 4px -2px hsl(0 0% 0% / 0.10);
    --shadow-lg: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 4px 6px -2px hsl(0 0% 0% / 0.10);
    --shadow-xl: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 8px 10px -2px hsl(0 0% 0% / 0.10);
    --shadow-2xl: 0px 4px 8px -1px hsl(0 0% 0% / 0.25);
  }
}`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get user and organization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const { themeId } = await request.json()

    if (!themeId) {
      return NextResponse.json({ error: 'Theme ID is required' }, { status: 400 })
    }

    // Get the theme data
    const { data: theme, error: themeError } = await supabase
      .from('design_themes')
      .select('*')
      .eq('id', themeId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (themeError || !theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
    }

    // Generate CSS variables
    const cssVariables = generateCSSVariables(theme.theme_data)
    
    // Update globals.css file
    try {
      const globalsPath = join(process.cwd(), 'app', 'globals.css')
      
      // Read current globals.css
      const fs = require('fs')
      let currentCSS = ''
      try {
        currentCSS = fs.readFileSync(globalsPath, 'utf8')
      } catch (error) {
        console.log('Creating new globals.css file')
      }
      
      // Replace the @layer base section
      const layerStartPattern = /@layer base\s*\{/
      const layerEndPattern = /^\s*\}\s*$/m
      
      let newCSS = currentCSS
      
      // Find the @layer base section
      const layerStartMatch = currentCSS.match(layerStartPattern)
      if (layerStartMatch) {
        const startIndex = layerStartMatch.index!
        
        // Find the matching closing brace for @layer base
        let braceCount = 0
        let endIndex = -1
        let inLayerBlock = false
        
        for (let i = startIndex; i < currentCSS.length; i++) {
          const char = currentCSS[i]
          if (char === '{') {
            braceCount++
            if (braceCount === 1) inLayerBlock = true
          } else if (char === '}') {
            braceCount--
            if (braceCount === 0 && inLayerBlock) {
              endIndex = i + 1
              break
            }
          }
        }
        
        if (endIndex !== -1) {
          // Replace the entire @layer base section
          newCSS = currentCSS.substring(0, startIndex) + 
                   cssVariables + 
                   currentCSS.substring(endIndex)
        } else {
          // If we can't find the end, append at the end
          newCSS = currentCSS + '\n\n' + cssVariables
        }
      } else {
        // No @layer base found, append at the end
        newCSS = currentCSS + '\n\n' + cssVariables
      }
      
      // Write back to file
      await writeFile(globalsPath, newCSS, 'utf8')
      
      console.log('Successfully updated globals.css with new theme')
    } catch (fileError) {
      console.error('Error updating CSS file:', fileError)
      return NextResponse.json({ 
        error: 'Failed to update CSS file. Theme saved but not applied globally.' 
      }, { status: 500 })
    }

    // Update database: unset all defaults, then set this one as default
    await supabase
      .from('design_themes')
      .update({ is_default: false })
      .eq('organization_id', profile.organization_id)

    const { error: updateError } = await supabase
      .from('design_themes')
      .update({ is_default: true })
      .eq('id', themeId)
      .eq('organization_id', profile.organization_id)

    if (updateError) {
      console.error('Database error:', updateError)
      return NextResponse.json({ error: 'Failed to set theme as default' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Theme applied globally and set as default' 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 