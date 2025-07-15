-- SPRAWDZENIE NIEUŻYWANYCH TABEL
-- Ten skrypt pomoże zidentyfikować tabele które mogą być bezpiecznie usunięte

-- ==================================================================
-- WSZYSTKIE TABELE W BAZIE DANYCH
-- ==================================================================

SELECT 
    '=== WSZYSTKIE TABELE W BAZIE ===' as info,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = t.table_name AND table_schema = 'public') as liczba_kolumn,
    CASE 
        WHEN table_name LIKE '%backup%' THEN '🗄️ BACKUP'
        WHEN table_name = 'auth_users' THEN '🔐 AUTH (Supabase)'
        WHEN table_name IN ('profiles', 'organizations', 'leave_types', 'leave_requests', 'leave_balances', 
                           'teams', 'invitations', 'company_holidays', 'user_settings') THEN '✅ AKTYWNA'
        WHEN table_name IN ('employee_schedules', 'work_schedule_templates') THEN '⚠️ CZĘŚCIOWO UŻYWANA'
        ELSE '❓ NIEZNANA'
    END as status
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY status, table_name;

-- ==================================================================
-- SPRAWDZENIE ROZMIARU TABEL
-- ==================================================================

SELECT 
    '=== ROZMIARY TABEL ===' as info,
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as rozmiar_calkowity,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as rozmiar_danych
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ==================================================================
-- SPRAWDZENIE LICZBY REKORDÓW W KAŻDEJ TABELI
-- ==================================================================

DO $$
DECLARE
    tbl record;
    row_count integer;
    query text;
BEGIN
    RAISE NOTICE '=== LICZBA REKORDÓW W TABELACH ===';
    
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        query := 'SELECT COUNT(*) FROM ' || quote_ident(tbl.table_name);
        EXECUTE query INTO row_count;
        RAISE NOTICE '% : % rekordów', tbl.table_name, row_count;
    END LOOP;
END $$;

-- ==================================================================
-- TABELE KTÓRE MOGĄ BYĆ NIEUŻYWANE
-- ==================================================================

-- Sprawdź czy istnieją tabele które nie były wymienione w analizie kodu
SELECT 
    '=== POTENCJALNIE NIEUŻYWANE TABELE ===' as info,
    table_name,
    'Sprawdź czy ta tabela jest rzeczywiście używana w kodzie' as akcja
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name NOT IN (
    'profiles', 'organizations', 'leave_types', 'leave_requests', 'leave_balances',
    'teams', 'invitations', 'company_holidays', 'user_settings',
    'employee_schedules', 'work_schedule_templates'
)
AND table_name NOT LIKE '%backup%'
ORDER BY table_name;

-- ==================================================================
-- FOREIGN KEYS I DEPENDENCIES
-- ==================================================================

SELECT 
    '=== FOREIGN KEYS (DEPENDENCIES) ===' as info,
    tc.table_name as tabela_zrodlowa,
    kcu.column_name as kolumna_zrodlowa,
    ccu.table_name as tabela_docelowa,
    ccu.column_name as kolumna_docelowa,
    tc.constraint_name as nazwa_constraint
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ==================================================================
-- INDEXES NA TABELACH
-- ==================================================================

SELECT 
    '=== INDEXES ===' as info,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ==================================================================
-- REKOMENDACJE
-- ==================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== REKOMENDACJE ===';
    RAISE NOTICE 'Tabele BEZPIECZNE do usunięcia (jeśli istnieją i są puste):';
    RAISE NOTICE '- parental_leave_requests (już usunięta w migracji)';
    RAISE NOTICE '- *_backup (tabele backup można usunąć po potwierdzeniu)';
    RAISE NOTICE '';
    RAISE NOTICE 'Tabele NIEBEZPIECZNE do usunięcia (NIE USUWAJ):';
    RAISE NOTICE '- profiles, organizations, leave_types, leave_requests, leave_balances';
    RAISE NOTICE '- teams, invitations, company_holidays, user_settings';
    RAISE NOTICE '';
    RAISE NOTICE 'Tabele CZĘŚCIOWO UŻYWANE (zachowaj na przyszłość):';
    RAISE NOTICE '- employee_schedules, work_schedule_templates';
    RAISE NOTICE '';
    RAISE NOTICE 'UWAGA: Zawsze sprawdź kod aplikacji przed usunięciem tabeli!';
END $$; 