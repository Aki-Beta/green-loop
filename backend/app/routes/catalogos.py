# backend/app/routes/catalogos.py - Datos para los <select> del frontend
from flask import Blueprint, jsonify
from backend.app.models import TipoResiduo, Camion, Ruta, Usuario

bp = Blueprint('catalogos', __name__)


@bp.route('/tipos-residuo', methods=['GET'])
def get_tipos_residuo():
    tipos = TipoResiduo.query.order_by(TipoResiduo.nombre).all()
    return jsonify([{
        'id': t.id, 'nombre': t.nombre, 'tarifa_base': float(t.tarifa_base),
        'display': f"{t.nombre.capitalize()} (${float(t.tarifa_base):,.0f}/kg)"
    } for t in tipos])


@bp.route('/camiones', methods=['GET'])
def get_camiones():
    camiones = Camion.query.join(Ruta).order_by(Camion.placa).all()
    return jsonify([{
        'id': c.id, 'placa': c.placa, 'qr_code': c.qr_code,
        'capacidad_kg': float(c.capacidad_kg),
        'ruta': {
            'id': c.ruta.id, 'nombre': c.ruta.nombre,
            'municipio': c.ruta.municipio, 'zona': c.ruta.zona
        }
    } for c in camiones])


@bp.route('/rutas', methods=['GET'])
def get_rutas():
    rutas = Ruta.query.order_by(Ruta.municipio, Ruta.nombre).all()
    return jsonify([{
        'id': r.id, 'nombre': r.nombre, 'municipio': r.municipio, 'zona': r.zona,
        'display': f"{r.nombre} - {r.municipio} ({r.zona})"
    } for r in rutas])


@bp.route('/usuarios', methods=['GET'])
def get_usuarios():
    usuarios = Usuario.query.filter_by(rol='reciclador').order_by(Usuario.nombre).all()
    return jsonify([{'id': u.id, 'nombre': u.nombre, 'email': u.email} for u in usuarios])


@bp.route('/camiones/<qr_code>/validar', methods=['GET'])
def validar_qr_camion(qr_code):
    camion = Camion.query.filter_by(qr_code=qr_code.upper()).first()
    if not camion:
        return jsonify({'valido': False, 'mensaje': 'Código QR no registrado'}), 404
    return jsonify({
        'valido': True,
        'camion': {'id': camion.id, 'placa': camion.placa, 'qr_code': camion.qr_code,
                    'capacidad_kg': float(camion.capacidad_kg)},
        'ruta': {'id': camion.ruta.id, 'nombre': camion.ruta.nombre,
                  'municipio': camion.ruta.municipio, 'zona': camion.ruta.zona}
    })