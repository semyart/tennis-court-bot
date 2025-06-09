import Court from "../models/Court";

export const getAllCourts = async () => await Court.find({});

export const getCourtById = async (courtId: number) =>
  await Court.findOne({ courtId });
