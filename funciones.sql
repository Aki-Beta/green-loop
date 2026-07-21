-- ============================================================
-- ARCHIVO 04: Funciones del sistema
-- ============================================================
-- Ordenadas por tema: usuarios, solicitudes, recolecciones.
-- ============================================================

-- ============================================================
-- 1. FUNCIONES DE USUARIOS Y PERFILES
-- ============================================================

CREATE OR REPLACE FUNCTION public.registrar_reciclador(
    p_nombre               VARCHAR(100),
    p_email                VARCHAR(100),
    p_contrasena           VARCHAR(255),
    p_documento            VARCHAR(20),
    p_telefono             VARCHAR(20),
    p_cedula               VARCHAR(20),
    p_direccion            VARCHAR(150),
    p_zona_id              INTEGER,
    p_foto_identificacion  VARCHAR(255)
) RETURNS INTEGER AS $$
DECLARE
    v_usuario_id INTEGER;
BEGIN
    INSERT INTO public.usuarios (nombre, email, contrasena, documento, telefono, rol, estado)
    VALUES (p_nombre, p_email, p_contrasena, p_documento, p_telefono,
            'reciclador'::public.rol_usuario,
            'pendiente'::public.estado_verificacion)
    RETURNING id INTO v_usuario_id;

    INSERT INTO public.perfil_recicladores (reciclador_id, cedula, direccion, zona_id, foto_identificacion)
    VALUES (v_usuario_id, p_cedula, p_direccion, p_zona_id, p_foto_identificacion);

    RETURN v_usuario_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.registrar_empresa(
    p_nombre                    VARCHAR(100),
    p_email                     VARCHAR(100),
    p_contrasena                VARCHAR(255),
    p_documento                 VARCHAR(20),
    p_telefono                  VARCHAR(20),
    p_nit                       VARCHAR(20),
    p_razon_social              VARCHAR(150),
    p_direccion                 VARCHAR(150),
    p_zona_id                   INTEGER,
    p_documento_camara_comercio VARCHAR(255),
    p_licencia_ambiental        VARCHAR(255)
) RETURNS INTEGER AS $$
DECLARE
    v_usuario_id INTEGER;
BEGIN
    INSERT INTO public.usuarios (nombre, email, contrasena, documento, telefono, rol, estado)
    VALUES (p_nombre, p_email, p_contrasena, p_documento, p_telefono,
            'empresa'::public.rol_usuario,
            'pendiente'::public.estado_verificacion)
    RETURNING id INTO v_usuario_id;

    INSERT INTO public.perfil_empresas (empresa_id, nit, razon_social, direccion, zona_id, documento_camara_comercio, licencia_ambiental)
    VALUES (v_usuario_id, p_nit, p_razon_social, p_direccion, p_zona_id, p_documento_camara_comercio, p_licencia_ambiental);

    RETURN v_usuario_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.actualizar_reciclador(
    p_reciclador_id          INTEGER,
    p_documento              VARCHAR(20) DEFAULT NULL,
    p_telefono               VARCHAR(20) DEFAULT NULL,
    p_direccion              VARCHAR(150) DEFAULT NULL,
    p_zona_id                INTEGER DEFAULT NULL,
    p_foto_identificacion    VARCHAR(255) DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE public.usuarios
    SET
        documento = COALESCE(p_documento, documento),
        telefono  = COALESCE(p_telefono, telefono)
    WHERE id = p_reciclador_id;

    UPDATE public.perfil_recicladores
    SET
        direccion           = COALESCE(p_direccion, direccion),
        zona_id             = COALESCE(p_zona_id, zona_id),
        foto_identificacion = COALESCE(p_foto_identificacion, foto_identificacion)
    WHERE reciclador_id = p_reciclador_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El reciclador con ID % no existe', p_reciclador_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.actualizar_empresa(
    p_empresa_id                 INTEGER,
    p_documento                  VARCHAR(20) DEFAULT NULL,
    p_telefono                   VARCHAR(20) DEFAULT NULL,
    p_direccion                  VARCHAR(150) DEFAULT NULL,
    p_zona_id                    INTEGER DEFAULT NULL,
    p_documento_camara_comercio  VARCHAR(255) DEFAULT NULL,
    p_licencia_ambiental         VARCHAR(255) DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE public.usuarios
    SET
        documento = COALESCE(p_documento, documento),
        telefono  = COALESCE(p_telefono, telefono)
    WHERE id = p_empresa_id;

    UPDATE public.perfil_empresas
    SET
        direccion                = COALESCE(p_direccion, direccion),
        zona_id                  = COALESCE(p_zona_id, zona_id),
        documento_camara_comercio = COALESCE(p_documento_camara_comercio, documento_camara_comercio),
        licencia_ambiental       = COALESCE(p_licencia_ambiental, licencia_ambiental)
    WHERE empresa_id = p_empresa_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La empresa con ID % no existe', p_empresa_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.eliminar_usuario(
    p_usuario_id INTEGER
) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
        RAISE EXCEPTION 'El usuario con ID % no existe', p_usuario_id;
    END IF;

    DELETE FROM public.usuarios WHERE id = p_usuario_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. FUNCIONES DE SOLICITUDES DE RECOLECCIÓN
