"""
Schemas Pydantic - Green-Loop
Validación de datos de entrada/salida para la API
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, validator
from enum import Enum


# ============================================================
# ENUMS
# ============================================================

class RolUsuario(str, Enum):
    admin = "admin"
    reciclador = "reciclador"
    empresa = "empresa"


class EstadoCarga(str, Enum):
    pendiente = "pendiente"
    confirmada = "confirmada"
    rechazada = "rechazada"


class CalidadResiduo(str, Enum):
    alta = "alta"
    media = "media"
    baja = "baja"


class EstadoPago(str, Enum):
    pendiente = "pendiente"
    pagado = "pagado"
    rechazado = "rechazado"


class EstadoCertificado(str, Enum):
    emitido = "emitido"
    anulado = "anulado"
    vencido = "vencido"


# ============================================================
# BASE MODELS
# ============================================================

class BaseSchema(BaseModel):
    class Config:
        from_attributes = True
        use_enum_values = True


# ============================================================
# ZONAS
# ============================================================

class ZonaBase(BaseSchema):
    nombre: str = Field(..., max_length=50)
    descripcion: Optional[str] = None
    multiplicador: Decimal = Field(default=Decimal("1.00"), ge=0)


class ZonaCreate(ZonaBase):
    pass


class ZonaUpdate(BaseSchema):
    nombre: Optional[str] = Field(None, max_length=50)
    descripcion: Optional[str] = None
    multiplicador: Optional[Decimal] = Field(None, ge=0)
    activa: Optional[bool] = None


class ZonaResponse(ZonaBase):
    id_zona: int
    activa: bool
    creada_en: datetime


# ============================================================
# RESIDUOS
# ============================================================

class ResiduoBase(BaseSchema):
    nombre: str = Field(..., max_length=50)
    codigo: str = Field(..., max_length=10)
    precio_base_kg: Decimal = Field(..., ge=0)
    descripcion: Optional[str] = None


class ResiduoCreate(ResiduoBase):
    pass


class ResiduoUpdate(BaseSchema):
    nombre: Optional[str] = Field(None, max_length=50)
    codigo: Optional[str] = Field(None, max_length=10)
    precio_base_kg: Optional[Decimal] = Field(None, ge=0)
    descripcion: Optional[str] = None
    activo: Optional[bool] = None


class ResiduoResponse(ResiduoBase):
    id_residuo: int
    activo: bool


# ============================================================
# EMPRESAS
# ============================================================

class EmpresaBase(BaseSchema):
    nit: str = Field(..., max_length=20)
    razon_social: str = Field(..., max_length=150)
    direccion: Optional[str] = None
    telefono: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    contacto_nombre: Optional[str] = Field(None, max_length=100)


class EmpresaCreate(EmpresaBase):
    pass


class EmpresaUpdate(BaseSchema):
    nit: Optional[str] = Field(None, max_length=20)
    razon_social: Optional[str] = Field(None, max_length=150)
    direccion: Optional[str] = None
    telefono: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    contacto_nombre: Optional[str] = Field(None, max_length=100)
    activa: Optional[bool] = None


class EmpresaResponse(EmpresaBase):
    id_empresa: int
    activa: bool
    creada_en: datetime


# ============================================================
# RUTAS
# ============================================================

class RutaBase(BaseSchema):
    codigo: str = Field(..., max_length=30)
    nombre: str = Field(..., max_length=100)
    id_zona: int
    id_empresa: Optional[int] = None
    descripcion: Optional[str] = None


class RutaCreate(RutaBase):
    pass


class RutaUpdate(BaseSchema):
    codigo: Optional[str] = Field(None, max_length=30)
    nombre: Optional[str] = Field(None, max_length=100)
    id_zona: Optional[int] = None
    id_empresa: Optional[int] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None


class RutaResponse(RutaBase):
    id_ruta: int
    activa: bool
    creada_en: datetime
    zona_nombre: Optional[str] = None
    empresa_nombre: Optional[str] = None


# ============================================================
# USUARIOS
# ============================================================

class UsuarioBase(BaseSchema):
    email: EmailStr
    nombre_completo: str = Field(..., max_length=150)
    telefono: Optional[str] = Field(None, max_length=20)
    rol: RolUsuario
    id_empresa: Optional[int] = None
    id_ruta_asignada: Optional[int] = None


class UsuarioCreate(UsuarioBase):
    password: str = Field(..., min_length=6, max_length=50)


class UsuarioUpdate(BaseSchema):
    email: Optional[EmailStr] = None
    nombre_completo: Optional[str] = Field(None, max_length=150)
    telefono: Optional[str] = Field(None, max_length=20)
    rol: Optional[RolUsuario] = None
    id_empresa: Optional[int] = None
    id_ruta_asignada: Optional[int] = None
    activo: Optional[bool] = None


class UsuarioLogin(BaseSchema):
    email: EmailStr
    password: str


class UsuarioResponse(UsuarioBase):
    id_usuario: int
    id_empresa: Optional[int] = None
    activo: bool
    creado_en: datetime
    ruta_nombre: Optional[str] = None


class TokenResponse(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse


# ============================================================
# CAMIONES
# ============================================================

class CamionBase(BaseSchema):
    placa: str = Field(..., max_length=10)
    qr_code: str = Field(..., max_length=50)
    capacidad_kg: Decimal = Field(..., ge=0)
    id_ruta: int


class CamionCreate(CamionBase):
    pass


class CamionUpdate(BaseSchema):
    placa: Optional[str] = Field(None, max_length=10)
    qr_code: Optional[str] = Field(None, max_length=50)
    capacidad_kg: Optional[Decimal] = Field(None, ge=0)
    id_ruta: Optional[int] = None
    activo: Optional[bool] = None


class CamionResponse(CamionBase):
    id_camion: int
    activo: bool
    fecha_registro: datetime
    ruta_nombre: Optional[str] = None


# ============================================================
# CARGAS
# ============================================================

class CargaBase(BaseSchema):
    codigo_qr: str = Field(..., max_length=50)
    id_ruta: int
    id_residuo: int
    id_reciclador: int
    peso_kg: Decimal = Field(..., gt=0)
    calidad: CalidadResiduo
    observaciones: Optional[str] = None


class CargaCreate(CargaBase):
    pass


class CargaUpdate(BaseSchema):
    codigo_qr: Optional[str] = Field(None, max_length=50)
    id_ruta: Optional[int] = None
    id_residuo: Optional[int] = None
    id_reciclador: Optional[int] = None
    peso_kg: Optional[Decimal] = Field(None, gt=0)
    calidad: Optional[CalidadResiduo] = None
    observaciones: Optional[str] = None
    procesada: Optional[bool] = None


class CargaResponse(CargaBase):
    id_carga: int
    fecha_recoleccion: datetime
    procesada: bool
    residuo_nombre: Optional[str] = None
    residuo_precio: Optional[Decimal] = None
    reciclador_nombre: Optional[str] = None
    ruta_nombre: Optional[str] = None
    zona_nombre: Optional[str] = None
    multiplicador_zona: Optional[Decimal] = None
    incentivo_calculado: Optional[Decimal] = None


class CargaSimularQR(BaseSchema):
    """Simula escaneo de QR del camión"""
    qr_code: str = Field(..., description="Código QR escaneado: CAMION-ZONA_NORTE-01")


# ============================================================
# CERTIFICADOS
# ============================================================

class CertificadoBase(BaseSchema):
    numero_radicado: str = Field(..., max_length=30)
    id_carga: int
    id_empresa: int
    periodo_inicio: date
    periodo_fin: date
    total_kg: Decimal = Field(..., ge=0)
    residuos_detalle: Dict[str, Any]
    hash_verificacion: str = Field(..., max_length=64)
    pdf_url: Optional[str] = None


class CertificadoCreate(CertificadoBase):
    pass


class CertificadoResponse(CertificadoBase):
    id_certificado: int
    fecha_emision: datetime
    estado: EstadoCertificado


class CertificadoVerificar(BaseSchema):
    hash_verificacion: str


# ============================================================
# PAGOS
# ============================================================

class PagoBase(BaseSchema):
    id_reciclador: int
    id_carga: int
    monto_base: Decimal = Field(..., ge=0)
    multiplicador_calidad: Decimal = Field(..., ge=0)
    multiplicador_zona: Decimal = Field(..., ge=0)
    monto_final: Decimal = Field(..., ge=0)


class PagoCreate(PagoBase):
    pass


class PagoUpdate(BaseSchema):
    estado: Optional[EstadoPago] = None
    fecha_pago: Optional[datetime] = None
    referencia_transaccion: Optional[str] = Field(None, max_length=100)


class PagoResponse(PagoBase):
    id_pago: int
    fecha_calculo: datetime
    estado: EstadoPago
    fecha_pago: Optional[datetime] = None
    referencia_transaccion: Optional[str] = None
    reciclador_nombre: Optional[str] = None


# ============================================================
# REPORTES / DASHBOARD
# ============================================================

class ResumenMensualZona(BaseSchema):
    mes: date
    zona: str
    residuo: str
    total_cargas: int
    total_kg: Decimal
    valor_estimado: Decimal


class DashboardStats(BaseSchema):
    total_cargas_hoy: int
    total_kg_hoy: Decimal
    total_recicladores_activos: int
    total_empresas: int
    cargas_por_zona: Dict[str, int]
    cargas_por_residuo: Dict[str, int]
    kg_por_zona: Dict[str, Decimal]
    incentivos_pendientes: Decimal


class ReporteAutoridad(BaseSchema):
    """Formato para exportar a autoridad ambiental"""
    consecutivo: int
    certificado_radicado: str
    fecha_recoleccion: date
    hora_recoleccion: str
    municipio: str
    ruta: str
    zona: str
    camion_placa: str
    camion_qr: str
    tipo_residuo: str
    peso_kg: Decimal
    calidad: str
    reciclador: str
    reciclador_email: str
    incentivo_cop: Decimal
    hash_verificacion: str


# ============================================================
# UTILIDADES
# ============================================================

class MessageResponse(BaseSchema):
    message: str
    detail: Optional[str] = None


class ErrorResponse(BaseSchema):
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


class PaginatedResponse(BaseSchema):
    total: int
    page: int
    per_page: int
    items: List[Any]