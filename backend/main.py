# backend/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn  

from db import init_db
from api.routes import (
    auth_router, cargas_router, certificados_router,
    pagos_router, catalogos_router, reportes_router,
    dashboard_router, usuarios_router, health_router,
    solicitudes_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Iniciando Green-Loop API...")
    init_db()  # Crea las tablas según models.py si no existen
    yield
    print("👋 Apagando Green-Loop API...")


app = FastAPI(title="Green-Loop API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de routers
app.include_router(health_router, prefix="/api")
app.include_router(auth_router)
app.include_router(catalogos_router)
app.include_router(cargas_router)
app.include_router(certificados_router)
app.include_router(pagos_router)
app.include_router(dashboard_router)
app.include_router(reportes_router)
app.include_router(usuarios_router)
app.include_router(solicitudes_router)

# --- ESTO ES LO QUE TE FALTABA PARA QUE FUNCIONE ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)