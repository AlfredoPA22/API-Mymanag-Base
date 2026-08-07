import { Types as MongooseTypes } from "mongoose";
import { cashRegisterStatus } from "../utils/enums/cashRegisterStatus.enum";
import { IUser } from "./user.interface";
import { ICompany } from "./company.interface";

export interface ICashMovement {
  type: "INGRESO" | "RETIRO";
  amount: number;
  currency?: string | null;
  description: string;
  date: Date;
  created_by: IUser;
}

export interface ICashRegister {
  _id: MongooseTypes.ObjectId;
  status: cashRegisterStatus;
  opening_amount: number;
  opening_amount_bs?: number | null;
  opening_date: Date;
  opened_by: IUser;
  closing_amount?: number | null;
  closing_amount_bs?: number | null;
  closing_date?: Date | null;
  closed_by?: IUser | null;
  notes?: string | null;
  movements: ICashMovement[];
  company: ICompany;
  // Calculados al leer la caja — no se guardan en la base de datos, ver
  // computeExpected() en cashRegister.service.ts.
  cash_sales?: number;
  cash_sales_bs?: number;
  cash_payments?: number;
  cash_payments_bs?: number;
  expected_amount?: number;
  expected_amount_bs?: number;
}

export interface OpenCashRegisterInput {
  opening_amount: number;
  opening_amount_bs?: number;
  notes?: string;
}

export interface CloseCashRegisterInput {
  closing_amount: number;
  closing_amount_bs?: number;
  notes?: string;
}

export interface AddCashMovementInput {
  type: "INGRESO" | "RETIRO";
  amount: number;
  currency?: string;
  description: string;
}
