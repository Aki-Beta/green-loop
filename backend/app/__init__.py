# backend/app/__init__.py - Factoría de la aplicación Flask
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from backend.config import Config

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # CORS habilitado para que el frontend (otro puerto) pueda llamar la API
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)
    migrate.init_app(app, db)

    from backend.app.routes.cargas import bp as cargas_bp
    from backend.app.routes.certificados import bp as certificados_bp
    from backend.app.routes.reportes import bp as reportes_bp
    from backend.app.routes.catalogos import bp as catalogos_bp

    app.register_blueprint(cargas_bp, url_prefix='/api')
    app.register_blueprint(certificados_bp, url_prefix='/api')
    app.register_blueprint(reportes_bp, url_prefix='/api')
    app.register_blueprint(catalogos_bp, url_prefix='/api')

    @app.route('/health')
    def health_check():
        return {'status': 'ok', 'service': 'trazabilidad-residuos'}, 200

    return app