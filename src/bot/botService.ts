import { initCropSession, getCropSesssionData, getVideoUrl, clearCropSession, setCropSessionField } from "../utils/userSessions";
import { timeStringToSeconds } from "../utils/secondsConverter";
import { cancelKeyboard, endingKeyboard, inlineCropKeyboard, menuKeyboard, startingKeyboard, volumeAdjustmentKeyboard } from "../utils/keyboards";
import { Context } from "telegraf";
import { reachedDownloadLimit } from "../utils/rateLimiters";
import { addReferencedSong, setUser } from "../mongo/services/userService";
import { sendToQueue } from "../queue/rabbit";
import { getAudioByUrl } from "../mongo/services/audioService";
import { unifyYouTubeUrl } from "../utils/unifyURL";

export const firstMessage = async (ctx: Context) => {
    try {
        ctx.reply(
            "Hey, welcome! This bot can crop songs and stuff, later there will be an instruction but I'm lazy for now to write it ¯\\_(ツ)_/¯",
        );
        //@ts-ignore
        const { id, first_name, username } = ctx.message.chat;
        console.log(ctx.message.chat);

        await setUser({ tg_id: id, username, first_name });
    } catch (error) {
        ctx.reply("Bot must be down currently =( \n Please stick around and try in some time!");
        console.error("Error creating user:", error.message);
    }
};

export const respondToYoutubeLink = async (ctx: Context) => {
    try {
        const chatId = ctx.message.chat.id;

        const limitDownload = await reachedDownloadLimit(chatId);
        if (limitDownload) {
            ctx.reply(
                "Sorry, but you have downloaded 10 songs in the last hour. It's a bit too much for my servers, so you have to chill a bit. Try again in some time =)",
            );
            return;
        }

        const existingCropSession = await getCropSesssionData(chatId);
        if (existingCropSession) {
            ctx.reply("Mate, choose what to do with the last song first please");
            return;
        }

        // @ts-ignore
        const unifiedUrl = unifyYouTubeUrl(ctx.message.text);
        await initCropSession(chatId, unifiedUrl);
        ctx.reply("Choose an option:", inlineCropKeyboard);
    } catch (error) {
        console.error("Error calling API:", error.message);
        await clearCropSession(ctx.message.chat.id);
        ctx.reply("Error calling the API. Please try again later.", menuKeyboard);
    }
};

export const getFullSong = async (ctx: Context) => {
    try {
        // @ts-ignore
        const chatId = ctx.update.callback_query.message.chat.id;
        const videoUrl = await getVideoUrl(chatId);

        ctx.editMessageText("Choose an option: Full audio");
        setCropSessionField(chatId, "action", "full");

        const audio = await getAudioByUrl(videoUrl);
        if (audio?.file_id) {
            await ctx.replyWithAudio(audio.file_id, {
                caption: "@ytAudioCropBot",
            });
            await clearCropSession(chatId);
            await addReferencedSong(chatId, videoUrl);
            return;
        }

        ctx.reply("Your request was sent to the queue, please wait...", menuKeyboard);
        await sendToQueue({
            chatId: chatId,
            videoUrl,
            action: "full"
        });

        await clearCropSession(chatId);
    } catch (error) {
        console.error("Error calling API:", error.message);
        // @ts-ignore
        await clearCropSession(ctx.update.callback_query.message.chat.id);
        ctx.reply("Error calling the API. Please try again later.", menuKeyboard);
    }
};

export const cropSong = (ctx: Context) => {
    // @ts-ignore
    const chatId = ctx.update.callback_query.message.chat.id;
    setCropSessionField(chatId, "state", "start");
    setCropSessionField(chatId, "action", "crop");
    ctx.editMessageText("Choose an option: Crop audio");
    ctx.reply("Enter start time (in plain seconds or MM:SS format): ", startingKeyboard);
};

export const silenceSong = (ctx: Context) => {
    // @ts-ignore
    const chatId = ctx.update.callback_query.message.chat.id;
    setCropSessionField(chatId, "state", "start");
    setCropSessionField(chatId, "volumeAdjustments", "");
    setCropSessionField(chatId, "action", "adjust");
    ctx.editMessageText("Choose an option: Volume adjustment");
    ctx.reply("Enter start time (in plain seconds or MM:SS format): ", startingKeyboard);
};

