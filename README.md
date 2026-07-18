# Green-Loop ♻️

**Plataforma de Trazabilidad de Residuos Sólidos - Colombia**

Implementación de la Resolución 2184/2019 y Ley 1950/2019 para gestión de residuos con trazabilidad, incentivos a recicladores y certificados de cumplimiento.

---

## 🚀 Inicio Rápido (Una sola línea)

```bash
# 1. Clonar
git clone <repo> Green_Loop && cd Green_Loop

# 2. Levantar todo con Docker
docker compose up -d --build

# 3. Abrir en navegador
# http://localhost:3000
```

---

## 🌐 URLs Importantes

| Qué | URL |
|-----|-----|
| **App (Login)** | http://localhost:3000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **Health Check** | http://localhost:3000/health |

---

## 👤 Usuarios de Prueba

| Rol | Email | Contraseña | Qué ve |
|-----|-------|------------|--------|
| **Admin** | `admin@greenloop.co` | `admin123` | Todo: Dashboard, Cargas, Certificados, Reportes, Usuarios |
| **Reciclador** | `juan@reciclador.co` | `rec123` | Dashboard, Mis Cargas, Mis Pagos |
| **Empresa** | `empresa@test.com` | `empresa123` | Dashboard, Mis Certificados, Cargas (solo ver) |

> **Nota:** El usuario `bdeoro200@gmail.com` no tiene contraseña configurada.

---

## 🛠️ Desarrollo Local (Sin Docker)

### Backend (FastAPI + PostgreSQL)
```bash
cd Green_Loop/backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # Editar DATABASE_URL si usas PostgreSQL local
python main.py
# → http://localhost:8000/docs
```

### Frontend (Vanilla JS + CSS)
```bash
cd Green_Loop/frontend
npx serve .                       # O: python -m http.server 3000
# → http://localhost:3000
```

### Base de Datos
```bash
# Opción A: Usar PostgreSQL local
createdb greenloop
psql -d greenloop -f ../database/schema.sql

# Opción B: Solo Docker para la BD
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=greenloop -p 5432:5432 postgres:16
```

---

## 📁 Estructura del Proyecto

```
Green_Loop/
├── backend/                 # FastAPI
│   ├── api/
│   │   ├── routes.py        # 9 routers: auth, cargas, certificados, pagos, catalogos, reportes, dashboard, usuarios, health
│   │   └── auth.py          # JWT + bcrypt
│   ├── models/              # SQLAlchemy modelos
│   ├── schemas/             # Pydantic validación
│   ├── services/            # Lógica: pdf, pagos, qr, hash
│   ├── db/                  # Conexión BD
│   ├── main.py              # App FastAPI
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                # Vanilla JS + CSS + Chart.js
│   ├── index.html
│   ├── css/style.css        # CSS puro (sin Tailwind, sin CDN)
│   ├── js/
│   │   ├── api.js           # Fetch + auth
│   │   ├── router.js        # SPA hash router
│   │   ├── app.js           # Init + navbar
│   │   └── views/           # login, register, dashboard, cargas, certificados, reportes, usuarios
│   └── assets/              # FontAwesome, Chart.js, favicon (locales)
├── database/
│   └── schema.sql           # PostgreSQL 3FN + seeds
├── docker-compose.yml       # PostgreSQL + Backend + Frontend (nginx)
├── nginx.conf               # Proxy + CORS + /api strip
└── .env.example
```

---

## 🔐 Autenticación

- **Login:** `POST /auth/login` con `{email, password}` → retorna JWT
- **Header:** `Authorization: Bearer <token>`
- **Roles:** `admin`, `reciclador`, `empresa`

---

## 📋 Endpoints Principales

| Módulo | Prefijo | Qué hace |
|--------|---------|----------|
| **Auth** | `/auth` | `POST /login`, `POST /register`, `GET /me` |
| **Cargas** | `/cargas` | Registrar carga QR, listar, ver |
| **Certificados** | `/certificados` | Generar PDF, verificar hash público |
| **Pagos** | `/pagos` | Calcular, listar, marcar pagado |
| **Dashboard** | `/dashboard` | KPIs, gráficos |
| **Reportes** | `/reportes` | Excel/PDF cumplimiento |
| **Usuarios** | `/usuarios` | CRUD + roles |
| **Catálogos** | `/catalogos` | Zonas, residuos, rutas, camiones, empresas |

📖 **Swagger interactivo:** http://localhost:8000/docs

---

## 🗄️ Base de Datos (Resumen)

**Tablas:** `zonas`, `empresas`, `rutas`, `camiones`, `residuos`, `usuarios`, `cargas`, `certificados`, `pagos`

**Fórmula de pago:**
```
monto = peso_kg × precio_base_kg × mult_calidad × mult_zona
```

| Calidad | Multiplicador |
|---------|---------------|
| Alta    | 1.20 |
| Media   | 1.00 |
| Baja    | 0.70 |

| Zona | Multiplicador |
|------|---------------|
| Urbana | 1.00 |
| Rural | 1.20 |
| Industrial | 1.15 |
| Centro Comercial | 1.10 |

---

## 🐳 Docker Compose (Producción)

```yaml
# docker-compose.prod.yml (ejemplo)
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./Green_Loop/backend
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/greenloop
      SECRET_KEY: ${SECRET_KEY}
      DEBUG: "false"
    command: gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

  frontend:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Green_Loop/frontend:/usr/share/nginx/html:ro
      - ./nginx.prod.conf:/etc/nginx/conf.d/default.conf:ro
```

---

## ✅ Checklist Despliegue

- [ ] `SECRET_KEY` fuerte en `.env`
- [ ] `DEBUG=False`, `FRONTEND_URL=https://tudominio.com`
- [ ] PostgreSQL con SSL + backups automáticos
- [ ] Nginx + SSL (Let's Encrypt) + rate limiting
- [ ] Gunicorn + Uvicorn workers (4+)
- [ ] Variables en secrets manager
- [ ] Logs centralizados (ELK/Loki)
- [ ] Health checks en `/health`

---

## 📦 Dependencias Principales

**Backend:**
- `fastapi`, `uvicorn`, `sqlalchemy`, `psycopg2`
- `pydantic[email]`, `python-jose`, `passlib[bcrypt]`
- `reportlab` (PDF), `openpyxl` (Excel), `qrcode`

**Frontend:**
- Chart.js (local), Font Awesome (CSS local)
- Vanilla JS ES6+ (módulos, async/await)

---

## 🧪 Testing

```bash
# Backend
cd Green_Loop/backend
pytest tests/ -v --cov=.

# Frontend (configurar Vitest/Jest)
cd Green_Loop/frontend
npm test
```

---

## 📄 Licencia

Proyecto educativo/demostrativo - Green Loop Colombia 🇨🇴

---

## 🤝 Contribuir

1. Fork → Feature branch → PR
2. Commits convencionales: `feat:`, `fix:`, `docs:`, `refactor:`
3. Tests + lint pasan en CI

---

**Desarrollado para cumplimiento normativo ambiental en Colombia** ♻️🇨🇴