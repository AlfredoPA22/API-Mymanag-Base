"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.increment = exports.generate = void 0;
const orderType_enum_1 = require("../../utils/enums/orderType.enum");
const codeGenerator_model_1 = require("./codeGenerator.model");
const generate = async (companyId, type) => {
    let currentCode = await codeGenerator_model_1.CodeGenerator.findOne({ type, company: companyId });
    if (!currentCode) {
        const defaultPrefixes = {
            [orderType_enum_1.codeType.PURCHASE_ORDER]: "COMP_",
            [orderType_enum_1.codeType.SALE_ORDER]: "VENT_",
            [orderType_enum_1.codeType.PRODUCT]: "SKU_",
            [orderType_enum_1.codeType.CLIENT]: "CLIE_",
            [orderType_enum_1.codeType.PROVIDER]: "PROV_",
            [orderType_enum_1.codeType.PRODUCT_TRANSFER]: "TRAN_",
            [orderType_enum_1.codeType.SALE_RETURN]: "DEV_",
        };
        currentCode = await codeGenerator_model_1.CodeGenerator.create({
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
exports.generate = generate;
const increment = async (companyId, type) => {
    const currentCode = await codeGenerator_model_1.CodeGenerator.findOne({ type, company: companyId });
    if (currentCode) {
        let num = parseInt(currentCode.sequence);
        num++;
        const incrementedNum = num
            .toString()
            .padStart(currentCode.sequence.length, "0");
        await codeGenerator_model_1.CodeGenerator.updateOne({ _id: currentCode._id }, { sequence: incrementedNum });
    }
};
exports.increment = increment;
