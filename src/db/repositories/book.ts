import Booking from "../models/Booking";

export const createBook = async (booking: {
  courtId: number;
  threadId: number;
  userId: number;
  username: string;
  hours: number[];
}) => {
  Booking.create(booking);
};

export const findBook = async (
  courtId: number,
  threadId: number,
  hours: number[]
) =>
  await Booking.find({
    courtId,
    threadId,
    hours: { $in: hours },
  });

export const removeBookings = async (
  oldKeys: Array<{ threadId: number; courtId: number }>
) => {
  return await Booking.bulkWrite(
    oldKeys.map(({ threadId, courtId }) => ({
      deleteMany: {
        filter: { threadId, courtId },
      },
    }))
  );
};
