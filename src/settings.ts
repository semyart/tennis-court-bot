import { Bot } from "grammy";
import Court from "./db/models/Court";
import { onlyAdmin } from "grammy-middlewares";

export const handleSettingsCommands = (bot: Bot) => {
  bot.command("set_booking_hours", onlyAdmin(), async (ctx) => {
    const message = ctx.message?.text;
    if (!message) return;

    const [start, end] = message.split(" ").slice(1).map(Number);

    if (
      isNaN(start) ||
      isNaN(end) ||
      start < 0 ||
      start > 23 ||
      end < 1 ||
      end > 23 ||
      start >= end
    ) {
      return ctx.reply("Неверный формат. Используйте: /set_booking_hours 6 23");
    }

    const updatedCourt = await Court.findOneAndUpdate(
      { courtId: ctx.chatId },
      { bookingStartHour: start, bookingEndHour: end }
    );

    if (!updatedCourt) {
      return ctx.reply(
        "❌ Корт не найден. Сначала создайте его с помощью команды /start"
      );
    }

    ctx.reply(`✅ Установлены часы бронирования: с ${start}:00 до ${end}:00`);
  });

  bot.command("set_max_hours", onlyAdmin(), async (ctx) => {
    const message = ctx.message?.text;
    if (!message) return;

    const args = message.split(" ").slice(1);

    const weekday = parseInt(args[0]);
    const weekend = parseInt(args[1]);

    if (isNaN(weekday) || isNaN(weekend) || weekday < 0 || weekend < 0) {
      return ctx.reply(
        "❌ Пример: /set_max_hours 2 1 — будни 2ч, выходные 1ч."
      );
    }

    const updatedCourt = await Court.findOneAndUpdate(
      { courtId: ctx.chat?.id },
      {
        maxHoursWeekday: weekday,
        maxHoursWeekend: weekend,
      }
    );

    if (!updatedCourt) {
      return ctx.reply(
        "❌ Корт не найден. Сначала создайте его с помощью команды /start"
      );
    }

    return ctx.reply(`✅ Ограничения обновлены:
- Будни: ${weekday} ч
- Выходные: ${weekend} ч`);
  });

  bot.command("set_max_hours_weekly", onlyAdmin(), async (ctx) => {
    const message = ctx.message?.text;
    if (!message) return;

    const args = message.split(" ").slice(1);

    const maxHour = parseInt(args[0]);

    if (isNaN(maxHour) || maxHour < 0) {
      return ctx.reply(
        "❌ Введите число больше 0. Пример: /set_max_hours_weekly 4"
      );
    }

    const updatedCourt = await Court.findOneAndUpdate(
      { courtId: ctx.chatId },
      { maxHoursWeekly: maxHour }
    );

    if (!updatedCourt) {
      return ctx.reply(
        "❌ Корт не найден. Сначала создайте его с помощью команды /start"
      );
    }

    ctx.reply(
      `✅ Установлено недельное ограничение бронирования: ${maxHour} ч.`
    );
  });

  bot.command("start_bot", onlyAdmin(), async (ctx) => {
    const updatedCourt = await Court.findOneAndUpdate(
      { courtId: ctx.chatId },
      { isActive: true }
    );

    if (!updatedCourt) {
      return ctx.reply(
        "❌ Корт не найден. Сначала создайте его с помощью команды /start"
      );
    }

    ctx.reply(`✅ Бот запущен, в 18:00 откроется бронирование`);
  });

  bot.command("stop_bot", onlyAdmin(), async (ctx) => {
    const updatedCourt = await Court.findOneAndUpdate(
      { courtId: ctx.chatId },
      { isActive: false }
    );

    if (!updatedCourt) {
      return ctx.reply(
        "❌ Корт не найден. Сначала создайте его с помощью команды /start"
      );
    }

    ctx.reply(
      `✅ Бот приостановлен. Новые темы для бронирования создаваться не будут`
    );
  });
};
