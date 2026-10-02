import Property from "../src/models/Property";
import {
  updateProperty
} from "../src/services/propertyService";

jest.mock("../src/models/Property", () => ({
  update: jest.fn(),
  findOne: jest.fn()
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

describe("Optimistic Locking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update a property when the version matches", async () => {
    (Property.update as jest.Mock).mockResolvedValue([1]);

    const updatedProperty = {
      id: "property-1",
      tenantId: "tenant-1",
      version: 2
    };

    (Property.findOne as jest.Mock).mockResolvedValue(
      updatedProperty
    );

    const result = await updateProperty(
      "tenant-1",
      "admin-1",
      "ADMIN",
      "property-1",
      {
        title: "Updated Property",
        version: 1
      }
    );

    expect(Property.update).toHaveBeenCalledWith(
      {
        title: "Updated Property",
        version: 2
      },
      {
        where: {
          id: "property-1",
          tenantId: "tenant-1",
          version: 1
        }
      }
    );

    expect(result).toEqual(updatedProperty);
  });

  it("should throw an optimistic lock error when the version is stale", async () => {
    (Property.update as jest.Mock).mockResolvedValue([0]);

    (Property.findOne as jest.Mock).mockResolvedValue({
      id: "property-1",
      tenantId: "tenant-1",
      version: 2
    });

    await expect(
      updateProperty(
        "tenant-1",
        "admin-1",
        "ADMIN",
        "property-1",
        {
          title: "Updated Property",
          version: 1
        }
      )
    ).rejects.toMatchObject({
      name: "OptimisticLockError"
    });
  });

  it("should not allow an agent to modify another agent property", async () => {
    (Property.update as jest.Mock).mockResolvedValue([0]);

    (Property.findOne as jest.Mock).mockResolvedValue({
      id: "property-1",
      tenantId: "tenant-1",
      assigneeId: "agent-2",
      version: 2
    });

    await expect(
      updateProperty(
        "tenant-1",
        "agent-1",
        "AGENT",
        "property-1",
        {
          title: "Updated Property",
          version: 1
        }
      )
    ).rejects.toMatchObject({
      name: "ForbiddenError"
    });
  });
});