"""
Punto de entrada principal - Green-Loop API
FastAPI app con todos los routers registrados
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from db import init_db
from api.routes import (
    auth_router, cargas_router, certificados_router,
    pagos_router, catalogos_router, reportes_router,
    dashboard_router, usuarios_router, health_router
)


# ============================================================
# LIFESPAN (Startup/Shutdown)
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Iniciando Green-Loop API...")
    init_db()
    print("✅ Base de datos conectada")
    yield
    # Shutdown
    print("👋 Apagando Green-Loop API...")


# ============================================================
# APP FASTAPI
# ============================================================

app = FastAPI(
    title="Green-Loop API",
    description="Plataforma de Trazabilidad y Cumplimiento para Gestión de Residuos Sólidos - Colombia",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS para frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:3000", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# REGISTRO DE ROUTERS
# ============================================================

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(catalogos_router)
app.include_router(cargas_router)
app.include_router(certificados_router)
app.include_router(pagos_router)
app.include_router(dashboard_router)
app.include_router(reportes_router)
app.include_router(usuarios_router)

# ============================================================
# ENDPOINTS ADICIONALES
# ============================================================

@app.get("/")
def root():
    return {
        "message": "🌿 Green-Loop API - Trazabilidad de Residuos Sólidos",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "normativa": "Resolución 2184/2019 - Ley 1950/2019"
    }


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )