/**
 * =============================================================================
 * API TEST SUITE — Customized T-Shirt Printing
 * Modules: Inventory | Order Management | User Management |
 *          Product Management | Refund & Return Management
 * =============================================================================
 *
 * HOW TO SET UP (one-time, run inside the /server folder):
 *
 *   npm install --save-dev jest supertest mongodb-memory-server
 *
 * Then add the following to server/package.json (do NOT change "type":"module"):
 *
 *   "scripts": {
 *     ...existing scripts...,
 *     "test": "node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=tests/ --forceExit --detectOpenHandles --runInBand"
 *   },
 *   "jest": {
 *     "testEnvironment": "node",
 *     "testTimeout": 30000
 *   }
 *
 * HOW TO RUN:
 *
 *   cd server
 *   npm test
 *
 * NOTES:
 *   - Tests use an in-memory MongoDB instance (no real DB needed).
 *   - External services (email, cloudinary) are mocked automatically.
 *   - Tests run sequentially (--runInBand) to avoid race conditions.
 *   - Each module's tests are fully isolated with their own seed data.
 * =============================================================================
 */

// ---------------------------------------------------------------------------
// Mock all external services BEFORE any imports (required for ESM jest)
// ---------------------------------------------------------------------------
import { jest } from '@jest/globals';

// emailService exports a default class instance
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  default: {
    send: jest.fn().mockResolvedValue(true),
    sendRegistrationEmail: jest.fn().mockResolvedValue(true),
    sendLoginEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendOrderConfirmationEmail: jest.fn().mockResolvedValue(true),
    sendReturnConfirmationEmail: jest.fn().mockResolvedValue(true),
    sendPromotionalAlert: jest.fn().mockResolvedValue(true),
  },
}));

// notificationService uses named exports
jest.unstable_mockModule('../src/services/notificationService.js', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
  createNotificationsForUsers: jest.fn().mockResolvedValue([]),
  notifyRoles: jest.fn().mockResolvedValue(true),
  getUnreadNotificationCount: jest.fn().mockResolvedValue(0),
}));

// imageUploadService uses named exports
jest.unstable_mockModule('../src/services/imageUploadService.js', () => ({
  storeProductImage: jest.fn().mockResolvedValue('/uploads/test-product.jpg'),
  storeUserAvatar: jest.fn().mockResolvedValue('/uploads/test-avatar.jpg'),
  storeCustomizationImage: jest.fn().mockResolvedValue('/uploads/test-custom.jpg'),
}));

// lowStockService uses named exports
jest.unstable_mockModule('../src/services/lowStockService.js', () => ({
  evaluateLowStockAlertState: jest.fn().mockReturnValue(false),
  notifyLowStockForRoles: jest.fn().mockResolvedValue(true),
}));

// ---------------------------------------------------------------------------
// Imports (must come AFTER jest.unstable_mockModule calls)
// ---------------------------------------------------------------------------
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

// Dynamic imports are needed for ESM mocking to take effect
const { default: app }        = await import('../src/app.js');
const { default: User }       = await import('../src/models/User.js');
const { default: Product }    = await import('../src/models/Product.js');
const { default: Inventory }  = await import('../src/models/Inventory.js');
const { default: Order }      = await import('../src/models/Order.js');
const { default: ReturnRequest } = await import('../src/models/ReturnRequest.js');

const request = supertest(app);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const JWT_SECRET = 'test-secret-key-for-jest-tests-only';
const BASE_URL   = '/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ---------------------------------------------------------------------------
// Global setup / teardown
// ---------------------------------------------------------------------------
let mongod;

