import { redis } from "../redis/redisClient";
import * as dotenv from "dotenv";
import { env } from "./env";
import { deductStar, getStarsLeft, refundStar } from "../mongo/services/userService";

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
        if (chatId === parseInt(env("ADMIN_CHAT_ID"))) {
            return false;
        }

        const starsLeft = await getStarsLeft(chatId);
        if (starsLeft > 0) {
            return false;
        }

        const songsDownloaded = await redis.hget(`${chatId}-info`, "songsDownloaded");
        if (!songsDownloaded) {
            return false;
        }

        if (parseInt(songsDownloaded) >= parseInt(env("DOWNLOADS_ALLOWED_NOT_SUBSCRIBED"))) {
            return true;
        }
        return false;
    } catch (error) {
        console.error("retrieving download count from redis", error);
        throw error;
    }
}

export async function consumeDownloadCredit(chatId: number): Promise<{ starsConsumed: number; starsLeft: number } | null> {
    const songsDownloaded = await redis.hget(`${chatId}-info`, "songsDownloaded");
    const freeLimit = parseInt(env("DOWNLOADS_ALLOWED_NOT_SUBSCRIBED"));
    const atOrOverLimit = songsDownloaded && parseInt(songsDownloaded) >= freeLimit;

    if (atOrOverLimit) {
        const starsLeft = await deductStar(chatId);
        return { starsConsumed: 1, starsLeft };
    }

    await incrementDownloadedSongs(chatId);
    return null;
}

export async function markPendingStarRefund(chatId: number, stars: number): Promise<void> {
    await redis.set(`${chatId}-pending-star`, String(stars), "EX", 7200);
}

export async function confirmDownloadCredit(chatId: number): Promise<void> {
    await redis.del(`${chatId}-pending-star`);
}

export async function refundPendingStar(chatId: number): Promise<{ starsRestored: number; starsLeft: number } | null> {
    const pending = await redis.get(`${chatId}-pending-star`);
    if (!pending) {
        return null;
    }

    await redis.del(`${chatId}-pending-star`);
    const starsRestored = parseInt(pending);
    const starsLeft = await refundStar(chatId, starsRestored);
    return { starsRestored, starsLeft };
}

export async function incrementMessageCount(chatId: number): Promise<void> {
    try {
        const messageCount = await redis.hget(`${chatId}-msg-limit`, "messageCount");
        if (messageCount) {
            await redis.hincrby(`${chatId}-msg-limit`, "messageCount", 1);
        } else {
            await redis.hmset(`${chatId}-msg-limit`, "messageCount", 1);
            await redis.expire(`${chatId}-msg-limit`, 60);
        }
    } catch (error) {
        console.error("Error setting message count in Redis", error);
    }
}

export async function reachedMessageLimit(chatId: number): Promise<boolean> {
    try {
        const messageCount = await redis.hget(`${chatId}-msg-limit`, "messageCount");
        console.log("messageCount:", messageCount);
        if (!messageCount) {
            return false;
        }

        if (parseInt(messageCount) >= parseInt(env("MESSAGE_LIMIT"))) {
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error retrieving message count from Redis", error);
        throw error;
    }
}
