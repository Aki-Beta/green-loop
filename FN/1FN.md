# Primera Forma Normal (1FN)

## Reglas de la 1FN

1. **Atomicidad** — Cada columna debe contener un solo valor indivisible. No se permiten listas, arreglos ni objetos JSON.
2. **Unicidad** — Cada fila debe ser identificable de forma única mediante una clave primaria.
3. **Homogeneidad** — Todos los valores de una columna deben ser del mismo tipo de dato.
4. **Sin grupos repetitivos** — No debe haber columnas que almacenen múltiples valores del mismo tipo (ej: telefono1, telefono2, telefono3). Los datos repetitivos se separan en tablas hijas.

---

## `zonas` — Zonas de recolección

**Descripción:** Catálogo de zonas geográficas donde operan los recicladores, cada una con un multiplicador de tarifa.

**Forma Normal:** 1NF ✓

**Columnas:**

- `zona_id` (`SERIAL`, PK)
  Identificador único de la zona. Se genera automáticamente.
- `nombre_zona` (`VARCHAR(50)`, NOT NULL, UNIQUE)
  Nombre de la zona (ej: Barranquilla, Soledad).
- `ciudad` (`VARCHAR(50)`, NOT NULL)
  Ciudad a la que pertenece la zona.
- `descripcion` (`TEXT`, nullable)
  Descripción opcional de la zona.
- `multiplicador` (`NUMERIC(3,2)`, DEFAULT 1.00)
  Factor de ajuste de tarifa para la zona.
- `activa` (`BOOLEAN`, DEFAULT true)
  Indica si la zona está operativa.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓ (cada una almacena un solo valor)
2. Cada fila se identifica de forma única por `zona_id` — ✓
3. No hay grupos repetitivos — ✓

---

## `usuarios` — Usuarios del sistema

**Descripción:** Almacena la información básica de todas las personas que usan la plataforma (administradores, recicladores y empresas).

**Forma Normal:** 1NF ✓

**Columnas:**

- `id` (`INTEGER`, PK, IDENTITY)
  Identificador único del usuario. Se genera automáticamente.
- `documento` (`VARCHAR(20)`, UNIQUE, nullable)
  Número de documento de identidad (cédula o NIT).
- `nombre` (`VARCHAR(100)`, NOT NULL)
  Nombre completo del usuario.
- `email` (`VARCHAR(100)`, UNIQUE, NOT NULL)
  Correo electrónico. No puede repetirse entre usuarios.
- `telefono` (`VARCHAR(20)`, nullable)
  Número de teléfono de contacto.
- `contrasena` (`VARCHAR(255)`, NOT NULL)
  Hash de la contraseña (nunca texto plano).
- `rol` (`rol_usuario`, NOT NULL)
  Tipo de usuario: administrador, reciclador o empresa.
- `estado` (`estado_verificacion`, DEFAULT 'pendiente')
  Estado de verificación de documentos: pendiente, aprobado o rechazado.
- `activo` (`BOOLEAN`, DEFAULT true)
  Indica si el usuario está activo en el sistema.
- `fecha_registro` (`TIMESTAMP`, DEFAULT CURRENT_TIMESTAMP)
  Fecha y hora de registro.

**Reglas 1FN aplicadas:**
1. Cada columna contiene un solo valor atómico — ✓
2. Cada fila se identifica de forma única por `id` — ✓
3. No hay grupos repetitivos — ✓ (los perfiles específicos están en tablas separadas)

---

## `empresas` — Registro legal de empresas

**Descripción:** Almacena el registro legal de las empresas como entidades jurídicas, independientemente de si tienen un perfil en la plataforma.

**Forma Normal:** 1NF ✓

**Columnas:**

- `id_empresa` (`SERIAL`, PK)
  Identificador único de la empresa.
- `nit` (`VARCHAR(20)`, UNIQUE, NOT NULL)
  NIT de la empresa. No puede repetirse.
- `razon_social` (`VARCHAR(150)`, NOT NULL)
  Razón social o nombre legal de la empresa.
- `direccion` (`TEXT`, nullable)
  Dirección física de la empresa.
- `telefono` (`VARCHAR(20)`, nullable)
  Teléfono de contacto.
