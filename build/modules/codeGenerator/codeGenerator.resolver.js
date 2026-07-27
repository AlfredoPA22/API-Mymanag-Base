"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeGeneratorResolver = void 0;
const codeGenerator_service_1 = require("./codeGenerator.service");
exports.codeGeneratorResolver = {
    Query: {
        async generateCode(_, args, context) {
            return await (0, codeGenerator_service_1.generate)(context.user.companyId, args.type);
        },
    },
};
