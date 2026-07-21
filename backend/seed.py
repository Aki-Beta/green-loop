"""
Crea los usuarios de prueba que promete el README:
  admin@greenloop.co / admin123
  juan@reciclador.co / rec123
  empresa@test.com   / empresa123

Uso (con los contenedores ya levantados):
    docker compose exec backend python seed.py
"""
from db import SessionLocal, init_db
from models import Usuario, Empresa, RolUsuario
from api.auth import get_password_hash

init_db()
db = SessionLocal()

try:
    if not db.query(Usuario).filter(Usuario.email == "admin@greenloop.co").first():
        db.add(Usuario(
            documento="ADMIN001",
            nombre_completo="Administrador Green-Loop",
            email="admin@greenloop.co",
            rol=RolUsuario.admin,
            contrasena_hash=get_password_hash("admin123"),
            activo=True,
        ))
        print("✅ Admin creado: admin@greenloop.co / admin123")
    else:
        print("ℹ️  Admin ya existía")

    if not db.query(Usuario).filter(Usuario.email == "juan@reciclador.co").first():
        db.add(Usuario(
            documento="REC001",
            nombre_completo="Juan Pérez",
            email="juan@reciclador.co",
            rol=RolUsuario.reciclador,
            contrasena_hash=get_password_hash("rec123"),
            activo=True,
        ))
        print("✅ Reciclador creado: juan@reciclador.co / rec123")
    else:
        print("ℹ️  Reciclador ya existía")

    empresa = db.query(Empresa).filter(Empresa.email == "empresa@test.com").first()
    if not empresa:
        empresa = Empresa(nit="900123456", razon_social="Empresa Test S.A.S", email="empresa@test.com", activa=True)
        db.add(empresa)
        db.commit()
        db.refresh(empresa)

    if not db.query(Usuario).filter(Usuario.email == "empresa@test.com").first():
        db.add(Usuario(
            documento="EMP001",
            nombre_completo="Empresa Test",
            email="empresa@test.com",
            rol=RolUsuario.empresa,
            id_empresa=empresa.id_empresa,
            contrasena_hash=get_password_hash("empresa123"),
            activo=True,
        ))
        print("✅ Empresa creada: empresa@test.com / empresa123")
    else:
        print("ℹ️  Empresa ya existía")

    db.commit()
    print("🌿 Seed completo.")
finally:
    db.close()
