# Polish Holiday System - Documentation

## Overview
This system automatically excludes Polish national holidays when calculating working days for leave requests.

## Files Included

### `clean-polish-holidays.sql`
**Purpose**: Main setup script for Polish holidays
- Adds all 13 Polish national holidays for 2025-2026
- Creates the `calculate_working_days_with_holidays()` database function
- Self-contained and safe to run multiple times

### `simple-holiday-setup.sql` 
**Purpose**: Alternative setup script with Easter calculation
- Includes mathematical Easter calculation for dynamic holidays
- More comprehensive but also more complex

### `fix-holidays-rls.sql`
**Purpose**: Fixes Row Level Security (RLS) policies
- Ensures national holidays are visible to all users
- Allows organization-specific holidays for individual companies
- **Run this if holiday queries return empty results**

## Polish National Holidays (13 total)

### Fixed Holidays (9)
- Nowy Rok (January 1)
- Święto Trzech Króli (January 6) 
- Święto Pracy (May 1)
- Święto Konstytucji 3 Maja (May 3)
- Wniebowzięcie NMP (August 15)
- Wszystkich Świętych (November 1)
- Święto Niepodległości (November 11)
- Boże Narodzenie (December 25)
- Drugi dzień Bożego Narodzenia (December 26)

### Easter-Dependent Holidays (4)
- Wielkanoc (Easter Sunday)
- Poniedziałek Wielkanocny (Easter Monday)
- Zielone Świątki (Pentecost - Easter +49 days)
- Boże Ciało (Corpus Christi - Easter +60 days)

## How It Works

1. **Database Storage**: Holidays stored in `company_holidays` table
   - National holidays have `organization_id = NULL`
   - Company holidays have specific `organization_id`

2. **Working Days Calculation**: 
   - API calls `calculate_working_days_with_holidays()` function
   - Function excludes weekends (Sat/Sun) and holidays
   - Returns accurate count for leave requests

3. **Frontend Integration**:
   - Shows "X dni robocze" with note "Nie licząc weekendów i polskich świąt"
   - Real-time calculation as user selects dates

## Troubleshooting

### Problem: Working days calculation returns wrong number
**Solution**: Check if holidays are visible
```sql
SELECT COUNT(*) FROM company_holidays WHERE type = 'national';
```
If returns 0, run `fix-holidays-rls.sql`

### Problem: Function doesn't exist
**Solution**: Run `clean-polish-holidays.sql` to create it

### Problem: Missing holidays for future years
**Solution**: Add holidays manually or extend the setup script for additional years

## Database Function

The `calculate_working_days_with_holidays()` function:
- Takes start_date, end_date, and organization_id parameters
- Returns INTEGER count of working days
- Excludes weekends and all applicable holidays
- Used by `/api/working-days` endpoint

## API Integration

**Endpoint**: `POST /api/working-days`
**Payload**: `{ "startDate": "2025-06-18", "endDate": "2025-06-20" }`
**Response**: `{ "working_days": 2, "holidays_in_period": [...] }`

## Maintenance

- **Annual**: Add holidays for upcoming years
- **Updates**: Modify holiday dates if government changes them
- **Monitoring**: Check API logs for any fallback calculations 