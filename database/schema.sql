-- Green-Loop: esquema sincronizado con backend/models/models.py
-- (Referencia manual — normalmente NO hace falta correr esto: el backend
-- crea las tablas automáticamente al arrancar vía init_db()).

-- 1. Tablas independientes
CREATE TABLE IF NOT EXISTS zonas (
    id_zona SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    multiplicador NUMERIC(3,2) DEFAULT 1.00,
    activa BOOLEAN DEFAULT TRUE,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS residuos (
    id_residuo SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    precio_base_kg NUMERIC(10,2) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS empresas (
    id_empresa SERIAL PRIMARY KEY,
    nit VARCHAR(20) UNIQUE NOT NULL,
    razon_social VARCHAR(150) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    contacto_nombre VARCHAR(100),
    activa BOOLEAN DEFAULT TRUE,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Dependen de las anteriores
CREATE TABLE IF NOT EXISTS rutas (
    id_ruta SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    id_zona INTEGER NOT NULL REFERENCES zonas(id_zona),
    id_empresa INTEGER REFERENCES empresas(id_empresa),
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Dependencias múltiples
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    documento VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telefono VARCHAR(20),
    rol VARCHAR(20) NOT NULL DEFAULT 'reciclador',
    id_ruta_asignada INTEGER REFERENCES rutas(id_ruta),
    id_empresa INTEGER REFERENCES empresas(id_empresa),
    contrasena_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS camiones (
    id_camion SERIAL PRIMARY KEY,
    placa VARCHAR(10) UNIQUE NOT NULL,
    qr_code VARCHAR(50) UNIQUE NOT NULL,
    capacidad_kg NUMERIC(10,2) NOT NULL,
    id_ruta INTEGER NOT NULL REFERENCES rutas(id_ruta),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tablas finales
CREATE TABLE IF NOT EXISTS cargas (
    id_carga SERIAL PRIMARY KEY,
    codigo_qr VARCHAR(50) NOT NULL,
    id_ruta INTEGER NOT NULL REFERENCES rutas(id_ruta),
    id_residuo INTEGER NOT NULL REFERENCES residuos(id_residuo),
    id_reciclador INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_camion INTEGER NOT NULL REFERENCES camiones(id_camion),
    peso_kg NUMERIC(10,2) NOT NULL,
    calidad VARCHAR(10) NOT NULL,
    fecha_recoleccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    procesada BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS certificados (
    id_certificado SERIAL PRIMARY KEY,
    numero_radicado VARCHAR(30) UNIQUE NOT NULL,
    id_carga INTEGER NOT NULL UNIQUE REFERENCES cargas(id_carga),
    id_empresa INTEGER NOT NULL REFERENCES empresas(id_empresa),
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    total_kg NUMERIC(12,2) NOT NULL,
    residuos_detalle JSON NOT NULL,
    hash_verificacion VARCHAR(64) NOT NULL,
    estado VARCHAR(20) DEFAULT 'emitido',
    pdf_url VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS pagos (
    id_pago SERIAL PRIMARY KEY,
    id_reciclador INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_carga INTEGER NOT NULL REFERENCES cargas(id_carga),
    monto_base NUMERIC(10,2) NOT NULL,
    multiplicador_calidad NUMERIC(3,2) NOT NULL,
    multiplicador_zona NUMERIC(3,2) NOT NULL,
    monto_final NUMERIC(12,2) NOT NULL,
    fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_pago TIMESTAMP,
    referencia_transaccion VARCHAR(100)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cargas_fecha ON cargas(fecha_recoleccion);
CREATE INDEX IF NOT EXISTS idx_cargas_reciclador ON cargas(id_reciclador);
CREATE INDEX IF NOT EXISTS idx_cargas_ruta ON cargas(id_ruta);
CREATE INDEX IF NOT EXISTS idx_certificados_radicado ON certificados(numero_radicado);
CREATE INDEX IF NOT EXISTS idx_pagos_reciclador ON pagos(id_reciclador);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
