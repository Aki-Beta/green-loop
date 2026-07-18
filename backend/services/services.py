"""
Servicios de Lógica de Negocio - Green-Loop
Algoritmos sencillos y claros para incentivos, certificados y reportes
"""
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import hashlib
import json


# ============================================================
# CONSTANTES DE NEGOCIO
# ============================================================

# Multiplicadores por calidad (fácil de leer y modificar)
MULTIPLICADORES_CALIDAD = {
    "alta": Decimal("1.20"),
    "media": Decimal("1.00"),
    "baja": Decimal("0.70")
}

# Factores por tipo de residuo (pueden venir de BD, aquí por simplicidad)
FACTORES_RESIDUO = {
    "PET": Decimal("1.0"),
    "PEAD": Decimal("1.0"),
    "CAR": Decimal("0.8"),
    "VID": Decimal("0.6"),
    "PAP": Decimal("0.7"),
    "ALU": Decimal("1.5"),
    "TPK": Decimal("0.9"),
    "CHA": Decimal("1.2"),
}


# ============================================================
# SERVICIO DE INCENTIVOS
# ============================================================

class IncentivoService:
    """
    Calcula el pago al reciclador usando reglas simples:
    - Precio base por kg del residuo
    - Multiplicador por calidad (Alta=1.2, Media=1.0, Baja=0.7)
    - Multiplicador por zona (Urbana=1.0, Rural=1.2, etc.)
    - Factor opcional por tipo de residuo
    """

    @staticmethod
    def calcular_incentivo(
        peso_kg: Decimal,
        precio_base_kg: Decimal,
        calidad: str,
        multiplicador_zona: Decimal,
        codigo_residuo: Optional[str] = None
    ) -> Decimal:
        """
        Fórmula: peso × precio_base × calidad × zona × factor_residuo
        Todo con Decimal para precisión monetaria
        """
        # Validaciones simples
        if peso_kg <= 0:
            raise ValueError("El peso debe ser mayor a cero")
        if precio_base_kg <= 0:
            raise ValueError("El precio base debe ser mayor a cero")

        # Multiplicador calidad
        mult_calidad = MULTIPLICADORES_CALIDAD.get(calidad.lower(), Decimal("1.00"))

        # Factor residuo opcional
        factor_residuo = FACTORES_RESIDUO.get(codigo_residuo.upper(), Decimal("1.0")) if codigo_residuo else Decimal("1.0")

        # Cálculo paso a paso (fácil de debuggear)
        subtotal = peso_kg * precio_base_kg
        con_calidad = subtotal * mult_calidad
        con_zona = con_calidad * multiplicador_zona
        resultado = con_zona * factor_residuo

        # Redondear a 2 decimales (pesos colombianos)
        return resultado.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @staticmethod
    def desglose_calculo(
        peso_kg: Decimal,
        precio_base_kg: Decimal,
        calidad: str,
        multiplicador_zona: Decimal,
        codigo_residuo: Optional[str] = None
    ) -> Dict[str, Any]:
        """Retorna el desglose completo para mostrar en certificado"""
        mult_calidad = MULTIPLICADORES_CALIDAD.get(calidad.lower(), Decimal("1.00"))
        factor_residuo = FACTORES_RESIDUO.get(codigo_residuo.upper(), Decimal("1.0")) if codigo_residuo else Decimal("1.0")

        subtotal = peso_kg * precio_base_kg
        con_calidad = subtotal * mult_calidad
        con_zona = con_calidad * multiplicador_zona
        resultado = con_zona * factor_residuo

        return {
            "peso_kg": str(peso_kg),
            "precio_base_kg": str(precio_base_kg),
            "subtotal": str(subtotal.quantize(Decimal("0.01"))),
            "multiplicador_calidad": str(mult_calidad),
            "despues_calidad": str(con_calidad.quantize(Decimal("0.01"))),
            "multiplicador_zona": str(multiplicador_zona),
            "despues_zona": str(con_zona.quantize(Decimal("0.01"))),
            "factor_residuo": str(factor_residuo),
            "incentivo_final": str(resultado.quantize(Decimal("0.01"))),
            "formula": f"{peso_kg} × {precio_base_kg} × {mult_calidad} × {multiplicador_zona} × {factor_residuo} = {resultado.quantize(Decimal('0.01'))}"
        }


# ============================================================
# SERVICIO DE CERTIFICADOS
# ============================================================

