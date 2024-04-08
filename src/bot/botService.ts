import { initCropSession, getCropSesssionData, getVideoUrl, clearCropSession, setCropSessionField } from "../utils/userSessions";
import { replyWithAudioPopulated } from "../utils/replyWithAudioPopulated";
import { downloadFullSong, downloadCroppedSong } from "../utils/apiUtils";
import { timeStringToSeconds } from "../utils/secondsConverter";
import { cancelKeyboard, endingKeyboard, inlineCropKeyboard, startingKeyboard } from "../utils/keyboards";
import { Context } from "telegraf";
import { reachedDownloadLimit } from "../utils/rateLimiter";
import { addDownloadedSong, setUser } from "../mongo/services/userService";

export const firstMessage = async (ctx: Context) => {
    try {
        ctx.reply(
            "Hey, welcome! This bot can crop songs and stuff, later there will be an instruction but I'm lazy for now to write it ¯\\_(ツ)_/¯",
        );
        //@ts-ignore
        const { id, first_name, username } = ctx.message.chat;
        console.log(ctx.message.chat);

        setUser({ tg_id: id, username, first_name });
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

        // @ts-ignore
        await initCropSession(chatId, ctx.message.text);
        ctx.reply("Choose an option:", inlineCropKeyboard);
    } catch (error) {
        console.error("Error calling API:", error.message);
        ctx.reply("Error calling the API. Please try again later.");
    }
};

export const getFullSong = async (ctx: Context) => {
    try {
        // @ts-ignore
        const chatId = ctx.update.callback_query.message.chat.id;
        const videoUrl = await getVideoUrl(chatId);

        ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        ctx.reply("Loading...");

        const response = await downloadFullSong(videoUrl);
        console.log("data after success", response.headers);
        replyWithAudioPopulated(ctx, response);
        await clearCropSession(chatId);
        await addDownloadedSong(chatId, videoUrl);
    } catch (error) {
        console.error("Error calling API:", error.message);
        ctx.reply("Error calling the API. Please try again later.");
    }
};

export const cropSong = (ctx: Context) => {
    // @ts-ignore
    const chatId = ctx.update.callback_query.message.chat.id;
    setCropSessionField(chatId, "state", "start");
    ctx.editMessageReplyMarkup({ inline_keyboard: [] });
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

    ctx.reply("Loading...");

    try {
        const response = await downloadCroppedSong(videoUrl, startSecond, "end");
        console.log("data", response.headers);
        replyWithAudioPopulated(ctx, response);
        await clearCropSession(chatId);
        await addDownloadedSong(chatId, videoUrl);
    } catch (error) {
        console.error("Error calling API:", error.message);
        ctx.reply("Error calling the API. Please try again later.");
    }

    await clearCropSession(chatId);
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
            ctx.reply(error);
        }

        ctx.reply("Please provide the end timecode", endingKeyboard);
        setCropSessionField(chatId, "state", "end");
    } else if (userSession.state === "end") {
        try {
            // @ts-ignore
            setCropSessionField(chatId, "endSecond", timeStringToSeconds(ctx.message.text));
        } catch (error) {
            console.error("error converting seconds:", error.message);
            ctx.reply("Please enter the number or a timecode");
            return;
        }

        try {
            const { videoUrl, startSecond, endSecond } = await getCropSesssionData(chatId);

            ctx.reply("Loading...");
            const response = await downloadCroppedSong(videoUrl, startSecond, endSecond);
            console.log("data", response.headers);
            replyWithAudioPopulated(ctx, response);
            await clearCropSession(chatId);
            await addDownloadedSong(chatId, videoUrl);
        } catch (error) {
            console.error("Error calling API:", error.message);
            ctx.reply("Error calling the API. Please try again later.");
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
    ctx.reply("Sure, cancelled the cropping");
    await clearCropSession(chatId);
};
