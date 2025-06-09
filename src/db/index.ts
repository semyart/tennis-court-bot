import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export async function connectToDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not defined in .env");

    await mongoose.connect(uri);
    console.log("MongoDB connected ✅");
  } catch (e) {
    console.error("MongoDB connection error:", e);
  }
}
