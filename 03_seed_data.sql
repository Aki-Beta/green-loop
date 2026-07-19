-- ============================================================
-- ARCHIVO 03: Datos iniciales del sistema
-- ============================================================

-- ============================================================
-- 1. ZONAS DEL ATLÁNTICO
-- ============================================================
INSERT INTO public.zonas (nombre_zona, ciudad, descripcion, multiplicador)
SELECT * FROM (VALUES
    ('Barranquilla', 'Barranquilla', 'Zona urbana principal', 1.00),
    ('Soledad', 'Soledad', 'Zona urbana periférica', 1.05),
    ('Malambo', 'Malambo', 'Zona urbana', 1.10),
    ('Puerto Colombia', 'Puerto Colombia', 'Zona costera', 1.10),
    ('Galapa', 'Galapa', 'Zona industrial', 1.15),
    ('Zona Costera', 'Atlántico', 'Zona rural costera', 1.20),
    ('Zona Sur', 'Atlántico', 'Zona rural sur', 1.20)
) AS v(nombre_zona, ciudad, descripcion, multiplicador)
WHERE NOT EXISTS (SELECT 1 FROM public.zonas WHERE nombre_zona = v.nombre_zona);

-- ============================================================
-- 2. MATERIALES RECICLABLES
-- ============================================================
INSERT INTO public.materiales (codigo, nombre, descripcion, precio_base_por_kg, factor_co2_evitado)
SELECT * FROM (VALUES
    ('PAPC', 'Papel y cartón', 'Cajas, periódico, papel de oficina', 300.00, 0.5000),
    ('PLAS', 'Plástico', 'Botellas PET, empaques plásticos', 600.00, 0.4000),
    ('VIDR', 'Vidrio', 'Botellas y frascos de vidrio', 150.00, 0.3000),
    ('METL', 'Metal', 'Latas de aluminio, chatarra pequeña', 1200.00, 0.8000),
    ('ELEC', 'Electrónicos', 'Equipos y residuos electrónicos (RAEE)', 800.00, 1.2000)
) AS v(codigo, nombre, descripcion, precio_base_por_kg, factor_co2_evitado)
WHERE NOT EXISTS (SELECT 1 FROM public.materiales WHERE nombre = v.nombre);

-- ============================================================
-- 3. USUARIOS DEMO
-- ============================================================
INSERT INTO public.usuarios (nombre, email, contrasena, documento, telefono, rol, estado)
SELECT v.nombre, v.email, v.contrasena, v.documento, v.telefono,
       v.rol::public.rol_usuario, v.estado::public.estado_verificacion
FROM (VALUES
    ('Admin General',  'admin@greenloop.com',  'hash_admin_aqui',  '10000001', '3001111111', 'administrador', 'aprobado'),
    ('Carlos Pérez',   'carlos@email.com',     'hash_carlos_aqui', '10000002', '3002222222', 'reciclador',    'aprobado'),
    ('Eco Recicla SAS','eco@recicla.com',      'hash_eco_aqui',    '900123456-7', '3003333333', 'empresa',       'aprobado')
) AS v(nombre, email, contrasena, documento, telefono, rol, estado)
WHERE NOT EXISTS (SELECT 1 FROM public.usuarios WHERE email = v.email);

-- ============================================================
-- 4. PERFIL RECICLADOR
-- ============================================================
INSERT INTO public.perfil_recicladores (reciclador_id, cedula, direccion, zona_id, foto_identificacion)
SELECT u.id, '1234567890', 'Carrera 45 # 23-10, Barranquilla', z.zona_id, '/fotos/carlos_cedula.jpg'
FROM public.usuarios u, public.zonas z
WHERE u.email = 'carlos@email.com' AND z.nombre_zona = 'Barranquilla'
AND NOT EXISTS (SELECT 1 FROM public.perfil_recicladores WHERE reciclador_id = u.id);

-- ============================================================
-- 5. PERFIL EMPRESA
-- ============================================================
INSERT INTO public.perfil_empresas (empresa_id, nit, razon_social, direccion, zona_id, documento_camara_comercio, licencia_ambiental)
SELECT u.id, '900123456-7', 'Eco Recicla SAS', 'Calle 100 # 7-20, Barranquilla', z.zona_id, '/docs/camara_comercio.pdf', '/docs/licencia_ambiental.pdf'
FROM public.usuarios u, public.zonas z
WHERE u.email = 'eco@recicla.com' AND z.nombre_zona = 'Barranquilla'
AND NOT EXISTS (SELECT 1 FROM public.perfil_empresas WHERE empresa_id = u.id);

-- ============================================================
-- 6. EMPRESA (registro legal)
-- ============================================================
INSERT INTO public.empresas (nit, razon_social, direccion, telefono, email, contacto_nombre)
SELECT '900123456-7', 'Eco Recicla SAS', 'Calle 100 # 7-20, Barranquilla', '3003333333', 'contacto@ecorecicla.com', 'María Fernández'
WHERE NOT EXISTS (SELECT 1 FROM public.empresas WHERE nit = '900123456-7');

-- ============================================================
-- 7. RUTA DEMO
-- ============================================================
INSERT INTO public.rutas (codigo, nombre, zona_id, descripcion)
SELECT 'RUTA-001', 'Ruta Norte Barranquilla', zona_id, 'Ruta principal zona norte'
FROM public.zonas WHERE nombre_zona = 'Barranquilla'
AND NOT EXISTS (SELECT 1 FROM public.rutas WHERE codigo = 'RUTA-001');

-- ============================================================
-- 8. CAMIÓN DEMO
-- ============================================================
INSERT INTO public.camiones (placa, qr_code, capacidad_kg, ruta_id)
SELECT 'ABC123', 'CAM-ABC123', 5000.00, ruta_id
FROM public.rutas WHERE codigo = 'RUTA-001'
AND NOT EXISTS (SELECT 1 FROM public.camiones WHERE placa = 'ABC123');
