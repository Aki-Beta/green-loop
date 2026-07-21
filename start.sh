#!/bin/bash
# Arranque completo de Green-Loop (desde la carpeta que tiene docker-compose.yml)
set -e

echo "🧹 Bajando contenedores viejos y borrando el volumen de Postgres (schema desactualizado)..."
docker compose down -v

echo "🏗️  Reconstruyendo imágenes..."
docker compose up -d --build

echo "⏳ Esperando a que el backend esté listo..."
sleep 8

echo "📋 Últimos logs del backend (verifica que no haya errores):"
docker compose logs backend --tail=30

echo ""
echo "🌱 Sembrando usuarios de prueba (admin, reciclador, empresa)..."
docker compose exec backend python seed.py

echo ""
echo "✅ Listo. Abre http://localhost:3000"
echo "   Swagger (docs backend): http://127.0.0.1:8000/docs"
echo ""
echo "   Admin:      admin@greenloop.co   / admin123"
echo "   Reciclador: juan@reciclador.co   / rec123"
echo "   Empresa:    empresa@test.com     / empresa123"
