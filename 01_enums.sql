-- ============================================================
-- ARCHIVO 01: Tipos de dato personalizados (ENUM)
-- ============================================================

CREATE TYPE public.rol_usuario AS ENUM (
    'administrador',
    'reciclador',
    'empresa'
);

CREATE TYPE public.estado_verificacion AS ENUM (
    'pendiente',
    'aprobado',
    'rechazado'
);

CREATE TYPE public.estado_pago AS ENUM (
    'Pendiente',
    'Pagado',
    'Rechazado'
);

CREATE TYPE public.estado_certificado AS ENUM (
    'Emitido',
    'Anulado',
    'Vencido'
);
