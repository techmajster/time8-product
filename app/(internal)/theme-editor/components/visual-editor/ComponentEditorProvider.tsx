'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Edit3, Eye, EyeOff, Save, Undo, Redo } from 'lucide-react';
import { toast } from 'sonner';

// Types for component editing
interface ComponentInstance {
  id: string;
  type: string;
  props: Record<string, any>;
  position: { x: number; y: number };
  element: HTMLElement | null;
}

interface ComponentEdit {
  id: string;
  property: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

interface ComponentEditorState {
  isEditMode: boolean;
  selectedComponent: ComponentInstance | null;
  editHistory: ComponentEdit[];
  historyIndex: number;
  components: Map<string, ComponentInstance>;
}

interface ComponentEditorContextType {
  state: ComponentEditorState;
  toggleEditMode: () => void;
  selectComponent: (component: ComponentInstance) => void;
  updateComponentProp: (id: string, property: string, value: any) => void;
  registerComponent: (id: string, type: string, props: Record<string, any>, element: HTMLElement) => void;
  unregisterComponent: (id: string) => void;
  undo: () => void;
  redo: () => void;
  saveChanges: () => void;
}

const ComponentEditorContext = createContext<ComponentEditorContextType | null>(null);

export function useComponentEditor() {
  const context = useContext(ComponentEditorContext);
  if (!context) {
    throw new Error('useComponentEditor must be used within ComponentEditorProvider');
  }
  return context;
}

interface ComponentEditorProviderProps {
  children: ReactNode;
}

export function ComponentEditorProvider({ children }: ComponentEditorProviderProps) {
  const [state, setState] = useState<ComponentEditorState>({
    isEditMode: false,
    selectedComponent: null,
    editHistory: [],
    historyIndex: -1,
    components: new Map(),
  });

  const toggleEditMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEditMode: !prev.isEditMode,
      selectedComponent: null,
    }));
    
    if (!state.isEditMode) {
      toast.success('Edit mode enabled', {
        description: 'Click on any component to start editing',
      });
    } else {
      toast.info('Edit mode disabled');
    }
  }, [state.isEditMode]);

  const selectComponent = useCallback((component: ComponentInstance) => {
    setState(prev => ({
      ...prev,
      selectedComponent: component,
    }));
  }, []);

  const updateComponentProp = useCallback((id: string, property: string, value: any) => {
    setState(prev => {
      const component = prev.components.get(id);
      if (!component) return prev;

      const oldValue = component.props[property];
      
      // Create edit history entry
      const edit: ComponentEdit = {
        id,
        property,
        oldValue,
        newValue: value,
        timestamp: Date.now(),
      };

      // Update component props
      const updatedComponent = {
        ...component,
        props: { ...component.props, [property]: value },
      };

      const newComponents = new Map(prev.components);
      newComponents.set(id, updatedComponent);

      // Update edit history
      const newHistory = prev.editHistory.slice(0, prev.historyIndex + 1);
      newHistory.push(edit);

      return {
        ...prev,
        components: newComponents,
        selectedComponent: prev.selectedComponent?.id === id ? updatedComponent : prev.selectedComponent,
        editHistory: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });

    // Apply changes to DOM element if needed
    const component = state.components.get(id);
    if (component?.element) {
      applyPropChangeToElement(component.element, property, value);
    }
  }, [state.components]);

  const registerComponent = useCallback((id: string, type: string, props: Record<string, any>, element: HTMLElement) => {
    setState(prev => {
      const newComponents = new Map(prev.components);
      const rect = element.getBoundingClientRect();
      
      newComponents.set(id, {
        id,
        type,
        props,
        position: { x: rect.left, y: rect.top },
        element,
      });

      return {
        ...prev,
        components: newComponents,
      };
    });
  }, []);

  const unregisterComponent = useCallback((id: string) => {
    setState(prev => {
      const newComponents = new Map(prev.components);
      newComponents.delete(id);

      return {
        ...prev,
        components: newComponents,
        selectedComponent: prev.selectedComponent?.id === id ? null : prev.selectedComponent,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex < 0) return prev;

      const edit = prev.editHistory[prev.historyIndex];
      const component = prev.components.get(edit.id);
      
      if (component) {
        const updatedComponent = {
          ...component,
          props: { ...component.props, [edit.property]: edit.oldValue },
        };

        const newComponents = new Map(prev.components);
        newComponents.set(edit.id, updatedComponent);

        // Apply changes to DOM
        if (component.element) {
          applyPropChangeToElement(component.element, edit.property, edit.oldValue);
        }

        return {
          ...prev,
          components: newComponents,
          selectedComponent: prev.selectedComponent?.id === edit.id ? updatedComponent : prev.selectedComponent,
          historyIndex: prev.historyIndex - 1,
        };
      }

      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex >= prev.editHistory.length - 1) return prev;

      const edit = prev.editHistory[prev.historyIndex + 1];
      const component = prev.components.get(edit.id);
      
      if (component) {
        const updatedComponent = {
          ...component,
          props: { ...component.props, [edit.property]: edit.newValue },
        };

        const newComponents = new Map(prev.components);
        newComponents.set(edit.id, updatedComponent);

        // Apply changes to DOM
        if (component.element) {
          applyPropChangeToElement(component.element, edit.property, edit.newValue);
        }

        return {
          ...prev,
          components: newComponents,
          selectedComponent: prev.selectedComponent?.id === edit.id ? updatedComponent : prev.selectedComponent,
          historyIndex: prev.historyIndex + 1,
        };
      }

      return prev;
    });
  }, []);

  const saveChanges = useCallback(() => {
    // Here we would sync changes back to the design system
    // For now, we'll just show a success message
    toast.success('Changes saved', {
      description: `Saved ${state.editHistory.length} component changes`,
    });
  }, [state.editHistory.length]);

  const contextValue: ComponentEditorContextType = {
    state,
    toggleEditMode,
    selectComponent,
    updateComponentProp,
    registerComponent,
    unregisterComponent,
    undo,
    redo,
    saveChanges,
  };

  return (
    <ComponentEditorContext.Provider value={contextValue}>
      {children}
      <ComponentEditorToolbar />
    </ComponentEditorContext.Provider>
  );
}