- `email` (`VARCHAR(100)`, nullable)
  Correo electrónico de contacto.
- `contacto_nombre` (`VARCHAR(100)`, nullable)
  Nombre de la persona de contacto.
- `activa` (`BOOLEAN`, DEFAULT true)
  Indica si la empresa está activa.
- `creada_en` (`TIMESTAMP`, DEFAULT CURRENT_TIMESTAMP)
  Fecha de registro de la empresa.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por `id_empresa` — ✓
3. No hay grupos repetitivos — ✓

---

## `perfil_recicladores` — Perfil de recicladores

**Descripción:** Datos específicos de los usuarios que tienen rol de reciclador. Relación 1:1 con la tabla `usuarios`.

**Forma Normal:** 1NF ✓

**Columnas:**

- `reciclador_id` (`INTEGER`, PK, FK → `usuarios.id` ON DELETE CASCADE)
  Identificador del reciclador. Es el mismo ID de la tabla `usuarios`.
- `cedula` (`VARCHAR(20)`, UNIQUE, NOT NULL)
  Número de cédula del reciclador. No puede repetirse.
- `direccion` (`VARCHAR(150)`, NOT NULL)
  Dirección de residencia o trabajo.
- `zona_id` (`INTEGER`, NOT NULL, FK → `zonas.zona_id`)
  Zona de trabajo asignada al reciclador.
- `foto_identificacion` (`VARCHAR(255)`, NOT NULL)
  Ruta de la foto del documento de identidad.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por `reciclador_id` — ✓
3. No hay grupos repetitivos — ✓

---

## `perfil_empresas` — Perfil de empresas en la plataforma

**Descripción:** Datos específicos de los usuarios que tienen rol de empresa en la plataforma. Relación 1:1 con la tabla `usuarios`.

**Forma Normal:** 1NF ✓

**Columnas:**

- `empresa_id` (`INTEGER`, PK, FK → `usuarios.id` ON DELETE CASCADE)
  Identificador de la empresa. Es el mismo ID de la tabla `usuarios`.
- `nit` (`VARCHAR(20)`, UNIQUE, NOT NULL)
  NIT de la empresa. No puede repetirse.
- `razon_social` (`VARCHAR(150)`, NOT NULL)
  Razón social de la empresa.
- `direccion` (`VARCHAR(150)`, NOT NULL)
  Dirección de la empresa.
- `zona_id` (`INTEGER`, FK → `zonas.zona_id`)
  Zona donde opera la empresa.
- `documento_camara_comercio` (`VARCHAR(255)`, NOT NULL)
  Ruta del archivo de la cámara de comercio.
- `licencia_ambiental` (`VARCHAR(255)`, NOT NULL)
  Ruta del archivo de la licencia ambiental.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por `empresa_id` — ✓
3. No hay grupos repetitivos — ✓

---

## `materiales` — Catálogo de materiales reciclables

**Descripción:** Lista de materiales reciclables que se pueden recolectar, con su precio base y factor de CO₂ evitado.

**Forma Normal:** 1NF ✓

**Columnas:**

- `material_id` (`SERIAL`, PK)
  Identificador único del material.
- `codigo` (`VARCHAR(10)`, UNIQUE, nullable)
  Código corto del material (ej: PET, CART, VIDR).
- `nombre` (`VARCHAR(50)`, UNIQUE, NOT NULL)
  Nombre del material (ej: Plástico, Vidrio).
- `descripcion` (`TEXT`, nullable)
  Descripción del material y ejemplos.
- `precio_base_por_kg` (`DECIMAL(10,2)`, nullable)
  Precio base en COP por kilogramo.
- `factor_co2_evitado` (`DECIMAL(6,4)`, nullable)
  Factor de CO₂ evitado por kg reciclado.
- `activo` (`BOOLEAN`, DEFAULT true)
  Indica si el material está disponible para recolección.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por `material_id` — ✓
3. No hay grupos repetitivos — ✓

---

## `verificacion_documentos` — Auditoría de verificación de documentos

**Descripción:** Historial de cada revisión que hace el administrador sobre los documentos de un usuario.

**Forma Normal:** 1NF ✓

**Columnas:**

- `verificacion_id` (`SERIAL`, PK)
  Identificador único de la verificación.
