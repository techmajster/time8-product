'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Save, 
  FolderOpen, 
  Star, 
  Trash2, 
  Plus,
  Settings,
  Eye,
  Download,
  Upload,
  Check,
  FileText,
  Palette
  } from 'lucide-react';
  import { toast } from 'sonner';
  import { Alert, AlertDescription } from '@/components/ui/alert';
  import { Separator } from '@/components/ui/separator';

interface DesignSystemTokens {
  colors: {
    semantic: {
      background: string
      foreground: string
      primary: string
      'primary-foreground': string
      secondary: string
      'secondary-foreground': string
      muted: string
      'muted-foreground': string
      accent: string
      'accent-foreground': string
      destructive: string
      'destructive-foreground': string
      success: string
      'success-foreground': string
      warning: string
      'warning-foreground': string
      info: string
      'info-foreground': string
      border: string
      input: string
      ring: string
    } | {
      light: {
        background: string
        foreground: string
        primary: string
        'primary-foreground': string
        secondary: string
        'secondary-foreground': string
        muted: string
        'muted-foreground': string
        accent: string
        'accent-foreground': string
        destructive: string
        'destructive-foreground': string
        success: string
        'success-foreground': string
        warning: string
        'warning-foreground': string
        info: string
        'info-foreground': string
        border: string
        input: string
        ring: string
      }
      dark: {
        background: string
        foreground: string
        primary: string
        'primary-foreground': string
        secondary: string
        'secondary-foreground': string
        muted: string
        'muted-foreground': string
        accent: string
        'accent-foreground': string
        destructive: string
        'destructive-foreground': string
        success: string
        'success-foreground': string
        warning: string
        'warning-foreground': string
        info: string
        'info-foreground': string
        border: string
        input: string
        ring: string
      }
    }
  }
  borderRadius: {
    sm: number
    md: number
    lg: number
    xl: number
  }
  spacing: {
    xs: number
    sm: number
    md: number
    lg: number
    xl: number
  }
  typography: {
    fontSize: {
      xs: number
      sm: number
      base: number
      lg: number
      xl: number
    }
    lineHeight: {
      tight: number
      normal: number
      relaxed: number
    }
  }
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
}

interface SavedTheme {
  id: string
  name: string
  description?: string
  tokens: DesignSystemTokens
  createdAt: string
  updatedAt: string
  isDefault?: boolean
}

interface ThemeManagerProps {
  currentTokens: DesignSystemTokens
  onApplyTheme: (tokens: DesignSystemTokens, themeId?: string) => void
}

