import { RoleInput } from "../../interfaces/role.interface";
import { Role } from "./role.model";

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
