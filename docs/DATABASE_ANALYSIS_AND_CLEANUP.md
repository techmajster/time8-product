# Analiza Bazy Danych i Propozycje Czyszczenia

## Podsumowanie Wykonawcze

Po gruntownej analizie kodu i migracji bazy danych, oto aktualna sytuacja tabel w systemie SaaS Leave Management:

- **Tabele Aktywne**: 12 głównych tabel w aktywnym użyciu
- **Tabele do Usunięcia**: 2 tabele (parental_leave_requests została już usunięta, 1 potencjalna do usunięcia)
- **Tabele Nieużywane**: Kilka tabel może istnieć w bazie ale nie być używanych w kodzie

## 📊 **Tabele w Aktywnym Użyciu**

### 🔐 **Uwierzytelnianie i Użytkownicy**
1. **`auth.users`** ✅ **AKTYWNA** 
   - Zarządzana przez Supabase Auth
   - Używana wszędzie do uwierzytelniania
   - **NIE USUWAĆ**

2. **`profiles`** ✅ **AKTYWNA**
   - Profil użytkownika, organizacja, rola
   - Używana w: auth-utils, wszystkich stronach, API endpoints
   - **NIE USUWAĆ** - kluczowa tabela

3. **`organizations`** ✅ **AKTYWNA**
   - Organizacje/firmy
   - Używana w: onboarding, dashboard, admin, cache-utils
   - **NIE USUWAĆ** - podstawowa tabela

4. **`invitations`** ✅ **AKTYWNA**
   - Zaproszenia do zespołu
   - Używana w: team management, onboarding
   - **NIE USUWAĆ**

### 👥 **Zespoły i Organizacja**
5. **`teams`** ✅ **AKTYWNA**
   - Zespoły w organizacji
   - Używana w: dashboard, team management, API /teams
   - **NIE USUWAĆ**

### 🏖️ **System Urlopów**
6. **`leave_types`** ✅ **AKTYWNA**
   - Typy urlopów (wypoczynkowy, na żądanie, itp.)
   - Używana wszędzie: leave forms, admin, balance management
   - **NIE USUWAĆ** - kluczowa tabela

7. **`leave_requests`** ✅ **AKTYWNA**
   - Wnioski urlopowe
   - Używana wszędzie: dashboard, leave pages, approval workflow
   - **DANE DO WYCZYSZCZENIA** - ale tabela zostaje

8. **`leave_balances`** ✅ **AKTYWNA**
   - Salda urlopowe użytkowników
   - Używana w: admin, leave forms, dashboard, balance utils
   - **NIE USUWAĆ** - kluczowa tabela

### 🗓️ **Harmonogramy i Święta**
9. **`company_holidays`** ✅ **AKTYWNA**
   - Święta narodowe i firmowe
   - Używana w: working days calculation, cache-utils
   - **NIE USUWAĆ**

10. **`employee_schedules`** ⚠️ **CZĘŚCIOWO UŻYWANA**
    - Harmonogramy pracowników
    - Używana w: schedule API endpoints
    - **ZACHOWAĆ** - może być używana w przyszłości

11. **`work_schedule_templates`** ⚠️ **CZĘŚCIOWO UŻYWANA**
    - Szablony harmonogramów
    - Używana w: schedule templates API
    - **ZACHOWAĆ** - może być używana w przyszłości

### ⚙️ **Ustawienia**
12. **`user_settings`** ✅ **AKTYWNA**
    - Ustawienia użytkownika (język, powiadomienia)
    - Używana w: i18n, profile, notifications
    - **NIE USUWAĆ**

## 🗑️ **Tabele do Usunięcia**

### ❌ **Już Usunięte**
1. **`parental_leave_requests`** ❌ **USUNIĘTA**
   - Usunięta w migracji 20250113000000_cleanup_parental_leave.sql
   - Zastąpiona przez bezpośrednie zarządzanie admin

### ⚠️ **Potencjalnie Nieużywane**
Na podstawie analizy kodu, następujące tabele mogą istnieć w bazie ale nie być używane:

- **`work_schedules`** - może być nieużywana (sprawdź w bazie)
- **`leave_policies`** - wspomniana w RLS docs ale nie znaleziona w kodzie
- **`organization_members`** - wspomniana w docs ale nie znaleziona w kodzie

## 🧹 **Plan Czyszczenia**

### **Faza 1: Bezpieczne Usunięcie Danych**
```sql
-- RESET LEAVE REQUESTS (zachowaj strukturę tabeli)
DELETE FROM leave_requests;

-- RESET LEAVE BALANCES (zachowaj strukturę tabeli)  
DELETE FROM leave_balances;

-- Optional: Reset invitations
DELETE FROM invitations WHERE status != 'accepted';
```

### **Faza 2: Sprawdzenie Nieużywanych Tabel**
```sql
-- Sprawdź jakie tabele faktycznie istnieją
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Sprawdź rozmiary tabel
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename;
```

### **Faza 3: Usunięcie Nieużywanych Tabel** (jeśli istnieją)
```sql
-- TYLKO jeśli potwierdzisz że nie są używane:
-- DROP TABLE IF EXISTS work_schedules;
-- DROP TABLE IF EXISTS leave_policies;  
-- DROP TABLE IF EXISTS organization_members;
```

## 🎯 **Rekomendacje**

### **Dla Czystego Startu:**
1. **USUŃ DANE** z `leave_requests` i `leave_balances` 
2. **ZACHOWAJ STRUKTURĘ** wszystkich głównych tabel
3. **NIE USUWAJ** tabel zespołów, typów urlopów, organizacji
4. **ZRESETUJ** tylko dane transakcyjne

### **Bezpieczny Skrypt Resetowania:**
```sql
-- Kopia bezpieczeństwa
CREATE TABLE leave_requests_backup AS SELECT * FROM leave_requests;
CREATE TABLE leave_balances_backup AS SELECT * FROM leave_balances;

-- Reset danych
DELETE FROM leave_requests;
DELETE FROM leave_balances;

-- Sprawdzenie
SELECT 'leave_requests' as table_name, COUNT(*) as remaining_rows FROM leave_requests
UNION ALL
SELECT 'leave_balances' as table_name, COUNT(*) as remaining_rows FROM leave_balances;
```

## ⚠️ **Ostrzeżenia**

1. **NIE USUWAJ** tabel `profiles`, `organizations`, `leave_types` - to podstawa systemu
2. **UTWÓRZ BACKUP** przed jakimkolwiek usuwaniem
3. **TESTUJ** na staging przed production
4. **SPRAWDŹ** dependencies przed usunięciem tabel

## 📋 **Następne Kroki**

1. Uruchom skrypt sprawdzający tabele w bazie
2. Wykonaj backup danych urlopowych
3. Usuń dane z leave_requests i leave_balances
4. Sprawdź czy aplikacja działa poprawnie
5. Usuń tabele backup po potwierdzeniu 