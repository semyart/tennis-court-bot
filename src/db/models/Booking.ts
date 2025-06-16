import { Schema, model } from "mongoose";

const bookSchema = new Schema({
  courtId: { type: Number, required: true },
  threadId: { type: Number, required: true },
  userId: { type: Number, required: true },
  username: { type: String, required: true },
  hours: { type: [Number], required: true },
});

bookSchema.index({ courtId: 1, threadId: 1, hours: 1 }, { unique: false });

export default model("Book", bookSchema);
