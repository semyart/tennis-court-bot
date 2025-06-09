import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  telegramId: Number,
  name: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
