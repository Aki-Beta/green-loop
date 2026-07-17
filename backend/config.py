import os
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
class Config:
    SECRET_KEY = "cambia-esto-en-produccion"
    JWT_SECRET_KEY = "otra-clave-secreta-distinta"
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'greenloop.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False