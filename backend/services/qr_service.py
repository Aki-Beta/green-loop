"""
services/qr_service.py
Generación/validación de códigos QR: el texto (que se guarda en la BD)
y la imagen real en base64 (para que el admin la imprima/comparta).
"""
import base64
import io
import secrets

import qrcode


def generar_qr_code(prefijo: str = "QR") -> str:
    return f"{prefijo}-{secrets.token_hex(4).upper()}"


def validar_qr_code(qr_code: str) -> bool:
    return bool(qr_code) and len(qr_code.strip()) >= 3


def generar_qr_image_base64(data: str) -> str:
    """Genera una imagen PNG del código QR y la devuelve como data URI base64."""
    img = qrcode.make(data)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"
