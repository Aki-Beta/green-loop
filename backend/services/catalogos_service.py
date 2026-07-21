"""
services/catalogos_service.py
Helpers para obtener-o-crear catálogos (residuo, ruta, camión) cuando el
formulario simple del frontend no manda los IDs relacionales completos.
"""
import secrets
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Zona, Residuo, Ruta, Camion

RESIDUOS_DEFAULT = {
    "plastico": ("Plástico", "PLA", Decimal("800.00")),
    "carton": ("Cartón / Papel", "CAR", Decimal("300.00")),
    "vidrio": ("Vidrio", "VID", Decimal("200.00")),
    "organico": ("Orgánico Biodegradable", "ORG", Decimal("100.00")),
}


def get_or_create_residuo(db: Session, tipo_residuo: str) -> Residuo:
    tipo_residuo = (tipo_residuo or "").lower().strip()
    residuo = db.query(Residuo).filter(func.lower(Residuo.nombre) == tipo_residuo).first()
    if residuo:
        return residuo

    nombre, codigo, precio = RESIDUOS_DEFAULT.get(
        tipo_residuo,
        (tipo_residuo.capitalize() or "Materia General", (tipo_residuo[:10] or "GEN").upper(), Decimal("100.00")),
    )
    residuo = db.query(Residuo).filter(Residuo.codigo == codigo).first()
    if residuo:
        return residuo

    residuo = Residuo(nombre=nombre, codigo=codigo, precio_base_kg=precio, activo=True)
    db.add(residuo)
    db.commit()
    db.refresh(residuo)
    return residuo


def get_or_create_ruta_default(db: Session) -> Ruta:
    ruta = db.query(Ruta).filter(Ruta.codigo == "RUTA-GENERAL").first()
    if ruta:
        return ruta

    zona = db.query(Zona).filter(Zona.nombre == "General").first()
    if not zona:
        zona = Zona(nombre="General", descripcion="Zona genérica autogenerada", multiplicador=Decimal("1.00"), activa=True)
        db.add(zona)
        db.commit()
        db.refresh(zona)

    ruta = Ruta(codigo="RUTA-GENERAL", nombre="Ruta General", id_zona=zona.id_zona, activa=True)
    db.add(ruta)
    db.commit()
    db.refresh(ruta)
    return ruta


def get_or_create_camion_default(db: Session, ruta: Ruta) -> Camion:
    camion = db.query(Camion).filter(Camion.id_ruta == ruta.id_ruta).first()
    if camion:
        return camion

    camion = Camion(
        placa="GEN-001",
        qr_code=f"QR-{secrets.token_hex(4).upper()}",
        capacidad_kg=Decimal("5000.00"),
        id_ruta=ruta.id_ruta,
        activo=True,
    )
    db.add(camion)
    db.commit()
    db.refresh(camion)
    return camion
