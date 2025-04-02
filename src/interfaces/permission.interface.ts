export interface IPermission {
  label: string;
  name: string;
  value: string;
  children?: IPermission[];
}

export interface PermissionInput {
  name: string;
  description?: string;
}
