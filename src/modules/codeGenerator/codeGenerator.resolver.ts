import { generate } from "./codeGenerator.service";

export const codeGeneratorResolver = {
  Query: {
    async generateCode(_: any, args: Record<string, any>): Promise<string> {
      return await generate(args.type);
    },
  },
};