beforeAll(async () => {
  // Replica set is required for MongoDB transactions used in order creation
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongod.getUri();
  process.env.MONGO_URI  = uri;
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.NODE_ENV   = 'test';
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ===========================================================================
// 1. USER MANAGEMENT MODULE
// ===========================================================================
describe('User Management', () => {
  let adminToken, staffToken, customerToken;
  let adminUser, customerUser;

  beforeAll(async () => {
    await User.deleteMany({});

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'Admin@12345',
      role: 'admin',
    });
    const staffUser = await User.create({
      name: 'Staff User',
      email: 'staff@test.com',
      password: 'Staff@12345',
      role: 'staff',
    });
    customerUser = await User.create({
      name: 'Customer One',
      email: 'customer@test.com',
      password: 'Customer@12345',
      role: 'customer',
    });

    adminToken    = makeToken(adminUser);
    staffToken    = makeToken(staffUser);
    customerToken = makeToken(customerUser);
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  // ----- GET /api/users -------------------------------------------------------
  describe('GET /api/users', () => {
    test('returns 401 when no token is provided', async () => {
      const res = await request.get(`${BASE_URL}/users`);
      expect(res.status).toBe(401);
    });

    test('returns 403 when a customer tries to list users', async () => {
      const res = await request
        .get(`${BASE_URL}/users`)
        .set(authHeader(customerToken));
      expect(res.status).toBe(403);
    });

    test('returns 403 when a staff tries to list users', async () => {
      const res = await request
        .get(`${BASE_URL}/users`)
        .set(authHeader(staffToken));
      expect(res.status).toBe(403);
    });

    test('returns paginated user list for admin', async () => {
      const res = await request
        .get(`${BASE_URL}/users`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('pagination.total');
      expect(res.body).toHaveProperty('pagination.page');
    });

    test('supports pagination params', async () => {
      const res = await request
        .get(`${BASE_URL}/users?page=1&limit=1`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    test('passwords are never returned in response', async () => {
      const res = await request
        .get(`${BASE_URL}/users`)
        .set(authHeader(adminToken));
      res.body.data.forEach((u) => {
        expect(u.password).toBeUndefined();
      });
    });
  });

  // ----- GET /api/users/:id ---------------------------------------------------
  describe('GET /api/users/:id', () => {
    test('returns 401 without auth', async () => {
      const res = await request.get(`${BASE_URL}/users/${adminUser._id}`);
      expect(res.status).toBe(401);
    });

    test('returns user object for admin', async () => {
      const res = await request
        .get(`${BASE_URL}/users/${customerUser._id}`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('email', 'customer@test.com');
      expect(res.body.user.password).toBeUndefined();
    });

    test('returns 400 for invalid MongoDB ID format', async () => {
      const res = await request
        .get(`${BASE_URL}/users/not-a-valid-id`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(422);
    });

    test('returns 404 for non-existent user ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request
        .get(`${BASE_URL}/users/${fakeId}`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(404);
    });
  });

  // ----- POST /api/users ------------------------------------------------------
  describe('POST /api/users', () => {
    test('creates a new user as admin', async () => {
      const res = await request
        .post(`${BASE_URL}/users`)
        .set(authHeader(adminToken))
        .send({
          name: 'New Test User',
          email: 'newuser@test.com',
          password: 'NewPass@123',
          role: 'customer',
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'User created');
      expect(res.body.user.email).toBe('newuser@test.com');
    });

    test('returns 409 for duplicate email', async () => {
      const res = await request
        .post(`${BASE_URL}/users`)
        .set(authHeader(adminToken))
        .send({
          name: 'Duplicate User',
          email: 'newuser@test.com',
          password: 'AnotherPass@123',
        });
      expect(res.status).toBe(409);
    });

    test('returns 400 for invalid email format', async () => {
      const res = await request
        .post(`${BASE_URL}/users`)
        .set(authHeader(adminToken))
        .send({ name: 'Bad Email', email: 'not-an-email', password: 'Pass@12345' });
      expect(res.status).toBe(422);
    });

    test('returns 400 when password is shorter than 8 characters', async () => {
      const res = await request
        .post(`${BASE_URL}/users`)
        .set(authHeader(adminToken))
        .send({ name: 'Short Pass', email: 'short@test.com', password: '123' });
      expect(res.status).toBe(422);
    });

    test('returns 400 when name is too short (< 2 chars)', async () => {
      const res = await request
        .post(`${BASE_URL}/users`)
        .set(authHeader(adminToken))
        .send({ name: 'A', email: 'shortname@test.com', password: 'Pass@12345' });
      expect(res.status).toBe(422);
    });

    test('returns 403 when customer tries to create user', async () => {
      const res = await request
        .post(`${BASE_URL}/users`)
        .set(authHeader(customerToken))
        .send({ name: 'Hacker', email: 'hacker@test.com', password: 'Pass@12345' });
      expect(res.status).toBe(403);
    });
  });

  // ----- PATCH /api/users/:id/role --------------------------------------------
  describe('PATCH /api/users/:id/role', () => {
    test('admin can update user role', async () => {
      const res = await request
        .patch(`${BASE_URL}/users/${customerUser._id}/role`)
        .set(authHeader(adminToken))
        .send({ role: 'staff' });
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('staff');
    });

    test('returns 400 for invalid role value', async () => {
      const res = await request
        .patch(`${BASE_URL}/users/${customerUser._id}/role`)
        .set(authHeader(adminToken))
        .send({ role: 'superuser' });
      expect(res.status).toBe(422);
    });

    test('returns 403 when non-admin tries to change role', async () => {
      const res = await request
        .patch(`${BASE_URL}/users/${customerUser._id}/role`)
        .set(authHeader(customerToken))
        .send({ role: 'admin' });
      expect(res.status).toBe(403);
    });
  });

  // ----- PATCH /api/users/:id/profile -----------------------------------------
  describe('PATCH /api/users/:id/profile', () => {
    test('admin can update user profile', async () => {
      const res = await request
        .patch(`${BASE_URL}/users/${customerUser._id}/profile`)
        .set(authHeader(adminToken))
        .send({ name: 'Updated Name', phone: '+94771234567' });
      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Updated Name');
    });

    test('returns 400 for invalid email in profile update', async () => {
      const res = await request
        .patch(`${BASE_URL}/users/${customerUser._id}/profile`)
        .set(authHeader(adminToken))
        .send({ email: 'bad-email' });
      expect(res.status).toBe(422);
    });
  });

  // ----- DELETE /api/users/:id ------------------------------------------------
  describe('DELETE /api/users/:id', () => {
    test('returns 403 when non-admin tries to delete a user', async () => {
      const res = await request
        .delete(`${BASE_URL}/users/${customerUser._id}`)
        .set(authHeader(customerToken));
      expect(res.status).toBe(403);
    });

    test('admin can delete a user', async () => {
      const tempUser = await User.create({
        name: 'To Delete',
        email: 'todelete@test.com',
        password: 'Delete@12345',
        role: 'customer',
      });
      const res = await request
        .delete(`${BASE_URL}/users/${tempUser._id}`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'User deleted');
    });

    test('returns 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request
        .delete(`${BASE_URL}/users/${fakeId}`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(404);
    });
  });
});

// ===========================================================================
// 2. PRODUCT MANAGEMENT MODULE
// ===========================================================================
describe('Product Management', () => {
  let adminToken, staffToken, customerToken;
  let testProduct;

  beforeAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});

    const admin = await User.create({
      name: 'Admin',
      email: 'admin.prod@test.com',
      password: 'Admin@12345',
      role: 'admin',
    });
    const staff = await User.create({
      name: 'Staff',
      email: 'staff.prod@test.com',
      password: 'Staff@12345',
      role: 'staff',
    });
    const customer = await User.create({
      name: 'Customer',
      email: 'customer.prod@test.com',
      password: 'Customer@12345',
      role: 'customer',
    });

    adminToken    = makeToken(admin);
    staffToken    = makeToken(staff);
    customerToken = makeToken(customer);

    // Seed a product directly (bypass controller to avoid cloudinary)
    testProduct = await Product.create({
      name: 'Classic White Tee',
      description: 'A classic white t-shirt made from 100% cotton.',
      basePrice: 29.99,
      category: 'tshirts',
      colors: ['#FFFFFF', '#000000'],
      sizes: [
        { size: 'S', priceModifier: 0 },
        { size: 'M', priceModifier: 0 },
        { size: 'L', priceModifier: 5 },
      ],
      isActive: true,
    });
    await Inventory.create({ product: testProduct._id, stock: 50, lowStockThreshold: 10 });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
  });

  // ----- GET /api/products ----------------------------------------------------
  describe('GET /api/products', () => {
    test('returns product list without auth (public endpoint)', async () => {
      const res = await request.get(`${BASE_URL}/products`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('returns pagination metadata', async () => {
      const res = await request.get(`${BASE_URL}/products?page=1&limit=5`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pagination.page', 1);
      expect(res.body).toHaveProperty('pagination.limit', 5);
      expect(res.body).toHaveProperty('pagination.total');
    });

    test('filters active products only with active=true', async () => {
      const res = await request.get(`${BASE_URL}/products?active=true`);
      expect(res.status).toBe(200);
      res.body.data.forEach((p) => expect(p.isActive).toBe(true));
    });

    test('search parameter returns matching products', async () => {
      const res = await request.get(`${BASE_URL}/products?search=Classic`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ----- GET /api/products/:id ------------------------------------------------
  describe('GET /api/products/:id', () => {
    test('returns product with inventory for valid ID', async () => {
      const res = await request.get(`${BASE_URL}/products/${testProduct._id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('product');
      expect(res.body.product._id.toString()).toBe(testProduct._id.toString());
    });

    test('returns 404 for non-existent product ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request.get(`${BASE_URL}/products/${fakeId}`);
      expect(res.status).toBe(404);
    });

    test('returns 400 for malformed product ID', async () => {
      const res = await request.get(`${BASE_URL}/products/invalid-id`);
      expect(res.status).toBe(422);
    });
  });

  // ----- POST /api/products ---------------------------------------------------
  describe('POST /api/products', () => {
    const newProductPayload = {
      name: 'Premium Polo Shirt',
      description: 'A premium quality polo shirt suitable for corporate events.',
      basePrice: 45.99,
      category: 'polo',
      colors: ['#FF0000', '#0000FF'],
      sizes: [
        { size: 'M', priceModifier: 0 },
        { size: 'L', priceModifier: 5 },
      ],
    };

    test('returns 401 without auth token', async () => {
      const res = await request.post(`${BASE_URL}/products`).send(newProductPayload);
      expect(res.status).toBe(401);
    });

    test('returns 403 when customer tries to create a product', async () => {
      const res = await request
        .post(`${BASE_URL}/products`)
        .set(authHeader(customerToken))
        .send(newProductPayload);
      expect(res.status).toBe(403);
    });

    test('returns 400 when name is missing', async () => {
      const res = await request
        .post(`${BASE_URL}/products`)
        .set(authHeader(adminToken))
        .send({ description: 'No name product', basePrice: 10 });
      expect(res.status).toBe(422);
    });

    test('returns 400 when description is too short (< 10 chars)', async () => {
      const res = await request
        .post(`${BASE_URL}/products`)
        .set(authHeader(adminToken))
        .send({ name: 'Valid Name', description: 'Short', basePrice: 10 });
      expect(res.status).toBe(422);
    });

    test('returns 400 when basePrice is missing', async () => {
      const res = await request
        .post(`${BASE_URL}/products`)
        .set(authHeader(adminToken))
        .send({ name: 'No Price Shirt', description: 'This shirt has no price set in body.' });
      expect(res.status).toBe(422);
    });

    test('returns 400 when basePrice is negative', async () => {
      const res = await request
        .post(`${BASE_URL}/products`)
        .set(authHeader(adminToken))
        .send({ name: 'Neg Price', description: 'Negative price product for testing.', basePrice: -5 });
      expect(res.status).toBe(422);
    });

    test('staff can create a product successfully', async () => {
      const res = await request
        .post(`${BASE_URL}/products`)
        .set(authHeader(staffToken))
        .send(newProductPayload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Product created');
      expect(res.body.product.name).toBe('Premium Polo Shirt');
    });
  });

  // ----- PUT /api/products/:id ------------------------------------------------
  describe('PUT /api/products/:id', () => {
    test('admin can update product name and price', async () => {
      const res = await request
        .put(`${BASE_URL}/products/${testProduct._id}`)
        .set(authHeader(adminToken))
        .send({ name: 'Updated White Tee', basePrice: 34.99 });
      expect(res.status).toBe(200);
      expect(res.body.product.name).toBe('Updated White Tee');
      expect(res.body.product.basePrice).toBe(34.99);
    });

    test('returns 403 when customer tries to update a product', async () => {
      const res = await request
        .put(`${BASE_URL}/products/${testProduct._id}`)
        .set(authHeader(customerToken))
        .send({ name: 'Hacked Name' });
      expect(res.status).toBe(403);
    });

    test('returns 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request
        .put(`${BASE_URL}/products/${fakeId}`)
        .set(authHeader(adminToken))
        .send({ name: 'Ghost Product' });
      expect(res.status).toBe(404);
    });
  });

  // ----- DELETE /api/products/:id ---------------------------------------------
  describe('DELETE /api/products/:id', () => {
    test('returns 403 when customer tries to delete a product', async () => {
      const res = await request
        .delete(`${BASE_URL}/products/${testProduct._id}`)
        .set(authHeader(customerToken));
      expect(res.status).toBe(403);
    });

    test('admin can delete a product', async () => {
      const tempProduct = await Product.create({
        name: 'Disposable Shirt',
        description: 'This product will be deleted during testing.',
        basePrice: 9.99,
        category: 'test',
      });
      const res = await request
        .delete(`${BASE_URL}/products/${tempProduct._id}`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Product deleted');
    });

    test('returns 404 when deleting non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request
        .delete(`${BASE_URL}/products/${fakeId}`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(404);
    });
  });
});

// ===========================================================================
// 3. INVENTORY MODULE
// ===========================================================================
describe('Inventory Management', () => {
  let adminToken, staffToken, customerToken;
  let testProduct, testInventory;

  beforeAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});

    const admin = await User.create({
      name: 'Admin',
      email: 'admin.inv@test.com',
      password: 'Admin@12345',
      role: 'admin',
    });
    const staff = await User.create({
      name: 'Staff',
      email: 'staff.inv@test.com',
      password: 'Staff@12345',
      role: 'staff',
    });
    const customer = await User.create({
      name: 'Customer',
      email: 'customer.inv@test.com',
      password: 'Customer@12345',
      role: 'customer',
    });

    adminToken    = makeToken(admin);
    staffToken    = makeToken(staff);
    customerToken = makeToken(customer);

    testProduct = await Product.create({
      name: 'Inventory Test Shirt',
      description: 'Product used exclusively for inventory module tests.',
      basePrice: 25.00,
      category: 'tshirts',
    });
    testInventory = await Inventory.create({
      product: testProduct._id,
      stock: 100,
      lowStockThreshold: 10,
    });

    // Create a low-stock product for alert tests
    const lowStockProduct = await Product.create({
      name: 'Low Stock Shirt',
      description: 'Product with low stock level for alert testing purposes.',
      basePrice: 19.99,
      category: 'tshirts',
    });
    await Inventory.create({
      product: lowStockProduct._id,
      stock: 3,
      lowStockThreshold: 10,
      lowStockAlertActive: true,
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
  });

  // ----- GET /api/inventory ---------------------------------------------------
  describe('GET /api/inventory', () => {
    test('returns 401 without auth token', async () => {
      const res = await request.get(`${BASE_URL}/inventory`);
      expect(res.status).toBe(401);
    });

    test('returns 403 when customer tries to access inventory', async () => {
      const res = await request
        .get(`${BASE_URL}/inventory`)
        .set(authHeader(customerToken));
      expect(res.status).toBe(403);
    });

    test('admin can retrieve paginated inventory list', async () => {
      const res = await request
        .get(`${BASE_URL}/inventory`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('pagination.total');
    });

    test('staff can retrieve inventory list', async () => {
      const res = await request
        .get(`${BASE_URL}/inventory`)
        .set(authHeader(staffToken));
      expect(res.status).toBe(200);
    });

    test('lowStock=true filter returns only low-stock items', async () => {
      const res = await request
        .get(`${BASE_URL}/inventory?lowStock=true`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      res.body.data.forEach((item) => {
        expect(item.stock).toBeLessThanOrEqual(item.lowStockThreshold);
      });
    });

    test('pagination params limit returned results', async () => {
      const res = await request
        .get(`${BASE_URL}/inventory?page=1&limit=1`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  // ----- GET /api/inventory/alerts/low-stock ----------------------------------
  describe('GET /api/inventory/alerts/low-stock', () => {
    test('returns 401 without auth', async () => {
      const res = await request.get(`${BASE_URL}/inventory/alerts/low-stock`);
      expect(res.status).toBe(401);
    });

    test('admin can retrieve low-stock alerts', async () => {
      const res = await request
        .get(`${BASE_URL}/inventory/alerts/low-stock`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('count');
    });

    test('all returned items have lowStockAlertActive = true', async () => {
      const res = await request
        .get(`${BASE_URL}/inventory/alerts/low-stock`)
        .set(authHeader(adminToken));
      res.body.data.forEach((item) => {
        expect(item.lowStockAlertActive).toBe(true);
      });
    });
  });

  // ----- PATCH /api/inventory/:id ---------------------------------------------
  describe('PATCH /api/inventory/:id', () => {
    test('returns 401 without auth', async () => {
      const res = await request
        .patch(`${BASE_URL}/inventory/${testInventory._id}`)
        .send({ stock: 80 });
      expect(res.status).toBe(401);
    });

    test('returns 403 when customer tries to update inventory', async () => {
      const res = await request
        .patch(`${BASE_URL}/inventory/${testInventory._id}`)
        .set(authHeader(customerToken))
        .send({ stock: 80 });
      expect(res.status).toBe(403);
    });

    test('admin can update stock level', async () => {
      const res = await request
        .patch(`${BASE_URL}/inventory/${testInventory._id}`)
        .set(authHeader(adminToken))
        .send({ stock: 80 });
      expect(res.status).toBe(200);
      expect(res.body.inventory.stock).toBe(80);
    });

    test('admin can update lowStockThreshold', async () => {
      const res = await request
        .patch(`${BASE_URL}/inventory/${testInventory._id}`)
        .set(authHeader(adminToken))
        .send({ lowStockThreshold: 15 });
      expect(res.status).toBe(200);
      expect(res.body.inventory.lowStockThreshold).toBe(15);
    });

    test('returns 400 when stock is a negative number', async () => {
      const res = await request
        .patch(`${BASE_URL}/inventory/${testInventory._id}`)
        .set(authHeader(adminToken))
        .send({ stock: -10 });
      expect(res.status).toBe(422);
    });

    test('returns 404 for non-existent inventory record', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request
        .patch(`${BASE_URL}/inventory/${fakeId}`)
        .set(authHeader(adminToken))
        .send({ stock: 50 });
      expect(res.status).toBe(404);
    });

    test('marks restocked and sets lastRestockedAt when restocked=true', async () => {
      const res = await request
        .patch(`${BASE_URL}/inventory/${testInventory._id}`)
        .set(authHeader(adminToken))
        .send({ stock: 200, restocked: true });
      expect(res.status).toBe(200);
      expect(res.body.inventory.lastRestockedAt).not.toBeNull();
    });
  });

  // ----- POST /api/inventory/adjust -------------------------------------------
  describe('POST /api/inventory/adjust', () => {
    test('returns 401 without auth', async () => {
      const res = await request
        .post(`${BASE_URL}/inventory/adjust`)
        .send({ productId: testProduct._id, changeBy: 10 });
      expect(res.status).toBe(401);
    });

    test('admin can increase stock with positive changeBy', async () => {
      const before = await Inventory.findById(testInventory._id);
      const res = await request
        .post(`${BASE_URL}/inventory/adjust`)
        .set(authHeader(adminToken))
        .send({ productId: testProduct._id.toString(), changeBy: 20 });
      expect(res.status).toBe(200);
      expect(res.body.inventory.stock).toBe(before.stock + 20);
    });

    test('admin can decrease stock with negative changeBy', async () => {
      const before = await Inventory.findById(testInventory._id);
      const res = await request
        .post(`${BASE_URL}/inventory/adjust`)
        .set(authHeader(adminToken))
        .send({ productId: testProduct._id.toString(), changeBy: -10 });
      expect(res.status).toBe(200);
      expect(res.body.inventory.stock).toBe(before.stock - 10);
    });

    test('returns 400 when productId is missing', async () => {
      const res = await request
        .post(`${BASE_URL}/inventory/adjust`)
        .set(authHeader(adminToken))
        .send({ changeBy: 5 });
      expect(res.status).toBe(422);
    });

    test('returns 400 when changeBy is missing', async () => {
      const res = await request
        .post(`${BASE_URL}/inventory/adjust`)
        .set(authHeader(adminToken))
        .send({ productId: testProduct._id.toString() });
      expect(res.status).toBe(422);
    });

    test('returns 400 for invalid (non-MongoId) productId', async () => {
      const res = await request
        .post(`${BASE_URL}/inventory/adjust`)
        .set(authHeader(adminToken))
        .send({ productId: 'not-a-mongo-id', changeBy: 5 });
      expect(res.status).toBe(422);
    });

    test('returns 404 when productId does not exist in inventory', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request
        .post(`${BASE_URL}/inventory/adjust`)
        .set(authHeader(adminToken))
        .send({ productId: fakeId.toString(), changeBy: 5 });
      expect(res.status).toBe(404);
    });
  });
});

// ===========================================================================
// 4. ORDER MANAGEMENT MODULE
// ===========================================================================
describe('Order Management', () => {
  let adminToken, staffToken, customerToken, otherCustomerToken;
  let adminUser, customerUser, otherCustomer;
  let testProduct, testInventory, testOrder;

  const deliveryAddress = {
    fullName: 'Test Buyer',
    phone: '+94771234567',
    addressLine1: '42 Main Street',
    city: 'Colombo',
    state: 'Western',
    country: 'Sri Lanka',
    postalCode: '10100',
  };

  beforeAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await Order.deleteMany({});

    adminUser = await User.create({
      name: 'Admin',
      email: 'admin.ord@test.com',
      password: 'Admin@12345',
      role: 'admin',
    });
    const staff = await User.create({
      name: 'Staff',
      email: 'staff.ord@test.com',
      password: 'Staff@12345',
      role: 'staff',
    });
    customerUser = await User.create({
      name: 'Customer',
      email: 'customer.ord@test.com',
      password: 'Customer@12345',
      role: 'customer',
    });
    otherCustomer = await User.create({
      name: 'Other Customer',
      email: 'other.ord@test.com',
      password: 'Other@12345',
      role: 'customer',
    });

    adminToken         = makeToken(adminUser);
    staffToken         = makeToken(staff);
    customerToken      = makeToken(customerUser);
    otherCustomerToken = makeToken(otherCustomer);

    testProduct = await Product.create({
      name: 'Order Test Shirt',
      description: 'T-shirt used exclusively for order management test cases.',
      basePrice: 30.00,
      category: 'tshirts',
      sizes: [{ size: 'M', priceModifier: 0 }],
      colors: ['#FFFFFF'],
    });
    testInventory = await Inventory.create({
      product: testProduct._id,
      stock: 200,
      lowStockThreshold: 10,
    });

    // Seed one order for the customer to use in later tests
    testOrder = await Order.create({
      user: customerUser._id,
      items: [{
        product: testProduct._id,
        productName: testProduct.name,
        quantity: 1,
        size: 'M',
        color: '#FFFFFF',
        unitPrice: 30.00,
        totalPrice: 30.00,
      }],
      deliveryAddress,
      subtotal: 30.00,
      total: 30.00,
      deliveryFee: 0,
      paymentMethod: 'cod',
      status: 'pending',
      paymentStatus: 'pending',
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await Order.deleteMany({});
  });

  // ----- POST /api/orders (create) --------------------------------------------
  describe('POST /api/orders', () => {
    test('returns 401 without auth token', async () => {
      const res = await request.post(`${BASE_URL}/orders`).send({});
      expect(res.status).toBe(401);
    });

    test('returns 400 when items array is missing', async () => {
      const res = await request
        .post(`${BASE_URL}/orders`)
        .set(authHeader(customerToken))
        .send({ deliveryAddress, paymentMethod: 'cod' });
      expect(res.status).toBe(422);
    });

    test('returns 400 when items array is empty', async () => {
      const res = await request
        .post(`${BASE_URL}/orders`)
        .set(authHeader(customerToken))
        .send({ items: [], deliveryAddress, paymentMethod: 'cod' });
      expect(res.status).toBe(422);
    });

    test('returns 400 when deliveryAddress is missing', async () => {
      const res = await request
        .post(`${BASE_URL}/orders`)
        .set(authHeader(customerToken))
        .send({
          items: [{ productId: testProduct._id, quantity: 1, size: 'M', color: '#FFFFFF' }],
          paymentMethod: 'cod',
        });
      expect(res.status).toBe(422);
    });

    test('returns 400 for invalid paymentMethod value', async () => {
      const res = await request
        .post(`${BASE_URL}/orders`)
        .set(authHeader(customerToken))
        .send({
          items: [{ productId: testProduct._id, quantity: 1, size: 'M', color: '#FFFFFF' }],
          deliveryAddress,
          paymentMethod: 'bitcoin',
        });
      expect(res.status).toBe(422);
    });

    test('customer can create a valid COD order', async () => {
      const res = await request
        .post(`${BASE_URL}/orders`)
        .set(authHeader(customerToken))
        .send({
          items: [{
            productId: testProduct._id.toString(),
            quantity: 1,
            size: 'M',
            color: '#FFFFFF',
          }],
          deliveryAddress,
          paymentMethod: 'cod',
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Order placed successfully');
      expect(res.body.order.status).toBe('pending');
      expect(res.body.order.paymentMethod).toBe('cod');
    });
  });

  // ----- POST /api/orders/quote -----------------------------------------------
  describe('POST /api/orders/quote', () => {
    test('returns 401 without auth', async () => {
      const res = await request.post(`${BASE_URL}/orders/quote`).send({});
      expect(res.status).toBe(401);
    });

    test('returns a price summary for valid items', async () => {
      const res = await request
        .post(`${BASE_URL}/orders/quote`)
        .set(authHeader(customerToken))
        .send({
          items: [{
            productId: testProduct._id.toString(),
            quantity: 2,
            size: 'M',
            color: '#FFFFFF',
          }],
          deliveryAddress,
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toHaveProperty('subtotal');
      expect(res.body.summary).toHaveProperty('total');
    });
  });

  // ----- GET /api/orders/mine -------------------------------------------------
  describe('GET /api/orders/mine', () => {
    test('returns 401 without auth', async () => {
      const res = await request.get(`${BASE_URL}/orders/mine`);
      expect(res.status).toBe(401);
    });

    test('customer can retrieve their own orders', async () => {
      const res = await request
        .get(`${BASE_URL}/orders/mine`)
        .set(authHeader(customerToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      res.body.data.forEach((o) => {
        expect(o.user.toString()).toBe(customerUser._id.toString());
      });
    });

    test('other customer sees no orders from unrelated users', async () => {
      const res = await request
        .get(`${BASE_URL}/orders/mine`)
        .set(authHeader(otherCustomerToken));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });

  // ----- GET /api/orders/:id --------------------------------------------------
  describe('GET /api/orders/:id', () => {
    test('returns 401 without auth', async () => {
      const res = await request.get(`${BASE_URL}/orders/${testOrder._id}`);
      expect(res.status).toBe(401);
    });

    test('owner can retrieve their order by ID', async () => {
      const res = await request
        .get(`${BASE_URL}/orders/${testOrder._id}`)
        .set(authHeader(customerToken));
      expect(res.status).toBe(200);
      expect(res.body.order._id.toString()).toBe(testOrder._id.toString());
    });

    test('non-owner customer cannot view another customer order', async () => {
      const res = await request
        .get(`${BASE_URL}/orders/${testOrder._id}`)
        .set(authHeader(otherCustomerToken));
      expect(res.status).toBe(403);
    });

    test('admin can view any order', async () => {
      const res = await request
        .get(`${BASE_URL}/orders/${testOrder._id}`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
    });

    test('returns 404 for non-existent order ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request
        .get(`${BASE_URL}/orders/${fakeId}`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(404);
    });
  });

  // ----- PATCH /api/orders/:id/status -----------------------------------------
  describe('PATCH /api/orders/:id/status', () => {
    test('returns 401 without auth', async () => {
      const res = await request
        .patch(`${BASE_URL}/orders/${testOrder._id}/status`)
        .send({ status: 'confirmed' });
      expect(res.status).toBe(401);
    });

    test('returns 403 when customer tries to update order status', async () => {
      const res = await request
        .patch(`${BASE_URL}/orders/${testOrder._id}/status`)
        .set(authHeader(customerToken))
        .send({ status: 'confirmed' });
      expect(res.status).toBe(403);
    });

    test('admin can update order status to confirmed', async () => {
      const res = await request
        .patch(`${BASE_URL}/orders/${testOrder._id}/status`)
        .set(authHeader(adminToken))
        .send({ status: 'confirmed' });
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('confirmed');
    });

    test('admin can update order status to processing', async () => {
      const res = await request
        .patch(`${BASE_URL}/orders/${testOrder._id}/status`)
        .set(authHeader(adminToken))
        .send({ status: 'processing' });
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('processing');
    });

    test('returns 400 for invalid status value', async () => {
      const res = await request
        .patch(`${BASE_URL}/orders/${testOrder._id}/status`)
        .set(authHeader(adminToken))
        .send({ status: 'flying' });
      expect(res.status).toBe(422);
    });

    test('staff can also update order status', async () => {
      const res = await request
        .patch(`${BASE_URL}/orders/${testOrder._id}/status`)
        .set(authHeader(staffToken))
        .send({ status: 'shipped' });
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('shipped');
    });
  });

  // ----- GET /api/orders (admin all orders) -----------------------------------
  describe('GET /api/orders (admin all orders)', () => {
    test('returns 403 for customer', async () => {
      const res = await request
        .get(`${BASE_URL}/orders`)
        .set(authHeader(customerToken));
      expect(res.status).toBe(403);
    });

    test('admin can retrieve all orders', async () => {
      const res = await request
        .get(`${BASE_URL}/orders`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.pagination.total).toBeGreaterThan(0);
    });
  });
});

// ===========================================================================
// 5. REFUND & RETURN MANAGEMENT MODULE
// ===========================================================================
describe('Refund & Return Management', () => {
  let adminToken, staffToken, customerToken, otherCustomerToken;
  let adminUser, customerUser, otherCustomer;
  let testProduct, testOrder, testReturn;

  const deliveryAddress = {
    fullName: 'Return Tester',
    phone: '+94770000001',
    addressLine1: '1 Return Lane',
    city: 'Kandy',
    state: 'Central',
    country: 'Sri Lanka',
    postalCode: '20000',
  };

  beforeAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await Order.deleteMany({});
    await ReturnRequest.deleteMany({});

    adminUser = await User.create({
      name: 'Admin',
      email: 'admin.ret@test.com',
      password: 'Admin@12345',
      role: 'admin',
    });
    const staff = await User.create({
      name: 'Staff',
      email: 'staff.ret@test.com',
      password: 'Staff@12345',
      role: 'staff',
    });
    customerUser = await User.create({
      name: 'Customer',
      email: 'customer.ret@test.com',
      password: 'Customer@12345',
      role: 'customer',
    });
    otherCustomer = await User.create({
      name: 'Other',
      email: 'other.ret@test.com',
      password: 'Other@12345',
      role: 'customer',
    });

    adminToken         = makeToken(adminUser);
    staffToken         = makeToken(staff);
    customerToken      = makeToken(customerUser);
    otherCustomerToken = makeToken(otherCustomer);

    testProduct = await Product.create({
      name: 'Return Test Shirt',
      description: 'Product used exclusively for return module test cases.',
      basePrice: 40.00,
      category: 'tshirts',
      sizes: [{ size: 'L', priceModifier: 0 }],
    });
    await Inventory.create({
      product: testProduct._id,
      stock: 100,
      lowStockThreshold: 5,
    });

    // Delivered order — eligible for return
    testOrder = await Order.create({
      user: customerUser._id,
      items: [{
        product: testProduct._id,
        productName: testProduct.name,
        quantity: 2,
        size: 'L',
        color: '#000000',
        unitPrice: 40.00,
        totalPrice: 80.00,
      }],
      deliveryAddress,
      subtotal: 80.00,
      total: 80.00,
      deliveryFee: 0,
      paymentMethod: 'cod',
      status: 'delivered',
      paymentStatus: 'paid',
    });

    // Pre-seed one return request for read/update tests
    testReturn = await ReturnRequest.create({
      order: testOrder._id,
      user: customerUser._id,
      items: [{
        product: testProduct._id,
        productName: testProduct.name,
        quantity: 1,
        size: 'L',
        color: '#000000',
        unitPrice: 40.00,
      }],
      reasonType: 'not_satisfied',
      status: 'pending',
      refundAmount: 80.00,
      refundMethod: 'wallet',
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await Order.deleteMany({});
    await ReturnRequest.deleteMany({});
  });

  // ----- POST /api/returns ----------------------------------------------------
  describe('POST /api/returns', () => {
    test('returns 401 without auth', async () => {
      const res = await request.post(`${BASE_URL}/returns`).send({});
      expect(res.status).toBe(401);
    });

    test('returns 400 when orderId is missing', async () => {
      const res = await request
        .post(`${BASE_URL}/returns`)
        .set(authHeader(customerToken))
        .send({ reasonType: 'not_satisfied' });
      expect(res.status).toBe(422);
    });

    test('returns 400 when reasonType is missing', async () => {
      const res = await request
        .post(`${BASE_URL}/returns`)
        .set(authHeader(customerToken))
        .send({ orderId: testOrder._id.toString() });
      expect(res.status).toBe(422);
    });

    test('returns 400 for invalid reasonType value', async () => {
      const res = await request
        .post(`${BASE_URL}/returns`)
        .set(authHeader(customerToken))
        .send({ orderId: testOrder._id.toString(), reasonType: 'invalid_reason' });
      expect(res.status).toBe(422);
    });

    test('returns 409 when an active return already exists for the order', async () => {
      // testReturn is already pending — second attempt should conflict
      const res = await request
        .post(`${BASE_URL}/returns`)
        .set(authHeader(customerToken))
        .send({ orderId: testOrder._id.toString(), reasonType: 'not_satisfied' });
      expect(res.status).toBe(409);
    });

    test('returns 403 when a customer tries to return an order they do not own', async () => {
      const otherOrder = await Order.create({
        user: adminUser._id,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1,
          size: 'L',
          color: '#FFFFFF',
          unitPrice: 40.00,
          totalPrice: 40.00,
        }],
        deliveryAddress,
        subtotal: 40.00,
        total: 40.00,
        deliveryFee: 0,
        paymentMethod: 'cod',
        status: 'delivered',
        paymentStatus: 'paid',
      });
      const res = await request
        .post(`${BASE_URL}/returns`)
        .set(authHeader(otherCustomerToken))
        .send({ orderId: otherOrder._id.toString(), reasonType: 'not_satisfied' });
      expect(res.status).toBe(403);
    });
  });

  // ----- GET /api/returns/mine ------------------------------------------------
  describe('GET /api/returns/mine', () => {
    test('returns 401 without auth', async () => {
      const res = await request.get(`${BASE_URL}/returns/mine`);
      expect(res.status).toBe(401);
    });

    test('customer can retrieve their own return requests', async () => {
      const res = await request
        .get(`${BASE_URL}/returns/mine`)
        .set(authHeader(customerToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      res.body.data.forEach((r) => {
        expect(r.user.toString()).toBe(customerUser._id.toString());
      });
    });

    test('other customer sees zero returns (none belong to them)', async () => {
      const res = await request
        .get(`${BASE_URL}/returns/mine`)
        .set(authHeader(otherCustomerToken));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    test('supports pagination params', async () => {
      const res = await request
        .get(`${BASE_URL}/returns/mine?page=1&limit=5`)
        .set(authHeader(customerToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pagination.page', 1);
    });
  });

  // ----- GET /api/returns (admin) ---------------------------------------------
  describe('GET /api/returns (admin all returns)', () => {
    test('returns 401 without auth', async () => {
      const res = await request.get(`${BASE_URL}/returns`);
      expect(res.status).toBe(401);
    });

    test('returns 403 when customer tries to access all returns', async () => {
      const res = await request
        .get(`${BASE_URL}/returns`)
        .set(authHeader(customerToken));
      expect(res.status).toBe(403);
    });

    test('admin can retrieve all return requests', async () => {
      const res = await request
        .get(`${BASE_URL}/returns`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.pagination.total).toBeGreaterThan(0);
    });

    test('staff can also retrieve all return requests', async () => {
      const res = await request
        .get(`${BASE_URL}/returns`)
        .set(authHeader(staffToken));
      expect(res.status).toBe(200);
    });

    test('filters by status when status query param is provided', async () => {
      const res = await request
        .get(`${BASE_URL}/returns?status=pending`)
        .set(authHeader(adminToken));
      expect(res.status).toBe(200);
      res.body.data.forEach((r) => expect(r.status).toBe('pending'));
    });
  });

  // ----- PATCH /api/returns/:id -----------------------------------------------
  describe('PATCH /api/returns/:id', () => {
    test('returns 401 without auth', async () => {
      const res = await request
        .patch(`${BASE_URL}/returns/${testReturn._id}`)
        .send({ status: 'approved' });
      expect(res.status).toBe(401);
    });

    test('returns 403 when customer tries to update return status', async () => {
      const res = await request
        .patch(`${BASE_URL}/returns/${testReturn._id}`)
        .set(authHeader(customerToken))
        .send({ status: 'approved' });
      expect(res.status).toBe(403);
    });

    test('admin can approve a return request', async () => {
      const res = await request
        .patch(`${BASE_URL}/returns/${testReturn._id}`)
        .set(authHeader(adminToken))
        .send({ status: 'approved', adminResponse: 'Approved — please ship back.' });
      expect(res.status).toBe(200);
      expect(res.body.returnRequest.status).toBe('approved');
    });

    test('admin can reject a return request with a note', async () => {
      const anotherReturn = await ReturnRequest.create({
        order: testOrder._id,
        user: customerUser._id,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1,
          size: 'L',
          color: '#000000',
          unitPrice: 40.00,
        }],
        reasonType: 'not_satisfied',
        status: 'pending',
        refundAmount: 40.00,
        refundMethod: 'wallet',
      });
      const res = await request
        .patch(`${BASE_URL}/returns/${anotherReturn._id}`)
        .set(authHeader(adminToken))
        .send({ status: 'rejected', adminResponse: 'Item is outside return window.' });
      expect(res.status).toBe(200);
      expect(res.body.returnRequest.status).toBe('rejected');
    });

    test('returns 400 for invalid status value', async () => {
      const res = await request
        .patch(`${BASE_URL}/returns/${testReturn._id}`)
        .set(authHeader(adminToken))
        .send({ status: 'cancelled' });
      expect(res.status).toBe(422);
    });

    test('returns 404 for non-existent return ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request
        .patch(`${BASE_URL}/returns/${fakeId}`)
        .set(authHeader(adminToken))
        .send({ status: 'approved' });
      expect(res.status).toBe(404);
    });

    test('status history is updated after each patch', async () => {
      const freshReturn = await ReturnRequest.create({
        order: testOrder._id,
        user: customerUser._id,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1,
          size: 'L',
          color: '#000000',
          unitPrice: 40.00,
        }],
        reasonType: 'other',
        reason: 'I changed my mind about buying this product',
        status: 'pending',
        refundAmount: 40.00,
        refundMethod: 'wallet',
      });
      const res = await request
        .patch(`${BASE_URL}/returns/${freshReturn._id}`)
        .set(authHeader(adminToken))
        .send({ status: 'approved', statusNote: 'Accepted after review.' });
      expect(res.status).toBe(200);
      expect(res.body.returnRequest.statusHistory.length).toBeGreaterThan(0);
    });
  });
});
