from typing import Optional
from pydantic import BaseModel


class CargaCreateSchema(BaseModel):
    empresa_email: Optional[str] = None
    tipo_residuo: str
    peso_kg: float
    id_camion: Optional[int] = None  # viene del escaneo real del QR del camión


class SimularQRSchema(BaseModel):
    qr_code: str
