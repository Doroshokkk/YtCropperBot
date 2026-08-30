import { initCropSession, getCropSesssionData, getVideoUrl, clearCropSession, setCropSessionField } from "../utils/userSessions";
import { timeStringToSeconds } from "../utils/secondsConverter";
import {
    cancelKeyboard,
    endingKeyboard,
    inlineCropKeyboard,
    inlineDonateKeyboard,
    inlineLanguageKeyboard,
    menuKeyboard,
    startingKeyboard,
    volumeAdjustmentKeyboard,
} from "../utils/keyboards";
import { Context } from "telegraf";
import { Lang, isDoneInput, mapTimeError, t } from "../i18n";
import { reachedDownloadLimit } from "../utils/rateLimiters";
import { addReferencedSong, creditStars, getStarsLeft, getUserLanguage, setUser, setUserLanguage } from "../mongo/services/userService";
import { sendToQueue } from "../queue/rabbit";
import { getAudioByUrl } from "../mongo/services/audioService";
import { unifyYouTubeUrl } from "../utils/unifyURL";

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function getTextMessage(ctx: Context): { chatId: number; text: string } | null {
    const message = ctx.message;
    if (!message || !("text" in message) || typeof message.text !== "string") {
        return null;
    }

    return { chatId: message.chat.id, text: message.text };
}

function getCallbackChatId(ctx: Context): number | null {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !("message" in callbackQuery) || !callbackQuery.message) {
        return null;
    }

    return callbackQuery.message.chat.id;
}

async function promptLanguage(ctx: Context) {
    await ctx.reply(t("en", "chooseLanguage"), inlineLanguageKeyboard);
}

async function requireLanguage(ctx: Context, chatId: number): Promise<Lang | null> {
    const lang = await getUserLanguage(chatId);
    if (!lang) {
        await promptLanguage(ctx);
        return null;
    }
    return lang;
}

async function finishDownload(ctx: Context, chatId: number, lang: Lang, outcome?: string) {
    const credit = await clearCropSession(chatId, outcome);
    if (credit) {
        await ctx.reply(t(lang, "starsUsed", { consumed: credit.starsConsumed, left: credit.starsLeft }));
    }
}

export const firstMessage = async (ctx: Context) => {
    try {
        const user = ctx.from;
        if (!user) {
            return;
        }

        await setUser({ tg_id: user.id, username: user.username ?? "", first_name: user.first_name });

        const lang = await getUserLanguage(user.id);
        if (!lang) {
            await promptLanguage(ctx);
            return;
        }

        await ctx.reply(t(lang, "welcome"), menuKeyboard(lang));
    } catch (error) {
        await ctx.reply(t("en", "botDown"));
        console.error("Error creating user:", getErrorMessage(error));
    }
};

export const showLanguageMenu = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const lang = (await getUserLanguage(textMessage.chatId)) ?? "en";
    await ctx.reply(t(lang, "chooseLanguage"), inlineLanguageKeyboard);
};

export const handleLanguageSelection = async (ctx: Context) => {
    const chatId = getCallbackChatId(ctx);
    const callbackQuery = ctx.callbackQuery;
    if (!chatId || !callbackQuery || !("data" in callbackQuery)) {
        return;
    }

    const match = callbackQuery.data.match(/^lang_(en|uk)$/);
    if (!match) {
        return;
    }

    const lang = match[1] as Lang;
    const user = ctx.from;
    if (user) {
        await setUser({ tg_id: user.id, username: user.username ?? "", first_name: user.first_name });
    }

    await ctx.answerCbQuery();
    await setUserLanguage(chatId, lang);
    await ctx.editMessageText(t(lang, "languageSet"));
    await ctx.reply(t(lang, "welcome"), menuKeyboard(lang));
};

export const respondToYoutubeLink = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId, text } = textMessage;
    const lang = await requireLanguage(ctx, chatId);
    if (!lang) {
        return;
    }

    try {
        const limitDownload = await reachedDownloadLimit(chatId);
        if (limitDownload) {
            await ctx.reply(t(lang, "downloadLimit"));
            await ctx.reply(t(lang, "donatePrompt"), inlineDonateKeyboard);
            return;
        }

        const existingCropSession = await getCropSesssionData(chatId);
        if (existingCropSession) {
            await ctx.reply(t(lang, "existingSession"));
            return;
        }

        const unifiedUrl = unifyYouTubeUrl(text);
        await initCropSession(chatId, unifiedUrl);
        await ctx.reply(t(lang, "chooseOption"), inlineCropKeyboard(lang));
    } catch (error) {
        console.error("Error calling API:", getErrorMessage(error));
        await finishDownload(ctx, chatId, lang);
        await ctx.reply(t(lang, "apiError"), menuKeyboard(lang));
    }
};

