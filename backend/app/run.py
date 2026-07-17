# backend/run.py - Punto de entrada. Ejecutar con: python run.py (desde carpeta backend)
import os
from backend.app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
    