# Segunda Forma Normal (2FN)

## Reglas de la 2FN

1. Debe cumplir con **1FN** (atomicidad, unicidad, sin grupos repetitivos).
2. **Sin dependencias parciales** — Todos los atributos no clave deben depender de la **totalidad** de la clave primaria, no solo de una parte.
3. En tablas con **clave primaria simple** (una sola columna), no existe la posibilidad de dependencia parcial, por lo que cumplen automáticamente con 2FN.
4. En tablas con **clave primaria compuesta** (dos o más columnas), se debe verificar que cada atributo no clave dependa de TODA la clave, no de una parte.

---

## Tablas con PK simple (cumplen 2FN automáticamente)

Las siguientes tablas tienen una clave primaria de una sola columna (SERIAL o INTEGER), por lo que no existe la posibilidad de dependencia parcial. Todas están en 2FN.

---

## `zonas` — Zonas de recolección

**Forma Normal:** 2NF ✓ (PK simple: `zona_id`)

**Análisis:** La clave primaria es `zona_id` (una sola columna). No puede existir dependencia parcial porque no hay una parte de la PK de la cual depender parcialmente.

---

## `usuarios` — Usuarios del sistema

**Forma Normal:** 2NF ✓ (PK simple: `id`)

**Análisis:** Clave primaria de una sola columna. No hay dependencias parciales posibles.

---

## `empresas` — Registro legal de empresas

**Forma Normal:** 2NF ✓ (PK simple: `id_empresa`)

**Análisis:** Clave primaria de una sola columna. No hay dependencias parciales posibles.

---

## `perfil_recicladores` — Perfil de recicladores

**Forma Normal:** 2NF ✓ (PK simple: `reciclador_id`)

**Análisis:** Clave primaria de una sola columna. No hay dependencias parciales posibles.

---

## `perfil_empresas` — Perfil de empresas en la plataforma

**Forma Normal:** 2NF ✓ (PK simple: `empresa_id`)

**Análisis:** Clave primaria de una sola columna. No hay dependencias parciales posibles.

---

## `materiales` — Catálogo de materiales reciclables

**Forma Normal:** 2NF ✓ (PK simple: `material_id`)

**Análisis:** Clave primaria de una sola columna. No hay dependencias parciales posibles.

---

## `verificacion_documentos` — Auditoría de verificación de documentos

**Forma Normal:** 2NF ✓ (PK simple: `verificacion_id`)

**Análisis:** Clave primaria de una sola columna. No hay dependencias parciales posibles.

---

## `rutas` — Rutas de recolección

**Forma Normal:** 2NF ✓ (PK simple: `ruta_id`)

**Análisis:** Clave primaria de una sola columna. No hay dependencias parciales posibles.

---

## `camiones` — Camiones de recolección

**Forma Normal:** 2NF ✓ (PK simple: `camion_id`)

**Análisis:** Clave primaria de una sola columna. No hay dependencias parciales posibles.

---

## `solicitudes_recoleccion` — Solicitudes de recolección

**Forma Normal:** 2NF ✓ (PK simple: `solicitud_id`)

**Análisis:** Clave primaria de una sola columna. No hay dependencias parciales posibles.

---

## `recolecciones` — Recolecciones en campo

**Forma Normal:** 2NF ✓ (PK simple: `recoleccion_id`)

**Análisis:** Clave primaria de una sola columna. No hay dependencias parciales posibles.

---

## `liquidaciones_incentivos` — Liquidaciones de incentivos

**Forma Normal:** 2NF ✓ (PK simple: `liquidacion_id`)

**Análisis:** Clave primaria de una sola columna. No hay dependencias parciales posibles.

---

## `certificados_ambientales` — Certificados ambientales

**Forma Normal:** 2NF ✓ (PK simple: `certificado_id`)

**Análisis:** Clave primaria de una sola columna. No hay dependencias parciales posibles.

---

## Tablas con PK compuesta (requieren verificación de 2FN)

---

## `detalle_solicitud_materiales` — Detalle de materiales por solicitud

**Forma Normal:** 2NF ✓

| Columna | Tipo | PK | Dependencia |
|---------|------|----|-------------|
| `detalle_id` | SERIAL | PK (completa) | — |
| `solicitud_id` | INTEGER | FK | — |
| `material_id` | INTEGER | FK | — |
| `cantidad_aproximada_kg` | NUMERIC(6,2) | — | Depende de `(solicitud_id, material_id)` |

**Análisis de dependencias:**

La tabla tiene una PK formal `detalle_id` (SERIAL), pero además tiene una restricción `UNIQUE (solicitud_id, material_id)` que funciona como clave candidata compuesta.

- `cantidad_aproximada_kg` depende de la combinación `(solicitud_id, material_id)`.
- No depende solo de `solicitud_id` (una solicitud puede tener muchos materiales, cada uno con su cantidad).
- No depende solo de `material_id` (un material puede aparecer en muchas solicitudes, cada una con su cantidad).

**Conclusión:** No hay dependencias parciales. La cantidad depende de la combinación completa de solicitud y material.

**Reglas 2FN aplicadas:**
1. Cumple 1FN — ✓
2. La cantidad depende de la PK completa, no de una parte — ✓

---

## `detalles_certificado` — Detalles del certificado

**Forma Normal:** 2NF ✓

| Columna | Tipo | PK | Dependencia |
|---------|------|----|-------------|
| `certificado_id` | INTEGER | PK compuesta | — |
| `recoleccion_id` | INTEGER | PK compuesta | — |

**Análisis de dependencias:**

La clave primaria es compuesta: `(certificado_id, recoleccion_id)`.

Esta tabla **no tiene atributos no clave**. Solo contiene las dos FK que forman la PK compuesta. Al no haber atributos no clave, no existe la posibilidad de dependencia parcial.

**Conclusión:** No hay dependencias parciales porque no hay columnas no clave.

**Reglas 2FN aplicadas:**
1. Cumple 1FN — ✓
2. No hay atributos no clave, por lo tanto no puede haber dependencias parciales — ✓

---

## Resumen de 2FN

| Tabla | PK | ¿Cumple 2FN? | Observación |
|-------|----|--------------|-------------|
| `zonas` | Simple (zona_id) | ✓ | Automática |
| `usuarios` | Simple (id) | ✓ | Automática |
| `empresas` | Simple (id_empresa) | ✓ | Automática |
| `perfil_recicladores` | Simple (reciclador_id) | ✓ | Automática |
| `perfil_empresas` | Simple (empresa_id) | ✓ | Automática |
| `materiales` | Simple (material_id) | ✓ | Automática |
| `verificacion_documentos` | Simple (verificacion_id) | ✓ | Automática |
| `rutas` | Simple (ruta_id) | ✓ | Automática |
| `camiones` | Simple (camion_id) | ✓ | Automática |
| `solicitudes_recoleccion` | Simple (solicitud_id) | ✓ | Automática |
| `detalle_solicitud_materiales` | Simple (detalle_id) + UNIQUE compuesto | ✓ | Sin dependencias parciales |
| `recolecciones` | Simple (recoleccion_id) | ✓ | Automática |
| `liquidaciones_incentivos` | Simple (liquidacion_id) | ✓ | Automática |
| `certificados_ambientales` | Simple (certificado_id) | ✓ | Automática |
| `detalles_certificado` | Compuesta (certificado_id, recoleccion_id) | ✓ | Sin atributos no clave |
