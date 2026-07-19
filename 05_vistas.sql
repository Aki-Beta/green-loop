-- ============================================================
-- ARCHIVO 05: Vistas del sistema
-- ============================================================

CREATE OR REPLACE VIEW public.vista_usuarios_pendientes AS
SELECT
    u.id AS usuario_id,
    u.nombre,
    u.email,
    u.rol,
    u.fecha_registro,
    pe.nit,
    pe.razon_social,
    pe.documento_camara_comercio,
    pe.licencia_ambiental,
    pr.cedula,
    pr.foto_identificacion
FROM public.usuarios u
LEFT JOIN public.perfil_empresas pe ON pe.empresa_id = u.id
LEFT JOIN public.perfil_recicladores pr ON pr.reciclador_id = u.id
WHERE u.estado = 'pendiente'
ORDER BY u.fecha_registro ASC;