class CertificadoService:
    """
    Genera certificados de gestión para cumplimiento Resolución 2184/2019
    """

    @staticmethod
    def generar_numero_radicado() -> str:
        """Formato: GL-YYYY-NNNNNN"""
        now = datetime.now()
        # En producción usar secuencia BD, aquí timestamp
        secuencial = int(now.strftime("%Y%m%d%H%M%S")) % 1000000
        return f"GL-{now.year}-{secuencial:06d}"

    @staticmethod
    def generar_hash_verificacion(
        numero_radicado: str,
        id_carga: int,
        total_kg: Decimal,
        fecha_emision: datetime
    ) -> str:
        """
        SHA256 para verificación pública del certificado
        Hash = SHA256(radicado + carga + kg + fecha)
        """
        data = f"{numero_radicado}{id_carga}{total_kg}{fecha_emision.isoformat()}"
        return hashlib.sha256(data.encode()).hexdigest()

    @staticmethod
    def construir_certificado_json(
        numero_radicado: str,
        empresa_razon_social: str,
        empresa_nit: str,
        reciclador_nombre: str,
        reciclador_documento: str,
        camion_placa: str,
        camion_qr: str,
        ruta_nombre: str,
        municipio: str,
        zona_nombre: str,
        fecha_recoleccion: datetime,
        residuos_detalle: List[Dict],
        total_kg: Decimal,
        incentivo_total: Decimal,
        hash_verificacion: str
    ) -> Dict[str, Any]:
        """Estructura JSON estandarizada para certificado"""
        return {
            "version": "1.0",
            "normativa": "Resolución 2184 de 2019 - Ley 1950 de 2019",
            "certificado": {
                "numero_radicado": numero_radicado,
                "fecha_emision": datetime.now().isoformat(),
                "periodo": {
                    "inicio": date.today().replace(day=1).isoformat(),
                    "fin": date.today().isoformat()
                }
            },
            "empresa": {
                "razon_social": empresa_razon_social,
                "nit": empresa_nit
            },
            "reciclador": {
                "nombre": reciclador_nombre,
                "documento": reciclador_documento
            },
            "recoleccion": {
                "camion": {
                    "placa": camion_placa,
                    "qr": camion_qr
                },
                "ruta": ruta_nombre,
                "municipio": municipio,
                "zona": zona_nombre,
                "fecha": fecha_recoleccion.isoformat()
            },
            "residuos": residuos_detalle,
            "totales": {
                "peso_kg": str(total_kg),
                "incentivo_cop": str(incentivo_total)
            },
            "verificacion": {
                "hash_sha256": hash_verificacion,
                "url_verificacion": f"https://greenloop.co/verificar/{hash_verificacion[:16]}"
            },
            "firma_digital": {
                "emitido_por": "Green-Loop Platform",
                "algoritmo": "SHA256",
                "timestamp": datetime.now().isoformat()
            }
        }

    @staticmethod
    def verificar_certificado(hash_verificacion: str, db: Session) -> Optional[Dict]:
        """
        Verifica si un certificado es válido consultando por hash
        (En producción: buscar en tabla certificados)
        """
        # TODO: Implementar búsqueda real en BD
        return None


# ============================================================
# SERVICIO DE REPORTES
# ============================================================