- `usuario_id` (`INTEGER`, NOT NULL, FK → `usuarios.id` ON DELETE CASCADE)
  Usuario cuyos documentos fueron revisados.
- `revisado_por` (`INTEGER`, FK → `usuarios.id`)
  Administrador que realizó la revisión.
- `estado` (`estado_verificacion`, NOT NULL)
  Estado asignado: pendiente, aprobado o rechazado.
- `motivo_rechazo` (`TEXT`, nullable)
  Motivo si fue rechazado.
- `fecha_revision` (`TIMESTAMP`, DEFAULT CURRENT_TIMESTAMP)
  Fecha y hora de la revisión.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por `verificacion_id` — ✓
3. No hay grupos repetitivos — ✓

---

## `rutas` — Rutas de recolección

**Descripción:** Rutas definidas para la recolección de materiales, asignadas a una zona geográfica.

**Forma Normal:** 1NF ✓

**Columnas:**

- `ruta_id` (`SERIAL`, PK)
  Identificador único de la ruta.
- `codigo` (`VARCHAR(30)`, UNIQUE, NOT NULL)
  Código único de la ruta (ej: RUTA-001).
- `nombre` (`VARCHAR(100)`, NOT NULL)
  Nombre descriptivo de la ruta.
- `zona_id` (`INTEGER`, NOT NULL, FK → `zonas.zona_id`)
  Zona a la que pertenece la ruta.
- `descripcion` (`TEXT`, nullable)
  Descripción de la ruta.
- `activa` (`BOOLEAN`, DEFAULT true)
  Indica si la ruta está operativa.
- `creada_en` (`TIMESTAMP`, DEFAULT CURRENT_TIMESTAMP)
  Fecha de creación de la ruta.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por `ruta_id` — ✓
3. No hay grupos repetitivos — ✓

---

## `camiones` — Camiones de recolección

**Descripción:** Vehículos registrados para la recolección de materiales, cada uno con un código QR y asignado a una ruta.

**Forma Normal:** 1NF ✓

**Columnas:**

- `camion_id` (`SERIAL`, PK)
  Identificador único del camión.
- `placa` (`VARCHAR(10)`, UNIQUE, NOT NULL)
  Placa del vehículo. No puede repetirse.
- `qr_code` (`VARCHAR(50)`, UNIQUE, NOT NULL)
  Código QR único del camión.
- `capacidad_kg` (`NUMERIC(10,2)`, NOT NULL)
  Capacidad de carga en kilogramos.
- `ruta_id` (`INTEGER`, NOT NULL, FK → `rutas.ruta_id`)
  Ruta a la que está asignado el camión.
- `activo` (`BOOLEAN`, DEFAULT true)
  Indica si el camión está operativo.
- `fecha_registro` (`TIMESTAMP`, DEFAULT CURRENT_TIMESTAMP)
  Fecha de registro del camión.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por `camion_id` — ✓
3. No hay grupos repetitivos — ✓

---

## `solicitudes_recoleccion` — Solicitudes de recolección

**Descripción:** Solicitudes creadas por empresas para que un reciclador recoja materiales. Es la entidad central del negocio.

**Forma Normal:** 1NF ✓

**Columnas:**

- `solicitud_id` (`SERIAL`, PK)
  Identificador único de la solicitud.
- `empresa_id` (`INTEGER`, NOT NULL, FK → `usuarios.id` ON DELETE CASCADE)
  Empresa que realiza la solicitud.
- `reciclador_id` (`INTEGER`, FK → `usuarios.id` ON DELETE SET NULL)
  Reciclador asignado a la solicitud. Se asigna después.
- `zona_id` (`INTEGER`, NOT NULL, FK → `zonas.zona_id`)
  Zona donde se debe realizar la recolección.
- `estado_solicitud` (`VARCHAR(20)`, NOT NULL, DEFAULT 'pendiente', CHECK: pendiente, asignada, en_proceso, completada, cancelada)
  Estado actual de la solicitud.
- `fecha_solicitud` (`TIMESTAMP`, DEFAULT CURRENT_TIMESTAMP)
  Fecha y hora en que se creó la solicitud.
