import os
from functools import wraps

from dotenv import load_dotenv
from flask import Blueprint, Flask, jsonify, request
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    verify_jwt_in_request,
)
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

db = SQLAlchemy()
jwt = JWTManager()

# Blueprint for API routes
api_bp = Blueprint('api', __name__, url_prefix='/api')


class User(db.Model):  # type: ignore[name-defined]
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    company_name = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "company_name": self.company_name
        }


def role_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in allowed_roles:
                return jsonify({"error": "No autorizado"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


@api_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Green Loop API"}), 200


@api_bp.route("/auth/register", methods=["POST"])
@jwt_required()
@role_required("admin")
def admin_register():
    """Solo admin puede crear usuarios (recicladores, otros admins, etc.)"""
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "user")
    company_name = data.get("company_name")

    if not email or not password:
        return jsonify({"error": "email y password son obligatorios"}), 400

    if role not in ("user", "company", "admin"):
        return jsonify({"error": "role inválido: user, company o admin"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Ese correo ya está registrado"}), 409

    user = User(email=email, role=role, company_name=company_name)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201


@api_bp.route("/auth/register-company", methods=["POST"])
def company_register():
    """Empresas se registran libremente (rol 'company')"""
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    company_name = data.get("company_name")

    if not email or not password or not company_name:
        return jsonify({"error": "email, password y company_name son obligatorios"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Ese correo ya está registrado"}), 409

    user = User(email=email, role="company", company_name=company_name)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201


@api_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Credenciales incorrectas"}), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role}
    )

    return jsonify({"access_token": token, "user": user.to_dict()}), 200


@api_bp.route("/users", methods=["GET"])
@jwt_required()
@role_required("admin")
def list_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200


@api_bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": "Usuario eliminado"}), 200


@api_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify(user.to_dict()), 200


def create_app(config_overrides=None):
    """Application factory."""
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(os.path.dirname(__file__), 'greenloop.db')}"
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    if config_overrides:
        app.config.update(config_overrides)

    db.init_app(app)
    jwt.init_app(app)
    app.register_blueprint(api_bp)

    with app.app_context():
        db.create_all()

    return app


# Default app instance for production
app = create_app()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
