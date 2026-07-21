"""
Configuración de base de datos - Green-Loop
Conexión simple a PostgreSQL
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/greenloop")

engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        # Si ya existen los tipos/tablas (ej. por una condición de carrera con
        # --reload arrancando dos veces), no tumbamos la app; solo avisamos.
        print(f"⚠️  init_db(): aviso al crear tablas (probablemente ya existían): {e}")