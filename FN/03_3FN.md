# Tercera Forma Normal (3FN)

## Reglas de la 3FN

1. Debe cumplir con **2FN** (sin dependencias parciales).
2. **Sin dependencias transitivas** — Ningún atributo no clave debe depender de otro atributo no clave. Todo atributo no clave debe depender **directamente** de la clave primaria.
3. Si un atributo no clave A determina otro atributo no clave B, entonces B debe estar en una tabla separada.
4. **Excepción:** Los campos calculados o derivados (total, fecha de actualización) no se consideran dependencias transitivas si su valor se recalcula a partir de los datos fuente.

---

## Tablas que cumplen 3FN

---

## `zonas` — Zonas de recolección

**Forma Normal:** 3NF ✓

| Columna | Depende de | Tipo |
|---------|-----------|------|
| `zona_id` | — | PK |
| `nombre_zona` | `zona_id` | Directa |
| `ciudad` | `zona_id` | Directa |
| `descripcion` | `zona_id` | Directa |
| `multiplicador` | `zona_id` | Directa |
| `activa` | `zona_id` | Directa |

**Análisis:** Todos los atributos no clave (`nombre_zona`, `ciudad`, `descripcion`, `multiplicador`, `activa`) dependen directamente de la clave primaria `zona_id`. No hay dependencias transitivas porque ningún atributo no clave determina a otro.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay dependencias transitivas — ✓

---

## `usuarios` — Usuarios del sistema

**Forma Normal:** 3NF ✓

| Columna | Depende de | Tipo |
|---------|-----------|------|
| `id` | — | PK |
| `documento` | `id` | Directa |
| `nombre` | `id` | Directa |
| `email` | `id` | Directa |
| `telefono` | `id` | Directa |
| `contrasena` | `id` | Directa |
| `rol` | `id` | Directa |
| `estado` | `id` | Directa |
| `activo` | `id` | Directa |
| `fecha_registro` | `id` | Directa |

**Análisis:** Todos los atributos no clave dependen directamente de `id`. No existe relación entre atributos no clave que cree una dependencia transitiva. Por ejemplo, `email` es UNIQUE pero no determina ningún otro atributo.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay dependencias transitivas — ✓

---

## `empresas` — Registro legal de empresas

**Forma Normal:** 3NF ✓

**Análisis:** Todos los atributos no clave (`nit`, `razon_social`, `direccion`, `telefono`, `email`, `contacto_nombre`, `activa`, `creada_en`) dependen directamente de `id_empresa`. `nit` es UNIQUE pero no determina ningún otro atributo.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay dependencias transitivas — ✓

---

## `perfil_recicladores` — Perfil de recicladores

**Forma Normal:** 3NF ✓

| Columna | Depende de | Tipo |
|---------|-----------|------|
| `reciclador_id` | — | PK |
| `cedula` | `reciclador_id` | Directa |
| `direccion` | `reciclador_id` | Directa |
| `zona_id` | `reciclador_id` | Directa |
| `foto_identificacion` | `reciclador_id` | Directa |

**Análisis:** Todos los atributos no clave dependen directamente de `reciclador_id`. `cedula` es UNIQUE pero no determina ningún otro atributo. `zona_id` es FK pero la información de la zona (nombre, ciudad, multiplicador) está en la tabla `zonas`, no aquí, evitando dependencias transitivas.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. Solo se almacena `zona_id` como FK, no los datos completos de la zona — ✓
3. No hay dependencias transitivas — ✓

---

## `perfil_empresas` — Perfil de empresas en la plataforma

**Forma Normal:** 3NF ✓

**Análisis:** Todos los atributos no clave dependen directamente de `empresa_id`. `nit` es UNIQUE pero no determina ningún otro atributo. `zona_id` es FK; los datos de la zona están en la tabla `zonas`.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay dependencias transitivas — ✓

---

## `materiales` — Catálogo de materiales reciclables

**Forma Normal:** 3NF ✓

**Análisis:** Todos los atributos no clave dependen directamente de `material_id`. `codigo` es UNIQUE y `nombre` es UNIQUE, pero ninguna de estas columnas determina otro atributo no clave.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay dependencias transitivas — ✓

---

## `verificacion_documentos` — Auditoría de verificación de documentos

**Forma Normal:** 3NF ✓

| Columna | Depende de | Tipo |
|---------|-----------|------|
| `verificacion_id` | — | PK |
| `usuario_id` | `verificacion_id` | Directa |
| `revisado_por` | `verificacion_id` | Directa |
| `estado` | `verificacion_id` | Directa |
| `motivo_rechazo` | `verificacion_id` | Directa |
| `fecha_revision` | `verificacion_id` | Directa |

**Análisis:** Todos los atributos dependen directamente de `verificacion_id`. `usuario_id` y `revisado_por` son FK que solo almacenan IDs, no datos completos de los usuarios.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay dependencias transitivas — ✓

---

## `rutas` — Rutas de recolección

**Forma Normal:** 3NF ✓

**Análisis:** Todos los atributos no clave (`codigo`, `nombre`, `zona_id`, `descripcion`, `activa`, `creada_en`) dependen directamente de `ruta_id`. `zona_id` es FK que solo almacena el ID, no los datos de la zona.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay dependencias transitivas — ✓

---

## `camiones` — Camiones de recolección

**Forma Normal:** 3NF ✓

**Análisis:** Todos los atributos no clave dependen directamente de `camion_id`. `placa` y `qr_code` son UNIQUE pero no determinan otros atributos. `ruta_id` es FK.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay dependencias transitivas — ✓

---

## `solicitudes_recoleccion` — Solicitudes de recolección

**Forma Normal:** 3NF ✓

| Columna | Depende de | Tipo |
|---------|-----------|------|
| `solicitud_id` | — | PK |
| `empresa_id` | `solicitud_id` | Directa |
| `reciclador_id` | `solicitud_id` | Directa |
| `zona_id` | `solicitud_id` | Directa |
| `estado_solicitud` | `solicitud_id` | Directa |
| `fecha_solicitud` | `solicitud_id` | Directa |
| `fecha_recoleccion` | `solicitud_id` | Directa |
| `observaciones` | `solicitud_id` | Directa |

**Análisis:** Todos los atributos no clave dependen directamente de `solicitud_id`. Las FK (`empresa_id`, `reciclador_id`, `zona_id`) solo almacenan identificadores, no datos completos de las tablas relacionadas.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay dependencias transitivas — ✓

---

## `detalle_solicitud_materiales` — Detalle de materiales por solicitud

**Forma Normal:** 3NF ✓

| Columna | Depende de | Tipo |
|---------|-----------|------|
| `detalle_id` | — | PK |
| `solicitud_id` | `detalle_id` | Directa |
| `material_id` | `detalle_id` | Directa |
| `cantidad_aproximada_kg` | `(solicitud_id, material_id)` | Directa |

**Análisis:** `cantidad_aproximada_kg` depende directamente de la combinación `(solicitud_id, material_id)` (clave candidata). No depende de otro atributo no clave.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay dependencias transitivas — ✓

---

## `recolecciones` — Recolecciones en campo

**Forma Normal:** 3NF ✓

**Análisis:** Todos los atributos no clave dependen directamente de `recoleccion_id`. Las FK (`solicitud_id`, `reciclador_id`, `registrado_por_id`, `empresa_id`, `material_id`, `ruta_id`, `camion_id`) solo almacenan IDs. La calidad del material es un valor directo, no depende de otro atributo no clave.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay dependencias transitivas — ✓

---

## `liquidaciones_incentivos` — Liquidaciones de incentivos

**Forma Normal:** 3NF ✓