- `fecha_recoleccion` (`TIMESTAMP`, nullable)
  Fecha y hora en que se completó la recolección.
- `observaciones` (`TEXT`, nullable)
  Notas u observaciones sobre la solicitud.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por `solicitud_id` — ✓
3. No hay grupos repetitivos — ✓ (los materiales se manejan en `detalle_solicitud_materiales`)

---

## `detalle_solicitud_materiales` — Detalle de materiales por solicitud

**Descripción:** Materiales y cantidades solicitadas en cada recolección. Permite que una solicitud tenga múltiples materiales.

**Forma Normal:** 1NF ✓

**Columnas:**

- `detalle_id` (`SERIAL`, PK)
  Identificador único del detalle.
- `solicitud_id` (`INTEGER`, NOT NULL, FK → `solicitudes_recoleccion.solicitud_id` ON DELETE CASCADE)
  Solicitud a la que pertenece este detalle.
- `material_id` (`INTEGER`, NOT NULL, FK → `materiales.material_id`)
  Material solicitado.
- `cantidad_aproximada_kg` (`NUMERIC(6,2)`, CHECK: > 0)
  Cantidad aproximada en kilogramos.
- Restricción adicional: `UNIQUE (solicitud_id, material_id)` — no se puede solicitar el mismo material dos veces en la misma solicitud.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por `detalle_id` — ✓
3. No hay grupos repetitivos — ✓

---

## `recolecciones` — Recolecciones en campo

**Descripción:** Registro de cada recolección real realizada: quién recogió, qué material, cuánto peso, calidad del material y ubicación GPS.

**Forma Normal:** 1NF ✓

**Columnas:**

- `recoleccion_id` (`SERIAL`, PK)
  Identificador único de la recolección.
- `solicitud_id` (`INTEGER`, FK → `solicitudes_recoleccion.solicitud_id` ON DELETE SET NULL)
  Solicitud que originó esta recolección.
- `reciclador_id` (`INTEGER`, NOT NULL, FK → `usuarios.id`)
  Reciclador que realizó la recolección.
- `registrado_por_id` (`INTEGER`, NOT NULL, FK → `usuarios.id`)
  Usuario que registró la recolección en el sistema.
- `empresa_id` (`INTEGER`, NOT NULL, FK → `usuarios.id`)
  Empresa dueña de los materiales recolectados.
- `material_id` (`INTEGER`, NOT NULL, FK → `materiales.material_id`)
  Material recolectado.
- `ruta_id` (`INTEGER`, FK → `rutas.ruta_id`)
  Ruta utilizada para la recolección (opcional).
- `camion_id` (`INTEGER`, FK → `camiones.camion_id`)
  Camión utilizado para la recolección (opcional).
- `codigo_qr` (`VARCHAR(50)`, nullable)
  Código QR registrado en la recolección (opcional).
- `peso_bruto_kg` (`DECIMAL(10,2)`, NOT NULL, CHECK: > 0)
  Peso bruto en kilogramos.
- `peso_neto_kg` (`DECIMAL(10,2)`, NOT NULL, CHECK: > 0)
  Peso neto en kilogramos (descontando tara).
- `calidad_material` (`VARCHAR(20)`, NOT NULL, DEFAULT 'Aceptable', CHECK: Excelente, Aceptable, Contaminado)
  Calidad del material recolectado.
- `latitud` (`DECIMAL(10,8)`, nullable)
  Latitud de la ubicación de recolección.
- `longitud` (`DECIMAL(11,8)`, nullable)
  Longitud de la ubicación de recolección.
- `observaciones` (`TEXT`, nullable)
  Notas adicionales sobre la recolección.
- `fecha_recoleccion` (`TIMESTAMP`, DEFAULT CURRENT_TIMESTAMP)
  Fecha y hora de la recolección.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por `recoleccion_id` — ✓
3. No hay grupos repetitivos — ✓

---

## `liquidaciones_incentivos` — Liquidaciones de incentivos

**Descripción:** Cálculo del pago a recicladores por cada recolección, incluyendo tarifa base, bonificación por calidad y multiplicadores de zona.

**Forma Normal:** 1NF ✓

**Columnas:**

- `liquidacion_id` (`SERIAL`, PK)
  Identificador único de la liquidación.
