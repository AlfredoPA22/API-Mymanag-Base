import { IRole, RoleInput } from "../../interfaces/role.interface";
import { User } from "../user/user.model";
import { Role } from "./role.model";
import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IRole[]> => {
  return await Role.find({
    company: companyId,
  })
    .populate("permission")
    .populate("company")
    .lean<IRole[]>();
};

export const listPermissionsByRole = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  roleId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<[]> => {
  const role: IRole | null = await Role.findOne({
    _id: roleId,
    company: companyId,
  }).lean<IRole>();

  return role?.permission || [];
};

export const create = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  roleInput: RoleInput
) => {
  const role = await Role.findOne({
    company: companyId,
    name: roleInput.name,
  });

  if (role) {
    throw new Error("El rol ya existe");
  }

  const newRole = await Role.create({ ...roleInput, company: companyId });

  return newRole;
};

export const deleteRole = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  roleId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const findUser = await User.find({
    company: companyId,
    role: roleId,
  });

  if (findUser.length > 0) {
    throw new Error("No se puede eliminar porque pertenece a un usuario");
  }

  const deleted = await Role.deleteOne({
    _id: roleId,
    company: companyId,
  });

  return {
    success: deleted.deletedCount > 0,
  };
};
