'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertTriangle, Loader2, Database, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function SetupHolidaysPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  
  const supabase = createClient()

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const runSetup = async () => {
    setLoading(true)
    setError(null)
    setLogs([])
    setSuccess(false)

    try {
      addLog('Rozpoczynanie konfiguracji systemu świąt...')

      // Step 1: Check if columns exist
      addLog('Sprawdzanie struktury tabeli company_holidays...')
      
      // Step 2: Add missing columns
      const steps = [
        {
          name: 'Dodawanie kolumny type',
          sql: `
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'company_holidays' 
                    AND column_name = 'type'
                ) THEN
                    ALTER TABLE company_holidays ADD COLUMN type VARCHAR(50) DEFAULT 'company';
                END IF;
            END $$;
          `
        },
        {
          name: 'Dodawanie kolumny is_work_day',
          sql: `
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'company_holidays' 
                    AND column_name = 'is_work_day'
                ) THEN
                    ALTER TABLE company_holidays ADD COLUMN is_work_day BOOLEAN DEFAULT false;
                END IF;
            END $$;
          `
        },
        {
          name: 'Dodawanie kolumny description',
          sql: `
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'company_holidays' 
                    AND column_name = 'description'
                ) THEN
                    ALTER TABLE company_holidays ADD COLUMN description TEXT;
                END IF;
            END $$;
          `
        },
        {
          name: 'Tworzenie funkcji obliczania Wielkanocy',
          sql: `
            CREATE OR REPLACE FUNCTION calculate_easter(year INTEGER)
            RETURNS DATE AS $$
            DECLARE
                a INTEGER;
                b INTEGER;
                c INTEGER;
                d INTEGER;
                e INTEGER;
                f INTEGER;
                g INTEGER;
                h INTEGER;
                i INTEGER;
                k INTEGER;
                l INTEGER;
                m INTEGER;
                month INTEGER;
                day INTEGER;
            BEGIN
                -- Using the algorithm for Gregorian calendar
                a := year % 19;
                b := year / 100;
                c := year % 100;
                d := b / 4;
                e := b % 4;
                f := (b + 8) / 25;
                g := (b - f + 1) / 3;
                h := (19 * a + b - d - g + 15) % 30;
                i := c / 4;
                k := c % 4;
                l := (32 + 2 * e + 2 * i - h - k) % 7;
                m := (a + 11 * h + 22 * l) / 451;
                month := (h + l - 7 * m + 114) / 31;
                day := ((h + l - 7 * m + 114) % 31) + 1;
                
                RETURN make_date(year, month, day);
            END;
            $$ LANGUAGE plpgsql;
          `
        },
        {
          name: 'Tworzenie funkcji dodawania polskich świąt',
          sql: `
            CREATE OR REPLACE FUNCTION insert_polish_national_holidays(target_year INTEGER)
            RETURNS VOID AS $$
            DECLARE
                easter_date DATE;
                holiday_record RECORD;
                has_created_at BOOLEAN;
                has_updated_at BOOLEAN;
                insert_sql TEXT;
            BEGIN
                -- Check which timestamp columns exist
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'company_holidays' AND column_name = 'created_at'
                ) INTO has_created_at;
                
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'company_holidays' AND column_name = 'updated_at'
                ) INTO has_updated_at;
                
                -- Calculate Easter for the year
                easter_date := calculate_easter(target_year);
                
                -- Delete existing national holidays for this year
                DELETE FROM company_holidays 
                WHERE type = 'national' 
                AND EXTRACT(YEAR FROM date) = target_year;
                
                -- Prepare holiday data
                CREATE TEMP TABLE temp_polish_holidays AS
                SELECT * FROM (
                    VALUES 
                    ('Nowy Rok', make_date(target_year, 1, 1), 'New Year''s Day'),
                    ('Święto Trzech Króli', make_date(target_year, 1, 6), 'Epiphany'),
                    ('Święto Pracy', make_date(target_year, 5, 1), 'Labour Day'),
                    ('Święto Konstytucji 3 Maja', make_date(target_year, 5, 3), 'Constitution Day'),
                    ('Wniebowzięcie Najświętszej Maryi Panny', make_date(target_year, 8, 15), 'Assumption of Mary'),
                    ('Wszystkich Świętych', make_date(target_year, 11, 1), 'All Saints'' Day'),
                    ('Święto Niepodległości', make_date(target_year, 11, 11), 'Independence Day'),
                    ('Boże Narodzenie', make_date(target_year, 12, 25), 'Christmas Day'),
                    ('Drugi dzień Bożego Narodzenia', make_date(target_year, 12, 26), 'Boxing Day'),
                    ('Wielkanoc', easter_date, 'Easter Sunday'),
                    ('Poniedziałek Wielkanocny', easter_date + INTERVAL '1 day', 'Easter Monday'),
                    ('Zielone Świątki', easter_date + INTERVAL '49 days', 'Pentecost'),
                    ('Boże Ciało', easter_date + INTERVAL '60 days', 'Corpus Christi')
                ) AS t(name, date, description);
                
                -- Build dynamic insert SQL based on available columns
                insert_sql := 'INSERT INTO company_holidays (organization_id, name, date, type, is_work_day, description';
                
                IF has_created_at THEN
                    insert_sql := insert_sql || ', created_at';
                END IF;
                
                IF has_updated_at THEN
                    insert_sql := insert_sql || ', updated_at';
                END IF;
                
                insert_sql := insert_sql || ') VALUES ($1, $2, $3, $4, $5, $6';
                
                IF has_created_at THEN
                    insert_sql := insert_sql || ', NOW()';
                END IF;
                
                IF has_updated_at THEN
                    insert_sql := insert_sql || ', NOW()';
                END IF;
                
                insert_sql := insert_sql || ')';
                
                -- Insert holidays with adaptive SQL
                FOR holiday_record IN 
                    SELECT name, date, description FROM temp_polish_holidays
                LOOP
                    EXECUTE insert_sql USING 
                        NULL::UUID,  -- organization_id (NULL for national holidays, cast to UUID)
                        holiday_record.name,
                        holiday_record.date,
                        'national',
                        false,
                        holiday_record.description;
                END LOOP;
                
                DROP TABLE temp_polish_holidays;
                
                RAISE NOTICE 'Inserted % Polish national holidays for year %', 
                    (SELECT COUNT(*) FROM company_holidays WHERE type = 'national' AND EXTRACT(YEAR FROM date) = target_year),
                    target_year;
            END;
            $$ LANGUAGE plpgsql;
          `
        }
      ]

      // Execute each step
      for (const step of steps) {
        addLog(`Wykonywanie: ${step.name}...`)
        const { error } = await supabase.rpc('exec_sql', { sql_query: step.sql })
        if (error) {
          throw new Error(`Błąd w kroku "${step.name}": ${error.message}`)
        }
        addLog(`✅ Ukończono: ${step.name}`)
      }

      // Step 3: Insert holidays for 2025-2027
      addLog('Dodawanie polskich świąt na lata 2025-2027...')
      for (const year of [2025, 2026, 2027]) {
        const { error } = await supabase.rpc('insert_polish_national_holidays', { target_year: year })
        if (error) {
          throw new Error(`Błąd dodawania świąt dla roku ${year}: ${error.message}`)
        }
        addLog(`✅ Dodano święta dla roku ${year}`)
      }

      // Step 4: Create views and functions
      const viewsAndFunctions = [
        {
          name: 'Tworzenie funkcji obliczania dni roboczych',
          sql: `
            CREATE OR REPLACE FUNCTION calculate_working_days_with_holidays(
              start_date DATE,
              end_date DATE,
              organization_id UUID DEFAULT NULL
            ) RETURNS INTEGER AS $$
            DECLARE
              total_days INTEGER := 0;
              current_date DATE := start_date;
              is_holiday BOOLEAN;
              day_of_week INTEGER;
            BEGIN
              WHILE current_date <= end_date LOOP
                -- Get day of week (1=Monday, 7=Sunday)
                day_of_week := EXTRACT(ISODOW FROM current_date);
                
                -- Skip weekends (Saturday=6, Sunday=7)
                IF day_of_week NOT IN (6, 7) THEN
                  -- Check if it's a holiday
                  SELECT EXISTS(
                    SELECT 1 FROM company_holidays 
                    WHERE date = current_date 
                    AND is_work_day = false
                    AND (
                      type = 'national' 
                      OR (type = 'organization' AND company_holidays.organization_id = calculate_working_days_with_holidays.organization_id)
                    )
                  ) INTO is_holiday;
                  
                  -- Count only non-holiday weekdays
                  IF NOT is_holiday THEN
                    total_days := total_days + 1;
                  END IF;
                END IF;
                
                current_date := current_date + INTERVAL '1 day';
              END LOOP;
              
              RETURN total_days;
            END;
            $$ LANGUAGE plpgsql;
          `
        },
        {
          name: 'Tworzenie widoku upcoming_holidays',
          sql: `
            CREATE OR REPLACE VIEW upcoming_holidays AS
            SELECT 
              id,
              name,
              date,
              type as holiday_type,
              description,
              EXTRACT(DAY FROM (date - CURRENT_DATE)) as days_until
            FROM company_holidays
            WHERE date >= CURRENT_DATE 
            AND date <= CURRENT_DATE + INTERVAL '90 days'
            AND is_work_day = false
            ORDER BY date ASC;
          `
        },
        {
          name: 'Tworzenie widoku current_year_holidays',
          sql: `
            CREATE OR REPLACE VIEW current_year_holidays AS
            SELECT 
              id,
              name,
              date,
              type as holiday_type,
              description,
              is_work_day
            FROM company_holidays
            WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ORDER BY date ASC;
          `
        }
      ]

      for (const item of viewsAndFunctions) {
        addLog(`Wykonywanie: ${item.name}...`)
        const { error } = await supabase.rpc('exec_sql', { sql_query: item.sql })
        if (error) {
          throw new Error(`Błąd w kroku "${item.name}": ${error.message}`)
        }
        addLog(`✅ Ukończono: ${item.name}`)
      }

      addLog('🎉 Konfiguracja systemu świąt została zakończona pomyślnie!')
      setSuccess(true)

    } catch (err: unknown) {
      console.error('Setup error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd'
      setError(errorMessage)
      addLog(`❌ BŁĄD: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Konfiguracja systemu świąt</h1>
          <p className="text-muted-foreground">
            Skonfiguruj polskie święta państwowe i system obliczania dni roboczych
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/holidays">
            Powrót do świąt
          </Link>
        </Button>
      </div>

      {/* Status */}
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            System świąt został pomyślnie skonfigurowany! Możesz teraz przejść do zarządzania świętami.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Setup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Konfiguracja bazy danych
          </CardTitle>
          <CardDescription>
            Ten proces skonfiguruje system świąt w bazie danych, dodając:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Polskie święta państwowe
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 13 świąt państwowych na lata 2025-2027</li>
                <li>• Automatyczne obliczanie Wielkanocy</li>
                <li>• Święta stałe i ruchome</li>
                <li>• Zgodność z Kodeksem Pracy</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Funkcje systemowe
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Obliczanie dni roboczych z wyłączeniem świąt</li>
                <li>• Widoki dla zarządzania świętami</li>
                <li>• Wsparcie dla świąt firmowych</li>
                <li>• Automatyczne aktualizacje</li>
              </ul>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              onClick={runSetup} 
              disabled={loading || success}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Konfigurowanie...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Konfiguracja ukończona
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Uruchom konfigurację
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Logi konfiguracji</CardTitle>
            <CardDescription>
              Szczegóły procesu konfiguracji
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-sm">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Actions */}
      {success && (
        <Card>
          <CardHeader>
            <CardTitle>Następne kroki</CardTitle>
            <CardDescription>
              System świąt został skonfigurowany. Oto co możesz teraz zrobić:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Button asChild>
                <Link href="/admin/holidays">
                  <Calendar className="mr-2 h-4 w-4" />
                  Zarządzaj świętami
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin">
                  Powrót do panelu administracyjnego
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 