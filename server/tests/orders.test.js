import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../index.js"; 
import * as orderStore from "../services/orderStore.js";

// Mock the orderStore so we don't need a real MongoDB connection to run unit tests
vi.mock("../services/orderStore.js", () => ({
  listOrders: vi.fn(),
  getOrderById: vi.fn(),
  updateOrderRecord: vi.fn(),
}));

// We must also mock authentication, but for our simple tests we can just test if the endpoint strictly rejects unauthorized traffic!
describe("Order API Routes", () => {
  it("should block unauthenticated access to the Admin getOrders route (/api/orders)", async () => {
    const res = await request(app).get("/api/orders");
    // Without an Admin token, it should reject immediately with 401
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/Authentication required/i);
  });
});
