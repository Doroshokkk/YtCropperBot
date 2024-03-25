import { redis } from "../redis/redisClient";

export async function countDownloadedSongs(chatId: number) {
    try {
        const songsDownloaded = await redis.hget(`${chatId}-info`, "songsDownloaded");
        if (songsDownloaded) {
            await redis.hincrby(`${chatId}-info`, "songsDownloaded", 1);
        } else {
            await redis.hmset(`${chatId}-info`, `songsDownloaded`, 1);
            await redis.expire(`${chatId}-info`, 3600);
        }
    } catch (error) {
        console.error("error setting to redis", error);
    }
}
