// tests/integration/auth.routes.test.ts
import request from 'supertest';
import app from '../../src/server';

/**
 * Integration tests for auth endpoints.
 * These require a real test database. Use:
 *   DATABASE_URL=postgresql://postgres:password@localhost:5432/ecommerce_test
 *   NODE_ENV=test jest tests/integration
 */

describe('POST /api/v1/auth/register', () => {
  it('should return 422 for invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'Test@123', firstName: 'A', lastName: 'B' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('should return 422 for weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@test.com', password: 'weak', firstName: 'A', lastName: 'B' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('should return 401 for wrong credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.com', password: 'Wrong@123' });
    expect(res.status).toBe(401);
  });
});

describe('GET /health', () => {
  it('should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
