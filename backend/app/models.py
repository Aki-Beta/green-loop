# backend/app/models.py - 6 tablas normalizadas (3FN)
from datetime import datetime
from backend.app import db


class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    rol = db.Column(db.String(20), nullable=False)  # reciclador, admin, empresa
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    cargas = db.relationship('Carga', backref='usuario', lazy=True)

    def __repr__(self):
        return f'<Usuario {self.nombre} ({self.rol})>'


class Ruta(db.Model):
    __tablename__ = 'rutas'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    municipio = db.Column(db.String(100), nullable=False)
    zona = db.Column(db.String(50), nullable=False)  # urbana | rural
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    camiones = db.relationship('Camion', backref='ruta', lazy=True)

    def __repr__(self):
        return f'<Ruta {self.nombre} - {self.municipio}>'


class TipoResiduo(db.Model):
    __tablename__ = 'tipos_residuo'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), unique=True, nullable=False)
    tarifa_base = db.Column(db.Numeric(10, 2), nullable=False)  # COP/kg
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    cargas = db.relationship('Carga', backref='tipo_residuo', lazy=True)

    def __repr__(self):
        return f'<TipoResiduo {self.nombre} - ${self.tarifa_base}/kg>'


class Camion(db.Model):
    __tablename__ = 'camiones'
    id = db.Column(db.Integer, primary_key=True)
    placa = db.Column(db.String(10), unique=True, nullable=False)
    qr_code = db.Column(db.String(100), unique=True, nullable=False)
    capacidad_kg = db.Column(db.Numeric(10, 2), nullable=False)
    ruta_id = db.Column(db.Integer, db.ForeignKey('rutas.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    cargas = db.relationship('Carga', backref='camion', lazy=True)

    def __repr__(self):
        return f'<Camion {self.placa} (QR: {self.qr_code})>'


class Carga(db.Model):
    __tablename__ = 'cargas'
    id = db.Column(db.Integer, primary_key=True)
    camion_id = db.Column(db.Integer, db.ForeignKey('camiones.id'), nullable=False)
    tipo_residuo_id = db.Column(db.Integer, db.ForeignKey('tipos_residuo.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    peso_kg = db.Column(db.Numeric(10, 2), nullable=False)
    calidad = db.Column(db.String(1), nullable=False)  # A | B | C
    zona = db.Column(db.String(50), nullable=False)    # urbana | rural
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    certificado = db.relationship(
        'Certificado', backref='carga', uselist=False,
        cascade='all, delete-orphan'
    )

    def __repr__(self):
        return f'<Carga #{self.id} - {self.peso_kg}kg>'


class Certificado(db.Model):
    __tablename__ = 'certificados'
    id = db.Column(db.Integer, primary_key=True)
    carga_id = db.Column(db.Integer, db.ForeignKey('cargas.id'), unique=True, nullable=False)
    consecutivo = db.Column(db.String(20), unique=True, nullable=False)
    hash_verificacion = db.Column(db.String(64), nullable=False)
    pdf_path = db.Column(db.String(255))
    generado_en = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Certificado {self.consecutivo}>'