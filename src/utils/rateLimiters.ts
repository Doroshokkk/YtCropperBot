import { redis } from "../redis/redisClient";
import * as dotenv from "dotenv";
dotenv.config();

export async function incrementDownloadedSongs(chatId: number): Promise<void> {
    try {
        const songsDownloaded = await redis.hget(`${chatId}-info`, "songsDownloaded");
        if (songsDownloaded) {
            await redis.hincrby(`${chatId}-info`, "songsDownloaded", 1);
        } else {
            await redis.hmset(`${chatId}-info`, `songsDownloaded`, 1);
            await redis.expire(`${chatId}-info`, 43200);
        }
    } catch (error) {
        console.error("error setting to redis", error);
    }
}

export async function reachedDownloadLimit(chatId: number): Promise<boolean> {
    try {
        if (chatId === parseInt(process.env.ADMIN_CHAT_ID)) {
            return false;
        }

        const songsDownloaded = await redis.hget(`${chatId}-info`, "songsDownloaded");
        if (parseInt(songsDownloaded) >= parseInt(process.env.DOWNLOADS_ALLOWED_NOT_SUBSCRIBED)) return true;
        return false;
    } catch (error) {
        console.error("retrieving download count from redis", error);
    }
}

export async function incrementMessageCount(chatId: number): Promise<void> {
    try {
        const messageCount = await redis.hget(`${chatId}-msg-limit`, "messageCount");
        if (messageCount) {
            await redis.hincrby(`${chatId}-msg-limit`, "messageCount", 1);
        } else {
            await redis.hmset(`${chatId}-msg-limit`, "messageCount", 1);
            await redis.expire(`${chatId}-msg-limit`, 60); // Set expiration to 60 seconds
        }
    } catch (error) {
        console.error("Error setting message count in Redis", error);
    }
}

export async function reachedMessageLimit(chatId: number): Promise<boolean> {
    try {
        const messageCount = await redis.hget(`${chatId}-msg-limit`, "messageCount");
        console.log("messageCount:", messageCount);
        const messageLimit = parseInt(process.env.MESSAGE_LIMIT) || 30;
        if (parseInt(messageCount) >= messageLimit) return true;
        return false;
    } catch (error) {
        console.error("Error retrieving message count from Redis", error);
    }
}