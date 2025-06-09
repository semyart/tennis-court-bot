import dayjs from "dayjs";
import "dayjs/locale/ru";

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const getThreadTitle = (dayGap: number) => {
  dayjs.locale("ru");
  const date = dayjs().add(dayGap, "day");
  const formatted = capitalize(date.format("dddd D MMMM"));
  return formatted;
};

export const isWeekend = (date: dayjs.Dayjs): boolean => {
  const day = date.day();
  return day === 0 || day === 6;
};
