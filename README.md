# SOMNGUARD — React + TypeScript + Vite

Frontend web para monitoreo de somnolencia al volante. Migrado a **Arquitectura por Características (Feature-Based)** + cliente HTTP centralizado sin URLs hardcodeadas.

## Stack

- **Vite 8.2.2** + `@vitejs/plugin-react 6.1.0`
- **React 19.2.8** + **TypeScript 6.0.2**
- Router: `react-router-dom 7.18.4` + Context API + `localStorage` + `fetch` nativo
- Lint: `oxlint`

## Estructura del proyecto

```
Somnguard-web/
├── .env                          # VITE_API_URL=http://localhost:8080/api/v1 (no se commitea)
├── index.html
├── vite.config.ts
├── public/
│   ├── favicon.svg
│   └── SOMNGUARD_APK_EN_PROCESO.pdf
└── src/
    ├── main.tsx                  # Entry: StrictMode -> AppProviders -> App
    ├── App.tsx                   # @deprecated shim -> re-export de app/App.tsx
    ├── app/                      # Configuración global
    │   ├── App.tsx               # Orquestador: auth ? <Dashboard> : <Hero> + modales + sync logo
    │   └── providers/AppProviders.tsx # Composición ToastProvider + AuthProvider
    ├── features/                 # Vertical slices por dominio (dueñas de su lógica)
    │   ├── auth/
    │   │   ├── api/auth.api.ts   # Service puro: loginApi, registerApi, verifyEmailApi, refreshApi, logoutApi
    │   │   ├── model/AuthContext.tsx # Estado global auth, persistencia token/refresh, expone login/register/verifyEmail/forgot/refresh/logout
    │   │   └── ui/AuthModals.tsx # 3 modales (Login / Register / Forgot+Verify) con validación inline
    │   ├── dashboard/
    │   │   ├── api/dashboard.api.ts # fetchDashboardStats()
    │   │   └── ui/Dashboard.tsx  # Panel + charts canvas (línea/barras) + historial
    │   └── landing/
    │       └── ui/Hero.tsx       # Hero landing + descarga APK
    ├── shared/                   # Reutilizable, sin lógica de negocio, nunca importa de features
    │   ├── api/
    │   │   ├── client.ts         # httpRequest<T>(url, method, data) genérico (fetch + Bearer + 204 + error {code,message,trace_id})
    │   │   └── endpoints.ts      # urlBase desde VITE_API_URL + endpoints.auth.* + HTTP enum
    │   ├── ui/
    │   │   ├── Header.tsx        # Header sticky con estado auth
    │   │   ├── SomnguardLogo.tsx # SVG Sync (header/hero) y Static (modal)
    │   │   └── Toast.tsx         # ToastProvider global
    │   ├── hooks/
    │   │   └── useSyncedLogoAnimation.ts # Motor: header líder -> hero seguidor 70ms delay
    │   └── lib/
    │       └── validation.ts     # Regex + sanitize + validateLogin/Register/Forgot (firstName,lastName,phone)
    ├── entities/
    │   └── user/model/types.ts   # Re-export User/DashboardStats (tipos de dominio)
    ├── services/
    │   └── api.ts                # Facade compatibilidad: re-exporta desde features/auth/api y dashboard/api
    ├── components/               # @deprecated shims -> shared/ui y features (no usar)
    ├── context/                  # @deprecated shim -> features/auth/model
    ├── hooks/                    # @deprecated shim -> shared/hooks
    ├── utils/                    # @deprecated shim -> shared/lib
    ├── assets/                   # hero.png, react.svg
    └── styles/
        └── globals.css           # Variables --accent, --bg-primary, responsive 968/640
```

## Qué va en cada carpeta

| Carpeta | Qué contiene | Regla |
|---|---|---|
| `src/app/` | `App.tsx` orquestador y `providers/AppProviders.tsx`. Solo compone features. | Puede importar `features`, `shared`, `services`. Nunca al revés. |
| `src/features/auth/` | Todo de **autenticación**: `api/` (llamadas HTTP puras), `model/` (Context + persistencia `somnguard_user/token/refresh_token`), `ui/` (modales). | Dueña de su dominio. No importa de otras `features`. |
| `src/features/auth/api/` | `loginApi(email,password)`, `registerApi({firstName,lastName,email,phone,password})`, `verifyEmailApi({token})`, `refreshApi()`, `logoutApi()`. Solo `httpRequest + endpoints + HTTP`. Sin DOM. | Retorna `Promise`, la UI decide `loadData`. |
| `src/features/dashboard/` | `api/` solo `fetchDashboardStats()`, `ui/` render canvas. | Igual que auth. |
| `src/features/landing/` | Solo UI estática `Hero`. | Sin api. |
| `src/shared/api/` | `client.ts` `httpRequest<T>` (equivalente a `Frontend-Job/assets/js/Services/api.js`) y `endpoints.ts` (`urlBase` desde `.env` + `endpoints` + `HTTP` como `conts.js`). | Nunca hardcodea URL. Centraliza `VITE_API_URL`. |
| `src/shared/ui/` | Componentes dumb reutilizables (`Header`, `SomnguardLogo`, `Toast`). | Sin lógica de negocio. |
| `src/shared/hooks/` | Hooks genéricos (`useSyncedLogoAnimation`). | Reutilizable. |
| `src/shared/lib/` | `validation.ts`: `firstNameRegex/lastNameRegex/phoneRegex`, `sanitizeFirstName/LastName/Phone`, `validateRegister(firstName,lastName,email,phone,password,confirm)` con `RegisterPayload {firstName,lastName,email,phone,password}` del JSON pedido. | Sin imports de features. |
| `src/entities/user/` | Tipos de dominio `User {name,firstName,lastName,email,phone,token,refreshToken}`. | Solo tipos. |
| `src/services/` | **Facade** para compatibilidad: re-exporta `features/auth/api` y `dashboard/api`. Nuevo código debe importar directo de `features/...`. | Transversal, no lógica. |
| `src/styles/`, `src/assets/` | Estilos globales y Media. | - |
| `src/components|context|hooks|utils` | **Shims @deprecated** que re-exportan a `shared/features`. Se eliminarán en major. | No añadir código nuevo. |

