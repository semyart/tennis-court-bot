import Book from "../models/Book";

export const createBook = async (
  courtId: number,
  threadId: number,
  userId: number,
  username: string,
  hours: number[]
) => {
  Book.create({ courtId, threadId, userId, username, hours });
};

export const findBook = async (
  courtId: number,
  threadId: number,
  hours: number[]
) =>
  await Book.find({
    courtId,
    threadId,
    hours: { $in: hours },
  });

export const removeBookings = async (
  oldKeys: Array<{ threadId: number; courtId: number }>
) => {
  return await Book.bulkWrite(
    oldKeys.map(({ threadId, courtId }) => ({
      deleteMany: {
        filter: { threadId, courtId },
      },
    }))
  );
};
