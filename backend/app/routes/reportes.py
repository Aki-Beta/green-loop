# backend/app/routes/reportes.py - Reportes de cumplimiento para autoridades
from flask import Blueprint, request, jsonify
from backend.app import db
from backend.app.models import Carga, TipoResiduo, Ruta, Usuario, Camion
from datetime import datetime
# OJO: calcular_incentivo_carga vive en services/pdf_generator.py, NO en validators.py
from backend.app.services.pdf_generator import calcular_incentivo_carga

bp = Blueprint('reportes', __name__)


@bp.route('/reportes', methods=['GET'])
def reporte_general():
    """
    Reporte agregado de cargas con filtros opcionales:
    fecha_inicio, fecha_fin, municipio, zona, tipo_residuo_id, page, per_page
    """
    fecha_inicio_str = request.args.get('fecha_inicio')
    fecha_fin_str = request.args.get('fecha_fin')
    municipio = request.args.get('municipio')
    zona = request.args.get('zona')
    tipo_residuo_id = request.args.get('tipo_residuo_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 50, type=int), 100)

    query = db.session.query(Carga).join(Camion).join(Ruta).join(TipoResiduo).join(Usuario)

    if fecha_inicio_str:
        try:
            fecha_inicio = datetime.fromisoformat(fecha_inicio_str)
            query = query.filter(Carga.timestamp >= fecha_inicio)
        except ValueError:
            return jsonify({'error': 'Formato fecha_inicio inválido. Use YYYY-MM-DD'}), 400

    if fecha_fin_str:
        try:
            fecha_fin = datetime.fromisoformat(fecha_fin_str).replace(hour=23, minute=59, second=59)
            query = query.filter(Carga.timestamp <= fecha_fin)
        except ValueError:
            return jsonify({'error': 'Formato fecha_fin inválido. Use YYYY-MM-DD'}), 400

    if municipio:
        query = query.filter(Ruta.municipio.ilike(f'%{municipio}%'))

    if zona:
        if zona not in ('urbana', 'rural'):
            return jsonify({'error': "Zona debe ser 'urbana' o 'rural'"}), 400
        query = query.filter(Carga.zona == zona)

    if tipo_residuo_id:
        query = query.filter(Carga.tipo_residuo_id == tipo_residuo_id)

    query = query.order_by(Carga.timestamp.desc())
    cargas = query.all()

    total_cargas = len(cargas)
    total_kg = sum(float(c.peso_kg) for c in cargas)
    total_certificados = sum(1 for c in cargas if c.certificado is not None)

    por_material, por_zona, por_municipio, por_calidad = {}, {}, {}, {}
    for c in cargas:
        por_material[c.tipo_residuo.nombre] = por_material.get(c.tipo_residuo.nombre, 0) + float(c.peso_kg)
        por_zona[c.zona] = por_zona.get(c.zona, 0) + float(c.peso_kg)
        por_municipio[c.camion.ruta.municipio] = por_municipio.get(c.camion.ruta.municipio, 0) + float(c.peso_kg)
        por_calidad[c.calidad] = por_calidad.get(c.calidad, 0) + float(c.peso_kg)

    inicio = (page - 1) * per_page
    fin = inicio + per_page
    cargas_pagina = cargas[inicio:fin]

    detalle = [{
        'id': c.id,
        'fecha': c.timestamp.isoformat(),
        'camion': c.camion.placa,
        'municipio': c.camion.ruta.municipio,
        'zona': c.zona,
        'material': c.tipo_residuo.nombre,
        'peso_kg': float(c.peso_kg),
        'calidad': c.calidad,
        'reciclador': c.usuario.nombre,
        'tiene_certificado': c.certificado is not None,
        'consecutivo': c.certificado.consecutivo if c.certificado else None
    } for c in cargas_pagina]

    return jsonify({
        'filtros_aplicados': {
            'fecha_inicio': fecha_inicio_str, 'fecha_fin': fecha_fin_str,
            'municipio': municipio, 'zona': zona, 'tipo_residuo_id': tipo_residuo_id
        },
        'resumen': {
            'total_cargas': total_cargas,
            'total_kg': round(total_kg, 2),
            'total_certificados': total_certificados,
            'por_material': {k: round(v, 2) for k, v in por_material.items()},
            'por_zona': {k: round(v, 2) for k, v in por_zona.items()},
            'por_municipio': {k: round(v, 2) for k, v in por_municipio.items()},
            'por_calidad': {k: round(v, 2) for k, v in por_calidad.items()}
        },
        'paginacion': {
            'page': page, 'per_page': per_page, 'total': total_cargas,
            'total_pages': max(1, (total_cargas + per_page - 1) // per_page)
        },
        'detalle': detalle
    })


@bp.route('/reportes/formato-autoridad', methods=['GET'])
def reporte_formato_autoridad():
    """Formato plano (para CSV/Excel) solo con cargas que ya tienen certificado."""
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')
    municipio = request.args.get('municipio')

    query = db.session.query(Carga).join(Camion).join(Ruta).join(TipoResiduo).join(Usuario)
    query = query.filter(Carga.certificado != None)  # noqa: E711

    if fecha_inicio:
        query = query.filter(Carga.timestamp >= datetime.fromisoformat(fecha_inicio))
    if fecha_fin:
        fecha_fin_dt = datetime.fromisoformat(fecha_fin).replace(hour=23, minute=59, second=59)
        query = query.filter(Carga.timestamp <= fecha_fin_dt)
    if municipio:
        query = query.filter(Ruta.municipio.ilike(f'%{municipio}%'))

    cargas = query.order_by(Carga.timestamp).all()

    filas = [{
        'consecutivo_reporte': i,
        'certificado_consecutivo': c.certificado.consecutivo,
        'fecha_recoleccion': c.timestamp.strftime('%d/%m/%Y'),
        'hora_recoleccion': c.timestamp.strftime('%H:%M'),
        'municipio': c.camion.ruta.municipio,
        'ruta': c.camion.ruta.nombre,
        'zona': c.zona,
        'camion_placa': c.camion.placa,
        'camion_qr': c.camion.qr_code,
        'tipo_residuo': c.tipo_residuo.nombre,
        'peso_kg': float(c.peso_kg),
        'calidad': c.calidad,
        'reciclador': c.usuario.nombre,
        'reciclador_email': c.usuario.email,
        'incentivo_cop': calcular_incentivo_carga(c),
        'hash_verificacion': c.certificado.hash_verificacion
    } for i, c in enumerate(cargas, 1)]

    return jsonify({
        'metadatos': {
            'total_registros': len(filas),
            'fecha_generacion': datetime.utcnow().isoformat(),
            'filtros': {'fecha_inicio': fecha_inicio, 'fecha_fin': fecha_fin, 'municipio': municipio}
        },
        'columnas': [
            'consecutivo_reporte', 'certificado_consecutivo', 'fecha_recoleccion',
            'hora_recoleccion', 'municipio', 'ruta', 'zona', 'camion_placa',
            'camion_qr', 'tipo_residuo', 'peso_kg', 'calidad', 'reciclador',
            'reciclador_email', 'incentivo_cop', 'hash_verificacion'
        ],
        'datos': filas
    })


@bp.route('/reportes/resumen-reciclador/<int:usuario_id>', methods=['GET'])
def resumen_reciclador(usuario_id):
    """Resumen de cargas e incentivos de un reciclador (para su dashboard personal)."""
    usuario = Usuario.query.get_or_404(usuario_id)
    cargas = Carga.query.filter_by(usuario_id=usuario_id).order_by(Carga.timestamp.desc()).all()

    total_kg = sum(float(c.peso_kg) for c in cargas)
    total_incentivo = sum(calcular_incentivo_carga(c) for c in cargas)
    total_certificados = sum(1 for c in cargas if c.certificado)

    por_mes = {}
    for c in cargas:
        mes_key = c.timestamp.strftime('%Y-%m')
        por_mes.setdefault(mes_key, {'kg': 0, 'incentivo': 0, 'cargas': 0})
        por_mes[mes_key]['kg'] += float(c.peso_kg)
        por_mes[mes_key]['incentivo'] += calcular_incentivo_carga(c)
        por_mes[mes_key]['cargas'] += 1

    return jsonify({
        'reciclador': {'id': usuario.id, 'nombre': usuario.nombre, 'email': usuario.email},
        'resumen': {
            'total_cargas': len(cargas),
            'total_kg': round(total_kg, 2),
            'total_incentivo': round(total_incentivo, 2),
            'total_certificados': total_certificados
        },
        'por_mes': {k: {kk: round(vv, 2) if isinstance(vv, float) else vv for kk, vv in v.items()}
                    for k, v in sorted(por_mes.items())},
        'ultimas_cargas': [{
            'id': c.id, 'fecha': c.timestamp.isoformat(), 'material': c.tipo_residuo.nombre,
            'peso_kg': float(c.peso_kg), 'calidad': c.calidad, 'zona': c.zona,
            'incentivo': calcular_incentivo_carga(c),
            'certificado': c.certificado.consecutivo if c.certificado else None
        } for c in cargas[:10]]
    })