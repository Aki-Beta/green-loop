from typing import Optional
from pydantic import BaseModel


class SolicitudCreateSchema(BaseModel):
    tipo_residuo: str
    cantidad_estimada_kg: float
    notas: Optional[str] = None
