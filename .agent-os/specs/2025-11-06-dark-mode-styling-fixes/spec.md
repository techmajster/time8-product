# Spec Requirements Document

> Spec: Dark Mode Styling Fixes
> Created: 2025-11-06
> Status: Planning

## Overview

Fix dark mode styling issues across components with hardcoded colors that don't adapt to dark mode. The goal is to ensure the dashboard and all components display correctly in both light and dark modes.

## User Stories

### Consistent Theme Experience

As a user, I want to toggle between light and dark modes, so that the entire application adapts seamlessly with proper colors and contrast in both themes.

**Workflow:**
- User clicks the theme toggle in the navigation
- All components immediately update to reflect the selected theme
- Dashboard calendar cells, radio buttons, badges, and avatars all display with appropriate colors
- No visual inconsistencies or hard-to-read text appears

**Problem Solved:** Currently, several components use hardcoded colors that don't respect the theme setting, resulting in poor visibility and inconsistent design in dark mode.

## Spec Scope

1. **CSS Variables Enhancement** - Add missing `--card-violet` variable to dark mode selector
2. **Radio Group Component Update** - Replace all hardcoded neutral colors with semantic tokens
3. **Dashboard Badge Fix** - Update "Custom Balance" badge to use theme-aware colors
4. **Avatar Fallback Colors** - Use CSS variables instead of hardcoded hex values
5. **Onboarding Text Colors** - Replace hardcoded dark text with semantic tokens (optional)

## Out of Scope

- Creating new dark mode color schemes or palettes
- Redesigning component layouts or structures
- Adding new theme options beyond light/dark
- Modifying the theme toggle mechanism

## Expected Deliverable

1. All dashboard components render correctly in both light and dark modes
2. Radio buttons in forms adapt properly to theme changes
3. Calendar cells in dashboard show appropriate background colors in dark mode
4. Avatar fallbacks and badges respect theme settings
5. Smooth visual transitions when toggling between themes
