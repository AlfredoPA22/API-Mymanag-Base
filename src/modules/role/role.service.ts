import { IRole, RoleInput } from "../../interfaces/role.interface";
import { Role } from "./role.model";
import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";

export const findAll = async (): Promise<IRole[]> => {
  const listRole = await Role.find().populate("permission").lean<IRole[]>();

  return listRole;
};

export const listPermissionsByRole = async (
  roleId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<[]> => {
  const role: IRole | null = await Role.findById(roleId).lean<IRole>();

  return role.permission || [];
};

export const create = async (roleInput: RoleInput) => {
  const role = await Role.findOne({
    name: roleInput.name,
  });

  if (role) {
    throw new Error("El rol ya existe");
  }

  const newRole = await Role.create(roleInput);

  return newRole;
};
