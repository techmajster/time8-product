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
  const colors = tokens.colors.semantic
  
  // Generate the replacement for the @layer base :root section
  return `@layer base {
  :root {
    --background: ${hslStringToValues(colors.background)};
    --foreground: ${hslStringToValues(colors.foreground)};
    --card: ${hslStringToValues(colors.background)};
    --card-foreground: ${hslStringToValues(colors.foreground)};
    --popover: ${hslStringToValues(colors.background)};
    --popover-foreground: ${hslStringToValues(colors.foreground)};
    --primary: ${hslStringToValues(colors.primary)};
    --primary-foreground: ${hslStringToValues(colors['primary-foreground'])};
    --secondary: ${hslStringToValues(colors.secondary)};
    --secondary-foreground: ${hslStringToValues(colors['secondary-foreground'])};
    --muted: ${hslStringToValues(colors.muted)};
    --muted-foreground: ${hslStringToValues(colors['muted-foreground'])};
    --accent: ${hslStringToValues(colors.accent)};
    --accent-foreground: ${hslStringToValues(colors['accent-foreground'])};
    --destructive: ${hslStringToValues(colors.destructive)};
    --destructive-foreground: ${hslStringToValues(colors['destructive-foreground'])};
    --border: ${hslStringToValues(colors.border)};
    --input: ${hslStringToValues(colors.input)};
    --ring: ${hslStringToValues(colors.ring)};
    --chart-1: ${hslStringToValues(colors.primary)};
    --chart-2: 270 75% 55%;
    --chart-3: 273 65% 50%;
    --chart-4: 276 55% 45%;
    --chart-5: 279 45% 40%;
    --sidebar: 240 5% 96%;
    --sidebar-foreground: ${hslStringToValues(colors.foreground)};
    --sidebar-primary: ${hslStringToValues(colors.primary)};
    --sidebar-primary-foreground: ${hslStringToValues(colors['primary-foreground'])};
    --sidebar-accent: ${hslStringToValues(colors.accent)};
    --sidebar-accent-foreground: ${hslStringToValues(colors['accent-foreground'])};
    --sidebar-border: ${hslStringToValues(colors.border)};
    --sidebar-ring: ${hslStringToValues(colors.ring)};
    --radius: ${tokens.borderRadius?.lg ? tokens.borderRadius.lg / 16 : 0.5}rem;

    /* Semantic colors for status states */
    --success: ${hslStringToValues(colors.success)};
    --success-foreground: ${hslStringToValues(colors['success-foreground'])};
    --warning: ${hslStringToValues(colors.warning)};
    --warning-foreground: ${hslStringToValues(colors['warning-foreground'])};
    --info: ${hslStringToValues(colors.info)};
    --info-foreground: ${hslStringToValues(colors['info-foreground'])};
    --sidebar-background: 0 0% 98%;
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
    --background: 240 10% 18%;
    --foreground: 240 5% 92%;
    --card: 240 10% 25%;
    --card-foreground: 240 5% 92%;
    --popover: 240 10% 25%;
    --popover-foreground: 240 5% 92%;
    --primary: ${hslStringToValues(colors.primary)};
    --primary-foreground: 240 10% 18%;
    --secondary: 240 8% 30%;
    --secondary-foreground: 240 5% 85%;
    --muted: 240 10% 25%;
    --muted-foreground: 240 5% 70%;
    --accent: 240 8% 35%;
    --accent-foreground: 240 5% 85%;
    --destructive: ${hslStringToValues(colors.destructive)};
    --destructive-foreground: 240 10% 18%;
    --border: 240 8% 42%;
    --input: 240 8% 42%;
    --ring: ${hslStringToValues(colors.ring)};
    --chart-1: ${hslStringToValues(colors.primary)};
    --chart-2: 267 85% 60%;
    --chart-3: 270 75% 55%;
    --chart-4: 273 65% 50%;
    --chart-5: 276 55% 45%;
    --sidebar: 240 10% 25%;
    --sidebar-foreground: 240 5% 92%;
    --sidebar-primary: ${hslStringToValues(colors.primary)};
    --sidebar-primary-foreground: 240 10% 18%;
    --sidebar-accent: 240 8% 35%;
    --sidebar-accent-foreground: 240 5% 85%;
    --sidebar-border: 240 8% 42%;
    --sidebar-ring: ${hslStringToValues(colors.ring)};
    --radius: ${tokens.borderRadius?.lg ? tokens.borderRadius.lg / 16 : 0.5}rem;

    /* Semantic colors for status states (dark mode) */
    --success: ${hslStringToValues(colors.success)};
    --success-foreground: 145 80% 10%;
    --warning: ${hslStringToValues(colors.warning)};
    --warning-foreground: 26 83% 14%;
    --info: ${hslStringToValues(colors.info)};
    --info-foreground: 0 0% 100%;
    --sidebar-background: 240 5.9% 10%;
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