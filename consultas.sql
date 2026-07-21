-- ============================================================
-- ARCHIVO 06: Consultas de reporte
-- ============================================================

-- 1. Solicitudes activas con datos de empresa, reciclador y zona
SELECT
    s.solicitud_id,
    s.fecha_solicitud,
    s.estado_solicitud,
    u_emp.nombre AS empresa,
    u_rec.nombre AS reciclador,
    z.nombre_zona AS zona,
    s.observaciones
FROM public.solicitudes_recoleccion s
JOIN public.usuarios u_emp ON u_emp.id = s.empresa_id
JOIN public.zonas z ON z.zona_id = s.zona_id
LEFT JOIN public.usuarios u_rec ON u_rec.id = s.reciclador_id
WHERE s.estado_solicitud IN ('pendiente', 'asignada', 'en_proceso')
ORDER BY s.fecha_solicitud;

-- 2. Carga de trabajo por reciclador
SELECT
    u.nombre,
    COUNT(s.solicitud_id) FILTER (WHERE s.estado_solicitud IN ('asignada','en_proceso')) AS activas,
    COUNT(s.solicitud_id) FILTER (WHERE s.estado_solicitud = 'completada') AS completadas
FROM public.usuarios u
JOIN public.perfil_recicladores pr ON pr.reciclador_id = u.id
LEFT JOIN public.solicitudes_recoleccion s ON s.reciclador_id = u.id
WHERE u.rol = 'reciclador'
GROUP BY u.nombre
ORDER BY activas DESC;

-- 3. Materiales más solicitados
SELECT
    m.nombre,
    COUNT(dsm.detalle_id) AS veces_solicitado,
    ROUND(AVG(dsm.cantidad_aproximada_kg), 2) AS promedio_kg
FROM public.materiales m
JOIN public.detalle_solicitud_materiales dsm ON dsm.material_id = m.material_id
GROUP BY m.nombre
ORDER BY veces_solicitado DESC;

-- 4. Solicitudes por zona
SELECT
    z.nombre_zona,
    COUNT(s.solicitud_id) AS total_solicitudes
FROM public.zonas z
LEFT JOIN public.solicitudes_recoleccion s ON s.zona_id = z.zona_id
GROUP BY z.nombre_zona
ORDER BY total_solicitudes DESC;

-- 5. Historial de auditoría (verificaciones de admin)
SELECT
    v.verificacion_id,
    u_usuario.nombre AS usuario,
    u_admin.nombre AS revisado_por,
    v.estado,
    v.motivo_rechazo,
    v.fecha_revision
FROM public.verificacion_documentos v
JOIN public.usuarios u_usuario ON u_usuario.id = v.usuario_id
JOIN public.usuarios u_admin ON u_admin.id = v.revisado_por
ORDER BY v.fecha_revision DESC;