export const getFullSong = async (ctx: Context) => {
    const chatId = getCallbackChatId(ctx);
    if (!chatId) {
        return;
    }

    const lang = await requireLanguage(ctx, chatId);
    if (!lang) {
        return;
    }

    try {
        const videoUrl = await getVideoUrl(chatId);
        if (!videoUrl) {
            await ctx.reply(t(lang, "sessionExpired"), menuKeyboard(lang));
            await clearCropSession(chatId, "cancelled");
            return;
        }

        await ctx.editMessageText(t(lang, "chooseFull"));
        setCropSessionField(chatId, "action", "full");

        const audio = await getAudioByUrl(videoUrl);
        if (audio?.file_id) {
            await ctx.replyWithAudio(audio.file_id, {
                caption: "@ytAudioCropBot",
            });
            await finishDownload(ctx, chatId, lang);
            await addReferencedSong(chatId, videoUrl);
            return;
        }

        await ctx.reply(t(lang, "queueSent"), menuKeyboard(lang));
        await sendToQueue({
            chatId: chatId,
            videoUrl,
            action: "full",
        });

        await finishDownload(ctx, chatId, lang);
    } catch (error) {
        console.error("Error calling API:", getErrorMessage(error));
        await finishDownload(ctx, chatId, lang);
        await ctx.reply(t(lang, "apiError"), menuKeyboard(lang));
    }
};

export const cropSong = async (ctx: Context) => {
    const chatId = getCallbackChatId(ctx);
    if (!chatId) {
        return;
    }

    const lang = await requireLanguage(ctx, chatId);
    if (!lang) {
        return;
    }

    setCropSessionField(chatId, "state", "start");
    setCropSessionField(chatId, "action", "crop");
    await ctx.editMessageText(t(lang, "chooseCrop"));
    await ctx.reply(t(lang, "enterStartTime"), startingKeyboard(lang));
};

export const silenceSong = async (ctx: Context) => {
    const chatId = getCallbackChatId(ctx);
    if (!chatId) {
        return;
    }

    const lang = await requireLanguage(ctx, chatId);
    if (!lang) {
        return;
    }

    setCropSessionField(chatId, "state", "start");
    setCropSessionField(chatId, "volumeAdjustments", "");
    setCropSessionField(chatId, "action", "adjust");
    await ctx.editMessageText(t(lang, "chooseSilence"));
    await ctx.reply(t(lang, "enterStartTime"), startingKeyboard(lang));
};

export const cropFromStart = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId } = textMessage;
    const lang = await requireLanguage(ctx, chatId);
    if (!lang) {
        return;
    }

    const userSession = await getCropSesssionData(chatId);

    if (!userSession || userSession.state !== "start") {
        await ctx.reply(t(lang, "invalidSession"));
        return;
    }

    setCropSessionField(chatId, "startSecond", "start");
    setCropSessionField(chatId, "state", "end");

    await ctx.reply(t(lang, "enterEndTime"), endingKeyboard(lang));
};

export const cropToEnd = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId } = textMessage;
    const lang = await requireLanguage(ctx, chatId);
    if (!lang) {
        return;
    }

    const userSession = await getCropSesssionData(chatId);

    if (!userSession || userSession.state !== "end") {
        await ctx.reply(t(lang, "invalidSession"));
        return;
    }

    setCropSessionField(chatId, "endSecond", "end");

    const { videoUrl, startSecond, action } = userSession;

    if (action === "adjust") {
        await ctx.reply(t(lang, "volumeAdjustPrompt"), volumeAdjustmentKeyboard(lang));
        setCropSessionField(chatId, "state", "volume");
    } else if (action === "crop") {
        await ctx.reply(t(lang, "queueSent"), menuKeyboard(lang));

        try {
            await sendToQueue({
                chatId: chatId,
                videoUrl,
                startSecond: startSecond === "start" ? "start" : Number(startSecond),
                endSecond: "end",
                action: "crop",
            });

            await finishDownload(ctx, chatId, lang);
        } catch (error) {
            console.error("Error calling API:", getErrorMessage(error));
            await finishDownload(ctx, chatId, lang);
            await ctx.reply(t(lang, "apiError"), menuKeyboard(lang));
        }
    }
};

