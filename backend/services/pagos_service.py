"""
services/pagos_service.py
Fórmula de pago (ver README):
    monto = peso_kg * precio_base_kg * mult_calidad * mult_zona
"""
from decimal import Decimal

from models import Carga

MULT_CALIDAD = {
    "alta": Decimal("1.20"),
    "media": Decimal("1.00"),
    "baja": Decimal("0.70"),
}


def calcular_monto(carga: Carga) -> dict:
    mult_calidad = MULT_CALIDAD.get(carga.calidad, Decimal("1.00"))
    mult_zona = carga.ruta.zona.multiplicador if carga.ruta and carga.ruta.zona else Decimal("1.00")
    monto_base = carga.peso_kg * carga.residuo.precio_base_kg if carga.residuo else Decimal("0")
    monto_final = monto_base * mult_calidad * mult_zona
    return {
        "monto_base": monto_base,
        "multiplicador_calidad": mult_calidad,
        "multiplicador_zona": mult_zona,
        "monto_final": monto_final,
    }
