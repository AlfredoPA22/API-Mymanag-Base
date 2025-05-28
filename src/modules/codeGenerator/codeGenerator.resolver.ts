import { generate } from "./codeGenerator.service";

export const codeGeneratorResolver = {
  Query: {
    async generateCode(
      _: any,
      args: Record<string, any>,
      context: any
    ): Promise<string> {
      return await generate(context.user.companyId, args.type);
    },
  },
};