export const handleNumberInput = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId, text } = textMessage;
    const lang = await requireLanguage(ctx, chatId);
    if (!lang) {
        return;
    }

    const userSession = await getCropSesssionData(chatId);

    if (!userSession) {
        await ctx.reply(t(lang, "invalidSession"));
        return;
    }

    if (userSession.state === "start") {
        try {
            setCropSessionField(chatId, "startSecond", timeStringToSeconds(text));
        } catch (error) {
            console.log("error", getErrorMessage(error));
            await ctx.reply(mapTimeError(lang, getErrorMessage(error)));
            return;
        }

        await ctx.reply(t(lang, "enterTimeFormat"), endingKeyboard(lang));
        setCropSessionField(chatId, "state", "end");
    } else if (userSession.state === "end") {
        try {
            const endSecond = timeStringToSeconds(text);
            await setCropSessionField(chatId, "endSecond", endSecond);

            const updatedSession = await getCropSesssionData(chatId);
            if (!updatedSession) {
                await ctx.reply(t(lang, "sessionExpired"));
                return;
            }

            if (updatedSession.action === "adjust") {
                await ctx.reply(t(lang, "volumeAdjustPrompt"), volumeAdjustmentKeyboard(lang));
                await setCropSessionField(chatId, "state", "volume");
            } else if (updatedSession.action === "crop") {
                const { videoUrl, startSecond, endSecond: sessionEndSecond } = updatedSession;

                await ctx.reply(t(lang, "queueSent"), menuKeyboard(lang));

                try {
                    await sendToQueue({
                        chatId: chatId,
                        videoUrl,
                        startSecond: startSecond === "start" ? "start" : Number(startSecond),
                        endSecond: Number(sessionEndSecond),
                        action: "crop",
                    });

                    await finishDownload(ctx, chatId, lang);
                } catch (error) {
                    console.error("Error calling API:", getErrorMessage(error));
                    await finishDownload(ctx, chatId, lang);
                    await ctx.reply(t(lang, "apiError"), menuKeyboard(lang));
                }
            }
        } catch (error) {
            console.error("error converting seconds:", getErrorMessage(error));
            await ctx.reply(t(lang, "enterTimeFormat"));
        }
    }
};

export const handleOtherInput = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId } = textMessage;
    const lang = await requireLanguage(ctx, chatId);
    if (!lang) {
        return;
    }

    const userSession = await getCropSesssionData(chatId);

    if (userSession && userSession.state) {
        if (userSession.state === "start") {
            await ctx.reply(t(lang, "enterStartPrompt"), startingKeyboard(lang));
            return;
        }

        if (userSession.state === "end") {
            await ctx.reply(t(lang, "enterEndPrompt"), endingKeyboard(lang));
            return;
        }

        await ctx.reply(t(lang, "clickButtonOrCancel"), cancelKeyboard(lang));
        return;
    }

    await ctx.reply(t(lang, "hello"));
};

export const handleCancellation = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId } = textMessage;
    const lang = await requireLanguage(ctx, chatId);
    if (!lang) {
        return;
    }

    await ctx.reply(t(lang, "cancelledCropping"), menuKeyboard(lang));
    await clearCropSession(chatId, "cancelled");
};

export const cancelCrop = async (ctx: Context) => {
    const chatId = getCallbackChatId(ctx);
    if (!chatId) {
        return;
    }

    const lang = await requireLanguage(ctx, chatId);
    if (!lang) {
        return;
    }

    await ctx.editMessageText(t(lang, "cancelledCrop"));
    await ctx.reply(t(lang, "cancelledCrop"), menuKeyboard(lang));
    await clearCropSession(chatId, "cancelled");
};

