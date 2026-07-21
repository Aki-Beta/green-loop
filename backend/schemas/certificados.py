from pydantic import BaseModel, EmailStr


class CertificadoCreateSchema(BaseModel):
    empresa_email: EmailStr