export function ThemeManager({ currentTokens, onApplyTheme }: ThemeManagerProps) {
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([])
  const [loading, setLoading] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadDialogOpen, setLoadDialogOpen] = useState(false)
  const [themeName, setThemeName] = useState('')
  const [themeDescription, setThemeDescription] = useState('')

  // Load saved themes on component mount
  useEffect(() => {
    loadSavedThemes()
  }, [])

  const loadSavedThemes = async () => {
    try {
      const response = await fetch('/api/themes')
      if (response.ok) {
        const data = await response.json()
        // Handle new API format with themes array
        const themes = data.themes || data || []
        // Validate that themes is an array and filter out invalid themes
        if (Array.isArray(themes)) {
          const validThemes = themes.filter(theme => 
            theme && 
            theme.id && 
            theme.name && 
            theme.tokens &&
            theme.tokens.colors &&
            theme.tokens.colors.semantic
          )
          setSavedThemes(validThemes)
        } else {
          console.warn('Invalid themes data received:', data)
          setSavedThemes([])
        }
      } else {
        console.error('Failed to fetch themes:', response.status)
        setSavedThemes([])
      }
    } catch (error) {
      console.error('Failed to load themes:', error)
      setSavedThemes([])
    }
  }

  const saveTheme = async () => {
    if (!themeName.trim()) {
      toast.error('Please enter a theme name')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: themeName.trim(),
          description: themeDescription.trim() || undefined,
          tokens: currentTokens
        })
      })

      if (response.ok) {
        const savedTheme = await response.json()
        setSavedThemes(prev => [...prev, savedTheme])
        setThemeName('')
        setThemeDescription('')
        setSaveDialogOpen(false)
        toast.success('Theme saved successfully!')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to save theme')
      }
    } catch (error) {
      toast.error('Failed to save theme')
    } finally {
      setLoading(false)
    }
  }

  const loadTheme = async (theme: SavedTheme) => {
    await onApplyTheme(theme.tokens, theme.id)
    setLoadDialogOpen(false)
    
    // Update the default flag in local state
    setSavedThemes(prev => prev.map(t => ({
      ...t,
      isDefault: t.id === theme.id
    })))
  }

  const deleteTheme = async (themeId: string) => {
    if (!confirm('Are you sure you want to delete this theme?')) return

    setLoading(true)
    try {
      const response = await fetch('/api/themes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: themeId })
      })

      if (response.ok) {
        setSavedThemes(prev => prev.filter(t => t.id !== themeId))
        toast.success('Theme deleted successfully!')
      } else {
        toast.error('Failed to delete theme')
      }
    } catch (error) {
      toast.error('Failed to delete theme')
    } finally {
      setLoading(false)
    }
  }

  const exportTheme = () => {
    const exportData = {
      name: 'Custom Theme Export',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tokens: currentTokens
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `theme-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Theme exported successfully!')
  }

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string)
        if (importData.tokens) {
          onApplyTheme(importData.tokens)
          toast.success('Theme imported successfully!')
        } else {
          toast.error('Invalid theme file format')
        }
      } catch (error) {
        toast.error('Failed to parse theme file')
      }
    }
    reader.readAsText(file)
    event.target.value = '' // Reset input
  }

  const applyThemeGlobally = async (theme: SavedTheme) => {
    setLoading(true)
    try {
      // Apply theme to current session and globally
      await onApplyTheme(theme.tokens, theme.id)
      
      // Update the default flag in local state
      setSavedThemes(prev => prev.map(t => ({
        ...t,
        isDefault: t.id === theme.id
      })))
      
      toast.success('Theme applied globally! Changes will persist across app restarts.', {
        description: 'The theme has been saved as the default and will apply to all users.'
      })
    } catch (error) {
      toast.error('Failed to apply theme globally')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Theme Management
        </SheetTitle>
        <SheetDescription>
          Save, load, and manage your design system themes
        </SheetDescription>
      </SheetHeader>

      {/* Quick Actions */}
      <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Save Theme
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Current Theme</DialogTitle>
                  <DialogDescription>
                    Save your current design system configuration for future use
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme-name">Theme Name</Label>
                    <Input
                      id="theme-name"
                      placeholder="e.g., Dark Mode, Brand Colors"
                      value={themeName}
                      onChange={(e) => setThemeName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="theme-description">Description (Optional)</Label>
                    <Input
                      id="theme-description"
                      placeholder="Brief description of this theme"
                      value={themeDescription}
                      onChange={(e) => setThemeDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={saveTheme} disabled={loading} className="flex-1">
                      {loading ? 'Saving...' : 'Save Theme'}
                    </Button>
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Load Theme
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Load Saved Theme</DialogTitle>
                  <DialogDescription>
                    Choose a saved theme to load into the editor
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto space-y-3">
                                     {savedThemes.length === 0 ? (
                     <div className="text-center py-8 text-muted-foreground">
                       <Palette className="w-12 h-12 mx-auto mb-2 opacity-50" />
                       <p>No saved themes yet</p>
                       <p className="text-sm">Save your first theme to see it here</p>
                       <p className="text-xs mt-2 opacity-70">Note: Database table will be created automatically when you save your first theme</p>
                     </div>
                  ) : (
                    savedThemes.map((theme) => (
                      <Card key={theme.id} className="relative">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{theme.name}</h4>
                                {theme.isDefault && (
                                  <Badge variant="outline" className="text-xs">
                                    <Check className="w-3 h-3 mr-1" />
                                    Default
                                  </Badge>
                                )}
                              </div>
                              {theme.description && (
                                <p className="text-sm text-muted-foreground">{theme.description}</p>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Created: {new Date(theme.createdAt).toLocaleDateString()}
                              </div>
                              
                                                             {/* Color Preview */}
                               <div className="flex gap-1 mt-2">
                                 {(() => {
                                   // Handle both old format (semantic) and new format (semantic.light/dark)
                                   const semantic = theme.tokens?.colors?.semantic;
                                   if (!semantic) return null;
                                   
                                   const colors = 'light' in semantic 
                                     ? semantic.light 
                                     : semantic;
                                   
                                   return (
                                     <>
                                       <div 
                                         className="w-6 h-6 rounded border"
                                         style={{ backgroundColor: colors.primary }}
                                         title="Primary"
                                       />
                                       <div 
                                         className="w-6 h-6 rounded border"
                                         style={{ backgroundColor: colors.secondary }}
                                         title="Secondary"
                                       />
                                       <div 
                                         className="w-6 h-6 rounded border"
                                         style={{ backgroundColor: colors.accent }}
                                         title="Accent"
                                       />
                                       <div 
                                         className="w-6 h-6 rounded border"
                                         style={{ backgroundColor: colors.destructive }}
                                         title="Destructive"
                                       />
                                     </>
                                   );
                                 })()}
                               </div>
                            </div>
                            
                            <div className="flex gap-1 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => loadTheme(theme)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Load
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => applyThemeGlobally(theme)}
                                disabled={loading}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Apply
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteTheme(theme.id)}
                                disabled={loading}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={exportTheme}>
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>

            <Label htmlFor="import-theme" className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>
                  <FileText className="w-4 h-4 mr-2" />
                  Import JSON
                </span>
              </Button>
              <input
                id="import-theme"
                type="file"
                accept=".json"
                className="hidden"
                onChange={importTheme}
              />
            </Label>
          </div>

          {savedThemes.length > 0 && (
            <Alert>
              <Palette className="h-4 w-4" />
              <AlertDescription>
                You have {savedThemes.length} saved theme{savedThemes.length === 1 ? '' : 's'}. 
                Use "Load" to preview or "Apply" to make it the default theme for your entire application.
              </AlertDescription>
            </Alert>
          )}
      </div>
    </div>
  )
} 