-- ============================================================

CREATE OR REPLACE FUNCTION public.crear_solicitud(
    p_empresa_id       INTEGER,
    p_zona_id          INTEGER,
    p_materiales       JSON,
    p_observaciones    TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_solicitud_id INTEGER;
    v_material     JSON;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_empresa_id AND rol = 'empresa') THEN
        RAISE EXCEPTION 'El usuario % no es una empresa válida', p_empresa_id;
    END IF;

    INSERT INTO public.solicitudes_recoleccion (empresa_id, zona_id, observaciones)
    VALUES (p_empresa_id, p_zona_id, p_observaciones)
    RETURNING solicitud_id INTO v_solicitud_id;

    FOR v_material IN SELECT * FROM json_array_elements(p_materiales)
    LOOP
        INSERT INTO public.detalle_solicitud_materiales (solicitud_id, material_id, cantidad_aproximada_kg)
        VALUES (
            v_solicitud_id,
            (v_material->>'material_id')::INTEGER,
            (v_material->>'cantidad_kg')::NUMERIC
        );
    END LOOP;

    RETURN v_solicitud_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.cambiar_estado_solicitud(
    p_solicitud_id  INTEGER,
    p_nuevo_estado  VARCHAR(20)
) RETURNS VOID AS $$
DECLARE
    v_estado_actual VARCHAR(20);
BEGIN
    SELECT estado_solicitud INTO v_estado_actual
    FROM public.solicitudes_recoleccion
    WHERE solicitud_id = p_solicitud_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La solicitud % no existe', p_solicitud_id;
    END IF;

    IF p_nuevo_estado NOT IN ('pendiente','asignada','en_proceso','completada','cancelada') THEN
        RAISE EXCEPTION 'Estado "%" no válido', p_nuevo_estado;
    END IF;

    IF v_estado_actual = 'completada' AND p_nuevo_estado != 'cancelada' THEN
        RAISE EXCEPTION 'No se puede cambiar el estado de una solicitud completada';
    END IF;

    IF v_estado_actual = 'cancelada' THEN
        RAISE EXCEPTION 'La solicitud ya está cancelada';
    END IF;

    UPDATE public.solicitudes_recoleccion
    SET estado_solicitud = p_nuevo_estado,
        fecha_recoleccion = CASE WHEN p_nuevo_estado = 'completada' THEN CURRENT_TIMESTAMP ELSE fecha_recoleccion END
    WHERE solicitud_id = p_solicitud_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.eliminar_solicitud(
    p_solicitud_id INTEGER
) RETURNS VOID AS $$
DECLARE
    v_estado VARCHAR(20);
