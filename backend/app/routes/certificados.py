# backend/app/routes/certificados.py - Descarga y verificación de certificados
from flask import Blueprint, send_file, jsonify
from backend.app.models import Carga, Certificado
import os

bp = Blueprint('certificados', __name__)


@bp.route('/certificados/<int:carga_id>/pdf', methods=['GET'])
def descargar_certificado(carga_id):
    carga = Carga.query.get_or_404(carga_id)

    if not carga.certificado:
        return jsonify({'error': 'Certificado no generado para esta carga'}), 404

    if not os.path.exists(carga.certificado.pdf_path):
        return jsonify({'error': 'Archivo PDF no encontrado en servidor'}), 404

    return send_file(
        carga.certificado.pdf_path,
        as_attachment=True,
        download_name=f"{carga.certificado.consecutivo}.pdf",
        mimetype='application/pdf'
    )


@bp.route('/certificados/verificar/<hash_verificacion>', methods=['GET'])
def verificar_certificado(hash_verificacion):
    """Endpoint público: verifica autenticidad de un certificado por su hash."""
    hash_norm = hash_verificacion.upper().strip()
    certificado = Certificado.query.filter_by(hash_verificacion=hash_norm).first()

    if not certificado:
        return jsonify({'valido': False, 'mensaje': 'Certificado no encontrado'}), 404

    carga = certificado.carga
    return jsonify({
        'valido': True,
        'consecutivo': certificado.consecutivo,
        'fecha_generacion': certificado.generado_en.isoformat(),
        'carga': {
            'fecha_recoleccion': carga.timestamp.isoformat(),
            'camion': carga.camion.placa,
            'tipo_residuo': carga.tipo_residuo.nombre,
            'peso_kg': float(carga.peso_kg),
            'zona': carga.zona,
            'calidad': carga.calidad,
            'reciclador': carga.usuario.nombre,
            'municipio': carga.camion.ruta.municipio
        }
    })