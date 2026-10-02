import request from "supertest";
import app from "../src/app";

describe("Property API", () => {
  it.each([
    "https://customer-relationship-management-sy-nine.vercel.app",
    "https://customer-relationship-management-system-b7qvwpq7c.vercel.app",
    "https://customer-relationship-managemen-git-5f3c3d-sudhamaybala240-cmyk.vercel.app",
    "https://customer-relationship-management-system-exb9ik7hu.vercel.app",
  ])("allows browser requests from %s", async (origin) => {
    const response = await request(app)
      .options("/api/properties")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "GET");

    expect(response.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("should report that the API is not ready before database initialization", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      status: "database_unavailable",
    });
  });

  it("should reject requests without authentication", async () => {
    const response = await request(app)
      .get("/api/properties");

    expect(response.status).toBe(401);
  });

  it("should reject property creation without authentication", async () => {
    const response = await request(app)
      .post("/api/properties")
      .send({
        title: "Test Property",
        listingType: "SALE",
        bhk: 2,
        area: 1000,
        price: 5000000,
        buildingName: "Test Building",
        unitNo: "101"
      });

    expect(response.status).toBe(401);
  });

  it("should reject property update without authentication", async () => {
    const response = await request(app)
      .put("/api/properties/test-id")
      .send({
        title: "Updated Property",
        version: 1
      });

    expect(response.status).toBe(401);
  });

  it("should reject property deletion without authentication", async () => {
    const response = await request(app)
      .delete("/api/properties/test-id");

    expect(response.status).toBe(401);
  });
});