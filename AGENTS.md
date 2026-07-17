# Green Loop - AGENTS.md

## Project Overview
Backend-only Flask API for waste traceability ("Green Loop"). Single-file implementation at `backend/main.py`.

## Run Commands

```bash
# Development server
cd backend
source venv/bin/activate
python main.py
# API at http://localhost:5000
```

## Key Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | /api/health | - | - | Health check |
| POST | /api/auth/register-company | - | - | Public company registration |
| POST | /api/auth/register | JWT | admin | Admin creates users |
| POST | /api/auth/login | - | - | Login (returns JWT) |
| GET | /api/me | JWT | any | Current user profile |
| GET | /api/users | JWT | admin | List all users |
| DELETE | /api/users/<id> | JWT | admin | Delete user |

## Auth Flow
1. **Company** registers via `/register-company` (public)
2. **Admin** creates users via `/register` (requires admin JWT)
3. All login via `/login` → returns `access_token`
4. Use `Authorization: Bearer <token>` for protected routes

## Database
- SQLite by default (`greenloop.db` in backend/)
- Auto-created on first run via `db.create_all()`
- To reset: delete `greenloop.db` and restart

## Dependencies
Installed in `venv/`:
```
flask==3.0.0
flask-sqlalchemy==3.1.1
flask-migrate==4.0.5
flask-cors==4.0.0
flask-jwt-extended
psycopg2-binary==2.9.9
python-dotenv==1.0.0
reportlab==4.0.8
qrcode==7.4.2
pillow==10.1.0
gunicorn==21.2.0
alembic==1.13.1
```

## Environment Variables (optional)
```bash
export SECRET_KEY="your-secret"
export JWT_SECRET_KEY="your-jwt-secret"
export DATABASE_URL="sqlite:///greenloop.db"  # or postgresql://...
```

## Common Tasks

**Test company registration:**
```bash
curl -X POST http://localhost:5000/api/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{"email":"co@test.com","password":"123456","company_name":"Test S.A.S."}'
```

**Test login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"co@test.com","password":"123456"}'
```

**Use token:**
```bash
TOKEN=<access_token_from_login>
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/me
```

**Admin creates user:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"email":"rec@test.com","password":"123456","role":"user"}'
```

## Gotchas
- JWT secret is hardcoded in `main.py` - change for production
- SQLite file (`greenloop.db`) is in `backend/` not project root
- No tests or linting configured
- No migrations - schema changes require deleting DB
- Frontend was removed; this is API-only now