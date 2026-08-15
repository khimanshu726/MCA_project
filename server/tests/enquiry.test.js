import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Enquiry } from "../models/Enquiry.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("enquiry-test"));
});

afterEach(async () => {
  await Enquiry.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const valid = {
  institutionName: "St. Xavier's College",
  institutionType: "college",
  contactName: "A. Fernandes",
  email: "procurement@stx.edu",
  phone: "9876543210",
  requirements: "5000 answer booklets, 20 attendance registers",
  message: "Needed before term start.",
};

describe("POST /api/enquiries", () => {
  it("creates an enquiry from valid data and returns 201 with an id", async () => {
    const response = await request(app).post("/api/enquiries").send(valid).expect(201);
    expect(response.body.id).toBeTruthy();

    const saved = await Enquiry.findOne({ email: "procurement@stx.edu" }).lean();
    expect(saved.institutionName).toBe("St. Xavier's College");
    expect(saved.institutionType).toBe("college");
    expect(saved.requirements).toContain("answer booklets");
    expect(saved.status).toBe("new"); // default lifecycle state
  });

  it("rejects missing required fields with 400 + field errors, persisting nothing", async () => {
    const response = await request(app).post("/api/enquiries").send({ phone: "123" }).expect(400);
    expect(response.body.errors.institutionName).toBeTruthy();
    expect(response.body.errors.contactName).toBeTruthy();
    expect(response.body.errors.email).toBeTruthy();
    expect(response.body.errors.requirements).toBeTruthy();
    expect(await Enquiry.countDocuments()).toBe(0);
  });

  it("rejects an invalid email", async () => {
    const response = await request(app)
      .post("/api/enquiries")
      .send({ ...valid, email: "not-an-email" })
      .expect(400);
    expect(response.body.errors.email).toBeTruthy();
    expect(await Enquiry.countDocuments()).toBe(0);
  });

  it("is public (no auth) and coerces an unknown institutionType to 'other'", async () => {
    await request(app).post("/api/enquiries").send({ ...valid, institutionType: "hogwarts" }).expect(201);
    const saved = await Enquiry.findOne({}).lean();
    expect(saved.institutionType).toBe("other");
  });
});