- `recoleccion_id` (`INTEGER`, NOT NULL, UNIQUE, FK → `recolecciones.recoleccion_id`)
  Recolección que se está liquidando. Una recolección solo puede tener una liquidación.
- `valor_tarifa_aplicada` (`DECIMAL(10,2)`, NOT NULL, CHECK: >= 0)
  Tarifa calculada (peso_neto × precio_base).
- `multiplicador_calidad` (`NUMERIC(3,2)`, DEFAULT 1.00)
  Multiplicador por calidad del material.
- `multiplicador_zona` (`NUMERIC(3,2)`, DEFAULT 1.00)
  Multiplicador por zona de recolección.
- `bonificacion_calidad` (`DECIMAL(10,2)`, DEFAULT 0.00)
  Bonificación o descuento por calidad.
- `total_pagado` (`DECIMAL(10,2)`, NOT NULL, CHECK: >= 0)
  Total a pagar al reciclador (nunca negativo).
- `estado_pago` (`estado_pago`, DEFAULT 'Pendiente')
  Estado del pago: Pendiente, Pagado o Rechazado.
- `fecha_liquidacion` (`TIMESTAMP`, DEFAULT CURRENT_TIMESTAMP)
  Fecha y hora de la liquidación.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por `liquidacion_id` — ✓
3. No hay grupos repetitivos — ✓

---

## `certificados_ambientales` — Certificados ambientales

**Descripción:** Certificado que agrupa las recolecciones de una empresa en un período determinado, con hash SHA-256 para verificación pública.

**Forma Normal:** 1NF ✓

**Columnas:**

- `certificado_id` (`SERIAL`, PK)
  Identificador único del certificado.
- `empresa_id` (`INTEGER`, NOT NULL, FK → `usuarios.id`)
  Empresa a la que se emite el certificado.
- `emitido_por_id` (`INTEGER`, NOT NULL, FK → `usuarios.id`)
  Administrador que emitió el certificado.
- `fecha_emision` (`TIMESTAMP`, DEFAULT CURRENT_TIMESTAMP)
  Fecha y hora de emisión.
- `numero_radicado` (`VARCHAR(30)`, UNIQUE, nullable)
  Número de radicado único del certificado.
- `periodo_inicio` (`DATE`, NOT NULL)
  Fecha de inicio del período cubierto.
- `periodo_fin` (`DATE`, NOT NULL, CHECK: periodo_fin >= periodo_inicio)
  Fecha de fin del período cubierto.
- `total_kg_certificado` (`DECIMAL(12,2)`, NOT NULL, CHECK: >= 0)
  Total de kilogramos certificados.
- `total_co2_evitado` (`DECIMAL(12,2)`, NOT NULL, CHECK: >= 0)
  Total de CO₂ evitado en kilogramos.
- `hash_verificacion` (`VARCHAR(64)`, UNIQUE, NOT NULL)
  Hash SHA-256 para verificación pública del certificado.
- `pdf_url` (`VARCHAR(500)`, nullable)
  URL del archivo PDF del certificado.
- `estado_certificado` (`estado_certificado`, DEFAULT 'Emitido')
  Estado del certificado: Emitido, Anulado o Vencido.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por `certificado_id` — ✓
3. No hay grupos repetitivos — ✓ (las recolecciones incluidas están en `detalles_certificado`)

---

## `detalles_certificado` — Detalles del certificado

**Descripción:** Relación muchos a muchos entre certificados ambientales y recolecciones. Indica qué recolecciones componen cada certificado.

**Forma Normal:** 1NF ✓

**Columnas:**

- `certificado_id` (`INTEGER`, NOT NULL, PK compuesta, FK → `certificados_ambientales.certificado_id` ON DELETE CASCADE)
  Certificado al que pertenece el detalle.
- `recoleccion_id` (`INTEGER`, NOT NULL, PK compuesta, FK → `recolecciones.recoleccion_id`)
  Recolección incluida en el certificado.

**Reglas 1FN aplicadas:**
1. Todas las columnas son atómicas — ✓
2. Cada fila se identifica de forma única por la combinación `(certificado_id, recoleccion_id)` — ✓
3. No hay grupos repetitivos — ✓
