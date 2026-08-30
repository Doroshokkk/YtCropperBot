import { incrementMessageCount, reachedMessageLimit } from "../utils/rateLimiters";
import { Context, MiddlewareFn } from "telegraf";


export const messageRateLimiter: MiddlewareFn<Context> = async (ctx, next) => {
    const chatId = ctx.message?.chat.id;
    if (!chatId) return next();

    const text = ctx.message && "text" in ctx.message ? ctx.message.text : undefined;
    if (text && text.length > 1000) {
        console.log("ctx in rate limiter: ", ctx);
        ctx.reply("Not reading this essay");
        return;
    }
    if (!ctx.from || !ctx.chat) return; // malformed

    const limitReached = await reachedMessageLimit(chatId);
    if (limitReached) {
        ctx.reply("You have exceeded the message limit. Please try again in a minute.");
        return;
    }

    await incrementMessageCount(chatId);
    return next();
};
