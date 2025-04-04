import { redis } from "../redis/redisClient";
import { incrementDownloadedSongs } from "./rateLimiters";

export type UserSession = {
    videoUrl: string;
    startSecond: number | string;
    endSecond: number | string;
    state: "start" | "end" | "volume" | undefined;
    volumeAdjustments?: string;
    action: "crop" | "full" | "adjust";
};

export async function initCropSession(chatId: number, videoUrl: string) {
    console.log("setting to redis", chatId, videoUrl);
    try {
        await redis.hmset(
            chatId.toString(),
            "videoUrl", videoUrl,
            "startSecond", "0",
            "endSecond", "0",
            "state", "",
            "volumeAdjustments", "",
            "action", ""
        );
        await redis.expire(chatId.toString(), 86400); // TTL of 1 day
    } catch (error) {
        console.error("error setting to redis", error);
    }
    console.log(await redis.hgetall(chatId.toString()));
}

export async function setCropSessionField(chatId: number, fieldName: string, fieldValue: string | number) {
    try {
        await redis.hmset(chatId.toString(), `${fieldName}`, `${fieldValue}`);
    } catch (error) {
        console.error("error setting to redis", error);
    }
    console.log("setCropSessionField", await redis.hgetall(chatId.toString()));
}

export async function getCropSesssionData(chatId: number): Promise<UserSession> | null {
    try {
        const redisData = await redis.hgetall(chatId.toString());
        if (Object.keys(redisData).length === 0) {
            return null;
        }
        const session = redisData as UserSession;
        return session;
    } catch (error) {
        console.error("Error getting session data from Redis", error);
        return null;
    }
}

export async function getVideoUrl(chatId: number) {
    const videourl = await redis.hget(chatId.toString(), "videoUrl");
    console.log("url", videourl);
    return videourl;
}

export async function clearCropSession(chatId: number, outcome?: string) {
    try {
        // Delete specific fields related to downloading the song
        await redis.hdel(chatId.toString(), "videoUrl", "startSecond", "endSecond", "state", "volumeAdjustments", "action");
        console.log(`Song download session cleared for chatId ${chatId}`);
        if (outcome !== "cancelled") await incrementDownloadedSongs(chatId);
    } catch (error) {
        console.error("Error clearing song download session from Redis", error);
    }
}
