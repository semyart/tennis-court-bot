import Day from "./db/models/Day";
import Booking from "./db/models/Booking";
import Court from "./db/models/Court";
import { Bot } from "grammy";

export const generateScheduleText = ({
  startHour,
  endHour,
  bookings,
}: {
  startHour: number;
  endHour: number;
  bookings: { hour: number; username: string }[];
}) => {
  const lines = [];

  for (let h = startHour; h <= endHour; h++) {
    const booking = bookings.find((b) => b.hour === h);
    lines.push(`${h}:00 — ${booking ? `${booking.username}` : ""}`);
  }

  return lines.join("\n");
};

export const updateScheduleMessage = async ({
  courtId,
  threadId,
  bot,
}: {
  courtId: number;
  threadId: number;
  bot: Bot;
}) => {
  const court = await Court.findOne({ courtId });
  const day = await Day.findOne({ threadId });
  if (!court || !day) return;

  const bookings = await Booking.find({ courtId, threadId });

  const bookingsFlat = bookings.flatMap((b) =>
    b.hours.map((hour) => ({
      hour,
      username: b.username,
    }))
  );

  const text = generateScheduleText({
    startHour: court.bookingStartHour,
    endHour: court.bookingEndHour,
    bookings: bookingsFlat,
  });

  return text;
};
