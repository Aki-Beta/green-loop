# backend/app/utils/validators.py - Reglas de negocio centralizadas
from backend.app.models import Camion, TipoResiduo

FACTORES_CALIDAD = {'A': 1.2, 'B': 1.0, 'C': 0.7}
FACTORES_ZONA = {'urbana': 1.0, 'rural': 1.3}


def validar_carga(qr_code, peso_kg, tipo_residuo_id, calidad, zona):
    """
    Valida todas las reglas de negocio antes de registrar una carga.
    Retorna (es_valido, mensaje_error, datos_resueltos)
    """
    camion = Camion.query.filter_by(qr_code=qr_code).first()
    if not camion:
        return False, f"Código QR '{qr_code}' no registrado en el sistema", None

    try:
        peso = float(peso_kg)
    except (ValueError, TypeError):
        return False, "Peso inválido: debe ser un número", None

    if peso <= 0:
        return False, "El peso debe ser mayor a cero", None

    if peso > float(camion.capacidad_kg):
        return False, f"Peso ({peso} kg) excede capacidad del camión ({camion.capacidad_kg} kg)", None

    tipo_residuo = TipoResiduo.query.get(tipo_residuo_id)
    if not tipo_residuo:
        return False, f"Tipo de residuo ID {tipo_residuo_id} no existe", None

    if calidad not in FACTORES_CALIDAD:
        return False, f"Calidad '{calidad}' inválida. Debe ser: A, B o C", None

    if zona not in FACTORES_ZONA:
        return False, f"Zona '{zona}' inválida. Debe ser: urbana o rural", None

    if camion.ruta.zona != zona:
        return False, f"Zona '{zona}' no coincide con ruta del camión ('{camion.ruta.zona}')", None

    return True, None, {
        'camion': camion,
        'tipo_residuo': tipo_residuo,
        'factor_calidad': FACTORES_CALIDAD[calidad],
        'factor_zona': FACTORES_ZONA[zona],
        'peso_kg': peso
    }


def calcular_incentivo(peso_kg, tarifa_base, factor_calidad, factor_zona):
    """Fórmula: peso × tarifa_base × factor_calidad × factor_zona"""
    incentivo = float(peso_kg) * float(tarifa_base) * factor_calidad * factor_zona
    return round(incentivo, 2)