### Reglas de dependencia

```
app -> features, shared, services, entities
features -> shared, services, entities (nunca entre features)
shared -> nada de features/app
entities -> solo tipos
services -> re-export de features
```

## Cómo funciona (flujo HTTP)

1. **`.env:5`** `VITE_API_URL=http://localhost:8080/api/v1` -> `src/shared/api/endpoints.ts:6` `urlBase = import.meta.env.VITE_API_URL.replace(/\/$/, '')` (nunca expuesta hardcodeada).
2. **`src/shared/api/client.ts:7`** `httpRequest<T>(url, method, data)` arma `headers {Accept, Content-Type, Authorization: Bearer <token>}`, `body: JSON.stringify(data)`, `fetch`, valida `!response.ok` parseando `{error:{code,message,details,trace_id}}`, maneja `204 -> null`.
3. **`src/shared/api/endpoints.ts:14`** `endpoints.auth = {verifyEmail, register, refresh, logout, login}` + `HTTP = {GET,POST,PUT,DELETE}` (igual a `conts.js`).
4. **`src/features/auth/api/auth.api.ts:40`** cada función es una línea: `httpRequest<User>(endpoints.auth.login, HTTP.POST, {email,password})`. Patrón idéntico a tu `product.js` (`getAllProducts`/`createProduct`).
5. **`src/features/auth/model/AuthContext.tsx:6`** consume el service, hace `setUser` + `persist` en `localStorage` (`somnguard_user`, `somnguard_token`, `somnguard_refresh_token`), expone `isAuthenticated`.
6. **`src/app/App.tsx:22`** usa `useAuth()` y `fetchDashboardStats()` con `INITIAL_STATS` fallback si falla, render condicional `!isAuthenticated ? <Hero> : <Dashboard stats ?? INITIAL_STATS>`.

### Auth-controller mapeado 1:1

```
POST /api/v1/auth/verify-email  -> verifyEmailApi({token})         src/features/auth/api/auth.api.ts:58
POST /api/v1/auth/register      -> registerApi(RegisterPayload)     src/features/auth/api/auth.api.ts:49
POST /api/v1/auth/refresh       -> refreshApi()                     src/features/auth/api/auth.api.ts:68
POST /api/v1/auth/logout        -> logoutApi()                      src/features/auth/api/auth.api.ts:76
POST /api/v1/auth/login         -> loginApi(email,password)         src/features/auth/api/auth.api.ts:40
```

### Validación registro (JSON pedido)

```
{
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string"
}
```
Validado en `src/shared/lib/validation.ts:94` `validateRegister(firstName,lastName,email,phone,password,confirm)` + `sanitizePhone` (7-15 dígitos, `+` opcional) y `confirm` extra UX. Errores por campo `RegisterErrors`.

## Variables de entorno

```env
# src/shared/api/endpoints.ts lo lee, httpRequest lo usa
VITE_API_URL=http://localhost:8080/api/v1
```
Sin `VITE_USE_MOCK`. Todo va contra backend real. Si falta, `client.ts` lanza `API_URL no configurado`.

## Cómo ejecutar

**Requisitos:** Node 18+

```bash
cd somnguard-portal
cp .env.example .env
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build -> dist/
npm run preview  # vite preview
npm run lint     # oxlint
```

### Probar auth

1. Asegura backend en `VITE_API_URL` con los 5 endpoints.
2. `npm run dev` -> `Registrarse` pide `firstName, lastName, email, phone, password, confirm` -> `POST /auth/register` -> guarda `token` -> auto-login.
3. `Iniciar sesión` -> `POST /auth/login`.
4. `Cerrar sesión` -> `POST /auth/logout` + limpia storage.

## Migración

De plano (`components/context/hooks/utils` + `services/api.ts` monolítico con mocks y `admin@somnguard.com`) a feature-based (`app/features/shared/entities`) + `shared/api` cliente centralizado sin datos quemados. Shims en `src/components|context|hooks|utils|App.tsx` mantienen compatibilidad.

## Routing por rol — ejemplo incluido

El proyecto ahora incluye una SPA con routing por rol:

```text
/admin/*  -> AdminLayout
/user/*   -> UserLayout
```

Guards disponibles:

- `RequireAuth`: sesión obligatoria.
- `RequireRole`: rol permitido.
- `RequirePermission`: permiso concreto.

Consulta `docs/RBAC-ARCHITECTURE.md` y `docs/ADDING-MODULES.md` para ver el flujo y cómo ampliar módulos/roles.

