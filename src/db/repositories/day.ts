import Day from "../models/Day";

export const createDay = (day: {
  threadId: number;
  courtId: number;
  isWeekend: boolean;
  date: Date;
  scheduleMessageId: number;
}) => {
  Day.create(day);
};

export const getDay = async (threadId: number, courtId: number) => {
  return await Day.findOne({ threadId, courtId });
};

export const getDaysBeforeDate = async (cutoffDate: Date) => {
  return await Day.find({ date: { $lt: cutoffDate } });
};

export const removeDays = async (
  oldKeys: Array<{ threadId: number; courtId: number }>
) => {
  return await Day.bulkWrite(
    oldKeys.map(({ threadId, courtId }) => ({
      deleteOne: {
        filter: { threadId, courtId },
      },
    }))
  );
};
