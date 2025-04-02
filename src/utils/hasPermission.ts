import { Role } from "../modules/role/role.model";

export const hasPermission = async (
  roleName: string,
  permissionNames: string[]
): Promise<boolean> => {
  const role = await Role.findOne({ name: roleName }).populate("permission");

  if (!role) {
    throw new Error("Rol no encontrado.");
  }

  const hasPermission = permissionNames.some((permission) =>
    role.permission.includes(permission)
  );

  if (!hasPermission) {
    throw new Error(`El rol ${roleName} no tiene permiso para esta accion`);
  }

  return hasPermission;
};
