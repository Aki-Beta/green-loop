from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from models.user import db, User
from utils import rol_requerido

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
@rol_requerido("admin")
def register():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "user")

    if not email or not password:
        return jsonify({"error": "email y password son obligatorios"}), 400

    if role not in ("user", "company", "admin"):
        return jsonify({"error": "role inválido"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Ese correo ya está registrado"}), 409

    nuevo = User(email=email, role=role)
    nuevo.set_password(password)
    db.session.add(nuevo)
    db.session.commit()

    return jsonify(nuevo.to_dict()), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Credenciales incorrectas"}), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role},
    )

    return jsonify({"access_token": token, "user": user.to_dict()}), 200