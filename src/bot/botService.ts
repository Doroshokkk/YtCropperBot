import { initCropSession, getCropSesssionData, getVideoUrl, clearCropSession, setCropSessionField } from "../utils/userSessions";
import { timeStringToSeconds } from "../utils/secondsConverter";
import { cancelKeyboard, endingKeyboard, inlineCropKeyboard, inlineDonateKeyboard, menuKeyboard, startingKeyboard, volumeAdjustmentKeyboard } from "../utils/keyboards";
import { Context } from "telegraf";
import { reachedDownloadLimit } from "../utils/rateLimiters";
import { addReferencedSong, creditStars, getStarsLeft, setUser } from "../mongo/services/userService";
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

async function finishDownload(ctx: Context, chatId: number, outcome?: string) {
    const credit = await clearCropSession(chatId, outcome);
    if (credit) {
        await ctx.reply(`⭐ Used ${credit.starsConsumed} star(s). You have ${credit.starsLeft} stars left.`);
    }
}

export const firstMessage = async (ctx: Context) => {
    try {
        await ctx.reply(
            "Hey, welcome! This bot can crop songs and stuff, later there will be an instruction but I'm lazy for now to write it ¯\\_(ツ)_/¯",
        );

        const user = ctx.from;
        if (!user) {
            return;
        }

        console.log(user);

        await setUser({ tg_id: user.id, username: user.username ?? "", first_name: user.first_name });
    } catch (error) {
        await ctx.reply("Bot must be down currently =( \n Please stick around and try in some time!");
        console.error("Error creating user:", getErrorMessage(error));
    }
};

export const respondToYoutubeLink = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId, text } = textMessage;

    try {
        const limitDownload = await reachedDownloadLimit(chatId);
        if (limitDownload) {
            await ctx.reply(
                "Sorry, but you have downloaded 10 songs in the last hour. It's a bit too much for my servers, so you have to chill a bit. Try again in some time =)",
            );
            await ctx.reply("You can donate stars to get more downloads, or wait for the limit to reset. 1 star = 1 download", inlineDonateKeyboard);
            return;
        }

        const existingCropSession = await getCropSesssionData(chatId);
        if (existingCropSession) {
            await ctx.reply("Mate, choose what to do with the last song first please");
            return;
        }

        const unifiedUrl = unifyYouTubeUrl(text);
        await initCropSession(chatId, unifiedUrl);
        await ctx.reply("Choose an option:", inlineCropKeyboard);
    } catch (error) {
        console.error("Error calling API:", getErrorMessage(error));
        await finishDownload(ctx, chatId);
        await ctx.reply("Error calling the API. Please try again later.", menuKeyboard);
    }
};

export const getFullSong = async (ctx: Context) => {
    const chatId = getCallbackChatId(ctx);
    if (!chatId) {
        return;
    }

    try {
        const videoUrl = await getVideoUrl(chatId);
        if (!videoUrl) {
            await ctx.reply("Session expired. Please send the link again.", menuKeyboard);
            await clearCropSession(chatId, "cancelled");
            return;
        }

        await ctx.editMessageText("Choose an option: Full audio");
        setCropSessionField(chatId, "action", "full");

        const audio = await getAudioByUrl(videoUrl);
        if (audio?.file_id) {
            await ctx.replyWithAudio(audio.file_id, {
                caption: "@ytAudioCropBot",
            });
            await finishDownload(ctx, chatId);
            await addReferencedSong(chatId, videoUrl);
            return;
        }

        await ctx.reply("Your request was sent to the queue, please wait...", menuKeyboard);
        await sendToQueue({
            chatId: chatId,
            videoUrl,
            action: "full"
        });

        await finishDownload(ctx, chatId);
    } catch (error) {
        console.error("Error calling API:", getErrorMessage(error));
        await finishDownload(ctx, chatId);
        await ctx.reply("Error calling the API. Please try again later.", menuKeyboard);
    }
};

export const cropSong = (ctx: Context) => {
    const chatId = getCallbackChatId(ctx);
    if (!chatId) {
        return;
    }

    setCropSessionField(chatId, "state", "start");
    setCropSessionField(chatId, "action", "crop");
    ctx.editMessageText("Choose an option: Crop audio");
    ctx.reply("Enter start time (in plain seconds or MM:SS format): ", startingKeyboard);
};

export const silenceSong = (ctx: Context) => {
    const chatId = getCallbackChatId(ctx);
    if (!chatId) {
        return;
    }

    setCropSessionField(chatId, "state", "start");
    setCropSessionField(chatId, "volumeAdjustments", "");
    setCropSessionField(chatId, "action", "adjust");
    ctx.editMessageText("Choose an option: Volume adjustment");
    ctx.reply("Enter start time (in plain seconds or MM:SS format): ", startingKeyboard);
};