| Columna | Depende de | Tipo |
|---------|-----------|------|
| `liquidacion_id` | — | PK |
| `recoleccion_id` | `liquidacion_id` | Directa |
| `valor_tarifa_aplicada` | `liquidacion_id` | Directa (calculado) |
| `multiplicador_calidad` | `liquidacion_id` | Directa |
| `multiplicador_zona` | `liquidacion_id` | Directa |
| `bonificacion_calidad` | `liquidacion_id` | Directa (calculado) |
| `total_pagado` | `liquidacion_id` | Directa (calculado) |
| `estado_pago` | `liquidacion_id` | Directa |
| `fecha_liquidacion` | `liquidacion_id` | Directa |

**Análisis de campos calculados:**

`total_pagado` se calcula como `valor_tarifa_aplicada + bonificacion_calidad`, y ambos se calculan a partir de datos de otras tablas (peso, precio base, calidad). Sin embargo:

- `total_pagado` es un **campo derivado** que se almacena para consultas rápidas y auditoría.
- No es una dependencia transitiva porque el cálculo se hace a partir de los datos fuente en el momento de la liquidación, no a partir de otro atributo no clave dentro de la misma tabla.
- `valor_tarifa_aplicada` y `bonificacion_calidad` se calculan de forma independiente desde `recolecciones` y `materiales`.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. Los campos calculados son derivados, no dependencias transitivas — ✓
3. No hay dependencias transitivas entre atributos no clave — ✓

---

## `certificados_ambientales` — Certificados ambientales

**Forma Normal:** 3NF ✓

| Columna | Depende de | Tipo |
|---------|-----------|------|
| `certificado_id` | — | PK |
| `empresa_id` | `certificado_id` | Directa |
| `emitido_por_id` | `certificado_id` | Directa |
| `fecha_emision` | `certificado_id` | Directa |
| `numero_radicado` | `certificado_id` | Directa |
| `periodo_inicio` | `certificado_id` | Directa |
| `periodo_fin` | `certificado_id` | Directa |
| `total_kg_certificado` | `certificado_id` | Directa (calculado) |
| `total_co2_evitado` | `certificado_id` | Directa (calculado) |
| `hash_verificacion` | `certificado_id` | Directa |
| `pdf_url` | `certificado_id` | Directa |
| `estado_certificado` | `certificado_id` | Directa |

**Análisis:** Todos los atributos dependen directamente de `certificado_id`. `total_kg_certificado` y `total_co2_evitado` son campos calculados a partir de las recolecciones incluidas, no dependencias transitivas.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay dependencias transitivas — ✓

---

## `detalles_certificado` — Detalles del certificado

**Forma Normal:** 3NF ✓

**Análisis:** La tabla no tiene atributos no clave (solo contiene las dos FK que forman la PK compuesta). Sin atributos no clave, no puede haber dependencias transitivas.

**Reglas 3FN aplicadas:**
1. Cumple 2FN — ✓
2. No hay atributos no clave, por lo tanto no puede haber dependencias transitivas — ✓

---

## Resumen de 3FN

| Tabla | ¿Cumple 3FN? | Observación |
|-------|--------------|-------------|
| `zonas` | ✓ | Sin dependencias transitivas |
| `usuarios` | ✓ | Sin dependencias transitivas |
| `empresas` | ✓ | Sin dependencias transitivas |
| `perfil_recicladores` | ✓ | FK solo almacenan IDs |
| `perfil_empresas` | ✓ | FK solo almacenan IDs |
| `materiales` | ✓ | Sin dependencias transitivas |
| `verificacion_documentos` | ✓ | FK solo almacenan IDs |
| `rutas` | ✓ | FK solo almacenan IDs |
| `camiones` | ✓ | FK solo almacenan IDs |
| `solicitudes_recoleccion` | ✓ | FK solo almacenan IDs |
| `detalle_solicitud_materiales` | ✓ | Dependencia directa de la PK |
| `recolecciones` | ✓ | FK solo almacenan IDs |
| `liquidaciones_incentivos` | ✓ | Campos calculados, no transitivos |
| `certificados_ambientales` | ✓ | Campos calculados, no transitivos |
| `detalles_certificado` | ✓ | Sin atributos no clave |

Todas las tablas cumplen con la Tercera Forma Normal (3FN).
