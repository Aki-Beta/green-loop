from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

incentivos_bp = Blueprint("incentivos", __name__, url_prefix="/api/incentivos")

PRECIO_BASE = {
    "carton": 500,
    "plastico": 800,
    "vidrio": 300,
}

FACTOR_CALIDAD = {
    "alta": 1.2,
    "media": 1.0,
    "baja": 0.7,
}


@incentivos_bp.route("/calcular", methods=["POST"])
@jwt_required()
def calcular_incentivo():
    data = request.get_json() or {}
    material = data.get("material")
    peso_kg = data.get("peso_kg")
    calidad = data.get("calidad", "media")

    if material not in PRECIO_BASE:
        return jsonify({"error": f"material inválido. Opciones: {list(PRECIO_BASE.keys())}"}), 400

    if not isinstance(peso_kg, (int, float)) or peso_kg <= 0:
        return jsonify({"error": "peso_kg debe ser un número mayor a 0"}), 400

    if calidad not in FACTOR_CALIDAD:
        return jsonify({"error": f"calidad inválida. Opciones: {list(FACTOR_CALIDAD.keys())}"}), 400

    pago = round(peso_kg * PRECIO_BASE[material] * FACTOR_CALIDAD[calidad], 2)

    return jsonify({
        "material": material,
        "peso_kg": peso_kg,
        "calidad": calidad,
        "pago_calculado": pago,
    }), 200