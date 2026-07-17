# backend/app/services/pdf_generator.py - Genera el certificado PDF
import hashlib
import os
import qrcode
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from backend.app.utils.validators import FACTORES_CALIDAD, FACTORES_ZONA, calcular_incentivo

COLOR_PRIMARY = HexColor('#1B5E20')
COLOR_SECONDARY = HexColor('#2E7D32')
COLOR_LIGHT = HexColor('#E8F5E9')
COLOR_BORDER = HexColor('#C8E6C9')
COLOR_TEXT = HexColor('#333333')
COLOR_MUTED = HexColor('#666666')


def generar_hash_verificacion(carga_id, consecutivo):
    data = f"{carga_id}-{consecutivo}-{datetime.utcnow().isoformat()}"
    return hashlib.sha256(data.encode()).hexdigest()[:16].upper()


def generar_qr_verificacion(hash_verificacion, output_dir="backend/temp"):
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=4, border=2)
    qr.add_data(f"VERIFICAR:{hash_verificacion}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, f"qr_{hash_verificacion}.png")
    img.save(path)
    return path


def calcular_incentivo_carga(carga):
    """Calcula el incentivo de una carga usando sus relaciones."""
    return calcular_incentivo(
        carga.peso_kg,
        carga.tipo_residuo.tarifa_base,
        FACTORES_CALIDAD.get(carga.calidad, 1.0),
        FACTORES_ZONA.get(carga.zona, 1.0)
    )


def generar_certificado_pdf(carga, certificado, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    doc = SimpleDocTemplate(output_path, pagesize=letter,
                             rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
    styles = getSampleStyleSheet()
    story = []

    style_title = ParagraphStyle('CertTitle', parent=styles['Heading1'],
                                  fontSize=18, spaceAfter=6, alignment=TA_CENTER,
                                  textColor=COLOR_PRIMARY, fontName='Helvetica-Bold')
    style_subtitle = ParagraphStyle('CertSubtitle', parent=styles['Heading2'],
                                     fontSize=13, spaceAfter=12, alignment=TA_CENTER,
                                     textColor=COLOR_SECONDARY, fontName='Helvetica')
    style_section = ParagraphStyle('SectionHeader', parent=styles['Heading3'],
                                    fontSize=11, spaceAfter=8, spaceBefore=12,
                                    textColor=COLOR_PRIMARY, fontName='Helvetica-Bold')
    style_normal = ParagraphStyle('CertNormal', parent=styles['Normal'],
                                   fontSize=10, spaceAfter=4, alignment=TA_LEFT,
                                   textColor=COLOR_TEXT, fontName='Helvetica')
    style_small = ParagraphStyle('CertSmall', parent=styles['Normal'],
                                  fontSize=8, spaceAfter=2, alignment=TA_CENTER,
                                  textColor=COLOR_MUTED, fontName='Helvetica')
    style_legal = ParagraphStyle('CertLegal', parent=styles['Normal'],
                                  fontSize=8, spaceAfter=4, alignment=TA_CENTER,
                                  textColor=COLOR_MUTED, fontName='Helvetica-Oblique', leading=10)

    # 1. Encabezado
    story.append(Paragraph("CERTIFICADO DE GESTIÓN DE RESIDUOS SÓLIDOS", style_title))
    story.append(Paragraph("Resolución 2184 de 2019  •  Ley 1950 de 2019", style_subtitle))
    story.append(Spacer(1, 20))

    # 2. Info certificado
    data_cert = [
        ['Consecutivo:', certificado.consecutivo],
        ['Fecha de generación:', certificado.generado_en.strftime('%d/%m/%Y %H:%M')],
        ['Hash de verificación:', certificado.hash_verificacion],
    ]
    t_cert = Table(data_cert, colWidths=[2 * inch, 4.5 * inch])
    t_cert.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (-1, -1), COLOR_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_cert)
    story.append(Spacer(1, 20))

    # 3. Detalles de la carga
    story.append(Paragraph("DETALLES DE LA RECOLECCIÓN", style_section))
    incentivo = calcular_incentivo_carga(carga)
    incentivo_str = f"${incentivo:,.2f} COP"

    data_detalle = [
        ['Campo', 'Valor'],
        ['Fecha y hora de recolección:', carga.timestamp.strftime('%d/%m/%Y %H:%M')],
        ['Camión:', f"{carga.camion.placa}  (QR: {carga.camion.qr_code})"],
        ['Ruta / Municipio:', f"{carga.camion.ruta.nombre} / {carga.camion.ruta.municipio}"],
        ['Zona:', carga.zona.capitalize()],
        ['Tipo de residuo:', carga.tipo_residuo.nombre.capitalize()],
        ['Peso recolectado:', f"{float(carga.peso_kg):,.2f} kg"],
        ['Calidad del material:', f"{carga.calidad}  (Factor: {FACTORES_CALIDAD[carga.calidad]}x)"],
        ['Reciclador responsable:', carga.usuario.nombre],
        ['Incentivo calculado:', incentivo_str],
    ]
    t_detalle = Table(data_detalle, colWidths=[2.2 * inch, 4.3 * inch])
    t_detalle.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_LIGHT),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_PRIMARY),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 1), (-1, -1), COLOR_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_detalle)
    story.append(Spacer(1, 20))

    # 4. Desglose del incentivo
    story.append(Paragraph("DESGLOSE DEL CÁLCULO DE INCENTIVO", style_section))
    formula_text = (
        f"<b>Fórmula:</b> Peso × Tarifa Base × Factor Calidad × Factor Zona<br/>"
        f"<b>Cálculo:</b> {float(carga.peso_kg):,.2f} kg × "
        f"${float(carga.tipo_residuo.tarifa_base):,.2f}/kg × "
        f"{FACTORES_CALIDAD[carga.calidad]} × {FACTORES_ZONA[carga.zona]} "
        f"= <b>{incentivo_str}</b>"
    )
    story.append(Paragraph(formula_text, style_normal))
    story.append(Spacer(1, 16))

    # 5. QR de verificación
    story.append(Paragraph("CÓDIGO DE VERIFICACIÓN OFICIAL", style_section))
    story.append(Spacer(1, 8))
    qr_path = generar_qr_verificacion(certificado.hash_verificacion)
    qr_img = Image(qr_path, width=1.5 * inch, height=1.5 * inch)
    data_qr = [
        [qr_img],
        [Paragraph(f"Hash: {certificado.hash_verificacion}",
                   ParagraphStyle('QRHash', parent=style_small, fontName='Courier'))],
        [Paragraph("Escanee para verificar en plataforma oficial", style_small)],
    ]
    t_qr = Table(data_qr, colWidths=[6.5 * inch])
    t_qr.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_qr)

    if os.path.exists(qr_path):
        os.remove(qr_path)

    story.append(Spacer(1, 30))

    # 6. Pie legal
    legal_text = (
        "Este certificado acredita la correcta gestión de residuos sólidos conforme a la "
        "normatividad colombiana vigente (Resolución 2184 de 2019, Ley 1950 de 2019). "
        "Su autenticidad puede verificarse mediante el hash único en la plataforma oficial. "
        "La falsificación de este documento acarrea sanciones penales y administrativas."
    )
    story.append(Paragraph(legal_text, style_legal))

    doc.build(story)
    return output_path