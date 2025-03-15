import mongoose from "mongoose";

const codeGeneratorSchema = new mongoose.Schema({
  code: { type: String, required: true },
  sequence: { type: String, required: true },
  type: { type: String, required: true },
});

export const CodeGenerator = mongoose.model("codeGenerator", codeGeneratorSchema);
