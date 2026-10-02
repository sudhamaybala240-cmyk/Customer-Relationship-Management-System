import Property from "../src/models/Property";
import { createProperty } from "../src/services/propertyService";

jest.mock("../src/models/Property", () => ({
  create: jest.fn()
}));

jest.mock("../src/services/cacheService", () => ({
  invalidatePropertyCache: jest.fn().mockResolvedValue(undefined),
  getPropertyCacheKey: jest.fn(),
  getCachedData: jest.fn(),
  setCachedData: jest.fn()
}));

jest.mock("../src/services/propertyActivityService", () => ({
  createActivity: jest.fn().mockResolvedValue(undefined)
}));

describe("Duplicate Listing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a property with tenant scoped listing data", async () => {
    const property = {
      id: "property-1",
      tenantId: "tenant-1",
      buildingName: "Building A",
      unitNo: "101",
      version: 1
    };

    (Property.create as jest.Mock).mockResolvedValue(property);

    const result = await createProperty({
      tenantId: "tenant-1",
      title: "Property A",
      listingType: "SALE",
      bhk: 2,
      area: 1000,
      price: 5000000,
      buildingName: "Building A",
      unitNo: "101",
      ownerName: "Owner A",
      ownerPhone: "9000000000",
      assigneeId: "agent-1"
    });

    expect(Property.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        buildingName: "Building A",
        unitNo: "101",
        version: 1
      })
    );

    expect(result).toEqual(property);
  });

  it("should propagate duplicate listing errors", async () => {
    const error = new Error("Duplicate listing");

    (Property.create as jest.Mock).mockRejectedValue(error);

    await expect(
      createProperty({
        tenantId: "tenant-1",
        title: "Property A",
        listingType: "SALE",
        bhk: 2,
        area: 1000,
        price: 5000000,
        buildingName: "Building A",
        unitNo: "101"
      })
    ).rejects.toThrow("Duplicate listing");
  });
});