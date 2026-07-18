import hashlib
"""
Rutas de la API - Green-Loop
Endpoints organizados por funcionalidad
"""
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from pydantic import BaseModel

from db import get_db
from models import (
    Usuario, Zona, Residuo, Empresa, Ruta, Camion, Carga,
    Certificado, Pago, RolUsuario, CalidadResiduo,
    EstadoPago, EstadoCertificado
)
from schemas import (
    UsuarioCreate, UsuarioLogin, UsuarioResponse, TokenResponse,
    CargaCreate, CargaResponse, CargaSimularQR,
    CertificadoCreate, CertificadoResponse,
    PagoCreate, PagoResponse,
    DashboardStats, ResumenMensualZona,
    MessageResponse, ErrorResponse,
    CamionCreate, CamionResponse, CamionUpdate,
    UsuarioUpdate
)
from api.auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_admin, ACCESS_TOKEN_EXPIRE_MINUTES
)
from services import IncentivoService, CertificadoService, ReporteService


# ============================================================
# ROUTERS
# ============================================================

auth_router = APIRouter(prefix="/auth", tags=["Autenticación"])
cargas_router = APIRouter(prefix="/cargas", tags=["Cargas"])
certificados_router = APIRouter(prefix="/certificados", tags=["Certificados"])
pagos_router = APIRouter(prefix="/pagos", tags=["Pagos"])
catalogos_router = APIRouter(prefix="/catalogos", tags=["Catálogos"])
reportes_router = APIRouter(prefix="/reportes", tags=["Reportes"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
usuarios_router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


# ============================================================
# AUTENTICACIÓN
# ============================================================

@auth_router.post("/login", response_model=TokenResponse)
def login(credentials: UsuarioLogin, db: Session = Depends(get_db)):
    """Login con email y contraseña"""
    user = db.query(Usuario).filter(Usuario.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.contrasena_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )

    token = create_access_token(data={"sub": user.email, "rol": user.rol.value})
    return TokenResponse(
        access_token=token,
        usuario=UsuarioResponse.from_orm(user)
    )


@auth_router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UsuarioCreate, db: Session = Depends(get_db)):
    """Registrar nuevo usuario (solo admin puede crear admins)"""
    # Verificar si existe
    if db.query(Usuario).filter(Usuario.email == user_data.email).first():
        raise HTTPException(400, "El email ya está registrado")

    # Solo admin puede crear otros admins
    # (En producción validar con token del usuario actual)

    hashed = get_password_hash(user_data.password)
    user = Usuario(
        documento=user_data.documento,
        nombre_completo=user_data.nombre_completo,
        email=user_data.email,
        telefono=user_data.telefono,
        rol=user_data.rol,
        id_ruta_asignada=user_data.id_ruta_asignada,
        contrasena_hash=hashed
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UsuarioResponse.from_orm(user)


@auth_router.get("/me", response_model=UsuarioResponse)
def get_me(current_user: Usuario = Depends(get_current_user)):
    """Obtener datos del usuario autenticado"""
    return UsuarioResponse.from_orm(current_user)


# ============================================================
# CATÁLOGOS (Solo lectura para frontend)
# ============================================================

@catalogos_router.get("/zonas", response_model=List[dict])
def listar_zonas(db: Session = Depends(get_db)):
    """Zonas con multiplicador para cálculo de incentivos"""
    zonas = db.query(Zona).filter(Zona.activa == True).all()
    return [{"id": z.id_zona, "nombre": z.nombre, "multiplicador": float(z.multiplicador)} for z in zonas]


@catalogos_router.get("/residuos", response_model=List[dict])
def listar_residuos(db: Session = Depends(get_db)):
    """Tipos de residuo con precio base"""
    residuos = db.query(Residuo).filter(Residuo.activo == True).all()
    return [
        {
            "id": r.id_residuo,
            "nombre": r.nombre,
            "codigo": r.codigo,
            "precio_base_kg": float(r.precio_base_kg)
        } for r in residuos
    ]


@catalogos_router.get("/rutas", response_model=List[dict])
def listar_rutas(db: Session = Depends(get_db)):
    """Rutas activas con su zona"""
    rutas = db.query(Ruta).filter(Ruta.activa == True).all()
    return [
        {
            "id": r.id_ruta,
            "codigo": r.codigo,
            "nombre": r.nombre,
            "id_zona": r.id_zona
        } for r in rutas
    ]


@catalogos_router.get("/empresas", response_model=List[dict])
def listar_empresas(db: Session = Depends(get_db)):
    """Empresas para certificación"""
    empresas = db.query(Empresa).filter(Empresa.activa == True).all()
    return [{"id": e.id_empresa, "razon_social": e.razon_social, "nit": e.nit} for e in empresas]


@catalogos_router.get("/recicladores", response_model=List[dict])
def listar_recicladores(db: Session = Depends(get_db)):
    """Recicladores para asignar cargas"""
    recicladores = db.query(Usuario).filter(
        Usuario.rol == RolUsuario.reciclador,
        Usuario.activo == True
    ).all()
    return [
        {"id": u.id_usuario, "nombre": u.nombre_completo, "documento": u.documento}
        for u in recicladores
    ]


@catalogos_router.get("/camiones", response_model=List[dict])
def listar_camiones(db: Session = Depends(get_db)):
    """Camiones para validar QR"""
    camiones = db.query(Camion).filter(Camion.activo == True).all()
    return [
        {"id": c.id_camion, "placa": c.placa, "qr_code": c.qr_code, "id_ruta": c.id_ruta}
        for c in camiones
    ]


# ============================================================
# CAMIONES CRUD (Admin)
# ============================================================

@catalogos_router.post("/camiones", response_model=CamionResponse, status_code=status.HTTP_201_CREATED)
def crear_camion(camion: CamionCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    """Crear nuevo camión"""
    # Validar ruta existe
    ruta = db.query(Ruta).filter(Ruta.id_ruta == camion.id_ruta).first()
    if not ruta:
        raise HTTPException(400, "Ruta no encontrada")
    
    # Verificar placa única
    if db.query(Camion).filter(Camion.placa == camion.placa).first():
        raise HTTPException(400, "La placa ya está registrada")
    
    # Verificar QR único
    if db.query(Camion).filter(Camion.qr_code == camion.qr_code.upper()).first():
        raise HTTPException(400, "El código QR ya está registrado")
    
    nuevo = Camion(
        placa=camion.placa.upper(),
        qr_code=camion.qr_code.upper(),
        capacidad_kg=camion.capacidad_kg,
        id_ruta=camion.id_ruta
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return CamionResponse.from_orm(nuevo)


@catalogos_router.get("/camiones/{id_camion}", response_model=CamionResponse)
def obtener_camion(id_camion: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Obtener camión por ID"""
    camion = db.query(Camion).filter(Camion.id_camion == id_camion).first()
    if not camion:
        raise HTTPException(404, "Camión no encontrado")
    return CamionResponse.from_orm(camion)


@catalogos_router.put("/camiones/{id_camion}", response_model=CamionResponse)
def actualizar_camion(id_camion: int, camion: CamionUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    """Actualizar camión"""
    db_camion = db.query(Camion).filter(Camion.id_camion == id_camion).first()
    if not db_camion:
        raise HTTPException(404, "Camión no encontrado")
    
    if camion.placa and camion.placa != db_camion.placa:
        if db.query(Camion).filter(Camion.placa == camion.placa).first():
            raise HTTPException(400, "La placa ya está registrada")
        db_camion.placa = camion.placa.upper()
    
    if camion.qr_code and camion.qr_code != db_camion.qr_code:
        if db.query(Camion).filter(Camion.qr_code == camion.qr_code.upper()).first():
            raise HTTPException(400, "El código QR ya está registrado")
        db_camion.qr_code = camion.qr_code.upper()
    
    if camion.capacidad_kg is not None:
        db_camion.capacidad_kg = camion.capacidad_kg
    if camion.id_ruta is not None:
        ruta = db.query(Ruta).filter(Ruta.id_ruta == camion.id_ruta).first()
        if not ruta:
            raise HTTPException(400, "Ruta no encontrada")
        db_camion.id_ruta = camion.id_ruta
    if camion.activo is not None:
        db_camion.activo = camion.activo
    
    db.commit()
    db.refresh(db_camion)
    return CamionResponse.from_orm(db_camion)


@catalogos_router.delete("/camiones/{id_camion}", response_model=MessageResponse)
def eliminar_camion(id_camion: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    """Eliminar camión (desactivar)"""
    camion = db.query(Camion).filter(Camion.id_camion == id_camion).first()
    if not camion:
        raise HTTPException(404, "Camión no encontrado")
    
    camion.activo = False
    db.commit()
    return MessageResponse(message="Camión desactivado correctamente")


# ============================================================
# CARGAS (Registro con QR simulado)
# ============================================================

@cargas_router.post("/simular-qr", response_model=dict)
def simular_qr(qr_data: CargaSimularQR, db: Session = Depends(get_db)):
    """
    Simula escaneo de QR del camión.
    Frontend envía: {"qr_code": "CAMION-ZONA_NORTE-01"}
    Retorna info del camión + ruta + zona para auto-llenar formulario
    """
    camion = db.query(Camion).filter(Camion.qr_code == qr_data.qr_code.upper()).first()
    if not camion:
        raise HTTPException(404, f"QR no encontrado: {qr_data.qr_code}")

    ruta = camion.ruta
    zona = ruta.zona if ruta else None

    return {
        "camion": {"id": camion.id_camion, "placa": camion.placa, "qr_code": camion.qr_code},
        "ruta": {"id": ruta.id_ruta, "codigo": ruta.codigo, "nombre": ruta.nombre} if ruta else None,
        "zona": {"id": zona.id_zona, "nombre": zona.nombre, "multiplicador": float(zona.multiplicador)} if zona else None
    }


@cargas_router.post("", response_model=CargaResponse, status_code=status.HTTP_201_CREATED)
def crear_carga(carga: CargaCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """
    Registra una nueva carga de residuos.
    Valida: QR existe, residuo existe, reciclador existe, peso > 0
    """
    # Buscar camión por código QR
    camion = db.query(Camion).filter(Camion.qr_code == carga.codigo_qr.upper()).first()
    if not camion:
        raise HTTPException(400, f"Camión no encontrado para QR: {carga.codigo_qr}")

    residuo = db.query(Residuo).filter(Residuo.id_residuo == carga.id_residuo).first()
    if not residuo:
        raise HTTPException(400, "Tipo de residuo no encontrado")

    reciclador = db.query(Usuario).filter(Usuario.id_usuario == carga.id_reciclador).first()
    if not reciclador:
        raise HTTPException(400, "Reciclador no encontrado")

    if carga.peso_kg <= 0:
        raise HTTPException(400, "El peso debe ser mayor a cero")

    # Calcular incentivo estimado
    zona_multiplicador = Decimal("1.00")
    if camion.ruta and camion.ruta.zona:
        zona_multiplicador = camion.ruta.zona.multiplicador

    incentivo = IncentivoService.calcular_incentivo(
        peso_kg=carga.peso_kg,
        precio_base_kg=residuo.precio_base_kg,
        calidad=carga.calidad.value if hasattr(carga.calidad, 'value') else carga.calidad,
        multiplicador_zona=zona_multiplicador,
        codigo_residuo=residuo.codigo
    )

    # Crear carga
    nueva_carga = Carga(
        codigo_qr=carga.codigo_qr,
        id_camion=camion.id_camion,
        id_residuo=carga.id_residuo,
        id_reciclador=carga.id_reciclador,
        id_ruta=carga.id_ruta,
        peso_kg=carga.peso_kg,
        calidad=carga.calidad.value if hasattr(carga.calidad, 'value') else carga.calidad,
        observaciones=carga.observaciones
    )
    db.add(nueva_carga)
    db.commit()
    db.refresh(nueva_carga)

    return CargaResponse(
        id_carga=nueva_carga.id_carga,
        codigo_qr=nueva_carga.codigo_qr,
        id_ruta=nueva_carga.id_ruta,
        id_residuo=nueva_carga.id_residuo,
        id_reciclador=nueva_carga.id_reciclador,
        peso_kg=nueva_carga.peso_kg,
        calidad=nueva_carga.calidad,
        fecha_recoleccion=nueva_carga.fecha_recoleccion,
        procesada=nueva_carga.procesada,
        residuo_nombre=residuo.nombre,
        residuo_precio=residuo.precio_base_kg,
        reciclador_nombre=reciclador.nombre_completo,
        ruta_nombre=camion.ruta.nombre if camion.ruta else None,
        zona_nombre=camion.ruta.zona.nombre if camion.ruta and camion.ruta.zona else None,
        multiplicador_zona=zona_multiplicador,
        incentivo_calculado=incentivo
    )


@cargas_router.get("", response_model=List[CargaResponse])
def listar_cargas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    id_reciclador: Optional[int] = None,
    id_ruta: Optional[int] = None,
    procesada: Optional[bool] = None
):
    """Lista cargas con filtros y paginación"""
    query = db.query(Carga).join(Camion).join(Ruta).join(Zona).join(Residuo).join(Carga.reciclador)

    # Filtros por rol
    if current_user.rol == RolUsuario.reciclador:
        query = query.filter(Carga.id_reciclador == current_user.id_usuario)

    if fecha_inicio:
        query = query.filter(Carga.fecha_recoleccion >= fecha_inicio)
    if fecha_fin:
        query = query.filter(Carga.fecha_recoleccion <= fecha_fin)
    if id_reciclador and current_user.rol == RolUsuario.admin:
        query = query.filter(Carga.id_reciclador == id_reciclador)
    if id_ruta:
        query = query.filter(Carga.id_ruta == id_ruta)
    if procesada is not None:
        query = query.filter(Carga.procesada == procesada)

    query = query.order_by(desc(Carga.fecha_recoleccion))
    total = query.count()
    cargas = query.offset((page - 1) * per_page).limit(per_page).all()

    # Enriquecer respuesta
    resultados = []
    for c in cargas:
        zona_mult = Decimal("1.00")
        if c.camion and c.camion.ruta and c.camion.ruta.zona:
            zona_mult = c.camion.ruta.zona.multiplicador

        incentivo = IncentivoService.calcular_incentivo(
            peso_kg=c.peso_kg,
            precio_base_kg=c.residuo.precio_base_kg,
            calidad=c.calidad,
            multiplicador_zona=zona_mult,
            codigo_residuo=c.residuo.codigo
        )

        resultados.append(CargaResponse(
            id_carga=c.id_carga,
            codigo_qr=c.codigo_qr,
            id_ruta=c.id_ruta,
            id_residuo=c.id_residuo,
            id_reciclador=c.id_reciclador,
            peso_kg=c.peso_kg,
            calidad=c.calidad,
            fecha_recoleccion=c.fecha_recoleccion,
            procesada=c.procesada,
            residuo_nombre=c.residuo.nombre,
            residuo_precio=c.residuo.precio_base_kg,
            reciclador_nombre=c.reciclador.nombre_completo,
            ruta_nombre=c.ruta.nombre if c.ruta else None,
            zona_nombre=c.ruta.zona.nombre if c.ruta and c.ruta.zona else None,
            multiplicador_zona=zona_mult,
            incentivo_calculado=incentivo
        ))

    return resultados


@cargas_router.get("/{id_carga}", response_model=CargaResponse)
def obtener_carga(id_carga: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Obtener una carga por ID"""
    carga = db.query(Carga).filter(Carga.id_carga == id_carga).first()
    if not carga:
        raise HTTPException(404, "Carga no encontrada")
    
    # Verificar permisos
    if current_user.rol == RolUsuario.reciclador and carga.id_reciclador != current_user.id_usuario:
        raise HTTPException(403, "No tiene permiso para ver esta carga")
    
    zona_mult = Decimal("1.00")
    if carga.camion and carga.camion.ruta and carga.camion.ruta.zona:
        zona_mult = carga.camion.ruta.zona.multiplicador

    incentivo = IncentivoService.calcular_incentivo(
        peso_kg=carga.peso_kg,
        precio_base_kg=carga.residuo.precio_base_kg,
        calidad=carga.calidad,
        multiplicador_zona=zona_mult,
        codigo_residuo=carga.residuo.codigo
    )

    return CargaResponse(
        id_carga=carga.id_carga,
        codigo_qr=carga.codigo_qr,
        id_ruta=carga.id_ruta,
        id_residuo=carga.id_residuo,
        id_reciclador=carga.id_reciclador,
        peso_kg=carga.peso_kg,
        calidad=carga.calidad,
        fecha_recoleccion=carga.fecha_recoleccion,
        procesada=carga.procesada,
        residuo_nombre=carga.residuo.nombre,
        residuo_precio=carga.residuo.precio_base_kg,
        reciclador_nombre=carga.reciclador.nombre_completo,
        ruta_nombre=carga.ruta.nombre if carga.ruta else None,
        zona_nombre=carga.ruta.zona.nombre if carga.ruta and carga.ruta.zona else None,
        multiplicador_zona=zona_mult,
        incentivo_calculado=incentivo
    )


@cargas_router.get("/{id_carga}/incentivo")
def obtener_incentivo(id_carga: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Calcular incentivo para una carga"""
    carga = db.query(Carga).filter(Carga.id_carga == id_carga).first()
    if not carga:
        raise HTTPException(404, "Carga no encontrada")
    
    if current_user.rol == RolUsuario.reciclador and carga.id_reciclador != current_user.id_usuario:
        raise HTTPException(403, "No tiene permiso para ver esta carga")
    
    zona_mult = Decimal("1.00")
    if carga.camion and carga.camion.ruta and carga.camion.ruta.zona:
        zona_mult = carga.camion.ruta.zona.multiplicador

    incentivo = IncentivoService.calcular_incentivo(
        peso_kg=carga.peso_kg,
        precio_base_kg=carga.residuo.precio_base_kg,
        calidad=carga.calidad,
        multiplicador_zona=zona_mult,
        codigo_residuo=carga.residuo.codigo
    )
    
    desglose = IncentivoService.desglose_calculo(
        peso_kg=carga.peso_kg,
        precio_base_kg=carga.residuo.precio_base_kg,
        calidad=carga.calidad,
        multiplicador_zona=zona_mult,
        codigo_residuo=carga.residuo.codigo
    )
    
    return {
        "carga_id": carga.id_carga,
        "incentivo_total": incentivo,
        "desglose": desglose
    }


@cargas_router.post("/{id_carga}/procesar", response_model=MessageResponse)
def procesar_carga(id_carga: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    """Marca carga como procesada y genera pago automáticamente"""
    carga = db.query(Carga).filter(Carga.id_carga == id_carga).first()
    if not carga:
        raise HTTPException(404, "Carga no encontrada")
    if carga.procesada:
        raise HTTPException(400, "La carga ya fue procesada")

    # Calcular incentivo
    zona_mult = Decimal("1.00")
    if carga.camion and carga.camion.ruta and carga.camion.ruta.zona:
        zona_mult = carga.camion.ruta.zona.multiplicador

    incentivo = IncentivoService.calcular_incentivo(
        peso_kg=carga.peso_kg,
        precio_base_kg=carga.residuo.precio_base_kg,
        calidad=carga.calidad,
        multiplicador_zona=zona_mult,
        codigo_residuo=carga.residuo.codigo
    )

    # Calcular multiplicadores usados
    mult_calidad = {"alta": Decimal("1.20"), "media": Decimal("1.00"), "baja": Decimal("0.70")}.get(carga.calidad, Decimal("1.00"))

    # Crear pago
    pago = Pago(
        id_reciclador=carga.id_reciclador,
        id_carga=carga.id_carga,
        monto_base=carga.residuo.precio_base_kg,
        multiplicador_calidad=mult_calidad,
        multiplicador_zona=zona_mult,
        monto_final=incentivo
    )
    db.add(pago)

    # Marcar procesada
    carga.procesada = True
    db.commit()

    return MessageResponse(message="Carga procesada y pago generado", detail=f"Incentivo: ${incentivo:,.0f} COP")


# ============================================================
# CERTIFICADOS (Resolución 2184/2019)
# ============================================================

@certificados_router.post("", response_model=CertificadoResponse, status_code=status.HTTP_201_CREATED)
def emitir_certificado(cert: CertificadoCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    """Emite certificado de gestión para una carga procesada"""
    carga = db.query(Carga).filter(Carga.id_carga == cert.id_carga).first()
    if not carga:
        raise HTTPException(404, "Carga no encontrada")
    if not carga.procesada:
        raise HTTPException(400, "La carga debe estar procesada primero")

    # Verificar si ya tiene certificado
    if carga.certificado:
        raise HTTPException(400, "Esta carga ya tiene certificado emitido")

    # Generar número de radicado
    anio = datetime.now().year
    ultimo = db.query(Certificado).filter(
        Certificado.numero_radicado.like(f"GL-{anio}-%")
    ).order_by(desc(Certificado.numero_radicado)).first()

    secuencia = 1
    if ultimo:
        try:
            secuencia = int(ultimo.numero_radicado.split("-")[-1]) + 1
        except:
            pass

    numero_radicado = f"GL-{anio}-{secuencia:06d}"

    # Calcular hash de verificación (SHA256)
    datos_hash = f"{numero_radicado}{carga.id_carga}{datetime.now().isoformat()}{cert.total_kg}"
    hash_verificacion = hashlib.sha256(datos_hash.encode()).hexdigest()

    # Crear certificado
    nuevo = Certificado(
        numero_radicado=numero_radicado,
        id_carga=carga.id_carga,
        id_empresa=cert.id_empresa,
        periodo_inicio=cert.periodo_inicio,
        periodo_fin=cert.periodo_fin,
        total_kg=cert.total_kg,
        residuos_detalle=cert.residuos_detalle,
        hash_verificacion=hash_verificacion
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return CertificadoResponse.from_orm(nuevo)


@certificados_router.get("/verificar/{hash_verificacion}")
def verificar_certificado(hash_verificacion: str, db: Session = Depends(get_db)):
    """Verifica autenticidad de certificado por hash (público)"""
    cert = db.query(Certificado).filter(Certificado.hash_verificacion == hash_verificacion).first()
    if not cert:
        raise HTTPException(404, "Certificado no encontrado o hash inválido")

    return {
        "valido": True,
        "numero_radicado": cert.numero_radicado,
        "fecha_emision": cert.fecha_emision,
        "periodo": f"{cert.periodo_inicio} a {cert.periodo_fin}",
        "total_kg": float(cert.total_kg),
        "estado": cert.estado.value,
        "empresa": cert.empresa.razon_social if cert.empresa else None
    }


@certificados_router.get("", response_model=List[CertificadoResponse])
def listar_certificados(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    page: int = 1,
    per_page: int = 20
):
    """Lista certificados (admin ve todos, empresa ve los suyos)"""
    query = db.query(Certificado)
    if current_user.rol == RolUsuario.empresa:
        query = query.filter(Certificado.id_empresa == current_user.id_empresa)

    query = query.order_by(desc(Certificado.fecha_emision))
    return query.offset((page - 1) * per_page).limit(per_page).all()


# ============================================================
# PAGOS
# ============================================================

@pagos_router.get("", response_model=List[PagoResponse])
def listar_pagos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    page: int = 1,
    per_page: int = 20,
    estado: Optional[EstadoPago] = None
):
    """Lista pagos (reciclador ve los suyos, admin todos)"""
    query = db.query(Pago).join(Carga.reciclador)
    if current_user.rol == RolUsuario.reciclador:
        query = query.filter(Pago.id_reciclador == current_user.id_usuario)
    if estado:
        query = query.filter(Pago.estado == estado)
    query = query.order_by(desc(Pago.fecha_calculo))
    return query.offset((page - 1) * per_page).limit(per_page).all()


@pagos_router.post("/{id_pago}/pagar", response_model=MessageResponse)
def marcar_pagado(id_pago: int, referencia: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    """Marca pago como pagado (solo admin)"""
    pago = db.query(Pago).filter(Pago.id_pago == id_pago).first()
    if not pago:
        raise HTTPException(404, "Pago no encontrado")
    if pago.estado == EstadoPago.pagado:
        raise HTTPException(400, "Ya está pagado")

    pago.estado = EstadoPago.pagado
    pago.fecha_pago = datetime.utcnow()
    pago.referencia_transaccion = referencia
    db.commit()
    return MessageResponse(message="Pago registrado", detail=f"Referencia: {referencia}")


# ============================================================
# DASHBOARD / REPORTES
# ============================================================

@dashboard_router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Estadísticas para tablero principal"""
    hoy = date.today()
    inicio_mes = hoy.replace(day=1)

    # Cargas hoy
    cargas_hoy = db.query(func.count(Carga.id_carga)).filter(
        func.date(Carga.fecha_recoleccion) == hoy
    ).scalar() or 0

    # Kg hoy
    kg_hoy = db.query(func.coalesce(func.sum(Carga.peso_kg), 0)).filter(
        func.date(Carga.fecha_recoleccion) == hoy
    ).scalar() or Decimal("0")

    # Recicladores activos
    recicladores = db.query(func.count(Usuario.id_usuario)).filter(
        Usuario.rol == RolUsuario.reciclador,
        Usuario.activo == True
    ).scalar() or 0

    # Empresas
    empresas = db.query(func.count(Empresa.id_empresa)).filter(
        Empresa.activa == True
    ).scalar() or 0

    # Por zona
    por_zona = db.query(
        Zona.nombre,
        func.count(Carga.id_carga),
        func.coalesce(func.sum(Carga.peso_kg), 0)
    ).join(Ruta, Carga.id_ruta == Ruta.id_ruta)\
     .join(Zona, Ruta.id_zona == Zona.id_zona)\
     .filter(func.date(Carga.fecha_recoleccion) >= inicio_mes)\
     .group_by(Zona.nombre).all()

    # Por residuo
    por_residuo = db.query(
        Residuo.nombre,
        func.count(Carga.id_carga),
        func.coalesce(func.sum(Carga.peso_kg), 0)
    ).join(Residuo, Carga.id_residuo == Residuo.id_residuo)\
     .filter(func.date(Carga.fecha_recoleccion) >= inicio_mes)\
     .group_by(Residuo.nombre).all()

    # Incentivos pendientes
    pendientes = db.query(func.coalesce(func.sum(Pago.monto_final), 0)).filter(
        Pago.estado == EstadoPago.pendiente
    ).scalar() or Decimal("0")

    return DashboardStats(
        total_cargas_hoy=cargas_hoy,
        total_kg_hoy=kg_hoy,
        total_recicladores_activos=recicladores,
        total_empresas=empresas,
        cargas_por_zona={z: c for z, c, _ in por_zona},
        kg_por_zona={z: float(kg) for z, _, kg in por_zona},
        cargas_por_residuo={r: c for r, c, _ in por_residuo},
        kg_por_residuo={r: float(kg) for r, _, kg in por_residuo},
        incentivos_pendientes=pendientes
    )


@reportes_router.get("/mensual-zona", response_model=List[ResumenMensualZona])
def reporte_mensual_zona(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
    anio: int = Query(default=datetime.now().year),
    mes: Optional[int] = None
):
    """Reporte mensual agrupado por zona y residuo (para autoridad)"""
    query = db.query(
        func.date_trunc('month', Carga.fecha_recoleccion).label('mes'),
        Zona.nombre.label('zona'),
        Residuo.nombre.label('residuo'),
        func.count(Carga.id_carga).label('total_cargas'),
        func.coalesce(func.sum(Carga.peso_kg), 0).label('total_kg')
    ).join(Ruta, Carga.id_ruta == Ruta.id_ruta)\
     .join(Zona, Ruta.id_zona == Zona.id_zona)\
     .join(Residuo, Carga.id_residuo == Residuo.id_residuo)\
     .filter(func.extract('year', Carga.fecha_recoleccion) == anio)

    if mes:
        query = query.filter(func.extract('month', Carga.fecha_recoleccion) == mes)

    query = query.group_by(
        func.date_trunc('month', Carga.fecha_recoleccion),
        Zona.nombre,
        Residuo.nombre
    ).order_by('mes', 'zona', 'residuo')

    resultados = query.all()
    return [
        ResumenMensualZona(
            mes=r.mes.date(),
            zona=r.zona,
            residuo=r.residuo,
            total_cargas=r.total_cargas,
            total_kg=r.total_kg,
            valor_estimado=Decimal("0")  # Se puede calcular si se necesita
        ) for r in resultados
    ]


@reportes_router.get("/formato-autoridad", response_model=List[dict])
def reporte_formato_autoridad(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None
):
    """Exporta datos en formato plano para autoridad ambiental"""
    query = db.query(
        Certificado.numero_radicado,
        Carga.fecha_recoleccion,
        Ruta.nombre.label('ruta'),
        Zona.nombre.label('zona'),
        Camion.placa,
        Camion.qr_code,
        Residuo.nombre.label('residuo'),
        Carga.peso_kg,
        Carga.calidad,
        Usuario.nombre_completo.label('reciclador'),
        Usuario.email.label('reciclador_email'),
        Pago.monto_final.label('incentivo_cop'),
        Certificado.hash_verificacion
    ).join(Carga, Certificado.id_carga == Carga.id_carga)\
     .join(Camion, Carga.id_camion == Camion.id_camion)\
     .join(Ruta, Carga.id_ruta == Ruta.id_ruta)\
     .join(Zona, Ruta.id_zona == Zona.id_zona)\
     .join(Residuo, Carga.id_residuo == Residuo.id_residuo)\
     .join(Usuario, Carga.id_reciclador == Usuario.id_usuario)\
     .outerjoin(Pago, Pago.id_carga == Carga.id_carga)

    if fecha_inicio:
        query = query.filter(func.date(Carga.fecha_recoleccion) >= fecha_inicio)
    if fecha_fin:
        query = query.filter(func.date(Carga.fecha_recoleccion) <= fecha_fin)

    resultados = query.order_by(Carga.fecha_recoleccion).all()

    return [
        {
            "consecutivo": i + 1,
            "certificado_radicado": r.numero_radicado,
            "fecha_recoleccion": r.fecha_recoleccion.strftime("%d/%m/%Y"),
            "hora_recoleccion": r.fecha_recoleccion.strftime("%H:%M"),
            "municipio": "Bogotá",  # Default, ajustar según ruta
            "ruta": r.ruta,
            "zona": r.zona,
            "camion_placa": r.placa,
            "camion_qr": r.qr_code,
            "tipo_residuo": r.residuo,
            "peso_kg": float(r.peso_kg),
            "calidad": r.calidad,
            "reciclador": r.reciclador,
            "reciclador_email": r.reciclador_email,
            "incentivo_cop": float(r.incentivo_cop) if r.incentivo_cop else 0,
            "hash_verificacion": r.hash_verificacion
        }
        for i, r in enumerate(resultados)
    ]


# ============================================================
# USUARIOS CRUD (Admin)
# ============================================================

@usuarios_router.get("", response_model=dict)
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    rol: Optional[RolUsuario] = None,
    activo: Optional[bool] = None,
    busqueda: Optional[str] = None
):
    """Lista usuarios con filtros y paginación (solo admin)"""
    query = db.query(Usuario)
    
    if rol:
        query = query.filter(Usuario.rol == rol)
    if activo is not None:
        query = query.filter(Usuario.activo == activo)
    if busqueda:
        query = query.filter(
            or_(
                Usuario.nombre_completo.ilike(f"%{busqueda}%"),
                Usuario.documento.ilike(f"%{busqueda}%"),
                Usuario.email.ilike(f"%{busqueda}%")
            )
        )
    
    query = query.order_by(desc(Usuario.creado_en))
    total = query.count()
    usuarios = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        "usuarios": [UsuarioResponse.from_orm(u) for u in usuarios],
        "paginacion": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page
        }
    }


@usuarios_router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    user_data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin)
):
    """Crear nuevo usuario (solo admin)"""
    # Verificar si existe
    if db.query(Usuario).filter(Usuario.documento == user_data.documento).first():
        raise HTTPException(400, "El documento ya está registrado")
    if user_data.email and db.query(Usuario).filter(Usuario.email == user_data.email).first():
        raise HTTPException(400, "El email ya está registrado")
    
    # Validar ruta si es reciclador
    if user_data.rol == RolUsuario.reciclador and user_data.id_ruta_asignada:
        ruta = db.query(Ruta).filter(Ruta.id_ruta == user_data.id_ruta_asignada).first()
        if not ruta:
            raise HTTPException(400, "Ruta no encontrada")
    
    hashed = get_password_hash(user_data.password)
    user = Usuario(
        documento=user_data.documento,
        nombre_completo=user_data.nombre_completo,
        email=user_data.email,
        telefono=user_data.telefono,
        rol=user_data.rol,
        id_ruta_asignada=user_data.id_ruta_asignada,
        contrasena_hash=hashed
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UsuarioResponse.from_orm(user)


@usuarios_router.get("/{id_usuario}", response_model=UsuarioResponse)
def obtener_usuario(
    id_usuario: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin)
):
    """Obtener usuario por ID (solo admin)"""
    user = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    return UsuarioResponse.from_orm(user)


@usuarios_router.put("/{id_usuario}", response_model=UsuarioResponse)
def actualizar_usuario(
    id_usuario: int,
    user_data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin)
):
    """Actualizar usuario (solo admin)"""
    user = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    
    # Verificar documento único
    if user_data.documento and user_data.documento != user.documento:
        if db.query(Usuario).filter(Usuario.documento == user_data.documento).first():
            raise HTTPException(400, "El documento ya está registrado")
        user.documento = user_data.documento
    
    # Verificar email único
    if user_data.email and user_data.email != user.email:
        if db.query(Usuario).filter(Usuario.email == user_data.email).first():
            raise HTTPException(400, "El email ya está registrado")
        user.email = user_data.email
    
    if user_data.nombre_completo is not None:
        user.nombre_completo = user_data.nombre_completo
    if user_data.telefono is not None:
        user.telefono = user_data.telefono
    if user_data.rol is not None:
        user.rol = user_data.rol
    if user_data.id_ruta_asignada is not None:
        if user_data.id_ruta_asignada:
            ruta = db.query(Ruta).filter(Ruta.id_ruta == user_data.id_ruta_asignada).first()
            if not ruta:
                raise HTTPException(400, "Ruta no encontrada")
        user.id_ruta_asignada = user_data.id_ruta_asignada
    if user_data.activo is not None:
        user.activo = user_data.activo
    
    # Cambiar contraseña si se proporciona
    if user_data.password:
        user.contrasena_hash = get_password_hash(user_data.password)
    
    db.commit()
    db.refresh(user)
    return UsuarioResponse.from_orm(user)


@usuarios_router.delete("/{id_usuario}", response_model=MessageResponse)
def eliminar_usuario(
    id_usuario: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin)
):
    """Eliminar usuario (desactivar, solo admin)"""
    user = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    
    # No permitir desactivarse a sí mismo
    if user.id_usuario == current_user.id_usuario:
        raise HTTPException(400, "No puede desactivar su propio usuario")
    
    user.activo = False
    db.commit()
    return MessageResponse(message="Usuario desactivado correctamente")


# ============================================================
# HEALTH CHECK
# ============================================================

health_router = APIRouter()

@health_router.get("/health")
def health_check():
    return {"status": "ok", "service": "Green-Loop API", "version": "1.0.0"}