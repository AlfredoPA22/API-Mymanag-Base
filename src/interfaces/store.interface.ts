export interface StoreCartItemInput {
  productId: string;
  quantity: number;
}

export interface StoreOrderInput {
  fullName: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  items: StoreCartItemInput[];
}

export interface IStoreOrderResult {
  _id: string;
  code: string;
  total: number;
  clientFullName: string;
}
