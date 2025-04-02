import {
  IPermission,
  PermissionInput,
} from "../../interfaces/permission.interface";
import { Permission } from "./permission.model";
import { PERMISSIONS_TREE } from "./utils/permissions";

export const create = async (permissionInput: PermissionInput) => {
  const permission = await Permission.findOne({
    name: permissionInput.name,
  });

  if (permission) {
    throw new Error("El permiso ya existe");
  }

  const newPermission = await Permission.create(permissionInput);

  return newPermission;
};

export const findAll = async (): Promise<IPermission[]> => {
  return PERMISSIONS_TREE;
};
