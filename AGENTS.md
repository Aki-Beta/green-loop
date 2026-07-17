# Green Loop - AGENTS.md

## Project Overview
Flask REST API for waste traceability (Green Loop). Single-file implementation at `backend/main.py`.

## Structure
```
green-loop/
├── backend/
│   ├── main.py          # Single-file Flask API (entry point)
│   ├── venv/            # Python virtual environment
│   ├── greenloop.db     # SQLite DB (auto-created)
│   └── app/requirements.txt  # Dependencies (legacy location)
└── AGENTS.md            # This file
```

## Run Commands
```bash
cd green-loop/backend
source venv/bin/activate
python main.py
# API at http://localhost:5000
```

## API Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/health` | - | - | Health check |
| POST | `/api/auth/register-company` | - | - | Public company registration |
| POST | `/api/auth/register` | JWT | admin | Admin creates users (user, company, admin) |
| POST | `/api/auth/login` | - | - | Login, returns JWT |
| GET | `/api/me` | JWT | any | Current user profile |
| GET | `/api/users` | JWT | admin | List all users |
| DELETE | `/api/users/<id>` | JWT | admin | Delete user |

## Auth Flow
1. **Company** registers via `/register-company` (public)
2. **Admin** creates users via `/register` (requires admin JWT)
3. All login via `/login` → returns `access_token`
4. Use `Authorization: Bearer <token>` for protected routes

## Database
- SQLite (`greenloop.db` in `backend/`)
- Auto-created on first run via `db.create_all()`
- Reset: delete `greenloop.db` and restart

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

## Test Commands
```bash
# Health
curl http://localhost:5000/api/health

# Company registration
curl -X POST http://localhost:5000/api/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{"email":"co@test.com","password":"123456","company_name":"Test S.A.S."}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"co@test.com","password":"123456}'

# Use token
TOKEN=<access_token>
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/me

# Admin creates user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"email":"rec@test.com","password":"123456","role":"user"}'
```

## Known Issues / Gotchas
- JWT secret hardcoded in `main.py` - change for production
- No tests, linting, or type checking configured
- No migrations - schema changes require deleting DB
- Legacy files in `app/`, `routes/`, `controllers/`, `models/` removed (unused)
- `requirements.txt` in root and `app/` are legacy; deps installed in venv