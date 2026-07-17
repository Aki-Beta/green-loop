# Green Loop API

API REST para gestión de residuos sólidos - Resolución 2184/2019 - Ley 1950/2019

## Requisitos

- Python 3.10+
- pip / venv

## Instalación y ejecución

```bash
# 1. Clonar repositorio
git clone https://github.com/Aki-Beta/green-loop.git
cd green-loop/backend

# 2. Crear y activar entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 3. Instalar dependencias
pip install -r app/requirements.txt

# 4. Ejecutar servidor
python main.py
```

El servidor inicia en **http://localhost:5000**

## Endpoints

### Públicos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register-company` | **Registro libre de empresas** |
| POST | `/api/auth/login` | Login, devuelve JWT |

### Protegidos (requieren token JWT)
| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| POST | `/api/auth/register` | `admin` | Crear usuarios (user, company, admin) |
| GET | `/api/users` | `admin` | Listar todos los usuarios |
| DELETE | `/api/users/<id>` | `admin` | Eliminar usuario |
| GET | `/api/me` | Cualquiera | Datos del usuario autenticado |

## Flujo de uso

### 1. Registro de empresa (público)
```bash
curl -X POST http://localhost:5000/api/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{
    "email": "empresa@test.com",
    "password": "123456",
    "company_name": "Reciclajes Green S.A.S."
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "empresa@test.com", "password": "123456"}'
```
Respuesta:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "empresa@test.com",
    "role": "company",
    "company_name": "Reciclajes Green S.A.S."
  }
}
```

### 3. Usar token en endpoints protegidos
```bash
# Header: Authorization: Bearer <access_token>
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/me
```

### 4. Admin crea usuarios (recicladores, otros admins)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"email": "reciclador@test.com", "password": "123456", "role": "user"}'
```

## Roles

| Rol | Descripción | Cómo se crea |
|-----|-------------|--------------|
| `company` | Empresa registradora | Endpoint público `/register-company` |
| `user` | Reciclador/operador | Solo admin via `/register` |
| `admin` | Administrador del sistema | Solo admin via `/register` |

## Base de datos

SQLite por defecto (`greenloop.db`). Se crea automáticamente al iniciar.

## Variables de entorno (opcional)

```bash
export SECRET_KEY="tu-clave-secreta"
export JWT_SECRET_KEY="otra-clave-jwt"
export DATABASE_URL="sqlite:///greenloop.db"  # o postgresql://...
```