# HU-PORTAL-001 - Auth en Portal Web (login, register, reset, session, guards)

> **Repo:** PORTAL | **Sprint:** 1 | **SP:** 8 | **MoSCoW:** Must  
> **Épica:** Seguridad y cuentas | **Feature:** FEA-PORTAL-AUTH

## Historia
**Como** usuario en portal web  
**quiero** registrarme, iniciar/cerrar sesión y recuperar contraseña  
**para** acceder a mi cuenta y dispositivos.

## Criterios de Aceptación

| ID | Criterio | Testeable |
|----|----------|-----------|
| AC-001 | Pantalla `/login`: formulario email/password, "¿Olvidaste contraseña?", validación cliente, error handling | Sí |
| AC-002 | Pantalla `/register`: datos cuenta, aceptación términos, llamada POST `/api/v1/auth/register`, redirige a login | Sí |
| AC-003 | Pantalla `/reset-password`: solicitud token (POST `/auth/forgot-password`) + confirmación (POST `/auth/reset-password`) | Sí |
| AC-004 | Guardado JWT (access + refresh) en httpOnly cookies / secure storage; refresh automático silencioso | Sí |
| AC-005 | Logout: llama POST `/api/v1/auth/logout`, limpia storage, redirige a login | Sí |
| AC-006 | Guards de ruta: redirige a `/login` si no autenticado; redirige a `/dashboard` si ya autenticado | Sí |

## Dependencias

| HU / Artefacto | Tipo | Descripción |
|----------------|------|-------------|
| HU-API-001, HU-API-002 | Bloqueante | Endpoints auth backend |
| RF-SEC-01..05,08,09 | Requisito | Base funcional |