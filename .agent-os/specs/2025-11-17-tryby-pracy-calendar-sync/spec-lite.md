# Spec Summary (Lite)

Implement the redesigned “Tryb pracy” tab from Figma and wire it to the existing dashboard and calendar so that working days, holiday handling, and daily work hours come from organization settings instead of hardcoded values. This includes new admin sheets for Dni pracujące and Godziny pracy, Supabase schema updates (holiday toggle, daily hours, shift metadata), API validation, and downstream consumers (CurrentDayCard + CalendarClient) that render the saved configuration.

