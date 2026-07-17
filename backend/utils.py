from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def rol_requerido(*roles_permitidos):
    def decorador(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in roles_permitidos:
                return jsonify({"error": "Solo un administrador puede hacer esto"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorador