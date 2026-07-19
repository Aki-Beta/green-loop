-- ============================================================
-- ARCHIVO 02: Todas las tablas del sistema
-- ============================================================
-- Creadas en orden de dependencia para evitar errores.
-- ============================================================

-- ============================================================
-- 1. ZONAS DE RECOLECCIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.zonas (
    zona_id      SERIAL PRIMARY KEY,
    nombre_zona  VARCHAR(50) NOT NULL UNIQUE,
    ciudad       VARCHAR(50) NOT NULL,
    descripcion  TEXT,
    multiplicador NUMERIC(3,2) DEFAULT 1.00,
    activa       BOOLEAN DEFAULT true
);

-- ============================================================
-- 2. USUARIOS DEL SISTEMA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    documento      VARCHAR(20) UNIQUE,
    nombre         VARCHAR(100) NOT NULL,
    email          VARCHAR(100) UNIQUE NOT NULL,
    telefono       VARCHAR(20),
    contrasena     VARCHAR(255) NOT NULL,
    rol            public.rol_usuario NOT NULL,
    estado         public.estado_verificacion DEFAULT 'pendiente',
    activo         BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. REGISTRO LEGAL DE EMPRESAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.empresas (
    id_empresa      SERIAL PRIMARY KEY,
    nit             VARCHAR(20) UNIQUE NOT NULL,
    razon_social    VARCHAR(150) NOT NULL,
    direccion       TEXT,
    telefono        VARCHAR(20),
    email           VARCHAR(100),
    contacto_nombre VARCHAR(100),
    activa          BOOLEAN DEFAULT true,
    creada_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. PERFIL DE RECICLADORES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.perfil_recicladores (
    reciclador_id       INTEGER PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
    cedula              VARCHAR(20) UNIQUE NOT NULL,
    direccion           VARCHAR(150) NOT NULL,
    zona_id             INTEGER NOT NULL REFERENCES public.zonas(zona_id),
    foto_identificacion VARCHAR(255) NOT NULL
);

-- ============================================================
-- 5. PERFIL DE EMPRESAS (plataforma)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.perfil_empresas (
    empresa_id                  INTEGER PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nit                         VARCHAR(20) UNIQUE NOT NULL,
    razon_social                VARCHAR(150) NOT NULL,
    direccion                   VARCHAR(150) NOT NULL,
    zona_id                     INTEGER REFERENCES public.zonas(zona_id),
    documento_camara_comercio   VARCHAR(255) NOT NULL,
    licencia_ambiental          VARCHAR(255) NOT NULL
);

-- ============================================================
-- 6. CATÁLOGO DE MATERIALES RECICLABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.materiales (
    material_id         SERIAL PRIMARY KEY,
    codigo              VARCHAR(10) UNIQUE,
    nombre              VARCHAR(50) NOT NULL UNIQUE,
    descripcion         TEXT,
    precio_base_por_kg  DECIMAL(10,2),
    factor_co2_evitado  DECIMAL(6,4),
    activo              BOOLEAN DEFAULT true
);

-- ============================================================
-- 7. AUDITORÍA DE VERIFICACIÓN DE DOCUMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.verificacion_documentos (
    verificacion_id SERIAL PRIMARY KEY,
    usuario_id      INTEGER NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    revisado_por    INTEGER REFERENCES public.usuarios(id),
    estado          public.estado_verificacion NOT NULL,
    motivo_rechazo  TEXT,
    fecha_revision  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.verificacion_documentos IS
    'Historial de cada revisión que hace el administrador sobre los documentos de un usuario.';

-- ============================================================
-- 8. RUTAS DE RECOLECCIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rutas (
    ruta_id     SERIAL PRIMARY KEY,
    codigo      VARCHAR(30) UNIQUE NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    zona_id     INTEGER NOT NULL REFERENCES public.zonas(zona_id),
    descripcion TEXT,
    activa      BOOLEAN DEFAULT true,
    creada_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 9. CAMIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.camiones (
    camion_id     SERIAL PRIMARY KEY,
    placa         VARCHAR(10) UNIQUE NOT NULL,
    qr_code       VARCHAR(50) UNIQUE NOT NULL,
    capacidad_kg  NUMERIC(10,2) NOT NULL,
    ruta_id       INTEGER NOT NULL REFERENCES public.rutas(ruta_id),
    activo        BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 10. SOLICITUDES DE RECOLECCIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.solicitudes_recoleccion (
    solicitud_id      SERIAL PRIMARY KEY,
    empresa_id        INTEGER NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    reciclador_id     INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
    zona_id           INTEGER NOT NULL REFERENCES public.zonas(zona_id),
    estado_solicitud  VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_solicitud IN ('pendiente','asignada','en_proceso','completada','cancelada')),
    fecha_solicitud   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_recoleccion TIMESTAMP,
    observaciones     TEXT
);

CREATE TABLE IF NOT EXISTS public.detalle_solicitud_materiales (
    detalle_id             SERIAL PRIMARY KEY,
    solicitud_id           INTEGER NOT NULL REFERENCES public.solicitudes_recoleccion(solicitud_id) ON DELETE CASCADE,
    material_id            INTEGER NOT NULL REFERENCES public.materiales(material_id),
    cantidad_aproximada_kg NUMERIC(6,2) CHECK (cantidad_aproximada_kg > 0),
    UNIQUE (solicitud_id, material_id)
);

-- ============================================================
-- 11. RECOLECCIONES EN CAMPO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recolecciones (
    recoleccion_id    SERIAL PRIMARY KEY,
    solicitud_id      INTEGER REFERENCES public.solicitudes_recoleccion(solicitud_id) ON DELETE SET NULL,
    reciclador_id     INTEGER NOT NULL REFERENCES public.usuarios(id),
    registrado_por_id INTEGER NOT NULL REFERENCES public.usuarios(id),
    empresa_id        INTEGER NOT NULL REFERENCES public.usuarios(id),
    material_id       INTEGER NOT NULL REFERENCES public.materiales(material_id),
    ruta_id           INTEGER REFERENCES public.rutas(ruta_id),
    camion_id         INTEGER REFERENCES public.camiones(camion_id),
    codigo_qr         VARCHAR(50),
    peso_bruto_kg     DECIMAL(10,2) NOT NULL CHECK (peso_bruto_kg > 0),
    peso_neto_kg      DECIMAL(10,2) NOT NULL CHECK (peso_neto_kg > 0),
    calidad_material  VARCHAR(20) NOT NULL DEFAULT 'Aceptable'
        CHECK (calidad_material IN ('Excelente', 'Aceptable', 'Contaminado')),
    latitud           DECIMAL(10,8),
    longitud          DECIMAL(11,8),
    observaciones     TEXT,
    fecha_recoleccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 12. LIQUIDACIONES DE INCENTIVOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.liquidaciones_incentivos (
    liquidacion_id          SERIAL PRIMARY KEY,
    recoleccion_id          INTEGER NOT NULL UNIQUE REFERENCES public.recolecciones(recoleccion_id),
    valor_tarifa_aplicada   DECIMAL(10,2) NOT NULL CHECK (valor_tarifa_aplicada >= 0),
    multiplicador_calidad   NUMERIC(3,2) DEFAULT 1.00,
    multiplicador_zona      NUMERIC(3,2) DEFAULT 1.00,
    bonificacion_calidad    DECIMAL(10,2) DEFAULT 0.00,
    total_pagado            DECIMAL(10,2) NOT NULL CHECK (total_pagado >= 0),
    estado_pago             public.estado_pago DEFAULT 'Pendiente',
    fecha_liquidacion       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 13. CERTIFICADOS AMBIENTALES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certificados_ambientales (
    certificado_id        SERIAL PRIMARY KEY,
    empresa_id            INTEGER NOT NULL REFERENCES public.usuarios(id),
    emitido_por_id        INTEGER NOT NULL REFERENCES public.usuarios(id),
    fecha_emision         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    numero_radicado       VARCHAR(30) UNIQUE,
    periodo_inicio        DATE NOT NULL,
    periodo_fin           DATE NOT NULL,
    total_kg_certificado  DECIMAL(12,2) NOT NULL CHECK (total_kg_certificado >= 0),
    total_co2_evitado     DECIMAL(12,2) NOT NULL CHECK (total_co2_evitado >= 0),
    hash_verificacion     VARCHAR(64) UNIQUE NOT NULL,
    pdf_url               VARCHAR(500),
    estado_certificado    public.estado_certificado DEFAULT 'Emitido',
    CHECK (periodo_fin >= periodo_inicio)
);

CREATE TABLE IF NOT EXISTS public.detalles_certificado (
    certificado_id  INTEGER NOT NULL REFERENCES public.certificados_ambientales(certificado_id) ON DELETE CASCADE,
    recoleccion_id  INTEGER NOT NULL REFERENCES public.recolecciones(recoleccion_id),
    PRIMARY KEY (certificado_id, recoleccion_id)
);

-- ============================================================
-- 14. SECUENCIA PARA RADICADOS
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.seq_certificado_radicado START 1;

-- ============================================================
-- 15. ÍNDICES PARA BÚSQUEDAS RÁPIDAS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_usuarios_estado     ON public.usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol        ON public.usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_email      ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_documento  ON public.usuarios(documento);

CREATE INDEX IF NOT EXISTS idx_solicitudes_estado  ON public.solicitudes_recoleccion(estado_solicitud);
CREATE INDEX IF NOT EXISTS idx_solicitudes_zona    ON public.solicitudes_recoleccion(zona_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_empresa ON public.solicitudes_recoleccion(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_recicla ON public.solicitudes_recoleccion(reciclador_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha   ON public.solicitudes_recoleccion(fecha_solicitud);

CREATE INDEX IF NOT EXISTS idx_recolecciones_solicitud   ON public.recolecciones(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_recolecciones_reciclador  ON public.recolecciones(reciclador_id);
CREATE INDEX IF NOT EXISTS idx_recolecciones_empresa     ON public.recolecciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_recolecciones_fecha       ON public.recolecciones(fecha_recoleccion);
CREATE INDEX IF NOT EXISTS idx_recolecciones_ruta        ON public.recolecciones(ruta_id);
CREATE INDEX IF NOT EXISTS idx_recolecciones_camion      ON public.recolecciones(camion_id);

CREATE INDEX IF NOT EXISTS idx_verificacion_usuario      ON public.verificacion_documentos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_detalle_solicitud         ON public.detalle_solicitud_materiales(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_recoleccion ON public.liquidaciones_incentivos(recoleccion_id);
CREATE INDEX IF NOT EXISTS idx_certificados_empresa      ON public.certificados_ambientales(empresa_id);
CREATE INDEX IF NOT EXISTS idx_certificados_radicado     ON public.certificados_ambientales(numero_radicado);
CREATE INDEX IF NOT EXISTS idx_detalles_certificado      ON public.detalles_certificado(certificado_id);

CREATE INDEX IF NOT EXISTS idx_rutas_zona                ON public.rutas(zona_id);
CREATE INDEX IF NOT EXISTS idx_camiones_ruta             ON public.camiones(ruta_id);
