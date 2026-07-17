# backend/seed.py - Pobla la base de datos con datos de prueba
# Ejecutar con: python seed.py (después de docker-compose up -d)
from backend.app import create_app, db
from backend.app.models import Usuario, Ruta, TipoResiduo, Camion, Carga, Certificado
from backend.app.services.pdf_generator import generar_hash_verificacion, generar_certificado_pdf
from datetime import datetime, timedelta
import random
import os


def seed_database():
    app = create_app()

    with app.app_context():
        print("🌱 Iniciando seed de base de datos...")

        db.drop_all()
        db.create_all()
        print("✅ Tablas creadas")

        # 1. Usuarios
        usuarios = [
            Usuario(nombre='Juan Pérez', email='juan@cooperativa.com', rol='reciclador'),
            Usuario(nombre='María González', email='maria@cooperativa.com', rol='reciclador'),
            Usuario(nombre='Carlos Rodríguez', email='carlos@cooperativa.com', rol='reciclador'),
            Usuario(nombre='Ana Martínez', email='ana@cooperativa.com', rol='reciclador'),
            Usuario(nombre='Admin Sistema', email='admin@trazabilidad.com', rol='admin'),
        ]
        db.session.add_all(usuarios)
        db.session.flush()
        print(f"✅ {len(usuarios)} usuarios creados")

        # 2. Rutas
        rutas = [
            Ruta(nombre='Ruta Norte', municipio='Bogotá', zona='urbana'),
            Ruta(nombre='Ruta Sur', municipio='Bogotá', zona='urbana'),
            Ruta(nombre='Ruta Occidente', municipio='Soacha', zona='urbana'),
            Ruta(nombre='Ruta Oriental', municipio='Chía', zona='rural'),
            Ruta(nombre='Ruta Centro', municipio='Cota', zona='rural'),
        ]
        db.session.add_all(rutas)
        db.session.flush()
        print(f"✅ {len(rutas)} rutas creadas")

        # 3. Tipos de residuo (tarifas base aproximadas COP/kg)
        tipos = [
            TipoResiduo(nombre='carton', tarifa_base=800),
            TipoResiduo(nombre='plastico', tarifa_base=1200),
            TipoResiduo(nombre='vidrio', tarifa_base=300),
            TipoResiduo(nombre='metal', tarifa_base=2500),
            TipoResiduo(nombre='papel', tarifa_base=600),
        ]
        db.session.add_all(tipos)
        db.session.flush()
        print(f"✅ {len(tipos)} tipos de residuo creados")

        # 4. Camiones
        camiones = [
            Camion(placa='ABC123', qr_code='QR-CAM-001', capacidad_kg=5000, ruta_id=rutas[0].id),
            Camion(placa='DEF456', qr_code='QR-CAM-002', capacidad_kg=3000, ruta_id=rutas[1].id),
            Camion(placa='GHI789', qr_code='QR-CAM-003', capacidad_kg=2000, ruta_id=rutas[2].id),
            Camion(placa='JKL012', qr_code='QR-CAM-004', capacidad_kg=4000, ruta_id=rutas[3].id),
            Camion(placa='MNO345', qr_code='QR-CAM-005', capacidad_kg=2500, ruta_id=rutas[4].id),
        ]
        db.session.add_all(camiones)
        db.session.flush()
        print(f"✅ {len(camiones)} camiones creados")

        # 5. Cargas de prueba (últimos 7 días)
        recicladores = [u for u in usuarios if u.rol == 'reciclador']
        calidades = ['A', 'B', 'C']

        cargas_creadas = 0
        for i in range(20):
            dias_atras = random.randint(0, 7)
            timestamp = datetime.utcnow() - timedelta(
                days=dias_atras, hours=random.randint(0, 23), minutes=random.randint(0, 59)
            )

            camion = random.choice(camiones)
            tipo = random.choice(tipos)
            reciclador = random.choice(recicladores)
            calidad = random.choice(calidades)
            zona = camion.ruta.zona

            peso_max = float(camion.capacidad_kg) * 0.95
            peso_min = float(camion.capacidad_kg) * 0.3
            peso = round(random.uniform(peso_min, peso_max), 2)

            carga = Carga(
                camion_id=camion.id, tipo_residuo_id=tipo.id, peso_kg=peso,
                calidad=calidad, zona=zona, usuario_id=reciclador.id, timestamp=timestamp
            )
            db.session.add(carga)
            db.session.flush()

            consecutivo = f"CERT-{timestamp.strftime('%Y%m%d')}-{carga.id:06d}"
            hash_ver = generar_hash_verificacion(carga.id, consecutivo)

            pdf_dir = "backend/certificados"
            os.makedirs(pdf_dir, exist_ok=True)
            pdf_path = os.path.join(pdf_dir, f"{consecutivo}.pdf")

            certificado = Certificado(
                carga_id=carga.id, consecutivo=consecutivo,
                hash_verificacion=hash_ver, pdf_path=pdf_path
            )
            db.session.add(certificado)
            cargas_creadas += 1

        db.session.commit()
        print(f"✅ {cargas_creadas} cargas con certificados creadas")

        # Generar PDFs físicos
        print("📄 Generando PDFs de certificados...")
        for cert in Certificado.query.all():
            try:
                carga = Carga.query.get(cert.carga_id)
                if carga:
                    generar_certificado_pdf(carga, cert, cert.pdf_path)
            except Exception as e:
                print(f"⚠️ Error generando PDF {cert.consecutivo}: {e}")

        print("\n🎉 SEED COMPLETADO")
        print("\n📋 CÓDIGOS QR PARA PROBAR:")
        for c in camiones:
            print(f"   - {c.placa}: {c.qr_code} (Cap: {c.capacidad_kg}kg, Ruta: {c.ruta.nombre})")
        print("\n👥 RECICLADORES (usa su ID en el formulario):")
        for r in recicladores:
            print(f"   - {r.nombre} (ID: {r.id})")


if __name__ == '__main__':
    seed_database()