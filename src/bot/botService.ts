import { initCropSession, getCropSesssionData, getVideoUrl, clearCropSession, setCropSessionField } from "../utils/userSessions";
import { timeStringToSeconds } from "../utils/secondsConverter";
import { cancelKeyboard, endingKeyboard, inlineCropKeyboard, menuKeyboard, startingKeyboard } from "../utils/keyboards";
import { Context } from "telegraf";
import { reachedDownloadLimit } from "../utils/rateLimiter";
import { setUser } from "../mongo/services/userService";
import { sendToQueue } from "../queue/rabbit";
import { getAudioByUrl } from "../mongo/services/audioService";

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
        await initCropSession(chatId, ctx.message.text);
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

        const audio = await getAudioByUrl(videoUrl);
        if (audio?.file_id) {
            await ctx.replyWithAudio(audio.file_id, {
                // title: audio.audio_name,
                // duration: audio.duration,
                // performer: audio?.channel_name,
                // thumbnail: { url: info.videoDetails?.thumbnail?.thumbnails?.[0]?.url },
                caption: "@ytAudioCropBot",
            });
            await clearCropSession(chatId);
            return;
        }

        ctx.reply("Your request was sent to the queue, please wait...", menuKeyboard);
        await sendToQueue({
            chatId: chatId,
            videoUrl,
        });

        await clearCropSession(chatId);
        // const response = await downloadFullSong(videoUrl);
        // console.log("data after success", response.headers);
        // console.log("data after success", response.data);

        // await replyWithAudioPopulated(ctx, response);
        // await clearCropSession(chatId);
        // await addDownloadedSong(chatId, videoUrl);
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
    ctx.editMessageText("Choose an option: Crop audio");
    // ctx.editMessageReplyMarkup({ inline_keyboard: [] });
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

    const { videoUrl, startSecond } = userSession;

    ctx.reply("Your request was sent to the queue, please wait...", menuKeyboard);

    try {
        await sendToQueue({
            chatId: chatId,
            videoUrl,
            startSecond,
            endSecond: "end",
        });

        await clearCropSession(chatId);
    } catch (error) {
        console.error("Error calling API:", error.message);
        await clearCropSession(ctx.message.chat.id);
        ctx.reply("Error calling the API. Please try again later.", menuKeyboard);
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
            setCropSessionField(chatId, "endSecond", timeStringToSeconds(ctx.message.text));
        } catch (error) {
            console.error("error converting seconds:", error.message);
            ctx.reply("Please enter the number or a timecode in MM:SS or M:SS format, or just a number of seconds.");
            return;
        }

        try {
            const { videoUrl, startSecond, endSecond } = await getCropSesssionData(chatId);

            ctx.reply("Your request was sent to the queue, please wait...", menuKeyboard);

            await sendToQueue({
                chatId: chatId,
                videoUrl,
                startSecond,
                endSecond,
            });

            await clearCropSession(chatId);
        } catch (error) {
            console.error("Error calling API:", error.message);
            await clearCropSession(ctx.message.chat.id);
            ctx.reply("Error calling the API. Please try again later.", menuKeyboard);
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
    await clearCropSession(chatId);
};

export const cancelCrop = async (ctx: Context) => {
    // @ts-ignore
    const chatId = ctx.update.callback_query.message.chat.id;
    ctx.editMessageText("Choose an option: Cancelled");
    ctx.reply("Sure, cancelled this crop", menuKeyboard);
    await clearCropSession(chatId);
};
