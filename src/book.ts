import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import Court from "./db/models/Court";
import Book from "./db/models/Book";
import Day from "./db/models/Day";
import { Bot } from "grammy";
import { updateScheduleMessage } from "./schedule";

dayjs.extend(isBetween);

const getUserBookingsInSameWeek = async ({
  userId,
  referenceDate,
}: {
  userId: number;
  referenceDate: Date;
}) => {
  const weekStart = dayjs(referenceDate).startOf("week");
  const weekEnd = dayjs(referenceDate).endOf("week");

  const allBookings = await Book.find({ userId });

  const bookingsWithDates = await Promise.all(
    allBookings.map(async (b) => {
      const day = await Day.findOne({ threadId: b.threadId });
      return day?.date ? { hours: b.hours, date: day.date } : null;
    })
  );

  const filtered = bookingsWithDates.filter(
    (b): b is { hours: number[]; date: Date } =>
      b !== null && dayjs(b.date).isBetween(weekStart, weekEnd, "day", "[]")
  );

  const totalHours = filtered.reduce((sum, b) => sum + b.hours.length, 0);

  return {
    totalHours,
    bookings: filtered,
  };
};

const tryBook = async ({
  courtId,
  threadId,
  userId,
  username,
  requestedHours,
}: {
  courtId: number;
  threadId: number;
  userId: number;
  username: string;
  requestedHours: number[];
}) => {
  const court = await Court.findOne({ courtId });
  const day = await Day.findOne({ threadId });

  if (!court || !day) {
    return {
      success: false,
      message:
        "❌ Ошибка: данная команда работает только в созданных мною темах.",
      hoursBooked: [],
      skipped: [],
    };
  }

  const invalidHours = requestedHours.filter(
    (h) => h < court.bookingStartHour || h > court.bookingEndHour
  );

  if (invalidHours.length > 0) {
    return {
      success: false,
      message: `❌ Недопустимое время: ${invalidHours.join(
        ", "
      )}.\nДопустимые часы бронирования: с ${court.bookingStartHour} до ${
        court.bookingEndHour
      }.`,
      hoursBooked: [],
      skipped: requestedHours,
    };
  }

  const maxHours = day.isWeekend
    ? court.maxHoursWeekend
    : court.maxHoursWeekday;

  // Получаем уже занятые часы
  const existingBookings = await Book.find({ courtId, threadId });
  const takenHours = new Set(existingBookings.flatMap((b) => b.hours));

  // Получаем уже забронированные текущим пользователем часы
  const userBookings = existingBookings.filter((b) => b.userId === userId);
  const alreadyBooked = userBookings.flatMap((b) => b.hours);

  const alreadyTaken = requestedHours.filter((h) => takenHours.has(h));
  const remainingHoursCount = maxHours - alreadyBooked.length;
  const availableHours = requestedHours.filter((h) => !takenHours.has(h));

  const skippedByLimit = availableHours.slice(remainingHoursCount);

  const { totalHours: totalHoursBookedThisWeek } =
    await getUserBookingsInSameWeek({
      userId,
      referenceDate: day.date,
    });

  // Оставляем только доступные часы с учетом дневного ограничения
  let hoursToBook = availableHours.slice(0, remainingHoursCount);

  // Недельный лимит
  const enabledHoursCountThisWeek =
    court.maxHoursWeekly - totalHoursBookedThisWeek;
  const skippedByWeeklyLimit = hoursToBook.slice(enabledHoursCountThisWeek);

  // Оставляем только доступные часы с учетом недельного ограничения
  hoursToBook = hoursToBook.slice(0, enabledHoursCountThisWeek);

  const messages: string[] = [];

  if (alreadyTaken.length) {
    messages.push(`⛔️ Время ${alreadyTaken.join(", ")} уже занято.`);
  }

  if (skippedByLimit.length) {
    messages.push(
      `⚠️ Вы пытаетесь превысить лимит.\nОграничение: ${court.maxHoursWeekday} ч. в будни, ${court.maxHoursWeekend} ч. в выходные.`
    );
  }

  if (skippedByWeeklyLimit.length) {
    messages.push(
      `⚠️ Вы пытаетесь превысить недельный лимит.\nОграничение: ${court.maxHoursWeekly} ч.`
    );
  }

  if (hoursToBook.length) {
    await Book.create({
      courtId,
      threadId,
      userId,
      username,
      hours: hoursToBook,
    });
    messages.unshift(`✅ Забронировано: ${hoursToBook.join(", ")}`);
    return {
      success: true,
      message: messages.join("\n\n"),
      hoursBooked: hoursToBook,
      skipped: [...alreadyTaken, ...skippedByLimit],
    };
  }

  messages.unshift("❌ Не удалось забронировать указанное время.");
  return {
    success: false,
    message: messages.join("\n\n"),
    hoursBooked: [],
    skipped: requestedHours,
  };
};

