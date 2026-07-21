from typing import Optional
from pydantic import BaseModel, EmailStr


class UsuarioCreateSchema(BaseModel):
    documento: str
    nombre_completo: str
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    rol: str = "reciclador"
    id_ruta_asignada: Optional[int] = None
    id_empresa: Optional[int] = None
    password: str


class UsuarioUpdateSchema(BaseModel):
    documento: Optional[str] = None
    nombre_completo: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    rol: Optional[str] = None
    id_ruta_asignada: Optional[int] = None
    id_empresa: Optional[int] = None
    password: Optional[str] = None
