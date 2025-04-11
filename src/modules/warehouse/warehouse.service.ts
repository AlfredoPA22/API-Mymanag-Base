import { Schema as MongooseSchema, Types as MongooseTypes } from "mongoose";
import {
  IWarehouse,
  UpdateWarehouseInput,
  WarehouseInput,
} from "../../interfaces/warehouse.interface";
import { ProductSerial } from "../product/product_serial.model";
import { Warehouse } from "./warehouse.model";
import { ProductInventory } from "../product/product_inventory.model";

export const findAll = async (): Promise<IWarehouse[]> => {
  return await Warehouse.find();
};

export const findById = async (
  warehouseId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
): Promise<IWarehouse> => {
  const warehouse = await Warehouse.findById(warehouseId);
  if (warehouse) {
    return warehouse.toObject() as IWarehouse;
  } else {
    throw new Error("El almacén no existe");
  }
};

export const create = async (warehouseInput: WarehouseInput) => {
  const warehouse = await Warehouse.findOne({
    name: warehouseInput.name,
  });

  if (warehouse) {
    throw new Error("El almacén ya existe");
  }
  const newWarehouse = await Warehouse.create(warehouseInput);

  return newWarehouse;
};

export const deleteWarehouse = async (
  warehouseId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId
) => {
  const findProductSerial = await ProductSerial.find({
    warehouse: warehouseId,
  });

  const findProductInventory = await ProductInventory.find({
    warehouse: warehouseId,
  });

  if (findProductSerial.length > 0 ||findProductInventory.length > 0 ) {
    throw new Error("No se puede eliminar porque el almacén tiene productos");
  }

  const deleted = await Warehouse.deleteOne({
    _id: warehouseId,
  });

  if (deleted.deletedCount > 0) {
    return {
      success: true,
    };
  }
  return {
    success: false,
  };
};

export const update = async (
  warehouseId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  updateWarehouseInput: UpdateWarehouseInput
) => {
  const warehouseUpdated = await Warehouse.findByIdAndUpdate(
    warehouseId,
    { $set: updateWarehouseInput },
    { new: true }
  );

  if (!warehouseUpdated) {
    throw new Error("El almacén no existe");
  }

  return warehouseUpdated;
};