export const cropFromStart = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId } = textMessage;
    const userSession = await getCropSesssionData(chatId);

    if (!userSession || userSession.state !== "start") {
        await ctx.reply("Invalid session. Please start again.");
        return;
    }

    setCropSessionField(chatId, "startSecond", "start");
    setCropSessionField(chatId, "state", "end");

    await ctx.reply("Enter end time: ", endingKeyboard);
};

export const cropToEnd = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId } = textMessage;
    const userSession = await getCropSesssionData(chatId);

    if (!userSession || userSession.state !== "end") {
        await ctx.reply("Invalid session. Please start again.");
        return;
    }

    setCropSessionField(chatId, "endSecond", "end");

    const { videoUrl, startSecond, action } = userSession;

    if (action === "adjust") {
        await ctx.reply(
            "Enter all volume adjustments in one message (up to 10 adjustments).\n" +
            "Format: start-end=percentage%\n" +
            "Example: 36-48=40%, 90-102=40%, 127-156=120%\n\n" +
            "After entering the adjustments, press 'Done' to finish.",
            volumeAdjustmentKeyboard
        );
        setCropSessionField(chatId, "state", "volume");
    } else if (action === "crop") {
        await ctx.reply("Your request was sent to the queue, please wait...", menuKeyboard);

        try {
            await sendToQueue({
                chatId: chatId,
                videoUrl,
                startSecond: startSecond === "start" ? "start" : Number(startSecond),
                endSecond: "end",
                action: "crop"
            });

            await finishDownload(ctx, chatId);
        } catch (error) {
            console.error("Error calling API:", getErrorMessage(error));
            await finishDownload(ctx, chatId);
            await ctx.reply("Error calling the API. Please try again later.", menuKeyboard);
        }
    }
};

export const handleNumberInput = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId, text } = textMessage;
    const userSession = await getCropSesssionData(chatId);

    if (!userSession) {
        await ctx.reply("Invalid session. Please start again.");
        return;
    }

    if (userSession.state === "start") {
        try {
            setCropSessionField(chatId, "startSecond", timeStringToSeconds(text));
        } catch (error) {
            console.log("error", getErrorMessage(error));
            await ctx.reply(getErrorMessage(error));
            return;
        }

        await ctx.reply("Please enter the number or a timecode in MM:SS or M:SS format, or just a number of seconds.", endingKeyboard);
        setCropSessionField(chatId, "state", "end");
    } else if (userSession.state === "end") {
        try {
            const endSecond = timeStringToSeconds(text);
            await setCropSessionField(chatId, "endSecond", endSecond);

            const updatedSession = await getCropSesssionData(chatId);
            if (!updatedSession) {
                await ctx.reply("Session expired. Please start again.");
                return;
            }

            if (updatedSession.action === "adjust") {
                await ctx.reply(
                    "Enter all volume adjustments in one message (up to 10 adjustments).\n" +
                    "Format: start-end=percentage%\n" +
                    "Example: 36-48=40%, 90-102=40%, 127-156=120%\n\n" +
                    "After entering the adjustments, press 'Done' to finish.",
                    volumeAdjustmentKeyboard
                );
                await setCropSessionField(chatId, "state", "volume");
            } else if (updatedSession.action === "crop") {
                const { videoUrl, startSecond, endSecond: sessionEndSecond } = updatedSession;

                await ctx.reply("Your request was sent to the queue, please wait...", menuKeyboard);

                try {
                    await sendToQueue({
                        chatId: chatId,
                        videoUrl,
                        startSecond: startSecond === "start" ? "start" : Number(startSecond),
                        endSecond: Number(sessionEndSecond),
                        action: "crop"
                    });

                    await finishDownload(ctx, chatId);
                } catch (error) {
                    console.error("Error calling API:", getErrorMessage(error));
                    await finishDownload(ctx, chatId);
                    await ctx.reply("Error calling the API. Please try again later.", menuKeyboard);
                }
            }
        } catch (error) {
            console.error("error converting seconds:", getErrorMessage(error));
            await ctx.reply("Please enter the number or a timecode in MM:SS or M:SS format, or just a number of seconds.");
        }
    }
};

export const handleOtherInput = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId } = textMessage;
    const userSession = await getCropSesssionData(chatId);

    if (userSession && userSession.state) {
        if (userSession.state === "start") {
            await ctx.reply("Enter starting time you want to crop from or press cancel", startingKeyboard);
            return;
        }

        if (userSession.state === "end") {
            await ctx.reply("Enter ending time you want to crop to or press cancel", endingKeyboard);
            return;
        }

        await ctx.reply("Please click a button or press cancel", cancelKeyboard);
        return;
    }

    console.log(ctx.message?.chat);
    await ctx.reply("Hello");
};

