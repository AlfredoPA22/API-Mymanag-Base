import { StoreCartItemInput } from "./store.interface";

export interface StoreRegisterInput {
  fullName: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  password: string;
}

export interface StoreUpdateProfileInput {
  fullName?: string;
  email?: string;
  address?: string;
}

export interface IStoreClient {
  _id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
}

export interface IStoreCartItem {
  productId: string;
  name: string;
  image: string;
  sale_price: number;
  stock: number;
  quantity: number;
}

export interface IStoreAuthResult {
  token: string;
  client: IStoreClient;
  cart: IStoreCartItem[];
}

export interface IStoreMeResult {
  client: IStoreClient;
  cart: IStoreCartItem[];
}

export interface IStoreOrderDetailItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  sale_price: number;
  subtotal: number;
}

export interface IStoreOrderDetailResult {
  code: string;
  date: string;
  status: string;
  total: number;
  is_paid: boolean;
  address: string;
  items: IStoreOrderDetailItem[];
}

export type { StoreCartItemInput };
