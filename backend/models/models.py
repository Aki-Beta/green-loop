"""
Modelos SQLAlchemy - Green-Loop
Tablas simples y claras para PostgreSQL
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Numeric, DateTime, Date, ForeignKey,
    Enum as SQLEnum, Text, Boolean, Index, func, JSON
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
import enum

from db import Base


# ============================================================
# ENUMS (Valores fijos)
# ============================================================

class RolUsuario(str, enum.Enum):
    admin = "admin"
    reciclador = "reciclador"
    empresa = "empresa"

class CalidadResiduo(str, enum.Enum):
    alta = "alta"
    media = "media"
    baja = "baja"

class EstadoPago(str, enum.Enum):
    pendiente = "pendiente"
    pagado = "pagado"
    rechazado = "rechazado"

class EstadoSolicitud(str, enum.Enum):
    pendiente = "pendiente"
    atendida = "atendida"
    cancelada = "cancelada"

class EstadoCertificado(str, enum.Enum):
    emitido = "emitido"
    anulado = "anulado"
    vencido = "vencido"


# ============================================================
# MODELOS (Tablas)
# ============================================================

class Zona(Base):
    __tablename__ = "zonas"
    
    id_zona: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    multiplicador: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("1.00"))
    activa: Mapped[bool] = mapped_column(Boolean, default=True)
    creada_en: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    rutas: Mapped[List["Ruta"]] = relationship(back_populates="zona")


class Residuo(Base):
    __tablename__ = "residuos"
    
    id_residuo: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(50), nullable=False)
    codigo: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    precio_base_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    
    cargas: Mapped[List["Carga"]] = relationship(back_populates="residuo")


class Empresa(Base):
    __tablename__ = "empresas"
    
    id_empresa: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nit: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    razon_social: Mapped[str] = mapped_column(String(150), nullable=False)
    direccion: Mapped[Optional[str]] = mapped_column(Text)
    telefono: Mapped[Optional[str]] = mapped_column(String(20))
    email: Mapped[Optional[str]] = mapped_column(String(100))
    contacto_nombre: Mapped[Optional[str]] = mapped_column(String(100))
    activa: Mapped[bool] = mapped_column(Boolean, default=True)
    creada_en: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    rutas: Mapped[List["Ruta"]] = relationship(back_populates="empresa")
    certificados: Mapped[List["Certificado"]] = relationship(back_populates="empresa")
    usuarios: Mapped[List["Usuario"]] = relationship(back_populates="empresa")
    solicitudes: Mapped[List["Solicitud"]] = relationship(back_populates="empresa")


class Usuario(Base):
    __tablename__ = "usuarios"
    
    id_usuario: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    documento: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nombre_completo: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(100), unique=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(20))
    rol: Mapped[RolUsuario] = mapped_column(SQLEnum(RolUsuario), nullable=False, default=RolUsuario.reciclador)
    id_ruta_asignada: Mapped[Optional[int]] = mapped_column(ForeignKey("rutas.id_ruta"), nullable=True)
    id_empresa: Mapped[Optional[int]] = mapped_column(ForeignKey("empresas.id_empresa"), nullable=True)
    contrasena_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    ruta_asignada: Mapped[Optional["Ruta"]] = relationship(back_populates="recicladores")
    cargas: Mapped[List["Carga"]] = relationship(back_populates="reciclador")
    pagos: Mapped[List["Pago"]] = relationship(back_populates="reciclador")
    empresa: Mapped[Optional["Empresa"]] = relationship(back_populates="usuarios")


class Ruta(Base):
    __tablename__ = "rutas"
    
    id_ruta: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    id_zona: Mapped[int] = mapped_column(ForeignKey("zonas.id_zona"), nullable=False)
    id_empresa: Mapped[Optional[int]] = mapped_column(ForeignKey("empresas.id_empresa"), nullable=True)
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    activa: Mapped[bool] = mapped_column(Boolean, default=True)
    creada_en: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    zona: Mapped["Zona"] = relationship(back_populates="rutas")
    empresa: Mapped[Optional["Empresa"]] = relationship(back_populates="rutas")
    recicladores: Mapped[List["Usuario"]] = relationship(back_populates="ruta_asignada")
    cargas: Mapped[List["Carga"]] = relationship(back_populates="ruta")
    camiones: Mapped[List["Camion"]] = relationship(back_populates="ruta")


class Camion(Base):
    __tablename__ = "camiones"
    
    id_camion: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    placa: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    qr_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    capacidad_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    id_ruta: Mapped[int] = mapped_column(ForeignKey("rutas.id_ruta"), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    fecha_registro: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    
    ruta: Mapped["Ruta"] = relationship(back_populates="camiones")
    cargas: Mapped[List["Carga"]] = relationship(back_populates="camion")


class Carga(Base):
    __tablename__ = "cargas"
    
    id_carga: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    codigo_qr: Mapped[str] = mapped_column(String(50), nullable=False)
    id_ruta: Mapped[int] = mapped_column(ForeignKey("rutas.id_ruta"), nullable=False)
    id_residuo: Mapped[int] = mapped_column(ForeignKey("residuos.id_residuo"), nullable=False)
    id_reciclador: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario"), nullable=False)
    id_camion: Mapped[int] = mapped_column(ForeignKey("camiones.id_camion"), nullable=False)
    peso_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    calidad: Mapped[str] = mapped_column(String(10), nullable=False)
    fecha_recoleccion: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    observaciones: Mapped[Optional[str]] = mapped_column(Text)
    procesada: Mapped[bool] = mapped_column(Boolean, default=False)
    
    ruta: Mapped["Ruta"] = relationship(back_populates="cargas")
    residuo: Mapped["Residuo"] = relationship(back_populates="cargas")
    reciclador: Mapped["Usuario"] = relationship(back_populates="cargas")
    camion: Mapped["Camion"] = relationship(back_populates="cargas")
    certificado: Mapped[Optional["Certificado"]] = relationship(back_populates="carga", uselist=False)
    pagos: Mapped[List["Pago"]] = relationship(back_populates="carga")


class Certificado(Base):
    __tablename__ = "certificados"
    
    id_certificado: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    numero_radicado: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    id_carga: Mapped[int] = mapped_column(ForeignKey("cargas.id_carga"), nullable=False, unique=True)
    id_empresa: Mapped[int] = mapped_column(ForeignKey("empresas.id_empresa"), nullable=False)
    fecha_emision: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    periodo_inicio: Mapped[date] = mapped_column(nullable=False)
    periodo_fin: Mapped[date] = mapped_column(nullable=False)
    total_kg: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    residuos_detalle: Mapped[dict] = mapped_column(JSON, nullable=False)
    hash_verificacion: Mapped[str] = mapped_column(String(64), nullable=False)
    estado: Mapped[EstadoCertificado] = mapped_column(SQLEnum(EstadoCertificado), default=EstadoCertificado.emitido)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500))
    
    carga: Mapped["Carga"] = relationship(back_populates="certificado")
    empresa: Mapped["Empresa"] = relationship(back_populates="certificados")


class Pago(Base):
    __tablename__ = "pagos"
    
    id_pago: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_reciclador: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario"), nullable=False)
    id_carga: Mapped[int] = mapped_column(ForeignKey("cargas.id_carga"), nullable=False)
    monto_base: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    multiplicador_calidad: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False)
    multiplicador_zona: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False)
    monto_final: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fecha_calculo: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    estado: Mapped[EstadoPago] = mapped_column(SQLEnum(EstadoPago), default=EstadoPago.pendiente)
    fecha_pago: Mapped[Optional[datetime]] = mapped_column()
    referencia_transaccion: Mapped[Optional[str]] = mapped_column(String(100))
    
    reciclador: Mapped["Usuario"] = relationship(back_populates="pagos")
    carga: Mapped["Carga"] = relationship(back_populates="pagos")


class Solicitud(Base):
    """Una empresa pide una recolección: qué tipo de residuo y cuánto (aprox)."""
    __tablename__ = "solicitudes"

    id_solicitud: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_empresa: Mapped[int] = mapped_column(ForeignKey("empresas.id_empresa"), nullable=False)
    tipo_residuo: Mapped[str] = mapped_column(String(50), nullable=False)
    cantidad_estimada_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notas: Mapped[Optional[str]] = mapped_column(Text)
    estado: Mapped[EstadoSolicitud] = mapped_column(SQLEnum(EstadoSolicitud), default=EstadoSolicitud.pendiente)
    creada_en: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    empresa: Mapped["Empresa"] = relationship(back_populates="solicitudes")


# Índices para búsquedas rápidas
Index("idx_cargas_fecha", Carga.fecha_recoleccion)
Index("idx_cargas_reciclador", Carga.id_reciclador)
Index("idx_cargas_ruta", Carga.id_ruta)
Index("idx_certificados_radicado", Certificado.numero_radicado)
Index("idx_pagos_reciclador", Pago.id_reciclador)
Index("idx_pagos_estado", Pago.estado)