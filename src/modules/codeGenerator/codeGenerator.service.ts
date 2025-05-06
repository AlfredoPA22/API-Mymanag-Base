import { codeType } from "../../utils/enums/orderType.enum";
import { CodeGenerator } from "./codeGenerator.model";

export const generate = async (type: codeType) => {
  let currentCode = await CodeGenerator.findOne({ type });
  if (!currentCode) {
    if (type == codeType.PURCHASE_ORDER) {
      currentCode = await CodeGenerator.create({
        code: "COMP_",
        sequence: "00000",
        type,
      });
    } else if (type == codeType.SALE_ORDER) {
      currentCode = await CodeGenerator.create({
        code: "VENT_",
        sequence: "00000",
        type,
      });
    } else if (type == codeType.PRODUCT) {
      currentCode = await CodeGenerator.create({
        code: "PROD_",
        sequence: "00000",
        type,
      });
    } else if (type == codeType.CLIENT) {
      currentCode = await CodeGenerator.create({
        code: "CLIE_",
        sequence: "00000",
        type,
      });
    } else if (type == codeType.PROVIDER) {
      currentCode = await CodeGenerator.create({
        code: "PROV_",
        sequence: "00000",
        type,
      });
    } else if (type == codeType.PRODUCT_TRANSFER) {
      currentCode = await CodeGenerator.create({
        code: "TRAN_",
        sequence: "00000",
        type,
      });
    }
  }
  let num = parseInt(currentCode.sequence);
  num++;
  const incrementedNum = num
    .toString()
    .padStart(currentCode.sequence.length, "0");
  const code = `${currentCode.code}${incrementedNum}`;
  return code;
};

export const increment = async (type: codeType) => {
  let currentCode = await CodeGenerator.findOne({ type });
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
