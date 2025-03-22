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
        const songsDownloaded = await redis.hget(`${chatId}-info`, "songsDownloaded");
        if (parseInt(songsDownloaded) >= parseInt(process.env.DOWNLOADS_ALLOWED_NOT_SUBSCRIBED)) return true;
        if (!songsDownloaded) return false;
        return false;
    } catch (error) {
        console.error("retrieving download count from redis", error);
    }
}
