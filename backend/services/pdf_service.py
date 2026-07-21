"""
services/pdf_service.py

El README menciona generación de PDF para los certificados (reportlab),
pero esa parte todavía NO está implementada — el campo `pdf_url` del
modelo Certificado se guarda como None por ahora.

Esta función queda como punto de extensión: cuando se implemente,
debe generar el PDF, subirlo/guardarlo, y devolver la URL o ruta.
"""
from typing import Optional


def generar_pdf_certificado(certificado) -> Optional[str]:
    """Placeholder. Retorna None hasta que se implemente la generación real."""
    return None
