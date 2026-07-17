import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import create_app


@pytest.fixture
def client():
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:'
    })
    with app.test_client() as client:
        yield client


def test_health(client):
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'ok'
    assert data['service'] == 'Green Loop API'


def test_register_company(client):
    response = client.post('/api/auth/register-company', json={
        'email': 'test@company.com',
        'password': 'password123',
        'company_name': 'Test Company S.A.S.'
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data['email'] == 'test@company.com'
    assert data['role'] == 'company'
    assert data['company_name'] == 'Test Company S.A.S.'


def test_register_company_duplicate(client):
    client.post('/api/auth/register-company', json={
        'email': 'dup@test.com',
        'password': 'pass',
        'company_name': 'Company 1'
    })
    response = client.post('/api/auth/register-company', json={
        'email': 'dup@test.com',
        'password': 'pass',
        'company_name': 'Company 2'
    })
    assert response.status_code == 409


def test_login(client):
    client.post('/api/auth/register-company', json={
        'email': 'login@test.com',
        'password': 'secret123',
        'company_name': 'Login Co'
    })
    response = client.post('/api/auth/login', json={
        'email': 'login@test.com',
        'password': 'secret123'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'access_token' in data
    assert data['user']['email'] == 'login@test.com'


def test_login_invalid_credentials(client):
    response = client.post('/api/auth/login', json={
        'email': 'none@test.com',
        'password': 'wrong'
    })
    assert response.status_code == 401


def test_admin_register_and_list(client):
    # Register company (gets company role)
    client.post('/api/auth/register-company', json={
        'email': 'admin@test.com',
        'password': 'adminpass',
        'company_name': 'Admin Corp'
    })
# Login as company
    login = client.post('/api/auth/login', json={
        'email': 'admin@test.com',
        'password': 'adminpass'
    })
    token = login.get_json()['access_token']

    # Company cannot create users (needs admin)
    response = client.post('/api/auth/register', json={
        'email': 'rec@test.com',
        'password': 'recpass',
        'role': 'user'
    }, headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 403


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