BEGIN
    SELECT estado_solicitud INTO v_estado
    FROM public.solicitudes_recoleccion
    WHERE solicitud_id = p_solicitud_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La solicitud % no existe', p_solicitud_id;
    END IF;

    IF v_estado NOT IN ('pendiente', 'cancelada') THEN
        RAISE EXCEPTION 'Solo se pueden eliminar solicitudes pendientes o canceladas (estado actual: %)', v_estado;
    END IF;

    DELETE FROM public.solicitudes_recoleccion WHERE solicitud_id = p_solicitud_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.revisar_documentos_usuario(
    p_usuario_id   INTEGER,
    p_revisado_por INTEGER,
    p_estado       public.estado_verificacion,
    p_motivo       TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = p_revisado_por AND rol = 'administrador'
    ) THEN
        RAISE EXCEPTION 'El usuario % no tiene rol de administrador y no puede aprobar/rechazar', p_revisado_por;
    END IF;

    UPDATE public.usuarios SET estado = p_estado WHERE id = p_usuario_id;

    INSERT INTO public.verificacion_documentos (usuario_id, revisado_por, estado, motivo_rechazo)
    VALUES (p_usuario_id, p_revisado_por, p_estado, p_motivo);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.asignar_reciclador_por_zona(
    p_solicitud_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_zona_id       INTEGER;
    v_reciclador_id INTEGER;
BEGIN
    SELECT zona_id INTO v_zona_id
    FROM public.solicitudes_recoleccion
    WHERE solicitud_id = p_solicitud_id
    FOR UPDATE;

    IF v_zona_id IS NULL THEN
        RAISE EXCEPTION 'La solicitud % no existe', p_solicitud_id;
    END IF;

    SELECT pr.reciclador_id INTO v_reciclador_id
    FROM public.perfil_recicladores pr
    JOIN public.usuarios u ON u.id = pr.reciclador_id
    LEFT JOIN (
        SELECT reciclador_id, COUNT(*) AS solicitudes_activas
        FROM public.solicitudes_recoleccion
        WHERE estado_solicitud IN ('asignada','en_proceso')
        GROUP BY reciclador_id
    ) carga ON carga.reciclador_id = pr.reciclador_id
    WHERE pr.zona_id = v_zona_id
        AND u.estado = 'aprobado'
    ORDER BY COALESCE(carga.solicitudes_activas, 0) ASC
    LIMIT 1
    FOR UPDATE OF u SKIP LOCKED;

    IF v_reciclador_id IS NULL THEN
        RAISE NOTICE 'No hay recicladores disponibles en esta zona por ahora';
        RETURN NULL;
    END IF;

    UPDATE public.solicitudes_recoleccion
    SET reciclador_id = v_reciclador_id,
        estado_solicitud = 'asignada'
    WHERE solicitud_id = p_solicitud_id;

    RETURN v_reciclador_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. FUNCIONES DE RECOLECCIONES EN CAMPO
-- ============================================================

CREATE OR REPLACE FUNCTION public.registrar_recoleccion(
    p_solicitud_id       INTEGER,
    p_reciclador_id      INTEGER,
    p_registrado_por_id  INTEGER,
    p_empresa_id         INTEGER,
    p_material_id        INTEGER,
    p_peso_bruto_kg      DECIMAL,
    p_peso_neto_kg       DECIMAL,
    p_calidad_material   VARCHAR(20) DEFAULT 'Aceptable',
    p_latitud            DECIMAL DEFAULT NULL,
    p_longitud           DECIMAL DEFAULT NULL,
    p_ruta_id            INTEGER DEFAULT NULL,
    p_camion_id          INTEGER DEFAULT NULL,
    p_codigo_qr          VARCHAR(50) DEFAULT NULL,
    p_observaciones      TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_recoleccion_id INTEGER;
BEGIN
    INSERT INTO public.recolecciones (
        solicitud_id, reciclador_id, registrado_por_id, empresa_id,
        material_id, peso_bruto_kg, peso_neto_kg, calidad_material,
        latitud, longitud, ruta_id, camion_id, codigo_qr, observaciones
    ) VALUES (
        p_solicitud_id, p_reciclador_id, p_registrado_por_id, p_empresa_id,
        p_material_id, p_peso_bruto_kg, p_peso_neto_kg, p_calidad_material,
        p_latitud, p_longitud, p_ruta_id, p_camion_id, p_codigo_qr, p_observaciones
    ) RETURNING recoleccion_id INTO v_recoleccion_id;

    PERFORM public.liquidar_recoleccion(v_recoleccion_id);

    RETURN v_recoleccion_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. FUNCIONES DE LIQUIDACIONES DE INCENTIVOS
-- ============================================================

CREATE OR REPLACE FUNCTION public.liquidar_recoleccion(
    p_recoleccion_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_peso_neto      DECIMAL;
    v_material_id    INTEGER;
    v_precio_base    DECIMAL;
    v_calidad        VARCHAR(20);
    v_tarifa         DECIMAL;
    v_bonificacion   DECIMAL := 0;
    v_total          DECIMAL;
    v_multi_calidad  NUMERIC(3,2) := 1.00;
    v_multi_zona     NUMERIC(3,2) := 1.00;
    v_liquidacion_id INTEGER;
BEGIN
    SELECT r.peso_neto_kg, r.material_id, r.calidad_material,
           COALESCE(m.precio_base_por_kg, 0)
    INTO v_peso_neto, v_material_id, v_calidad, v_precio_base
    FROM public.recolecciones r
    JOIN public.materiales m ON m.material_id = r.material_id
    WHERE r.recoleccion_id = p_recoleccion_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La recolección % no existe', p_recoleccion_id;
    END IF;

    v_tarifa := v_peso_neto * v_precio_base;

    IF v_calidad = 'Excelente' THEN
        v_bonificacion := v_tarifa * 0.10;
        v_multi_calidad := 1.10;
    ELSIF v_calidad = 'Contaminado' THEN
        v_bonificacion := v_tarifa * (-0.05);
        v_multi_calidad := 0.85;
    ELSE
        v_multi_calidad := 1.00;
    END IF;

    SELECT COALESCE(z.multiplicador, 1.00) INTO v_multi_zona
    FROM public.recolecciones r
    JOIN public.perfil_recicladores pr ON pr.reciclador_id = r.reciclador_id
    JOIN public.zonas z ON z.zona_id = pr.zona_id
    WHERE r.recoleccion_id = p_recoleccion_id;

    v_total := v_tarifa + v_bonificacion;

    INSERT INTO public.liquidaciones_incentivos (
        recoleccion_id, valor_tarifa_aplicada,
        multiplicador_calidad, multiplicador_zona,
        bonificacion_calidad, total_pagado
    ) VALUES (
        p_recoleccion_id, v_tarifa,
        v_multi_calidad, v_multi_zona,
        v_bonificacion, GREATEST(v_total, 0)
    ) RETURNING liquidacion_id INTO v_liquidacion_id;

    RETURN v_liquidacion_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. FUNCIONES DE CERTIFICADOS AMBIENTALES
-- ============================================================

CREATE OR REPLACE FUNCTION public.generar_certificado(
    p_empresa_id    INTEGER,
    p_emitido_por   INTEGER,
    p_periodo_inicio DATE,
    p_periodo_fin   DATE
) RETURNS INTEGER AS $$
DECLARE
    v_certificado_id INTEGER;
    v_total_kg       DECIMAL;
    v_total_co2      DECIMAL;
    v_hash           VARCHAR(64);
    v_radicado       VARCHAR(30);
BEGIN
    SELECT COALESCE(SUM(r.peso_neto_kg), 0),
           COALESCE(SUM(r.peso_neto_kg * COALESCE(m.factor_co2_evitado, 0)), 0)
    INTO v_total_kg, v_total_co2
    FROM public.recolecciones r
    JOIN public.materiales m ON m.material_id = r.material_id
    WHERE r.empresa_id = p_empresa_id
      AND r.fecha_recoleccion >= p_periodo_inicio
      AND r.fecha_recoleccion < p_periodo_fin + 1;

    IF v_total_kg = 0 THEN
        RAISE EXCEPTION 'No hay recolecciones en el período indicado para la empresa %', p_empresa_id;
    END IF;

    v_hash := encode(
        sha256(
            (p_empresa_id::TEXT || p_periodo_inicio::TEXT || p_periodo_fin::TEXT || v_total_kg::TEXT || v_total_co2::TEXT || clock_timestamp()::TEXT)::bytea
        ),
        'hex'
    );

    INSERT INTO public.certificados_ambientales (
        empresa_id, emitido_por_id, periodo_inicio, periodo_fin,
        total_kg_certificado, total_co2_evitado, hash_verificacion
    ) VALUES (
        p_empresa_id, p_emitido_por, p_periodo_inicio, p_periodo_fin,
        v_total_kg, v_total_co2, v_hash
    ) RETURNING certificado_id INTO v_certificado_id;

    v_radicado := 'GC-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(NEXTVAL('public.seq_certificado_radicado')::TEXT, 6, '0');

    UPDATE public.certificados_ambientales
    SET numero_radicado = v_radicado
    WHERE certificado_id = v_certificado_id;

    INSERT INTO public.detalles_certificado (certificado_id, recoleccion_id)
    SELECT v_certificado_id, r.recoleccion_id
    FROM public.recolecciones r
    WHERE r.empresa_id = p_empresa_id
      AND r.fecha_recoleccion >= p_periodo_inicio
      AND r.fecha_recoleccion < p_periodo_fin + 1;

    RETURN v_certificado_id;
END;
$$ LANGUAGE plpgsql;
