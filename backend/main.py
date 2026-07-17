from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'cambia-esto-en-produccion'
app.config['JWT_SECRET_KEY'] = 'otra-clave-secreta-distinta'
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'greenloop.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
jwt = JWTManager(app)


class User(db.Model):
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


from flask_jwt_extended import verify_jwt_in_request


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Green Loop API"}), 200


@app.route("/api/auth/register", methods=["POST"])
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


@app.route("/api/auth/register-company", methods=["POST"])
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


@app.route("/api/auth/login", methods=["POST"])
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


@app.route("/api/users", methods=["GET"])
@jwt_required()
@role_required("admin")
def list_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": "Usuario eliminado"}), 200


@app.route("/api/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify(user.to_dict()), 200


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)