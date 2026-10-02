import { DataTypes } from "sequelize";
import sequelize from "../config/database";

export const ensureTenantProfileSchema = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable("tenant_profiles");

  if (!columns.crmTenantId) {
    await queryInterface.addColumn("tenant_profiles", "crmTenantId", {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
    });
  }

  if (!columns.isPlatform) {
    await queryInterface.addColumn("tenant_profiles", "isPlatform", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }
  if (!columns.slug) {
    await queryInterface.addColumn("tenant_profiles", "slug", {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    });
  }
  if (!columns.status) {
    await queryInterface.addColumn("tenant_profiles", "status", {
      type: DataTypes.ENUM("ACTIVE", "SUSPENDED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    });
  }
  if (!columns.createdAt) {
    await queryInterface.addColumn("tenant_profiles", "createdAt", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }
  if (!columns.updatedAt) {
    await queryInterface.addColumn("tenant_profiles", "updatedAt", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }

  const userColumns = await queryInterface.describeTable("users");
  const userIdColumn = userColumns.id;
  if (!userIdColumn) {
    throw new Error("The auth users table is missing its id column.");
  }
  if (!userIdColumn.autoIncrement) {
    await queryInterface.changeColumn("users", "id", {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      ...(!userIdColumn.primaryKey && { primaryKey: true }),
    });
  }
  if (!userColumns.tenantId) {
    await queryInterface.addColumn("users", "tenantId", {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    });
  }
  if (!userColumns.tenant_id) {
    await queryInterface.addColumn("users", "tenant_id", {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    });
  }
  if (!userColumns.passwordHash) {
    await queryInterface.addColumn("users", "passwordHash", {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  }
  if (!userColumns.createdAt) {
    await queryInterface.addColumn("users", "createdAt", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }
  if (!userColumns.updatedAt) {
    await queryInterface.addColumn("users", "updatedAt", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }
  if (!userColumns.status) {
    await queryInterface.addColumn("users", "status", {
      type: DataTypes.ENUM("ACTIVE", "DEACTIVATED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    });
  }
  if (!userColumns.lastLoginAt) {
    await queryInterface.addColumn("users", "lastLoginAt", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }

  const tenantColumns = await queryInterface.describeTable("tenants");
  if (!tenantColumns.name) {
    await queryInterface.addColumn("tenants", "name", {
      type: DataTypes.STRING(150),
      allowNull: true,
    });
  }
  if (!tenantColumns.createdAt) {
    await queryInterface.addColumn("tenants", "createdAt", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }
  if (!tenantColumns.updatedAt) {
    await queryInterface.addColumn("tenants", "updatedAt", {
      type: DataTypes.DATE,
      allowNull: true,
    });
  }
};
