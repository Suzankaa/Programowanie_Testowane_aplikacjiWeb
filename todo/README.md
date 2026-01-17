# TodoApp (Angular + .NET + SQL Server)

## Wymagania
- .NET SDK 9.0
- Node.js + npm
- Angular CLI (`npm i -g @angular/cli`)
- Lokalny SQL Server (Windows Auth)

## Konfiguracja bazy
Plik `api/appsettings.json` ma ConnectionString:
```
Server=WiktoriaKompute;Database=TodoApp;Trusted_Connection=True;TrustServerCertificate=True
```
Jesli Twoja instancja ma inna nazwe, zmien `Server=...`.

## Logowanie (bardzo proste)
- Rejestracja i login sa w `/api/auth/register` i `/api/auth/login`.
- Frontend zapisuje `userId` w localStorage i wysyla naglowek `X-User-Id` do API.
- To jest minimalne rozwiazanie bez sesji/JWT (na potrzeby prostego projektu).

Jesli uruchamialas API wczesniej, a baza juz istnieje, trzeba usunac baze `TodoApp`,
bo dodalismy nowa tabele uzytkownikow i pole `UserId` w TODO.

## Uruchomienie backendu
```
cd api
dotnet restore
dotnet run
```
API startuje pod `http://localhost:5294`.

## Uruchomienie frontendu
```
cd web
npm install
ng serve
```
Frontend: `http://localhost:4200`.

## Endpointy API
- GET `http://localhost:5294/api/todos`
- POST `http://localhost:5294/api/todos`
- PUT `http://localhost:5294/api/todos/{id}`
- DELETE `http://localhost:5294/api/todos/{id}`
