export interface IKardexEntry {
  _id: string;
  date: number;
  type: string;
  reference_code: string;
  reference_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  balance: number;
  created_by: string;
  entity_name: string;
}
