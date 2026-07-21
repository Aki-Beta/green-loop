"""
backend/api/routes.py
Define los 9 (+1) routers usados por main.py. Los modelos de entrada
viven en `schemas/` y la lógica de negocio en `services/`; aquí solo
queda el "pegamento" (endpoints + serialización de respuesta).
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from db import get_db
from models import (
    Usuario, RolUsuario, Zona, Residuo, Empresa, Ruta, Camion,
    Carga, Certificado, EstadoCertificado, Pago, EstadoPago,
    Solicitud, EstadoSolicitud,
)
from api.auth import (
    create_access_token, verify_password, get_password_hash,
    get_current_user, get_current_admin, get_current_reciclador, get_current_empresa,
)
from schemas import (
    LoginSchema, RegisterEmpresaSchema,
    UsuarioCreateSchema, UsuarioUpdateSchema,
    CargaCreateSchema, SimularQRSchema,
    CertificadoCreateSchema,
    SolicitudCreateSchema,
    CamionCreateSchema,
)
from services import (
    get_or_create_residuo, get_or_create_ruta_default, get_or_create_camion_default,
    calcular_monto,
    generar_qr_code, generar_qr_image_base64,
    generar_numero_radicado, generar_hash_certificado,
)


# ============================================================
# SERIALIZADORES (transforman modelos SQLAlchemy -> dict de respuesta)
# ============================================================
def serialize_usuario(u: Usuario) -> dict:
    return {
        "id_usuario": u.id_usuario,
        "id": u.id_usuario,
        "documento": u.documento,
        "nombre_completo": u.nombre_completo,
        "email": u.email,
        "telefono": u.telefono,
        "rol": u.rol.value if hasattr(u.rol, "value") else u.rol,
        "id_ruta_asignada": u.id_ruta_asignada,
        "id_empresa": u.id_empresa,
        "activo": u.activo,
    }


def serialize_carga(c: Carga) -> dict:
    return {
        "id_carga": c.id_carga,
        "id": c.id_carga,
        "tipo_residuo": c.residuo.nombre if c.residuo else None,
        "peso_kg": float(c.peso_kg),
        "peso": float(c.peso_kg),
        "calidad": c.calidad,
        "fecha_recoleccion": c.fecha_recoleccion.isoformat() if c.fecha_recoleccion else None,
        "procesada": c.procesada,
        "empresa_email": None,  # el modelo no vincula empresa directo a la carga
    }


def serialize_certificado(c: Certificado) -> dict:
    return {
        "id_certificado": c.id_certificado,
        "id": c.id_certificado,
        "radicado": c.numero_radicado,
        "empresa_nombre": c.empresa.razon_social if c.empresa else None,
        "fecha_emision": c.fecha_emision.isoformat() if c.fecha_emision else None,
        "total_kg": float(c.total_kg),
        "hash_verificacion": c.hash_verificacion,
        "estado": c.estado.value if hasattr(c.estado, "value") else c.estado,
    }


def serialize_pago(p: Pago) -> dict:
    return {
        "id_pago": p.id_pago,
        "id": p.id_pago,
        "id_carga": p.id_carga,
        "monto_final": float(p.monto_final),
        "estado": p.estado.value if hasattr(p.estado, "value") else p.estado,
        "fecha_calculo": p.fecha_calculo.isoformat() if p.fecha_calculo else None,
    }


def serialize_solicitud(s: Solicitud) -> dict:
    return {
        "id_solicitud": s.id_solicitud,
        "id": s.id_solicitud,
        "empresa_nombre": s.empresa.razon_social if s.empresa else None,
        "tipo_residuo": s.tipo_residuo,
        "cantidad_estimada_kg": float(s.cantidad_estimada_kg),
        "notas": s.notas,
        "estado": s.estado.value if hasattr(s.estado, "value") else s.estado,
        "creada_en": s.creada_en.isoformat() if s.creada_en else None,
    }


def serialize_camion(c: Camion) -> dict:
    return {
        "id_camion": c.id_camion,
        "id": c.id_camion,
        "placa": c.placa,
        "qr_code": c.qr_code,
        "capacidad_kg": float(c.capacidad_kg),
        "id_ruta": c.id_ruta,
        "ruta_nombre": c.ruta.nombre if c.ruta else None,
        "activo": c.activo,
    }


# ============================================================
# HEALTH  (main.py le agrega prefix="/api" -> queda en /api/health)
# ============================================================
health_router = APIRouter(tags=["health"])


@health_router.get("/health")
def health_check():
    return {"status": "ok", "service": "Green-Loop API"}


# ============================================================
# AUTH  (/auth/...)
# ============================================================
auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/login")
def login(payload: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if not user or not verify_password(payload.password, user.contrasena_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not user.activo:
        raise HTTPException(status_code=401, detail="Usuario inactivo, contacta al administrador")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


@auth_router.get("/me")
def me(current_user: Usuario = Depends(get_current_user)):
    return serialize_usuario(current_user)


@auth_router.post("/register")
def register_empresa(payload: RegisterEmpresaSchema, db: Session = Depends(get_db)):
    """Registro público (usado por /register en el frontend). Siempre crea rol=empresa."""
    if db.query(Usuario).filter(Usuario.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Ese correo ya está registrado")
    if db.query(Usuario).filter(Usuario.documento == payload.documento).first():
        raise HTTPException(status_code=400, detail="Ese documento/NIT ya está registrado")

    empresa = db.query(Empresa).filter(Empresa.nit == payload.documento).first()
    if not empresa:
        empresa = Empresa(nit=payload.documento, razon_social=payload.nombre_completo, email=payload.email, activa=True)
        db.add(empresa)
        db.commit()
        db.refresh(empresa)

    nuevo_usuario = Usuario(
        documento=payload.documento,
        nombre_completo=payload.nombre_completo,
        email=payload.email,
        rol=RolUsuario.empresa,
        id_empresa=empresa.id_empresa,
        contrasena_hash=get_password_hash(payload.password),
        activo=True,
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return serialize_usuario(nuevo_usuario)


# ============================================================
# CATALOGOS  (/catalogos/...)
# ============================================================
catalogos_router = APIRouter(prefix="/catalogos", tags=["catalogos"])


@catalogos_router.get("/zonas")
def listar_zonas(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    zonas = db.query(Zona).filter(Zona.activa == True).all()  # noqa: E712
    return [{"id": z.id_zona, "nombre": z.nombre, "multiplicador": float(z.multiplicador)} for z in zonas]


@catalogos_router.get("/empresas")
def listar_empresas(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    empresas = db.query(Empresa).filter(Empresa.activa == True).all()  # noqa: E712
    return [{"id": e.id_empresa, "nombre": e.razon_social, "razon_social": e.razon_social, "email": e.email} for e in empresas]


@catalogos_router.get("/rutas")
def listar_rutas(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    rutas = db.query(Ruta).filter(Ruta.activa == True).all()  # noqa: E712
    return [{"id": r.id_ruta, "nombre": r.nombre, "codigo": r.codigo} for r in rutas]


@catalogos_router.get("/residuos")
def listar_residuos(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    residuos = db.query(Residuo).filter(Residuo.activo == True).all()  # noqa: E712
    return [{"id": r.id_residuo, "nombre": r.nombre, "codigo": r.codigo, "precio_base_kg": float(r.precio_base_kg)} for r in residuos]


@catalogos_router.get("/camiones")
def listar_camiones(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    camiones = db.query(Camion).filter(Camion.activo == True).all()  # noqa: E712
    return [serialize_camion(c) for c in camiones]


@catalogos_router.post("/camiones")
def crear_camion(payload: CamionCreateSchema, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    if db.query(Camion).filter(Camion.placa == payload.placa).first():
        raise HTTPException(status_code=400, detail="Ya existe un camión con esa placa")
    ruta = db.query(Ruta).get(payload.id_ruta)
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    camion = Camion(
        placa=payload.placa,
        qr_code=generar_qr_code("CAMION"),
        capacidad_kg=Decimal(str(payload.capacidad_kg)),
        id_ruta=payload.id_ruta,
        activo=True,
    )
    db.add(camion)
    db.commit()
    db.refresh(camion)
    return serialize_camion(camion)


@catalogos_router.get("/camiones/{id_camion}/qr")
def obtener_qr_camion(id_camion: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    camion = db.query(Camion).get(id_camion)
    if not camion:
        raise HTTPException(status_code=404, detail="Camión no encontrado")
    return {
        "placa": camion.placa,
        "qr_code": camion.qr_code,
        "qr_image_base64": generar_qr_image_base64(camion.qr_code),
    }


# ============================================================
# CARGAS  (/cargas/...)
# ============================================================
cargas_router = APIRouter(prefix="/cargas", tags=["cargas"])


@cargas_router.get("")
def listar_cargas(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    query = db.query(Carga)
    if current_user.rol == RolUsuario.reciclador:
        query = query.filter(Carga.id_reciclador == current_user.id_usuario)
    cargas = query.order_by(Carga.fecha_recoleccion.desc()).limit(200).all()
    return [serialize_carga(c) for c in cargas]


@cargas_router.post("")
def crear_carga(payload: CargaCreateSchema, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    residuo = get_or_create_residuo(db, payload.tipo_residuo)

    if payload.id_camion:
        camion = db.query(Camion).filter(Camion.id_camion == payload.id_camion, Camion.activo == True).first()  # noqa: E712
        if not camion:
            raise HTTPException(status_code=404, detail="El camión escaneado ya no existe o está inactivo")
        ruta = camion.ruta
    elif current_user.id_ruta_asignada:
        ruta = db.query(Ruta).get(current_user.id_ruta_asignada)
        camion = get_or_create_camion_default(db, ruta)
    else:
        ruta = get_or_create_ruta_default(db)
        camion = get_or_create_camion_default(db, ruta)

    carga = Carga(
        codigo_qr=camion.qr_code,
        id_ruta=ruta.id_ruta,
        id_residuo=residuo.id_residuo,
        id_reciclador=current_user.id_usuario,
        id_camion=camion.id_camion,
        peso_kg=Decimal(str(payload.peso_kg)),
        calidad="media",
    )
    db.add(carga)
    db.commit()
    db.refresh(carga)
    return serialize_carga(carga)


@cargas_router.post("/verificar-qr")
def verificar_qr_camion(payload: SimularQRSchema, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Busca un camión real por su código QR (lo genera el admin). Ya no es una simulación."""
    camion = db.query(Camion).filter(Camion.qr_code == payload.qr_code.strip(), Camion.activo == True).first()  # noqa: E712
    if not camion:
        raise HTTPException(status_code=404, detail="Código QR no reconocido. Pídele al admin que genere el código de ese camión.")
    return serialize_camion(camion)



