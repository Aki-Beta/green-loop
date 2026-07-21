from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginSchema(BaseModel):
    email: EmailStr
    password: str


class RegisterEmpresaSchema(BaseModel):
    documento: str
    nombre_completo: str
    email: EmailStr
    password: str
    rol: Optional[str] = "empresa"