export const handleVolumeAdjustments = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId, text: input } = textMessage;
    const lang = await requireLanguage(ctx, chatId);
    if (!lang) {
        return;
    }

    const userSession = await getCropSesssionData(chatId);

    if (!userSession || userSession.state !== "volume") {
        await ctx.reply(t(lang, "invalidSession"));
        return;
    }

    if (isDoneInput(input)) {
        const { videoUrl, startSecond, endSecond, volumeAdjustments } = userSession;

        if (!volumeAdjustments || volumeAdjustments === "") {
            await ctx.reply(t(lang, "volumeNoAdjustments"), volumeAdjustmentKeyboard(lang));
            return;
        }

        await ctx.reply(t(lang, "queueSent"), menuKeyboard(lang));

        try {
            await sendToQueue({
                chatId: chatId,
                videoUrl,
                startSecond,
                endSecond,
                volumeAdjustments,
                action: "adjust",
            });

            await finishDownload(ctx, chatId, lang);
        } catch (error) {
            console.error("Error calling API:", getErrorMessage(error));
            await finishDownload(ctx, chatId, lang);
            await ctx.reply(t(lang, "apiError"), menuKeyboard(lang));
        }
        return;
    }

    const adjustments = input.split(", ");

    if (adjustments.length > 10) {
        await ctx.reply(t(lang, "tooManyAdjustments"), volumeAdjustmentKeyboard(lang));
        return;
    }

    try {
        const convertedAdjustments = adjustments.map((adj: string) => {
            const match = adj.match(/^([\d:]+)-([\d:]+)=(\d+)%$/);
            if (!match) {
                throw new Error("Invalid format");
            }

            const [, startStr, endStr, percentageStr] = match;

            const start = timeStringToSeconds(startStr);
            const end = timeStringToSeconds(endStr);

            if (start >= end) {
                throw new Error("Start time must be less than end time");
            }

            const percentage = parseInt(percentageStr, 10);
            if (percentage < 0 || percentage > 5000) {
                throw new Error("Volume percentage must be between 0% and 5000%");
            }

            return `${start}-${end}=${percentage}%`;
        });

        await setCropSessionField(chatId, "volumeAdjustments", convertedAdjustments.join(", "));
        await ctx.reply(t(lang, "volumeSaved"), volumeAdjustmentKeyboard(lang));
    } catch (error) {
        const message = getErrorMessage(error);

        if (message === "Start time must be less than end time") {
            await ctx.reply(t(lang, "invalidTimeRange"), volumeAdjustmentKeyboard(lang));
        } else if (message === "Volume percentage must be between 0% and 5000%") {
            await ctx.reply(t(lang, "invalidVolumePercent"), volumeAdjustmentKeyboard(lang));
        } else {
            await ctx.reply(t(lang, "invalidAdjustmentFormat"), volumeAdjustmentKeyboard(lang));
        }
    }
};

export const showDonateMenu = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const lang = await requireLanguage(ctx, textMessage.chatId);
    if (!lang) {
        return;
    }

    const starsLeft = await getStarsLeft(textMessage.chatId);
    await ctx.reply(t(lang, "donateMenu", { stars: starsLeft }), inlineDonateKeyboard);
};

export const handleDonateAction = async (ctx: Context) => {
    const chatId = getCallbackChatId(ctx);
    if (!chatId) {
        return;
    }

    const lang = await requireLanguage(ctx, chatId);
    if (!lang) {
        return;
    }

    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !("data" in callbackQuery)) {
        return;
    }

    const match = callbackQuery.data.match(/^donate_(\d+)$/);
    if (!match) {
        return;
    }

    const amount = parseInt(match[1], 10);
    if (![1, 5, 10, 100].includes(amount)) {
        return;
    }

    await replyWithInvoice(ctx, lang, amount);
};

export const handleSuccessfulPayment = async (ctx: Context) => {
    const message = ctx.message;
    if (!message || !("successful_payment" in message)) {
        return;
    }

    const paymentInfo = message.successful_payment;
    const userId = ctx.from?.id;
    if (!userId) {
        return;
    }

    const lang = (await getUserLanguage(userId)) ?? "en";
    const chargeId = paymentInfo.telegram_payment_charge_id;
    const amountPaid = paymentInfo.total_amount;

    console.log(`User ${userId} paid ${amountPaid} stars. Charge ID: ${chargeId}`);

    await setUser({
        tg_id: userId,
        username: ctx.from?.username ?? "",
        first_name: ctx.from?.first_name,
    });

    const starsLeft = await creditStars(userId, amountPaid, chargeId);
    await ctx.reply(t(lang, "paymentSuccess", { paid: amountPaid, left: starsLeft }));
};

export const replyWithInvoice = async (ctx: Context, lang: Lang, starAmount: number) => {
    try {
        await ctx.answerCbQuery();
        return ctx.replyWithInvoice({
            title: t(lang, "invoiceTitle"),
            description: t(lang, "invoiceDescription"),
            payload: `stars_donation_${starAmount}`,
            provider_token: "",
            currency: "XTR",
            prices: [
                { label: `${starAmount} star(s)`, amount: starAmount },
            ],
            start_parameter: `donate-stars-${starAmount}`,
            need_email: false,
            need_name: false,
            is_flexible: false,
        });
    } catch (error) {
        console.error("Error processing donation:", getErrorMessage(error));
        await ctx.reply(t(lang, "donationError"));
    }
};
