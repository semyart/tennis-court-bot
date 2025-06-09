import { Schema, model } from "mongoose";

const courtSchema = new Schema({
  courtId: { type: Number, required: true, unique: true },
  name: { type: String, default: "Теннисный корт" },
  bookingStartHour: { type: Number, default: 6 },
  bookingEndHour: { type: Number, default: 23 },
  maxHoursWeekday: { type: Number, default: 2 },
  maxHoursWeekend: { type: Number, default: 1 },
  maxHoursWeekly: { type: Number, default: 4 },
  timezone: { type: String, default: "Europe/Moscow" },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: false }, // Корты с true попадают в задачи крона
});

export default model("Court", courtSchema);
