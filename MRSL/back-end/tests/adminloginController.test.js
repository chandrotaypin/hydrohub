// tests/adminloginController.test.js
import { jest } from '@jest/globals';

// ── ESM-compatible mocking ────────────────────────────────────────────────────

const mockAdmin = {
  findFirst:  jest.fn(),
  findUnique: jest.fn(),
  create:     jest.fn(),
};

await jest.unstable_mockModule("../config/db.js", () => ({
  prisma: { admin: mockAdmin },
}));

await jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash:    jest.fn(),
    compare: jest.fn(),
  }
}));

await jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: jest.fn(),
  }
}));

// Dynamic imports — must come after unstable_mockModule calls
const { setupAdmin, adminLogin } = await import("../controller/adminloginController.js");
const bcrypt = (await import("bcrypt")).default;
const jwt    = (await import("jsonwebtoken")).default;

// ─────────────────────────────────────────────────────────────────────────────

describe("setupAdmin", () => {

  beforeEach(() => jest.clearAllMocks());

  test("returns 400 if username is missing", async () => {
    const req = { body: { password: "secret123" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await setupAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  test("returns 400 if password is missing", async () => {
    const req = { body: { username: "admin" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await setupAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 409 if admin already exists", async () => {
    mockAdmin.findFirst.mockResolvedValue({ id: 1, username: "admin" });

    const req = { body: { username: "admin", password: "secret123" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await setupAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Admin account already exists." })
    );
  });

  test("returns 201 and creates admin if none exists", async () => {
    mockAdmin.findFirst.mockResolvedValue(null);    // no existing admin
    bcrypt.hash.mockResolvedValue("hashedpassword");
    mockAdmin.create.mockResolvedValue({
      id: 1,
      username: "admin",
      createdAt: new Date(),
    });

    const req = { body: { username: "admin", password: "secret123" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await setupAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
    // Verify password was hashed with cost factor 10
    expect(bcrypt.hash).toHaveBeenCalledWith("secret123", 10);
  });

});

// ─────────────────────────────────────────────────────────────────────────────

describe("adminLogin", () => {

  beforeEach(() => jest.clearAllMocks());

  test("returns 400 if username is missing", async () => {
    const req = { body: { password: "secret123" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await adminLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 if password is missing", async () => {
    const req = { body: { username: "admin" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await adminLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 401 if admin username does not exist", async () => {
    mockAdmin.findUnique.mockResolvedValue(null);

    const req = { body: { username: "wronguser", password: "secret123" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await adminLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid credentials." })
    );
  });

  test("returns 401 if password is wrong", async () => {
    mockAdmin.findUnique.mockResolvedValue({
      id: 1, username: "admin", passwordHash: "hashedpassword"
    });
    bcrypt.compare.mockResolvedValue(false); // wrong password

    const req = { body: { username: "admin", password: "wrongpassword" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await adminLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid credentials." })
    );
  });

  test("returns 200 and a token on valid credentials", async () => {
    mockAdmin.findUnique.mockResolvedValue({
      id: 1, username: "admin", passwordHash: "hashedpassword"
    });
    bcrypt.compare.mockResolvedValue(true);          // correct password
    jwt.sign.mockReturnValue("mocked.jwt.token");    // fake token

    const req = { body: { username: "admin", password: "secret123" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await adminLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: "mocked.jwt.token",
      })
    );
    // Verify JWT was signed with admin's id, username and role
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ role: "admin", id: 1, username: "admin" }),
      process.env.JWT_SECRET,
      expect.any(Object)
    );
  });

});