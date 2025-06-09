import { Bot } from "grammy";
import dotenv from "dotenv";
import { connectToDB } from "./db";
import Court from "./db/models/Court";
import { ignoreOld, onlyAdmin } from "grammy-middlewares";
import { handleSettingsCommands } from "./settings";
import cron from "node-cron";

import { getAllCourts } from "./db/repositories/court";
import {
  createDay,
  getDaysBeforeDate,
  removeDays,
} from "./db/repositories/day";
import { getThreadTitle, isWeekend } from "./utils/common";
import dayjs from "dayjs";
import { handleBookCommands } from "./book";
import { generateScheduleText, updateScheduleMessage } from "./schedule";
import { removeBookings } from "./db/repositories/book";

dotenv.config();

const bot = new Bot(process.env.BOT_API_KEY!);
bot.use(ignoreOld(30));

bot.api.setMyCommands([
  { command: "start", description: "Добавить корт в базу" },
  { command: "book", description: "Забронировать часы (пример: /book 14,15)" },
  {
    command: "unbook",
    description: "Отменить бронирование (пример: /unbook 14)",
  },
  { command: "set_booking_hours", description: "Настроить часы бронирования" },
  {
    command: "set_max_hours",
    description: "Лимит часов в день: будни/выходные",
  },
  { command: "set_max_hours_weekly", description: "Лимит часов в неделю" },
  { command: "start_bot", description: "Включить автосоздание тем" },
  { command: "stop_bot", description: "Отключить автосоздание тем" },
]);

const startCron = () => {
  cron.schedule("0 18 * * *", async () => {
    const courts = await getAllCourts();
    const activeCourts = courts.filter((court) => court.isActive);
    const dayGap = 3;

    for (const court of activeCourts) {
      try {
        const topic = await bot.api.createForumTopic(
          court.courtId,
          getThreadTitle(dayGap)
        );

        const emptySchedule = generateScheduleText({
          startHour: court.bookingStartHour,
          endHour: court.bookingEndHour,
          bookings: [],
        });

        const message = await bot.api.sendMessage(
          court.courtId,
          emptySchedule,
          {
            message_thread_id: topic.message_thread_id,
          }
        );

        bot.api.pinChatMessage(court.courtId, message.message_id);

        createDay({
          threadId: topic.message_thread_id,
          courtId: court.courtId,
          isWeekend: isWeekend(dayjs().add(dayGap, "day")),
          date: dayjs().add(dayGap, "day").toDate(),
          scheduleMessageId: message.message_id,
        });
      } catch (err) {
        console.error("Ошибка при отправке в чат", court.courtId, err);
      }
    }
  });

  cron.schedule("0 19 * * *", async () => {
    const cutoffDate = dayjs().subtract(7, "day").toDate();
    const oldDays = await getDaysBeforeDate(cutoffDate);

    if (oldDays.length === 0) return;

    const oldDaysIds = oldDays.map((oldDay) => ({
      threadId: oldDay.threadId,
      courtId: oldDay.courtId,
    }));

    const topicsDeleteResults = await Promise.allSettled(
      oldDaysIds.map((chat) =>
        bot.api.deleteForumTopic(chat.courtId, chat.threadId)
      )
    );

    topicsDeleteResults.forEach((result, i) => {
      if (result.status === "rejected") {
        const chat = oldDaysIds[i];
        console.warn(
          `❌ Ошибка при удалении топика ${chat.threadId} в чате ${chat.courtId}`,
          result.reason
        );
      }
    });

    await removeBookings(oldDaysIds);
    await removeDays(oldDaysIds);
  });
};

const init = async () => {
  await connectToDB();

  startCron();

  bot.command("start", onlyAdmin(), async (ctx) => {
    const courtId = ctx.chatId;
    const chatName = ctx.chat.title;

    let court = await Court.findOne({ courtId });

    if (!court) {
      court = await Court.create({ courtId, name: chatName });
      await ctx.reply(`Корт добавлен в базу.`);
    } else {
      await ctx.reply(`Этот корт уже есть в базе.`);
    }
  });

  handleBookCommands(bot);
  handleSettingsCommands(bot);

  bot.start();
};

init();
