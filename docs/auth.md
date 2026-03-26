# Autentykacja HOMMM

## Jak działa

System autentykacji oparty na:
- **Whitelist emaili** — tabela `Admin` w bazie danych
- **Secret code** — wspólny kod dostępu (zmienna `ADMIN_SECRET_CODE`)
- **JWT** — token podpisany kluczem `JWT_SECRET`, przechowywany w httpOnly cookie
- **Sesje w DB** — tabela `Session` z tokenem i datą wygaśnięcia

## Logowanie

1. Admin wchodzi na `/admin/login`
2. Wpisuje email + kod dostępu
3. `POST /api/auth/login` sprawdza:
   - Czy `secretCode` === `ADMIN_SECRET_CODE`
   - Czy email istnieje w tabeli `Admin` i `isActive === true`
4. Jeśli OK: tworzy JWT (ważny 7 dni), sesję w DB, ustawia httpOnly cookie
5. Redirect na `/admin/dashboard`

## Ochrona stron

`middleware.ts` przechwytuje wszystkie requesty do `/admin/*` (oprócz `/admin/login`):
- Sprawdza cookie `admin_session`
- Weryfikuje JWT (podpis + expiry)
- Sprawdza sesję w DB (czy istnieje, czy nie wygasła, czy admin aktywny)
- Brak/nieważny token → redirect na `/admin/login`

## Wylogowanie

`POST /api/auth/logout`:
- Usuwa sesję z DB
- Usuwa cookie

## Jak dodać admina

1. Prisma Studio: `npm run db:studio`
2. Dodaj rekord w tabeli `Admin` z emailem
3. Lub bezpośrednio SQL:
   ```sql
   INSERT INTO "Admin" (id, email, name, "isActive", "createdAt")
   VALUES (gen_random_uuid()::text, 'nowy@email.com', 'Imię', true, now());
   ```

## Zmienne środowiskowe

| Zmienna | Opis |
|---------|------|
| `JWT_SECRET` | Klucz do podpisywania JWT. Zmień na losowy ciąg 32+ znaków |
| `ADMIN_SECRET_CODE` | Kod dostępu do panelu. Udostępnij tylko adminom |
| `ADMIN_EMAIL` | Email domyślnego admina (używany w seedzie) |
