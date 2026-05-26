// tests/orderController.test.js
import { jest } from '@jest/globals';

// ── ESM-compatible mocking ────────────────────────────────────────────────────
// jest.mock() does NOT work reliably with ESM — use unstable_mockModule instead.
// Dynamic imports must come AFTER the mock is registered.

const mockOrder = {
  create:     jest.fn(),
  findUnique: jest.fn(),
  update:     jest.fn(),
};

await jest.unstable_mockModule("../config/db.js", () => ({
  prisma: { order: mockOrder },
}));

await jest.unstable_mockModule("../utils/mailer.js", () => ({
  sendReadyNotification: jest.fn(),
}));

// Dynamic imports — must come after unstable_mockModule calls
const { createOrder, updateOrderStatus } = await import("../controller/orderController.js");

// ─────────────────────────────────────────────────────────────────────────────

describe("createOrder", () => {

  beforeEach(() => jest.clearAllMocks());

  test("returns 400 if customerName is missing", async () => {
    const req = { body: { email: "a@b.com", weight: 5, serviceType: "wash" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  test("returns 400 for invalid serviceType", async () => {
    const req = { body: { customerName: "John", email: "a@b.com", weight: 5, serviceType: "iron" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 if weight is negative", async () => {
    const req = { body: { customerName: "John", email: "a@b.com", weight: -1, serviceType: "wash" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("calculates totalPrice correctly for wash_dry_fold", async () => {
    mockOrder.create.mockResolvedValue({ id: 1, customerName: "John", totalPrice: 400 });

    const req = { body: { customerName: "John", email: "a@b.com", weight: 14, serviceType: "wash_dry_fold" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createOrder(req, res);

    // 14kg ÷ 8kg/load = 2 loads × ₱200 = ₱400
    expect(mockOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalPrice: 400 }) })
    );
  });

});

// ─────────────────────────────────────────────────────────────────────────────

describe("updateOrderStatus — transition guard", () => {

  beforeEach(() => jest.clearAllMocks());

  test("rejects skipping from PENDING to CLAIMED", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: 1, status: "PENDING" });

    const req = { params: { id: "1" }, body: { status: "CLAIMED" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("accepts PENDING → WASHING", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: 1, status: "PENDING" });
    mockOrder.update.mockResolvedValue({ id: 1, status: "WASHING", email: null });

    const req = { params: { id: "1" }, body: { status: "WASHING" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

});