# Backfill y Smoke Tests - KNCHA Backend

Este documento describe el script de backfill para el campo `userId` en members y cómo ejecutar los smoke tests.

## Script de Backfill: `userId` en Members

### Propósito

El campo `userId` en los documentos de members (`events/{eventId}/members/{uid}`) es necesario para las queries de collection-group que permiten listar "mis eventos" (`GET /api/v1/me/events`).

Todos los flujos actuales de escritura ya incluyen este campo, pero este script actualiza cualquier documento antiguo que pueda faltar.

### Ubicación

```bash
scripts/backfill-member-userId.ts
```

### Uso

**Modo dry-run (recomendado primero):**
```bash
npm run backfill:members
```

Esto escanea todos los eventos y members, reportando cuántos documentos necesitan actualización **sin hacer cambios**.

**Modo ejecución (aplica cambios):**
```bash
npm run backfill:members -- --execute
```

### Requisitos

El script necesita las credenciales de Firebase Admin en `.env.local`:
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

### Output Esperado

```
Backfill member userId field
Mode: DRY-RUN (no changes)

Scanning 15 events...

[event123] member abc456 (Juan Pérez) missing userId
  → Would set: userId = "abc456"

============================================================
Summary:
  Total members scanned:    45
  Missing userId field:     1
============================================================

Re-run with --execute to apply changes.
```

## Smoke Tests

### Core Flow Test

Prueba el flujo completo de la API: feed público → votar → aceptar miembro.

**Prerequisitos:**
1. Servidor corriendo: `npm run dev`
2. Datos de demo: `npm run seed:demo`

**Ejecutar:**
```bash
npm run smoke:flow
```

**Lo que hace:**
1. Crea tokens personalizados para el organizador y jugador demo
2. Lee el feed público de eventos
3. Vota "sí" en una solicitud de unión pendiente
4. El organizador acepta la solicitud
5. Verifica que el roster se actualizó correctamente
6. Verifica que hay mensajes en el chat

### Scripts de Seed

**Crear usuario admin:**
```bash
npm run seed:admin -- usuario@ejemplo.com
```

**Crear catálogo de zonas:**
```bash
npm run seed:zones
```

**Crear evento y jugadores demo:**
```bash
npm run seed:demo
# O especificar email del organizador:
npm run seed:demo -- organizador@ejemplo.com
```

## Índices Firebase

Los índices de Firestore necesarios están definidos en `firestore.indexes.json`. El más relevante para members es:

```json
{
  "collectionGroup": "members",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

**Desplegar índices:**
```bash
firebase deploy --only firestore:indexes
```

## Notas

- El backfill es idempotente: puede ejecutarse múltiples veces sin problemas
- Los smoke tests usan Firebase real, no mocks
- Los tests unitarios (`npm test`) usan Firebase mockeado y no necesitan credenciales
