import mongoose, { Schema as MongooseSchema } from "mongoose";

const codeGeneratorSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    sequence: { type: String, required: true },
    type: { type: String, required: true },
    company: {
      type: MongooseSchema.Types.ObjectId,
      ref: "company",
      required: true,
    },
  },
  { timestamps: true }
);

export const CodeGenerator = mongoose.model(
  "codeGenerator",
  codeGeneratorSchema
);