# ============================================================
# CERTIFICADOS  (/certificados/...)
# ============================================================
certificados_router = APIRouter(prefix="/certificados", tags=["certificados"])


@certificados_router.get("")
def listar_certificados(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    query = db.query(Certificado)
    if current_user.rol == RolUsuario.empresa and current_user.id_empresa:
        query = query.filter(Certificado.id_empresa == current_user.id_empresa)
    certificados = query.order_by(Certificado.fecha_emision.desc()).limit(200).all()
    return [serialize_certificado(c) for c in certificados]


@certificados_router.post("")
def crear_certificado(payload: CertificadoCreateSchema, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    empresa = db.query(Empresa).filter(Empresa.email == payload.empresa_email).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="No existe una empresa con ese correo")

    carga = (
        db.query(Carga)
        .filter(Carga.procesada == False)  # noqa: E712
        .order_by(Carga.fecha_recoleccion.asc())
        .first()
    )
    if not carga:
        raise HTTPException(status_code=400, detail="No hay cargas pendientes para certificar")

    numero_radicado = generar_numero_radicado()
    detalle = {"residuo": carga.residuo.nombre if carga.residuo else "N/A", "peso_kg": float(carga.peso_kg)}
    hash_verificacion = generar_hash_certificado(numero_radicado, carga.id_carga, empresa.id_empresa)

    certificado = Certificado(
        numero_radicado=numero_radicado,
        id_carga=carga.id_carga,
        id_empresa=empresa.id_empresa,
        periodo_inicio=date.today(),
        periodo_fin=date.today(),
        total_kg=carga.peso_kg,
        residuos_detalle=detalle,
        hash_verificacion=hash_verificacion,
        estado=EstadoCertificado.emitido,
    )
    carga.procesada = True
    db.add(certificado)
    db.commit()
    db.refresh(certificado)
    return serialize_certificado(certificado)


@certificados_router.get("/verificar/{hash_verificacion}")
def verificar_certificado(hash_verificacion: str, db: Session = Depends(get_db)):
    certificado = db.query(Certificado).filter(Certificado.hash_verificacion == hash_verificacion).first()
    if not certificado:
        raise HTTPException(status_code=404, detail="Hash no encontrado")
    return {"status": "Auténtico", "radicado": certificado.numero_radicado, "estado": certificado.estado.value}


# ============================================================
# PAGOS  (/pagos/...)
# ============================================================
pagos_router = APIRouter(prefix="/pagos", tags=["pagos"])


@pagos_router.get("")
def listar_pagos(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    query = db.query(Pago)
    if current_user.rol == RolUsuario.reciclador:
        query = query.filter(Pago.id_reciclador == current_user.id_usuario)
    pagos = query.order_by(Pago.fecha_calculo.desc()).limit(200).all()
    return [serialize_pago(p) for p in pagos]


@pagos_router.post("/calcular/{id_carga}")
def calcular_pago(id_carga: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    carga = db.query(Carga).get(id_carga)
    if not carga:
        raise HTTPException(status_code=404, detail="Carga no encontrada")

    montos = calcular_monto(carga)
    pago = Pago(
        id_reciclador=carga.id_reciclador,
        id_carga=carga.id_carga,
        monto_base=montos["monto_base"],
        multiplicador_calidad=montos["multiplicador_calidad"],
        multiplicador_zona=montos["multiplicador_zona"],
        monto_final=montos["monto_final"],
        estado=EstadoPago.pendiente,
    )
    db.add(pago)
    db.commit()
    db.refresh(pago)
    return serialize_pago(pago)


@pagos_router.put("/{id_pago}/marcar-pagado")
def marcar_pagado(id_pago: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    pago = db.query(Pago).get(id_pago)
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    pago.estado = EstadoPago.pagado
    pago.fecha_pago = datetime.utcnow()
    db.commit()
    db.refresh(pago)
    return serialize_pago(pago)


# ============================================================
# DASHBOARD  (/dashboard/...)
# ============================================================
dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@dashboard_router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    if current_user.rol == RolUsuario.reciclador:
        cargas_q = db.query(Carga).filter(Carga.id_reciclador == current_user.id_usuario)
        total_cargas = cargas_q.count()
        total_peso = cargas_q.with_entities(func.coalesce(func.sum(Carga.peso_kg), 0)).scalar()
        total_certificados = 0
    elif current_user.rol == RolUsuario.empresa:
        total_cargas = 0
        certs_q = db.query(Certificado).filter(Certificado.id_empresa == current_user.id_empresa)
        total_certificados = certs_q.count()
        total_peso = certs_q.with_entities(func.coalesce(func.sum(Certificado.total_kg), 0)).scalar()
    else:  # admin
        total_cargas = db.query(Carga).count()
        total_certificados = db.query(Certificado).count()
        total_peso = db.query(Carga).with_entities(func.coalesce(func.sum(Carga.peso_kg), 0)).scalar()

    return {
        "total_cargas": total_cargas,
        "total_certificados": total_certificados,
        "total_peso_kg": float(total_peso or 0),
    }


# ============================================================
# REPORTES  (/reportes/...)  -- solo admin, según router.js del frontend
# ============================================================
reportes_router = APIRouter(prefix="/reportes", tags=["reportes"])


@reportes_router.get("/mensual-zona")
def reporte_mensual_zona(
    anio: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
):
    query = db.query(Carga)
    if anio:
        query = query.filter(func.extract("year", Carga.fecha_recoleccion) == anio)
    if mes:
        query = query.filter(func.extract("month", Carga.fecha_recoleccion) == mes)
    cargas = query.all()
    return [
        {
            "zona": c.ruta.zona.nombre if c.ruta and c.ruta.zona else "Sin zona",
            "residuo": c.residuo.nombre if c.residuo else "N/A",
            "total_kg": float(c.peso_kg),
        }
        for c in cargas
    ]


@reportes_router.get("/formato-autoridad")
def reporte_formato_autoridad(
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
):
    query = db.query(Carga)
    if fecha_inicio:
        query = query.filter(func.date(Carga.fecha_recoleccion) >= fecha_inicio)
    if fecha_fin:
        query = query.filter(func.date(Carga.fecha_recoleccion) <= fecha_fin)
    cargas = query.order_by(Carga.fecha_recoleccion.asc()).all()
    return [
        {
            "id": c.id_carga,
            "certificado_radicado": c.certificado.numero_radicado if c.certificado else None,
            "fecha_recoleccion": c.fecha_recoleccion.isoformat() if c.fecha_recoleccion else None,
            "tipo_residuo": c.residuo.nombre if c.residuo else "N/A",
            "peso_kg": float(c.peso_kg),
        }
        for c in cargas
    ]


# ============================================================
# USUARIOS  (/usuarios/...)  -- admin, según router.js del frontend
# ============================================================
usuarios_router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@usuarios_router.get("")
def listar_usuarios(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    busqueda: Optional[str] = Query(None),
    rol: Optional[str] = Query(None),
    activo: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_admin),
):
    query = db.query(Usuario)
    if busqueda:
        like = f"%{busqueda}%"
        query = query.filter((Usuario.nombre_completo.ilike(like)) | (Usuario.email.ilike(like)) | (Usuario.documento.ilike(like)))
    if rol:
        query = query.filter(Usuario.rol == rol)
    if activo is not None and activo != "":
        query = query.filter(Usuario.activo == (activo.lower() == "true"))

    total = query.count()
    usuarios = query.order_by(Usuario.id_usuario.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"usuarios": [serialize_usuario(u) for u in usuarios], "total": total}


@usuarios_router.get("/{id_usuario}")
def obtener_usuario(id_usuario: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    usuario = db.query(Usuario).get(id_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return serialize_usuario(usuario)


@usuarios_router.post("")
def crear_usuario(payload: UsuarioCreateSchema, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    if db.query(Usuario).filter(Usuario.documento == payload.documento).first():
        raise HTTPException(status_code=400, detail="Documento ya registrado")
    if payload.email and db.query(Usuario).filter(Usuario.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    usuario = Usuario(
        documento=payload.documento,
        nombre_completo=payload.nombre_completo,
        email=payload.email,
        telefono=payload.telefono,
        rol=payload.rol,
        id_ruta_asignada=payload.id_ruta_asignada,
        id_empresa=payload.id_empresa,
        contrasena_hash=get_password_hash(payload.password),
        activo=True,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return serialize_usuario(usuario)


@usuarios_router.put("/{id_usuario}")
def actualizar_usuario(id_usuario: int, payload: UsuarioUpdateSchema, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    usuario = db.query(Usuario).get(id_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    data = payload.dict(exclude_unset=True, exclude={"password"})
    for campo, valor in data.items():
        setattr(usuario, campo, valor)
    if payload.password:
        usuario.contrasena_hash = get_password_hash(payload.password)

    db.commit()
    db.refresh(usuario)
    return serialize_usuario(usuario)


@usuarios_router.patch("/{id_usuario}/toggle")
def toggle_usuario(id_usuario: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    usuario = db.query(Usuario).get(id_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.activo = not usuario.activo
    db.commit()
    db.refresh(usuario)
    return serialize_usuario(usuario)


@usuarios_router.delete("/{id_usuario}")
def eliminar_usuario(id_usuario: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    usuario = db.query(Usuario).get(id_usuario)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(usuario)
    db.commit()
    return {"status": "eliminado"}


# ============================================================
# SOLICITUDES  (/solicitudes/...)
# La empresa pide una recolección: tipo de residuo + cantidad estimada.
# ============================================================
solicitudes_router = APIRouter(prefix="/solicitudes", tags=["solicitudes"])


@solicitudes_router.get("")
def listar_solicitudes(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    query = db.query(Solicitud)
    if current_user.rol == RolUsuario.empresa:
        if not current_user.id_empresa:
            return []
        query = query.filter(Solicitud.id_empresa == current_user.id_empresa)
    solicitudes = query.order_by(Solicitud.creada_en.desc()).limit(200).all()
    return [serialize_solicitud(s) for s in solicitudes]


@solicitudes_router.post("")
def crear_solicitud(payload: SolicitudCreateSchema, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_empresa)):
    if not current_user.id_empresa:
        raise HTTPException(status_code=400, detail="Tu usuario no tiene una empresa asociada")
    solicitud = Solicitud(
        id_empresa=current_user.id_empresa,
        tipo_residuo=payload.tipo_residuo,
        cantidad_estimada_kg=Decimal(str(payload.cantidad_estimada_kg)),
        notas=payload.notas,
        estado=EstadoSolicitud.pendiente,
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    return serialize_solicitud(solicitud)


@solicitudes_router.patch("/{id_solicitud}/atender")
def atender_solicitud(id_solicitud: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_admin)):
    solicitud = db.query(Solicitud).get(id_solicitud)
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    solicitud.estado = EstadoSolicitud.atendida
    db.commit()
    db.refresh(solicitud)
    return serialize_solicitud(solicitud)


@solicitudes_router.delete("/{id_solicitud}")
def cancelar_solicitud(id_solicitud: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    solicitud = db.query(Solicitud).get(id_solicitud)
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if current_user.rol == RolUsuario.empresa and solicitud.id_empresa != current_user.id_empresa:
        raise HTTPException(status_code=403, detail="No puedes cancelar solicitudes de otra empresa")
    solicitud.estado = EstadoSolicitud.cancelada
    db.commit()
    db.refresh(solicitud)
    return serialize_solicitud(solicitud)
