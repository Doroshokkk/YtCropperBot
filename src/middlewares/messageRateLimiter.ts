import { incrementMessageCount, reachedMessageLimit } from "../utils/rateLimiters";
import { getUserLanguage } from "../mongo/services/userService";
import { t } from "../i18n";
import { Context, MiddlewareFn } from "telegraf";

export const messageRateLimiter: MiddlewareFn<Context> = async (ctx, next) => {
    const chatId = ctx.message?.chat.id;
    if (!chatId) return next();

    const lang = (await getUserLanguage(chatId)) ?? "en";
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : undefined;
    if (text && text.length > 1000) {
        console.log("ctx in rate limiter: ", ctx);
        ctx.reply(t(lang, "notReadingEssay"));
        return;
    }
    if (!ctx.from || !ctx.chat) return;

    const limitReached = await reachedMessageLimit(chatId);
    if (limitReached) {
        ctx.reply(t(lang, "messageLimitExceeded"));
        return;
    }

    await incrementMessageCount(chatId);
    return next();
};