// Helper function to apply prop changes to DOM elements
function applyPropChangeToElement(element: HTMLElement, property: string, value: any) {
  switch (property) {
    case 'variant':
      // Update class names for variant changes
      element.className = element.className.replace(
        /bg-\w+|text-\w+|border-\w+/g,
        ''
      );
      element.classList.add(`bg-${value}`, `text-${value}-foreground`);
      break;
    
    case 'size':
      // Update size classes
      element.className = element.className.replace(/text-\w+|px-\w+|py-\w+/g, '');
      const sizeClasses = getSizeClasses(value);
      element.classList.add(...sizeClasses);
      break;
    
    case 'disabled':
      if (value) {
        element.setAttribute('disabled', 'true');
        element.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        element.removeAttribute('disabled');
        element.classList.remove('opacity-50', 'cursor-not-allowed');
      }
      break;
    
    default:
      // Handle other properties
      if (element.hasAttribute(property)) {
        element.setAttribute(property, value);
      }
  }
}

function getSizeClasses(size: string): string[] {
  switch (size) {
    case 'sm':
      return ['text-sm', 'px-3', 'py-1'];
    case 'lg':
      return ['text-lg', 'px-6', 'py-3'];
    default:
      return ['text-base', 'px-4', 'py-2'];
  }
}

// Floating toolbar for edit mode
function ComponentEditorToolbar() {
  const { state, toggleEditMode, undo, redo, saveChanges } = useComponentEditor();

  if (!state.isEditMode) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-2 flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={toggleEditMode}
        className="flex items-center gap-2"
      >
        <EyeOff className="h-4 w-4" />
        Exit Edit
      </Button>
      
      <div className="h-4 w-px bg-border" />
      
      <Button
        size="sm"
        variant="ghost"
        onClick={undo}
        disabled={state.historyIndex < 0}
      >
        <Undo className="h-4 w-4" />
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={redo}
        disabled={state.historyIndex >= state.editHistory.length - 1}
      >
        <Redo className="h-4 w-4" />
      </Button>
      
      <div className="h-4 w-px bg-border" />
      
      <Button
        size="sm"
        onClick={saveChanges}
        disabled={state.editHistory.length === 0}
        className="flex items-center gap-2"
      >
        <Save className="h-4 w-4" />
        Save ({state.editHistory.length})
      </Button>
    </div>
  );
} 