const unbookHours = async ({
  courtId,
  threadId,
  userId,
  requestedHours,
}: {
  courtId: number;
  threadId: number;
  userId: number;
  requestedHours: number[];
}) => {
  const bookings = await Book.find({ courtId, threadId, userId });

  const toUnbook: number[] = [];
  const skipped: number[] = [];

  for (const hour of requestedHours) {
    const booking = bookings.find((b) => b.hours.includes(hour));
    if (booking) {
      booking.hours = booking.hours.filter((h) => h !== hour);

      if (booking.hours.length === 0) {
        await Book.deleteOne({ _id: booking._id });
      } else {
        await booking.save();
      }

      toUnbook.push(hour);
    } else {
      skipped.push(hour);
    }
  }

  const messages = [];

  if (toUnbook.length > 0) {
    messages.push(`✅ Отменено: ${toUnbook.join(", ")}`);
  }

  if (skipped.length > 0) {
    messages.push(
      `⚠️ Эти часы не были забронированы вами: ${skipped.join(", ")}`
    );
  }

  return {
    success: !!toUnbook.length,
    message: messages.join("\n\n"),
    toUnbook,
    skipped,
  };
};

const createBookingCommand = ({
  bot,
  commandName,
  handler,
  exampleText,
  emptyInputMessage,
}: {
  bot: Bot;
  commandName: string;
  handler: (args: {
    courtId: number;
    threadId: number;
    userId: number;
    username: string;
    requestedHours: number[];
  }) => Promise<{ success: boolean; message: string }>;
  exampleText: string;
  emptyInputMessage: string;
}) => {
  bot.command(commandName, async (ctx) => {
    if (!ctx.message) return;

    const input = ctx.message.text.split(" ").slice(1).join("");
    const requestedHours = input
      .split(",")
      .map((h) => h.trim())
      .filter((h) => /^\d+$/.test(h))
      .map(Number);

    if (requestedHours.length === 0) {
      return ctx.reply(`${emptyInputMessage} Пример: ${exampleText}`, {
        reply_to_message_id: ctx.message.message_id,
      });
    }

    const threadId = ctx.message.message_thread_id;
    const courtId = ctx.chat.id;
    const userId = ctx.from.id;

    if (!threadId) {
      return ctx.reply("Данная команда работает только внутри тем.");
    }

    const username = ctx.from?.username
      ? `${ctx.from.first_name} (${ctx.from.username})`
      : ctx.from.first_name;

    const result = await handler({
      courtId,
      threadId,
      userId,
      username,
      requestedHours,
    });

    ctx.reply(result.message, {
      reply_to_message_id: ctx.message.message_id,
    });

    if (result.success) {
      await updateScheduleMessage({ courtId, threadId, bot });
    }
  });
};

export const handleBookCommands = (bot: Bot) => {
  createBookingCommand({
    bot,
    commandName: "book",
    handler: tryBook,
    exampleText: "/book 14,15",
    emptyInputMessage:
      "❌ Пожалуйста, укажите часы для бронирования. Только целые числа через запятую.",
  });

  createBookingCommand({
    bot,
    commandName: "unbook",
    handler: unbookHours,
    exampleText: "/unbook 12,13",
    emptyInputMessage: "⚠️ Укажите часы для отмены брони.",
  });
};
