import { codeType } from "../../utils/enums/orderType.enum";
import { CodeGenerator } from "./codeGenerator.model";
import { Types as MongooseTypes, Schema as MongooseSchema } from "mongoose";

export const generate = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  type: codeType
) => {
  let currentCode = await CodeGenerator.findOne({ type, company: companyId });
  if (!currentCode) {
    const defaultPrefixes = {
      [codeType.PURCHASE_ORDER]: "COMP_",
      [codeType.SALE_ORDER]: "VENT_",
      [codeType.PRODUCT]: "SKU_",
      [codeType.CLIENT]: "CLIE_",
      [codeType.PROVIDER]: "PROV_",
      [codeType.PRODUCT_TRANSFER]: "TRAN_",
    };

    currentCode = await CodeGenerator.create({
      company: companyId,
      type,
      code: defaultPrefixes[type],
      sequence: "00000",
    });
  }
  let num = parseInt(currentCode.sequence);
  num++;
  const incrementedNum = num
    .toString()
    .padStart(currentCode.sequence.length, "0");
  const code = `${currentCode.code}${incrementedNum}`;
  return code;
};

export const increment = async (
  companyId: MongooseSchema.Types.ObjectId | MongooseTypes.ObjectId,
  type: codeType
) => {
  const currentCode = await CodeGenerator.findOne({ type, company: companyId });

  if (currentCode) {
    let num = parseInt(currentCode.sequence);
    num++;
    const incrementedNum = num
      .toString()
      .padStart(currentCode.sequence.length, "0");

    await CodeGenerator.updateOne(
      { _id: currentCode._id },
      { sequence: incrementedNum }
    );
  }
};
