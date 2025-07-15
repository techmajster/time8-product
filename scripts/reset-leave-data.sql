-- BEZPIECZNY RESET DANYCH URLOPOWYCH
-- Ten skrypt usuwa dane z leave_requests i leave_balances zachowując strukturę tabel
-- 
-- UWAGA: Uruchom to TYLKO jeśli chcesz zacząć z czystą kartą!
-- WAŻNE: Utwórz backup przed uruchomieniem tego skryptu

-- ==================================================================
-- KROK 1: SPRAWDZENIE AKTUALNEGO STANU
-- ==================================================================

DO $$
BEGIN
    RAISE NOTICE '=== SPRAWDZANIE AKTUALNEGO STANU BAZY DANYCH ===';
END $$;

-- Sprawdź liczbę rekordów przed usunięciem
SELECT 
    'PRZED RESETEM - leave_requests' as info,
    COUNT(*) as liczba_rekordow,
    COUNT(DISTINCT user_id) as liczba_uzytkownikow,
    COUNT(DISTINCT organization_id) as liczba_organizacji
FROM leave_requests;

SELECT 
    'PRZED RESETEM - leave_balances' as info,
    COUNT(*) as liczba_rekordow,
    COUNT(DISTINCT user_id) as liczba_uzytkownikow,
    COUNT(DISTINCT organization_id) as liczba_organizacji
FROM leave_balances;

-- Sprawdź wszystkie tabele w bazie
SELECT 
    'TABELE W BAZIE' as info,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as liczba_kolumn
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ==================================================================
-- KROK 2: UTWORZENIE KOPII BEZPIECZEŃSTWA
-- ==================================================================

DO $$
BEGIN
    RAISE NOTICE '=== TWORZENIE KOPII BEZPIECZEŃSTWA ===';
END $$;

-- Usuń stare backupy jeśli istnieją
DROP TABLE IF EXISTS leave_requests_backup;
DROP TABLE IF EXISTS leave_balances_backup;

-- Stwórz kopie bezpieczeństwa
CREATE TABLE leave_requests_backup AS 
SELECT * FROM leave_requests;

CREATE TABLE leave_balances_backup AS 
SELECT * FROM leave_balances;

-- Sprawdź czy backup się udał
SELECT 
    'BACKUP UTWORZONY - leave_requests_backup' as info,
    COUNT(*) as liczba_rekordow_w_backupie
FROM leave_requests_backup;

SELECT 
    'BACKUP UTWORZONY - leave_balances_backup' as info,
    COUNT(*) as liczba_rekordow_w_backupie
FROM leave_balances_backup;

-- ==================================================================
-- KROK 3: BEZPIECZNE USUNIĘCIE DANYCH
-- ==================================================================

DO $$
BEGIN
    RAISE NOTICE '=== USUWANIE DANYCH Z TABEL TRANSAKCYJNYCH ===';
END $$;

-- UWAGA: To nieodwracalne! Dane zostaną usunięte!
-- Możesz odkomentować poniższe linie aby rzeczywiście usunąć dane:

/*
-- Usuń wszystkie wnioski urlopowe
DELETE FROM leave_requests;

-- Usuń wszystkie salda urlopowe
DELETE FROM leave_balances;

-- Opcjonalnie: usuń nieprzetworzone zaproszenia
-- DELETE FROM invitations WHERE status = 'pending';
*/

-- ==================================================================
-- KROK 4: SPRAWDZENIE PO USUNIĘCIU
-- ==================================================================

-- Sprawdź liczby po usunięciu (będą 0 jeśli odkomentowałeś DELETE)
SELECT 
    'PO RESECIE - leave_requests' as info,
    COUNT(*) as pozostale_rekordy
FROM leave_requests;

SELECT 
    'PO RESECIE - leave_balances' as info,
    COUNT(*) as pozostale_rekordy
FROM leave_balances;

-- ==================================================================
-- KROK 5: SPRAWDZENIE INTEGRALNOŚCI POZOSTAŁYCH TABEL
-- ==================================================================

DO $$
BEGIN
    RAISE NOTICE '=== SPRAWDZANIE INTEGRALNOŚCI POZOSTAŁYCH TABEL ===';
END $$;

-- Sprawdź kluczowe tabele które powinny zostać nietknięte
SELECT 'profiles' as tabela, COUNT(*) as liczba_rekordow FROM profiles
UNION ALL
SELECT 'organizations' as tabela, COUNT(*) as liczba_rekordow FROM organizations
UNION ALL
SELECT 'leave_types' as tabela, COUNT(*) as liczba_rekordow FROM leave_types
UNION ALL
SELECT 'teams' as tabela, COUNT(*) as liczba_rekordow FROM teams
UNION ALL
SELECT 'company_holidays' as tabela, COUNT(*) as liczba_rekordow FROM company_holidays
ORDER BY tabela;

-- ==================================================================
-- INSTRUKCJE ODZYSKIWANIA (W RAZIE PROBLEMU)
-- ==================================================================

DO $$
BEGIN
    RAISE NOTICE '=== INSTRUKCJE ODZYSKIWANIA ===';
    RAISE NOTICE 'W razie problemu, możesz przywrócić dane używając:';
    RAISE NOTICE 'INSERT INTO leave_requests SELECT * FROM leave_requests_backup;';
    RAISE NOTICE 'INSERT INTO leave_balances SELECT * FROM leave_balances_backup;';
    RAISE NOTICE '';
    RAISE NOTICE 'Aby usunąć tabele backup po potwierdzeniu że wszystko działa:';
    RAISE NOTICE 'DROP TABLE leave_requests_backup;';
    RAISE NOTICE 'DROP TABLE leave_balances_backup;';
END $$;

-- ==================================================================
-- PODSUMOWANIE
-- ==================================================================

DO $$
DECLARE
    requests_count INTEGER;
    balances_count INTEGER;
    backup_requests_count INTEGER;
    backup_balances_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO requests_count FROM leave_requests;
    SELECT COUNT(*) INTO balances_count FROM leave_balances;
    SELECT COUNT(*) INTO backup_requests_count FROM leave_requests_backup;
    SELECT COUNT(*) INTO backup_balances_count FROM leave_balances_backup;
    
    RAISE NOTICE '=== PODSUMOWANIE OPERACJI ===';
    RAISE NOTICE 'Leave requests: % (backup: %)', requests_count, backup_requests_count;
    RAISE NOTICE 'Leave balances: % (backup: %)', balances_count, backup_balances_count;
    
    IF requests_count = 0 AND balances_count = 0 THEN
        RAISE NOTICE '✅ RESET ZAKOŃCZONY POMYŚLNIE - dane usunięte, backup utworzony';
    ELSE
        RAISE NOTICE '⚠️  RESET NIE ZOSTAŁ WYKONANY - odkomentuj linie DELETE aby usunąć dane';
    END IF;
END $$; 