export const cropFromStart = async (ctx: Context) => {
    const chatId = ctx.message.chat.id;
    const userSession = await getCropSesssionData(chatId);

    if (!userSession || userSession.state !== "start") {
        ctx.reply("Invalid session. Please start again.");
        return;
    }

    setCropSessionField(chatId, "startSecond", "start");
    setCropSessionField(chatId, "state", "end");

    ctx.reply("Enter end time: ", endingKeyboard);
};

export const cropToEnd = async (ctx: Context) => {
    const chatId = ctx.message.chat.id;
    const userSession = await getCropSesssionData(chatId);

    if (!userSession || userSession.state !== "end") {
        ctx.reply("Invalid session. Please start again.");
        return;
    }

    setCropSessionField(chatId, "endSecond", "end");

    const { videoUrl, startSecond, action } = userSession;

    // Only show volume adjustments if it's an adjust operation
    if (action === "adjust") {
        ctx.reply(
            "Enter all volume adjustments in one message (up to 10 adjustments).\n" +
            "Format: start-end=percentage%\n" +
            "Example: 36-48=40%, 90-102=40%, 127-156=120%\n\n" +
            "After entering the adjustments, press 'Done' to finish.",
            volumeAdjustmentKeyboard
        );
        setCropSessionField(chatId, "state", "volume");
    } else if (action === "crop") {
        ctx.reply("Your request was sent to the queue, please wait...", menuKeyboard);

        try {
            await sendToQueue({
                chatId: chatId,
                videoUrl,
                startSecond: startSecond === "start" ? "start" : Number(startSecond),
                endSecond: "end",
                action: "crop"
            });

            await clearCropSession(chatId);
        } catch (error) {
            console.error("Error calling API:", error.message);
            await clearCropSession(ctx.message.chat.id);
            ctx.reply("Error calling the API. Please try again later.", menuKeyboard);
        }
    }
};

export const handleNumberInput = async (ctx: Context) => {
    const chatId = ctx.message.chat.id;
    const userSession = await getCropSesssionData(chatId);

    if (!userSession) {
        ctx.reply("Invalid session. Please start again.");
        return;
    }

    if (userSession.state === "start") {
        try {
            // @ts-ignore
            setCropSessionField(chatId, "startSecond", timeStringToSeconds(ctx.message.text));
        } catch (error) {
            console.log("error", error.message);
            ctx.reply(error.message);
            return;
        }

        ctx.reply("Please enter the number or a timecode in MM:SS or M:SS format, or just a number of seconds.", endingKeyboard);
        setCropSessionField(chatId, "state", "end");
    } else if (userSession.state === "end") {
        try {
            // @ts-ignore
            const endSecond = timeStringToSeconds(ctx.message.text);
            await setCropSessionField(chatId, "endSecond", endSecond);

            // Get fresh session data after updating endSecond
            const updatedSession = await getCropSesssionData(chatId);
            if (!updatedSession) {
                ctx.reply("Session expired. Please start again.");
                return;
            }

            // Only show volume adjustments if it's an adjust operation
            if (updatedSession.action === "adjust") {
                ctx.reply(
                    "Enter all volume adjustments in one message (up to 10 adjustments).\n" +
                    "Format: start-end=percentage%\n" +
                    "Example: 36-48=40%, 90-102=40%, 127-156=120%\n\n" +
                    "After entering the adjustments, press 'Done' to finish.",
                    volumeAdjustmentKeyboard
                );
                await setCropSessionField(chatId, "state", "volume");
            } else if (updatedSession.action === "crop") {
                // Regular crop behavior
                const { videoUrl, startSecond, endSecond } = updatedSession;

                ctx.reply("Your request was sent to the queue, please wait...", menuKeyboard);

                try {
                    await sendToQueue({
                        chatId: chatId,
                        videoUrl,
                        startSecond: startSecond === "start" ? "start" : Number(startSecond),
                        endSecond: Number(endSecond),
                        action: "crop"
                    });

                    await clearCropSession(chatId);
                } catch (error) {
                    console.error("Error calling API:", error.message);
                    await clearCropSession(ctx.message.chat.id);
                    ctx.reply("Error calling the API. Please try again later.", menuKeyboard);
                }
            }
        } catch (error) {
            console.error("error converting seconds:", error.message);
            ctx.reply("Please enter the number or a timecode in MM:SS or M:SS format, or just a number of seconds.");
            return;
        }
    }
};