class ReporteService:
    """
    Consultas SQL directas para dashboards y exportación a autoridades
    """

    @staticmethod
    def resumen_mensual_por_zona(db: Session, mes: int, año: int) -> List[Dict]:
        """
        GROUP BY zona, residuo - Cuánto se recicló por mes
        """
        from models import Carga, Residuo, Ruta, Zona

        inicio = date(año, mes, 1)
        if mes == 12:
            fin = date(año + 1, 1, 1)
        else:
            fin = date(año, mes + 1, 1)

        resultados = db.query(
            Zona.nombre.label("zona"),
            Residuo.codigo.label("residuo"),
            func.count(Carga.id_carga).label("total_cargas"),
            func.sum(Carga.peso_kg).label("total_kg"),
            func.sum(Carga.peso_kg * Residuo.precio_base_kg).label("valor_estimado")
        ).join(
            Ruta, Carga.id_ruta == Ruta.id_ruta
        ).join(
            Zona, Ruta.id_zona == Zona.id_zona
        ).join(
            Residuo, Carga.id_residuo == Residuo.id_residuo
        ).filter(
            Carga.fecha_recoleccion >= inicio,
            Carga.fecha_recoleccion < fin,
            Carga.procesada == True
        ).group_by(
            Zona.nombre, Residuo.codigo
        ).order_by(
            Zona.nombre, Residuo.codigo
        ).all()

        return [
            {
                "zona": r.zona,
                "residuo": r.residuo,
                "total_cargas": r.total_cargas,
                "total_kg": float(r.total_kg or 0),
                "valor_estimado": float(r.valor_estimado or 0)
            }
            for r in resultados
        ]

    @staticmethod
    def reporte_para_autoridad(
        db: Session,
        fecha_inicio: date,
        fecha_fin: date,
        municipio: Optional[str] = None
    ) -> List[Dict]:
        """
        Formato plano para exportar a CSV/Excel y enviar a autoridad ambiental
        """
        from models import Carga, Residuo, Ruta, Zona, Usuario, Camion, Certificado

        query = db.query(
            Carga, Residuo, Ruta, Zona, Usuario, Camion, Certificado
        ).join(
            Residuo, Carga.id_residuo == Residuo.id_residuo
        ).join(
            Ruta, Carga.id_ruta == Ruta.id_ruta
        ).join(
            Zona, Ruta.id_zona == Zona.id_zona
        ).join(
            Usuario, Carga.id_reciclador == Usuario.id_usuario
        ).join(
            Camion, Carga.id_camion == Camion.id_camion
        ).outerjoin(
            Certificado, Carga.id_carga == Certificado.id_carga
        ).filter(
            Carga.fecha_recoleccion >= fecha_inicio,
            Carga.fecha_recoleccion <= fecha_fin,
            Carga.procesada == True
        )

        if municipio:
            query = query.filter(Ruta.nombre.ilike(f"%{municipio}%"))

        resultados = query.order_by(Carga.fecha_recoleccion).all()

        return [
            {
                "consecutivo": i + 1,
                "certificado_radicado": c.numero_radicado if c else "SIN_CERTIFICADO",
                "fecha_recoleccion": ca.fecha_recoleccion.date(),
                "hora_recoleccion": ca.fecha_recoleccion.strftime("%H:%M"),
                "municipio": r.nombre,
                "ruta": r.codigo,
                "zona": z.nombre,
                "camion_placa": cm.placa,
                "camion_qr": cm.qr_code,
                "tipo_residuo": res.codigo,
                "peso_kg": float(ca.peso_kg),
                "calidad": ca.calidad,
                "reciclador": u.nombre_completo,
                "reciclador_email": u.email or "",
                "incentivo_cop": float(IncentivoService.calcular_incentivo(
                    ca.peso_kg, res.precio_base_kg, ca.calidad,
                    z.multiplicador, res.codigo
                )),
                "hash_verificacion": c.hash_verificacion if c else ""
            }
            for i, (ca, res, r, z, u, cm, c) in enumerate(resultados)
        ]

    @staticmethod
    def dashboard_stats(db: Session) -> Dict:
        """Estadísticas para el dashboard principal"""
        from models import Carga, Usuario, Empresa, Residuo, Ruta, Zona

        hoy = date.today()

        total_cargas_hoy = db.query(func.count(Carga.id_carga)).filter(
            func.date(Carga.fecha_recoleccion) == hoy
        ).scalar() or 0

        total_kg_hoy = db.query(func.sum(Carga.peso_kg)).filter(
            func.date(Carga.fecha_recoleccion) == hoy
        ).scalar() or Decimal("0")

        recicladores_activos = db.query(func.count(Usuario.id_usuario)).filter(
            Usuario.rol == "reciclador",
            Usuario.activo == True
        ).scalar() or 0

        total_empresas = db.query(func.count(Empresa.id_empresa)).filter(
            Empresa.activa == True
        ).scalar() or 0

        # Cargas por zona
        cargas_zona = db.query(
            Zona.nombre, func.count(Carga.id_carga)
        ).join(Ruta, Carga.id_ruta == Ruta.id_ruta).join(
            Zona, Ruta.id_zona == Zona.id_zona
        ).filter(func.date(Carga.fecha_recoleccion) == hoy).group_by(Zona.nombre).all()

        # Cargas por residuo
        cargas_residuo = db.query(
            Residuo.codigo, func.count(Carga.id_carga)
        ).join(Carga, Residuo.id_residuo == Carga.id_residuo).filter(
            func.date(Carga.fecha_recoleccion) == hoy
        ).group_by(Residuo.codigo).all()

        # Kg por zona
        kg_zona = db.query(
            Zona.nombre, func.sum(Carga.peso_kg)
        ).join(Ruta, Carga.id_ruta == Ruta.id_ruta).join(
            Zona, Ruta.id_zona == Zona.id_zona
        ).filter(func.date(Carga.fecha_recoleccion) == hoy).group_by(Zona.nombre).all()

        # Incentivos pendientes
        from models import Pago
        incentivos_pendientes = db.query(func.sum(Pago.monto_final)).filter(
            Pago.estado == "pendiente"
        ).scalar() or Decimal("0")

        return {
            "total_cargas_hoy": total_cargas_hoy,
            "total_kg_hoy": float(total_kg_hoy),
            "total_recicladores_activos": recicladores_activos,
            "total_empresas": total_empresas,
            "cargas_por_zona": {z: c for z, c in cargas_zona},
            "cargas_por_residuo": {r: c for r, c in cargas_residuo},
            "kg_por_zona": {z: float(k or 0) for z, k in kg_zona},
            "incentivos_pendientes": float(incentivos_pendientes)
        }


# ============================================================
# SERVICIO DE AUTENTICACIÓN
# ============================================================

class AuthService:
    """Manejo sencillo de tokens JWT"""

    from jose import jwt
    from passlib.context import CryptContext
    from datetime import timedelta

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    SECRET_KEY = "cambia-esta-clave-en-produccion"
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60

    @classmethod
    def hash_password(cls, password: str) -> str:
        return cls.pwd_context.hash(password)

    @classmethod
    def verify_password(cls, plain: str, hashed: str) -> bool:
        return cls.pwd_context.verify(plain, hashed)

    @classmethod
    def create_token(cls, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=cls.ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        return cls.jwt.encode(to_encode, cls.SECRET_KEY, algorithm=cls.ALGORITHM)

    @classmethod
    def decode_token(cls, token: str) -> Optional[dict]:
        try:
            return cls.jwt.decode(token, cls.SECRET_KEY, algorithms=[cls.ALGORITHM])
        except:
            return None