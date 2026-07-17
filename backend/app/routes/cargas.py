# backend/app/routes/cargas.py - Endpoints de registro de cargas
from flask import Blueprint, request, jsonify
from backend.app import db
from backend.app.models import Carga, Usuario, Certificado
from backend.app.utils.validators import validar_carga, FACTORES_CALIDAD, FACTORES_ZONA
from backend.app.services.pdf_generator import (
    generar_hash_verificacion, generar_certificado_pdf, calcular_incentivo_carga
)
import os
from datetime import datetime

bp = Blueprint('cargas', __name__)


@bp.route('/cargas', methods=['POST'])
def crear_carga():
    """
    Registra una nueva carga y genera su certificado automáticamente.
    Body JSON: {qr_code, peso_kg, tipo_residuo_id, calidad, zona, usuario_id}
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request debe ser JSON válido'}), 400

    required = ['qr_code', 'peso_kg', 'tipo_residuo_id', 'calidad', 'zona', 'usuario_id']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Campo requerido faltante: {field}'}), 400

    valido, error, datos = validar_carga(
        data['qr_code'], data['peso_kg'], data['tipo_residuo_id'],
        data['calidad'], data['zona']
    )
    if not valido:
        return jsonify({'error': error}), 400

    usuario = Usuario.query.get(data['usuario_id'])
    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    if usuario.rol != 'reciclador':
        return jsonify({'error': 'El usuario debe tener rol reciclador'}), 400

    carga = Carga(
        camion_id=datos['camion'].id,
        tipo_residuo_id=data['tipo_residuo_id'],
        peso_kg=data['peso_kg'],
        calidad=data['calidad'],
        zona=data['zona'],
        usuario_id=data['usuario_id']
    )
    db.session.add(carga)
    db.session.flush()

    consecutivo = f"CERT-{datetime.utcnow().strftime('%Y%m%d')}-{carga.id:06d}"
    hash_verificacion = generar_hash_verificacion(carga.id, consecutivo)

    pdf_dir = "backend/certificados"
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_path = os.path.join(pdf_dir, f"{consecutivo}.pdf")

    certificado = Certificado(
        carga_id=carga.id,
        consecutivo=consecutivo,
        hash_verificacion=hash_verificacion,
        pdf_path=pdf_path
    )
    db.session.add(certificado)
    db.session.commit()

    try:
        generar_certificado_pdf(carga, certificado, pdf_path)
    except Exception as e:
        print(f"⚠️ Error generando PDF: {e}")

    incentivo = calcular_incentivo_carga(carga)

    return jsonify({
        'message': 'Carga registrada y certificado generado exitosamente',
        'carga_id': carga.id,
        'certificado': {
            'consecutivo': consecutivo,
            'hash_verificacion': hash_verificacion,
            'pdf_url': f'/api/certificados/{carga.id}/pdf'
        },
        'incentivo_calculado': incentivo
    }), 201


@bp.route('/cargas/<int:carga_id>', methods=['GET'])
def obtener_carga(carga_id):
    carga = Carga.query.get_or_404(carga_id)
    return jsonify({
        'id': carga.id,
        'camion': {
            'placa': carga.camion.placa,
            'qr_code': carga.camion.qr_code,
            'ruta': {
                'nombre': carga.camion.ruta.nombre,
                'municipio': carga.camion.ruta.municipio
            }
        },
        'tipo_residuo': carga.tipo_residuo.nombre,
        'peso_kg': float(carga.peso_kg),
        'calidad': carga.calidad,
        'zona': carga.zona,
        'usuario': carga.usuario.nombre,
        'timestamp': carga.timestamp.isoformat(),
        'certificado': {
            'consecutivo': carga.certificado.consecutivo,
            'hash_verificacion': carga.certificado.hash_verificacion,
            'generado_en': carga.certificado.generado_en.isoformat()
        } if carga.certificado else None
    })


@bp.route('/cargas/<int:carga_id>/incentivo', methods=['GET'])
def obtener_incentivo(carga_id):
    carga = Carga.query.get_or_404(carga_id)
    incentivo = calcular_incentivo_carga(carga)

    return jsonify({
        'carga_id': carga.id,
        'peso_kg': float(carga.peso_kg),
        'tarifa_base': float(carga.tipo_residuo.tarifa_base),
        'factor_calidad': FACTORES_CALIDAD[carga.calidad],
        'factor_zona': FACTORES_ZONA[carga.zona],
        'incentivo_total': incentivo,
        'formula': (
            f"{float(carga.peso_kg)} × {float(carga.tipo_residuo.tarifa_base)} × "
            f"{FACTORES_CALIDAD[carga.calidad]} × {FACTORES_ZONA[carga.zona]} = {incentivo}"
        )
    })