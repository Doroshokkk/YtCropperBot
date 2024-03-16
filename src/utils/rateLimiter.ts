import { redis } from "../redis/redisClient";

export async function countDownloadedSongs(chatId: number) {
    try {
        const downloadedSongs = await redis.hget(chatId.toString(), "songsDownloaded");
        await redis.hmset(`${chatId}-info`, `songsDownloaded`, downloadedSongs ? parseInt(downloadedSongs) + 1 : 1);
    } catch (error) {
        console.error("error setting to redis", error);
    }
}
