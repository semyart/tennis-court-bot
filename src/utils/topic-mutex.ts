import { Mutex } from "async-mutex";

const mutexMap = new Map<string, Mutex>();

export const getTopicMutex = (courtId: number, threadId: number) => {
  const key = `${courtId}_${threadId}`;
  if (!mutexMap.has(key)) {
    mutexMap.set(key, new Mutex());
  }
  return mutexMap.get(key)!;
};
