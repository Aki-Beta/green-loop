"""
services/hash_service.py
Genera el número de radicado y el hash de verificación pública de un
certificado (ej. para el botón "Verificar" en el frontend).
"""
import hashlib
import secrets
from datetime import datetime


def generar_numero_radicado() -> str:
    return f"GL-{datetime.utcnow().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"


def generar_hash_certificado(numero_radicado: str, id_carga: int, id_empresa: int) -> str:
    payload = f"{numero_radicado}-{id_carga}-{id_empresa}"
    return hashlib.sha256(payload.encode()).hexdigest()
