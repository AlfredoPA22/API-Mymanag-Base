import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  IWarehouse,
  UpdateWarehouseInput,
  WarehouseInput,
} from "../../interfaces/warehouse.interface";
import { ProductInventory } from "../product/product_inventory.model";
import { ProductSerial } from "../product/product_serial.model";
import { Warehouse } from "./warehouse.model";

export const findAll = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IWarehouse[]> => {
  return await Warehouse.find({
    company: companyId,
  })
    .populate("company")
    .lean<IWarehouse[]>();
};

export const create = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  warehouseInput: WarehouseInput
) => {
  const warehouse = await Warehouse.findOne({
    company: companyId,
    name: warehouseInput.name,
  });

  if (warehouse) {
    throw new Error("El almacén ya existe");
  }

  const newWarehouse = await Warehouse.create({
    ...warehouseInput,
    company: companyId,
  });

  return newWarehouse;
};

export const deleteWarehouse = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  warehouseId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const warehouse = await Warehouse.findOne({
    _id: warehouseId,
    company: companyId,
  });

  if (!warehouse) {
    throw new Error("El almacén no existe");
  }

  const findProductSerial = await ProductSerial.find({
    company: companyId,
    warehouse: warehouseId,
  });

  const findProductInventory = await ProductInventory.find({
    company: companyId,
    warehouse: warehouseId,
  });

  if (findProductSerial.length > 0 || findProductInventory.length > 0) {
    throw new Error("No se puede eliminar porque el almacén tiene productos");
  }

  const deleted = await Warehouse.deleteOne({
    _id: warehouseId,
    company: companyId,
  });

  return {
    success: deleted.deletedCount > 0,
  };
};

export const update = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  warehouseId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateWarehouseInput: UpdateWarehouseInput
) => {
  const warehouse = await Warehouse.findOne({
    _id: warehouseId,
    company: companyId,
  });

  if (!warehouse) {
    throw new Error("El almacén no existe");
  }

  const warehouseUpdated = await Warehouse.findOneAndUpdate(
    { _id: warehouseId, company: companyId },
    { $set: updateWarehouseInput },
    { new: true }
  );

  return warehouseUpdated;
};