export const handleOtherInput = async (ctx: Context) => {
    const chatId = ctx.message.chat.id;
    const userSession = await getCropSesssionData(chatId);

    if (userSession && userSession.state) {
        if (userSession.state === "start") {
            ctx.reply("Enter starting time you want to crop from or press cancel", startingKeyboard);
            return;
        }

        if (userSession.state === "end") {
            ctx.reply("Enter ending time you want to crop to or press cancel", endingKeyboard);
            return;
        }

        ctx.reply("Please click a button or press cancel", cancelKeyboard);
    }
    console.log(ctx.message?.chat);
    ctx.reply("Hello");
};

export const handleCancellation = async (ctx: Context) => {
    const chatId = ctx.message.chat.id;
    ctx.reply("Sure, cancelled the cropping", menuKeyboard);
    await clearCropSession(chatId, "cancelled");
};

export const cancelCrop = async (ctx: Context) => {
    // @ts-ignore
    const chatId = ctx.update.callback_query.message.chat.id;
    ctx.editMessageText("Choose an option: Cancelled");
    ctx.reply("Sure, cancelled this crop", menuKeyboard);
    await clearCropSession(chatId, "cancelled");
};

export const handleVolumeAdjustments = async (ctx: Context) => {
    const chatId = ctx.message.chat.id;
    const userSession = await getCropSesssionData(chatId);

    if (!userSession || userSession.state !== "volume") {
        ctx.reply("Invalid session. Please start again.");
        return;
    }

    // @ts-ignore
    const input = ctx.message.text;

    // Handle "Done" trigger separately
    if (input.toLowerCase() === "done") {
        const { videoUrl, startSecond, endSecond, volumeAdjustments } = userSession;

        if (!volumeAdjustments || volumeAdjustments === "") {
            ctx.reply(
                "You haven't specified any volume adjustments yet.\n\n" +
                "Please enter all adjustments (up to 10) in one message:\n" +
                "Example: 1:28-2:15=40%, 4:30-5:10=120%",
                volumeAdjustmentKeyboard
            );
            return;
        }

        ctx.reply("Your request was sent to the queue, please wait...", menuKeyboard);

        try {
            await sendToQueue({
                chatId: chatId,
                videoUrl,
                startSecond,
                endSecond,
                volumeAdjustments,
                action: "adjust"
            });

            await clearCropSession(chatId);
        } catch (error) {
            console.error("Error calling API:", error.message);
            await clearCropSession(ctx.message.chat.id);
            ctx.reply("Error calling the API. Please try again later.", menuKeyboard);
        }
        return;
    }

    // Handle volume adjustment input
    const adjustments = input.split(", ");

    // Check number of adjustments
    if (adjustments.length > 10) {
        ctx.reply(
            "Too many adjustments! Please enter a maximum of 10 adjustments in one message.",
            volumeAdjustmentKeyboard
        );
        return;
    }

    try {
        // Validate and convert each adjustment
        const convertedAdjustments = adjustments.map(adj => {
            // Split into times and percentage parts
            const match = adj.match(/^([\d:]+)-([\d:]+)=(\d+)%$/);
            if (!match) {
                throw new Error("Invalid format");
            }

            const [_, startStr, endStr, percentageStr] = match;

            // Convert times to seconds
            const start = timeStringToSeconds(startStr);
            const end = timeStringToSeconds(endStr);

            // Validate time range
            if (start >= end) {
                throw new Error("Start time must be less than end time");
            }

            // Parse and validate percentage
            const percentage = parseInt(percentageStr, 10);
            if (percentage < 0 || percentage > 5000) {
                throw new Error("Volume percentage must be between 0% and 5000%");
            }

            return `${start}-${end}=${percentage}%`;
        });

        // Save the valid adjustments with converted times
        await setCropSessionField(chatId, "volumeAdjustments", convertedAdjustments.join(", "));
        ctx.reply(
            "Volume adjustments saved. Press 'Done' to process your request.",
            volumeAdjustmentKeyboard
        );
    } catch (error) {
        if (error.message === "Start time must be less than end time") {
            ctx.reply(
                "Invalid time range: start time must be less than end time for each adjustment.",
                volumeAdjustmentKeyboard
            );
        } else if (error.message === "Volume percentage must be between 0% and 5000%") {
            ctx.reply(
                "Invalid volume percentage! Volume must be between 0% and 5000%.",
                volumeAdjustmentKeyboard
            );
        } else {
            ctx.reply(
                "Please enter adjustments in the correct format:\n" +
                "Example: 1:28-2:15=40%, 4:30-5:10=120%\n" +
                "Each adjustment should be in the format: start-end=percentage%\n" +
                "Time can be in M:SS format (e.g., 1:28) or seconds (e.g., 88)",
                volumeAdjustmentKeyboard
            );
        }
    }
};
