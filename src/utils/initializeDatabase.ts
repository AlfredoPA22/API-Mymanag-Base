import { Role } from "../modules/role/role.model";
import { User } from "../modules/user/user.model";

export const initializeDatabase = async () => {
  try {
    const roleAdminExists = await Role.findOne({ name: "Admin" });
    if (!roleAdminExists) {
      const roleCreated = await Role.create({
        name: "Admin",
        description: "Administrador del sistema",
        permission: [
          "LIST_AND_CREATE_BRAND",
          "DELETE_BRAND",
          "UPDATE_BRAND",
          "LIST_AND_CREATE_CATEGORY",
          "DELETE_CATEGORY",
          "UPDATE_CATEGORY",
          "LIST_AND_CREATE_CLIENT",
          "LIST_SALE_ORDER_BY_CLIENT",
          "DELETE_CLIENT",
          "UPDATE_CLIENT",
          "SEARCH_PRODUCT",
          "GENERAL_DATA",
          "LIST_AND_CREATE_PRODUCT",
          "FIND_PRODUCT",
          "LIST_PRODUCT_SERIAL_BY_PRODUCT",
          "DELETE_PRODUCT",
          "UPDATE_PRODUCT",
          "LIST_AND_CREATE_PROVIDER",
          "DELETE_PROVIDER",
          "UPDATE_PROVIDER",
          "LIST_AND_CREATE_PURCHASE",
          "DETAIL_PURCHASE",
          "EDIT_PURCHASE",
          "DELETE_PURCHASE",
          "LIST_AND_CREATE_SALE",
          "DETAIL_SALE",
          "EDIT_SALE",
          "DELETE_SALE",
          "USER_AND_ROLE",
        ],
      });

      const adminExists = await User.findOne({ role: roleCreated._id });

      if (!adminExists) {
        await User.create({
          user_name: process.env.USER_NAME_ADMIN,
          password: process.env.PASSWORD_ADMIN,
          role: roleCreated._id,
        });
      }
    } else {
      const adminExists = await User.findOne({ role: roleAdminExists._id });
      if (!adminExists) {
        await User.create({
          user_name: process.env.USER_NAME_ADMIN,
          password: process.env.PASSWORD_ADMIN,
          role: adminExists._id,
        });
      }
    }
  } catch (error) {
    console.error("Error inicializando la base de datos:", error);
  }
};
