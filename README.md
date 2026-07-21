# Green Loop — Recycling Platform Database

Database for a recycling platform that connects waste generators with authorized recyclers in the Atlántico region, Colombia.

## Stack

| | |
| :-- | :-- |
| **Database** | PostgreSQL 18+ |
| **Container** | `greenloop` (Docker, group: `local`) |

### Docker Connection

| Property   | Value        |
| :--------- | :----------- |
| Host       | `127.0.0.1`  |
| Port       | `5432`       |
| User       | `postgres`   |
| Password   | `postgres`   |
| Database   | `postgres`   |

## Database Schema

```
greenloop/
├── 📁 Catalogs
│   ├── zonas                   Collection zones with rate multiplier
│   ├── usuarios                System users (admin, recycler, company)
│   ├── empresas                Legal entity registry
│   ├── materiales              Recyclable materials with code, price, CO₂ factor
│   ├── rutas                   Collection routes per zone
│   └── camiones                Trucks with QR code and capacity
├── 📁 Profiles
│   ├── perfil_recicladores     Recycler-specific data
│   └── perfil_empresas         Company platform profiles
└── 📁 Operations
    ├── verificacion_documentos  Document review audit trail
    ├── solicitudes_recoleccion  Collection requests
    │   └── detalle_solicitud_materiales
    ├── recolecciones            Field collection records (weight, GPS, quality)
    ├── liquidaciones_incentivos Recycler payment calculations
    └── certificados_ambientales Environmental certificates with SHA-256 hash
        └── detalles_certificado
```

### Catalogs

| Table | Description |
| :---- | :---------- |
| `zonas` | Collection zones with rate multiplier |
| `usuarios` | System users (admin, recycler, company) |
| `empresas` | Legal entity registry |
| `materiales` | Recyclable materials with code, price, and CO₂ factor |
| `rutas` | Collection routes per zone |
| `camiones` | Trucks with QR code and capacity |

### Profiles

| Table | Description |
| :---- | :---------- |
| `perfil_recicladores` | Recycler-specific data (ID, address, zone, photo) |
| `perfil_empresas` | Company platform profiles (NIT, legal docs) |

### Operations

| Table | Description |
| :---- | :---------- |
| `verificacion_documentos` | Document review history by admins |
| `solicitudes_recoleccion` | Collection requests created by companies |
| `detalle_solicitud_materiales` | Materials and quantities per request |
| `recolecciones` | Field collection records (weight, GPS, quality) |
| `liquidaciones_incentivos` | Recycler payment calculations |
| `certificados_ambientales` | Environmental certificates with SHA-256 hash |
| `detalles_certificado` | Collections included in each certificate |

## Project Files

| File | Purpose |
| :--- | :------ |
| `Database/01_enums.sql` | ENUM types |
| `Database/02_tablas.sql` | Tables and indexes |
| `Database/03_seed_data.sql` | Initial data |
| `Database/04_funciones.sql` | System functions |
| `Database/05_vistas.sql` | Views |
| `Database/06_consultas.sql` | Report queries |
| `MER-green-loop.pgerd` | Entity-relationship diagram |

## Execution Order

```bash
docker exec -i greenloop psql -U postgres -d postgres -f Database/01_enums.sql
docker exec -i greenloop psql -U postgres -d postgres -f Database/02_tablas.sql
docker exec -i greenloop psql -U postgres -d postgres -f Database/03_seed_data.sql
docker exec -i greenloop psql -U postgres -d postgres -f Database/04_funciones.sql
docker exec -i greenloop psql -U postgres -d postgres -f Database/05_vistas.sql
```

`06_consultas.sql` is optional (SELECT-only reports).

## Conventions

- Explicit `public` schema on all tables
- Idempotency with `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`
- `TIMESTAMP` without time zone
- ENUMs created with direct `CREATE TYPE`
- Seed data guarded with `WHERE NOT EXISTS`

## Main Functions

| Function | Description |
| :------- | :---------- |
| `registrar_reciclador` / `registrar_empresa` | Create user with profile |
| `actualizar_reciclador` / `actualizar_empresa` | Update user profile data |
| `eliminar_usuario` | Delete user with cascade |
| `crear_solicitud` | Company requests material collection |
| `cambiar_estado_solicitud` | Change request status with validation |
| `eliminar_solicitud` | Delete pending or cancelled requests |
| `revisar_documentos_usuario` | Admin approves or rejects user documents |
| `asignar_reciclador_por_zona` | Assign least loaded recycler in zone |
| `registrar_recoleccion` | Record collection and auto-calculate payment |
| `liquidar_recoleccion` | Calculate rate + quality bonus |
| `generar_certificado` | Generate environmental certificate with SHA-256 hash |
