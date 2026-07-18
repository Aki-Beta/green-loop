-- Green-Loop Database Schema
-- PostgreSQL 3FN + Seeds
-- Resolución 2184/2019 y Ley 1950/2019 - Colombia

-- ============================================================
-- ENUMS (Tipos enumerados)
-- ============================================================

CREATE TYPE rol_usuario AS ENUM ('admin', 'reciclador', 'empresa');
CREATE TYPE calidad_residuo AS ENUM ('alta', 'media', 'baja');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'pagado', 'rechazado');
CREATE TYPE estado_certificado AS ENUM ('emitido', 'anulado', 'vencido');

-- ============================================================
-- TABLAS (3FN)
-- ============================================================

-- Zonas de recolección
CREATE TABLE zonas (
    id_zona SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    multiplicador NUMERIC(3,2) DEFAULT 1.00,
    activa BOOLEAN DEFAULT TRUE,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tipos de residuos
CREATE TABLE residuos (
    id_residuo SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    codigo VARCHAR(10) UNIQUE NOT NULL,
    precio_base_kg NUMERIC(10,2) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- Empresas generadoras
CREATE TABLE empresas (
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

-- Usuarios (recicladores, admins, empresas)
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    documento VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telefono VARCHAR(20),
    rol rol_usuario NOT NULL DEFAULT 'reciclador',
    id_ruta_asignada INTEGER REFERENCES rutas(id_ruta),
    id_empresa INTEGER REFERENCES empresas(id_empresa),
    contrasena_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rutas de recolección
CREATE TABLE rutas (
    id_ruta SERIAL PRIMARY KEY,
    codigo VARCHAR(30) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    id_zona INTEGER NOT NULL REFERENCES zonas(id_zona),
    id_empresa INTEGER REFERENCES empresas(id_empresa),
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE,
    creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Camiones
CREATE TABLE camiones (
    id_camion SERIAL PRIMARY KEY,
    placa VARCHAR(10) UNIQUE NOT NULL,
    qr_code VARCHAR(50) UNIQUE NOT NULL,
    capacidad_kg NUMERIC(10,2) NOT NULL,
    id_ruta INTEGER NOT NULL REFERENCES rutas(id_ruta),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cargas de residuos
CREATE TABLE cargas (
    id_carga SERIAL PRIMARY KEY,
    codigo_qr VARCHAR(50) NOT NULL,
    id_ruta INTEGER NOT NULL REFERENCES rutas(id_ruta),
    id_residuo INTEGER NOT NULL REFERENCES residuos(id_residuo),
    id_reciclador INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_camion INTEGER NOT NULL REFERENCES camiones(id_camion),
    peso_kg NUMERIC(10,2) NOT NULL,
    calidad calidad_residuo NOT NULL,
    fecha_recoleccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    procesada BOOLEAN DEFAULT FALSE
);

-- Certificados de cumplimiento
CREATE TABLE certificados (
    id_certificado SERIAL PRIMARY KEY,
    numero_radicado VARCHAR(30) UNIQUE NOT NULL,
    id_carga INTEGER NOT NULL REFERENCES cargas(id_carga) UNIQUE,
    id_empresa INTEGER NOT NULL REFERENCES empresas(id_empresa),
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    total_kg NUMERIC(12,2) NOT NULL,
    residuos_detalle JSONB NOT NULL,
    hash_verificacion VARCHAR(64) NOT NULL,
    estado estado_certificado DEFAULT 'emitido',
    pdf_url VARCHAR(500)
);

-- Pagos a recicladores
CREATE TABLE pagos (
    id_pago SERIAL PRIMARY KEY,
    id_reciclador INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_carga INTEGER NOT NULL REFERENCES cargas(id_carga),
    monto_base NUMERIC(10,2) NOT NULL,
    multiplicador_calidad NUMERIC(3,2) NOT NULL,
    multiplicador_zona NUMERIC(3,2) NOT NULL,
    monto_final NUMERIC(12,2) NOT NULL,
    fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado estado_pago DEFAULT 'pendiente',
    fecha_pago TIMESTAMP,
    referencia_transaccion VARCHAR(100)
);

-- ============================================================
-- ÍNDICES PARA BÚSQUEDAS RÁPIDAS
-- ============================================================

CREATE INDEX idx_cargas_fecha ON cargas(fecha_recoleccion);
CREATE INDEX idx_cargas_reciclador ON cargas(id_reciclador);
CREATE INDEX idx_cargas_ruta ON cargas(id_ruta);
CREATE INDEX idx_certificados_radicado ON certificados(numero_radicado);
CREATE INDEX idx_pagos_reciclador ON pagos(id_reciclador);
CREATE INDEX idx_pagos_estado ON pagos(estado);

-- ============================================================
-- SEEDS (Datos iniciales)
-- ============================================================

-- Zonas (multiplicadores según norma)
INSERT INTO zonas (nombre, descripcion, multiplicador) VALUES
('Urbana', 'Zona urbana principal', 1.00),
('Rural', 'Zona rural', 1.20),
('Industrial', 'Zona industrial', 1.15),
('Centro Comercial', 'Centros comerciales', 1.10)
ON CONFLICT (nombre) DO NOTHING;

-- Residuos (precios base COP/kg)
INSERT INTO residuos (nombre, codigo, precio_base_kg, descripcion) VALUES
('Plástico PET', 'PET', 800.00, 'Botellas plásticas transparentes'),
('Plástico PEAD', 'PEAD', 600.00, 'Envases opacos, champú, detergente'),
('Cartón', 'CART', 300.00, 'Cajas, empaques de cartón'),
('Papel Blanco', 'PBLA', 400.00, 'Papel oficina, hojas blancas'),
('Papel Mixto', 'PMIX', 200.00, 'Periódicos, revistas, papel mezclado'),
('Vidrio', 'VIDR', 150.00, 'Botellas, frascos de vidrio'),
('Metal', 'METL', 1200.00, 'Latas aluminio, hojalata'),
('Orgánico', 'ORGA', 100.00, 'Residuos aprovechables orgánicos')
ON CONFLICT (codigo) DO NOTHING;

-- Empresa demo
INSERT INTO empresas (nit, razon_social, direccion, telefono, email, contacto_nombre) VALUES
('900123456-7', 'Green Loop Demo SAS', 'Calle 100 # 7-20, Bogotá', '6015551234', 'contacto@greenloop.co', 'Carlos Demo')
ON CONFLICT (nit) DO NOTHING;

-- Usuarios de prueba (contraseñas: admin123, rec123, empresa123)
INSERT INTO usuarios (documento, nombre_completo, email, telefono, rol, id_empresa, contrasena_hash) VALUES
('10000001', 'Admin Green Loop', 'admin@greenloop.co', '3001111111', 'admin', NULL, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOwLHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S'),
('10000002', 'Juan Reciclador', 'juan@reciclador.co', '3002222222', 'reciclador', NULL, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S'),
('10000003', 'Empresa Demo', 'empresa@test.com', '3003333333', 'empresa', 1, '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S')
ON CONFLICT (documento) DO NOTHING;

-- Ruta demo
INSERT INTO rutas (codigo, nombre, id_zona, id_empresa) VALUES
('RUTA-001', 'Ruta Norte Bogotá', 1, 1)
ON CONFLICT (codigo) DO NOTHING;

-- Camión demo
INSERT INTO camiones (placa, qr_code, capacidad_kg, id_ruta) VALUES
('ABC123', 'CAM-ABC123', 5000.00, 1)
ON CONFLICT (placa) DO NOTHING;