'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  Download
} from 'lucide-react';
import { toast } from 'sonner';

export interface DesignTokens {
  colors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
}

export interface SavedTheme {
  id: string;
  name: string;
  description?: string;
  theme_data: DesignTokens;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface ThemeManagerProps {
  currentTheme: DesignTokens;
  onThemeLoad: (theme: DesignTokens) => void;
  onThemeReset: () => void;
}

export function ThemeManager({ currentTheme, onThemeLoad, onThemeReset }: ThemeManagerProps) {
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<SavedTheme | null>(null);
  
  // Save dialog state
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  // Load saved themes on component mount
  useEffect(() => {
    loadSavedThemes();
  }, []);

  const loadSavedThemes = async () => {
    try {
      const response = await fetch('/api/themes');
      if (response.ok) {
        const data = await response.json();
        setSavedThemes(data.themes || []);
      } else {
        console.error('Failed to load themes');
      }
    } catch (error) {
      console.error('Error loading themes:', error);
    }
  };

  const saveTheme = async () => {
    if (!saveName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim(),
          description: saveDescription.trim() || undefined,
          theme_data: currentTheme,
          is_default: saveAsDefault
        })
      });

      if (response.ok) {
        toast.success(`Theme "${saveName}" saved successfully!`);
        setSaveDialogOpen(false);
        setSaveName('');
        setSaveDescription('');
        setSaveAsDefault(false);
        await loadSavedThemes(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save theme');
      }
    } catch (error) {
      toast.error('Error saving theme');
      console.error('Save theme error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTheme = async (theme: SavedTheme) => {
    onThemeLoad(theme.theme_data);
    setLoadDialogOpen(false);
    toast.success(`Loaded theme "${theme.name}"`);
  };

  const setAsDefault = async (theme: SavedTheme) => {
    setLoading(true);
    try {
      const response = await fetch('/api/themes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: theme.id,
          is_default: true
        })
      });

      if (response.ok) {
        toast.success(`"${theme.name}" set as default theme`);
        await loadSavedThemes(); // Refresh to update default status
      } else {
        toast.error('Failed to set default theme');
      }
    } catch (error) {
      toast.error('Error setting default theme');
      console.error('Set default error:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTheme = async (theme: SavedTheme) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/themes?id=${theme.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success(`Theme "${theme.name}" deleted`);
        await loadSavedThemes(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete theme');
      }
    } catch (error) {
      toast.error('Error deleting theme');
      console.error('Delete theme error:', error);
    } finally {
      setLoading(false);
      setDeleteConfirmOpen(false);
      setThemeToDelete(null);
    }
  };



  return (
    <div className="flex items-center gap-3">
      {/* Save Theme */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Save size={16} className="mr-2" />
            Save Theme
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Theme</DialogTitle>
            <DialogDescription>
              Save your current design tokens as a reusable theme preset.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="save-name">Theme Name</Label>
              <Input
                id="save-name"
                placeholder="My Custom Theme"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="save-description">Description (Optional)</Label>
              <Textarea
                id="save-description"
                placeholder="Description of this theme..."
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="save-default"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="save-default">Set as organization default</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTheme} disabled={loading}>
              {loading ? 'Saving...' : 'Save Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Theme */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <FolderOpen size={16} className="mr-2" />
            Load Theme
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load Saved Theme</DialogTitle>
            <DialogDescription>
              Choose from your saved theme presets. Loading will replace your current settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {savedThemes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings size={48} className="mx-auto mb-4 opacity-50" />
                <p>No saved themes yet.</p>
                <p className="text-sm">Save your first theme to get started!</p>
              </div>
            ) : (
              savedThemes.map((theme) => (
                <Card key={theme.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{theme.name}</h3>
                        {theme.is_default && (
                          <Badge variant="secondary">
                            <Star size={12} className="mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      {theme.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {theme.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(theme.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadTheme(theme)}
                      >
                        <Eye size={16} className="mr-1" />
                        Load
                      </Button>
                      
                      {!theme.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAsDefault(theme)}
                        >
                          <Star size={16} className="mr-1" />
                          Set Default
                        </Button>
                      )}
                      
                      {!theme.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setThemeToDelete(theme);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Theme</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{themeToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => themeToDelete && deleteTheme(themeToDelete)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 