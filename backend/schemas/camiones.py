from pydantic import BaseModel


class CamionCreateSchema(BaseModel):
    placa: str
    capacidad_kg: float
    id_ruta: int
