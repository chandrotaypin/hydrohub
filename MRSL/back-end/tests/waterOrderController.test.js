// tests/waterOrderController.test.js
import { jest } from '@jest/globals';

// ── ESM-compatible mocking ────────────────────────────────────────────────────

const mockWaterOrder = {
  create:     jest.fn(),
  findUnique: jest.fn(),
  update:     jest.fn(),
};

await jest.unstable_mockModule("../config/db.js", () => ({
  prisma: { waterOrder: mockWaterOrder },
}));

await jest.unstable_mockModule("../utils/mailer.js", () => ({
  sendReadyNotification: jest.fn(),
}));

// Dynamic imports — must come after unstable_mockModule calls
const { createWaterOrder, updateWaterOrderStatus } = await import("../controller/waterOrderController.js");

// ─────────────────────────────────────────────────────────────────────────────

describe("createWaterOrder", () => {

  beforeEach(() => jest.clearAllMocks());

  test("returns 400 if customerName is missing", async () => {
    const req = { body: { serviceType: "refill", quantity: 2 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createWaterOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  test("returns 400 for invalid serviceType", async () => {
    const req = { body: { customerName: "Jane", serviceType: "steam", quantity: 1 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createWaterOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 if quantity is zero", async () => {
    const req = { body: { customerName: "Jane", serviceType: "refill", quantity: 0 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createWaterOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("calculates totalPrice correctly for new_container", async () => {
    mockWaterOrder.create.mockResolvedValue({
      id: 1, customerName: "Jane", serviceType: "NEW_CONTAINER", quantity: 2, totalPrice: 260
    });

    const req = { body: { customerName: "Jane", serviceType: "new_container", quantity: 2 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createWaterOrder(req, res);

    // 2 × ₱130 = ₱260
    expect(mockWaterOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalPrice: 260 }) })
    );
  });

});

// ─────────────────────────────────────────────────────────────────────────────

describe("updateWaterOrderStatus — transition guard", () => {

  beforeEach(() => jest.clearAllMocks());

  test("rejects skipping from PENDING to CLAIMED", async () => {
    mockWaterOrder.findUnique.mockResolvedValue({ id: 1, status: "PENDING" });

    const req = { params: { id: "1" }, body: { status: "CLAIMED" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateWaterOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("accepts PENDING → READY", async () => {
    mockWaterOrder.findUnique.mockResolvedValue({ id: 1, status: "PENDING" });
    mockWaterOrder.update.mockResolvedValue({ id: 1, status: "READY", email: null });

    const req = { params: { id: "1" }, body: { status: "READY" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateWaterOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("accepts READY → CLAIMED", async () => {
    mockWaterOrder.findUnique.mockResolvedValue({ id: 1, status: "READY" });
    mockWaterOrder.update.mockResolvedValue({ id: 1, status: "CLAIMED", email: null });

    const req = { params: { id: "1" }, body: { status: "CLAIMED" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await updateWaterOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

});