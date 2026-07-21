#  Green-Loop

Web platform of traceability and compliance for solid waste management, aimed at recycler cooperatives and grooming companies. Digitize the complete collection cycle: registration of loads by QR, automatic calculation of incentives and issuance of digital environmental management certificates, with reports ready to be presented to authorities.

## Roles

| Role | What does |

|---|---|

| **Admin** | Manage users, routes, trucks/QR, requests, certificates, payments and reports |

| **Recycler** | Register loads by scanning the truck's QR (or manual input if the navigator does not support camera) |

| **Company** | Request collections and consult your environmental certificates |

## Main functionalities

- Registration of loads by QR, associated with a real truck and route.

- Calculation of incentives by weight, quality of the waste and area (backend; no dedicated view yet in the frontend).

- Digital certification with single file and verification hash. **The verification of a certificate is public**, no login required.

- Collection requests (`pending → attended/cancelled`).

- Reports by area/month and format for authorities, exportable to CSV.

- Loads, trucks and certificates are **immutable once created** (not edited or deleted), by design, to ensure traceability.

## Stack

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL 16, JWT authentication with bcrypt.

- **Frontend**: JavaScript vanilla (SPA by hash routing) + Tailwind CSS, served with Nginx.

- **Infrastructure**: Docker Compose (3 services: `postgres`, `backend`, `frontend`).

## Prerequisites

- Docker and Docker Compose installed.

## Installation and execution

```bash

Git clone <url-del-repo>

Cd green-loop

Docker compose up -d --build

```

This lifts the three services. Database tables are created automatically when the backend starts (`init_db()`); `schema.sql` is left as a query reference.

## Environment variables

Defined directly in `docker-compose.yml`:

| Variable | Description |

|---|---|

| `DATABASE_URL` | Connection to PostgreSQL (`postgres:5432/greenloop`) |

| `SECRET_KEY` | JWT signature key — **change in production** |

| `ALGORITHM` | JWT Algorithm (`HS256`) |

| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration (60 min) |

| `FRONTEND_URL` | Frontend URL, used by the backend (`http://localhost:3000`) |

## 📁 Project Structure

```

Green_Loop/

├── backend/ # FastAPI

│ ├── api/

│ │ ├── routes.py # 9 routers: auth, loads, certificates, payments, catalogs, reports, dashboard, users, health

│ │ └── auth.py # JWT + bcrypt

│ ├── models/ # SQLAlchemy models

│ ├── schemas/ # Pydantic validation

│ ├── services/ # Logic: pdf, payments, qr, hash

│ ├── db/ # BD Connection

│ ├── main.py # FastAPI App

│├── requirements.txt

│ └�─ Dockerfile

├── frontend/ # Vanilla JS + CSS + Chart.js

│├── index.html

│ ├── css/style.css # pure CSS (without Tailwind, without CDN)

│ ├── js/

│ │ ├── api.js # Fetch + auth

│ │ ├── router.js # SPA hash router

│ │ ├── app.js # Init + navbar

│ │ └── views/ # login, register, dashboard, loads, certificates, reports, users

│ └── assets/ # FontAwesome, Chart.js, favicon (locales)

├── database/

│ └── schema.sql # PostgreSQL 3FN + seeds

├── docker-compose.yml # PostgreSQL + Backend + Frontend (nginx)

├── nginx.conf # Proxy + CORS

```

## Access

| Service | URL |

|---|---|

| Frontend | http://localhost:3000 |

| Backend (API) | http://localhost:8000/api |

| Docs API (Swagger) | http://localhost:8000/docs |

| Database (PostgreSQL) | localhost:5432 |

## Trial users

| Role | Email | Password |

|---|---|---|

| Admin | admin@greenloop.co | admin123 |

| Recycler | juan@reciclador.co | rec123 |

| Company | company@test.com | company123 |

## Team

| Member | Role |

|---|---|

| Angela García | Scrum Master |

| Sebastian Mendoza | Frontend |

| Golden Briana | Backend |

| Josué Andrade | Analyst |
