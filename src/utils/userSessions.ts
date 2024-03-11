export type UserSession = {
  videoUrl: string;
  startSecond: number | string;
  endSecond: number | string;
  state: "start" | "end" | undefined;
};

export const userSessions = new Map<number, UserSession>();