export const handleCancellation = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId } = textMessage;
    await ctx.reply("Sure, cancelled the cropping", menuKeyboard);
    await clearCropSession(chatId, "cancelled");
};

export const cancelCrop = async (ctx: Context) => {
    const chatId = getCallbackChatId(ctx);
    if (!chatId) {
        return;
    }

    await ctx.editMessageText("Choose an option: Cancelled");
    await ctx.reply("Sure, cancelled this crop", menuKeyboard);
    await clearCropSession(chatId, "cancelled");
};

export const handleVolumeAdjustments = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const { chatId, text: input } = textMessage;
    const userSession = await getCropSesssionData(chatId);

    if (!userSession || userSession.state !== "volume") {
        await ctx.reply("Invalid session. Please start again.");
        return;
    }

    if (input.toLowerCase() === "done") {
        const { videoUrl, startSecond, endSecond, volumeAdjustments } = userSession;

        if (!volumeAdjustments || volumeAdjustments === "") {
            await ctx.reply(
                "You haven't specified any volume adjustments yet.\n\n" +
                "Please enter all adjustments (up to 10) in one message:\n" +
                "Example: 1:28-2:15=40%, 4:30-5:10=120%",
                volumeAdjustmentKeyboard
            );
            return;
        }

        await ctx.reply("Your request was sent to the queue, please wait...", menuKeyboard);

        try {
            await sendToQueue({
                chatId: chatId,
                videoUrl,
                startSecond,
                endSecond,
                volumeAdjustments,
                action: "adjust"
            });

            await finishDownload(ctx, chatId);
        } catch (error) {
            console.error("Error calling API:", getErrorMessage(error));
            await finishDownload(ctx, chatId);
            await ctx.reply("Error calling the API. Please try again later.", menuKeyboard);
        }
        return;
    }

    const adjustments = input.split(", ");

    if (adjustments.length > 10) {
        await ctx.reply(
            "Too many adjustments! Please enter a maximum of 10 adjustments in one message.",
            volumeAdjustmentKeyboard
        );
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
        await ctx.reply(
            "Volume adjustments saved. Press 'Done' to process your request.",
            volumeAdjustmentKeyboard
        );
    } catch (error) {
        const message = getErrorMessage(error);

        if (message === "Start time must be less than end time") {
            await ctx.reply(
                "Invalid time range: start time must be less than end time for each adjustment.",
                volumeAdjustmentKeyboard
            );
        } else if (message === "Volume percentage must be between 0% and 5000%") {
            await ctx.reply(
                "Invalid volume percentage! Volume must be between 0% and 5000%.",
                volumeAdjustmentKeyboard
            );
        } else {
            await ctx.reply(
                "Please enter adjustments in the correct format:\n" +
                "Example: 1:28-2:15=40%, 4:30-5:10=120%\n" +
                "Each adjustment should be in the format: start-end=percentage%\n" +
                "Time can be in M:SS format (e.g., 1:28) or seconds (e.g., 88)",
                volumeAdjustmentKeyboard
            );
        }
    }
};

export const showDonateMenu = async (ctx: Context) => {
    const textMessage = getTextMessage(ctx);
    if (!textMessage) {
        return;
    }

    const starsLeft = await getStarsLeft(textMessage.chatId);
    await ctx.reply(`You have ${starsLeft} stars. Choose how many to buy:`, inlineDonateKeyboard);
};

export const handleDonateAction = async (ctx: Context) => {
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

    await replyWithInvoice(ctx, amount);
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

    const chargeId = paymentInfo.telegram_payment_charge_id;
    const amountPaid = paymentInfo.total_amount;

    console.log(`User ${userId} paid ${amountPaid} stars. Charge ID: ${chargeId}`);

    await setUser({
        tg_id: userId,
        username: ctx.from?.username ?? "",
        first_name: ctx.from?.first_name,
    });

    const starsLeft = await creditStars(userId, amountPaid, chargeId);
    await ctx.reply(`🎉 Payment successful! You've received ${amountPaid} stars. You now have ${starsLeft} stars.`);
};

export const replyWithInvoice = async (ctx: Context, starAmount: number) => {
    try {
        await ctx.answerCbQuery();
        return ctx.replyWithInvoice({
            title: "Donate stars",
            description: "You can donate stars to get more downloads, or wait for the limit to reset. 1 star = 1 download",
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
        await ctx.reply("An error occurred while processing your donation. Please try again later.");
    }
};
