import { Schema, model } from "mongoose";

const daySchema = new Schema({
  threadId: { type: Number, required: true, unique: true },
  courtId: { type: Number, required: true },
  isWeekend: { type: Boolean, required: true },
  date: { type: Date, required: true },
  scheduleMessageId: { type: Number, required: true }, // id первого сообщения, далее редактируется это сообщение
});

export default model("Day", daySchema);
