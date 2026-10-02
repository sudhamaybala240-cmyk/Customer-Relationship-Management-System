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

  const userColumns = await queryInterface.describeTable("users");
  if (!userColumns.tenantId) {
    await queryInterface.addColumn("users", "tenantId", {
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
};