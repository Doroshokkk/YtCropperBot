import { initCropSession, getCropSesssionData, getVideoUrl, clearCropSession, setCropSessionField } from "../utils/userSessions";
import { replyWithAudioPopulated } from "../utils/replyWithAudioPopulated";
import { downloadFullSong, downloadCroppedSong } from "../utils/apiUtils";
import { timeStringToSeconds } from "../utils/secondsConverter";
import { cancelKeyboard, endingKeyboard, inlineCropKeyboard, startingKeyboard } from "../utils/keyboards";

export const respondToYoutubeLink = async (ctx) => {
    const chatId = ctx.message.chat.id;

    await initCropSession(chatId, ctx.message.text);

    ctx.reply("Choose an option:", inlineCropKeyboard);
};

export const getFullSong = async (ctx) => {
    const chatId = ctx.update.callback_query.message.chat.id;
    const videoUrl = await getVideoUrl(chatId);

    ctx.editMessageText(undefined, undefined, "Choose an option:");

    ctx.reply("Loading...");
    try {
        const response = await downloadFullSong(videoUrl);
        console.log("data after success", response.headers);
        replyWithAudioPopulated(ctx, response);
        clearCropSession(chatId);
    } catch (error) {
        console.error("Error calling API:", error.message);
        ctx.reply("Error calling the API. Please try again later.");
    }
};

export const cropSong = (ctx) => {
    const chatId = ctx.update.callback_query.message.chat.id;
    setCropSessionField(chatId, "state", "start");

    ctx.editMessageText(undefined, undefined, "Choose an option:");

    ctx.reply("Enter start time (in plain seconds or MM:SS format): ", startingKeyboard);
};

export const cropFromStart = async (ctx) => {
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

export const cropToEnd = async (ctx) => {
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
        clearCropSession(chatId);
    } catch (error) {
        console.error("Error calling API:", error.message);
        ctx.reply("Error calling the API. Please try again later.");
    }

    clearCropSession(chatId);
};

export const handleNumberInput = async (ctx) => {
    const chatId = ctx.message.chat.id;
    const userSession = await getCropSesssionData(chatId);

    if (!userSession) {
        ctx.reply("Invalid session. Please start again.");
        return;
    }

    if (userSession.state === "start") {
        try {
            setCropSessionField(chatId, "startSecond", timeStringToSeconds(ctx.message.text));
        } catch (error) {
            ctx.reply(error);
        }

        ctx.reply("Please provide the end timecode", endingKeyboard);
        setCropSessionField(chatId, "state", "end");
    } else if (userSession.state === "end") {
        try {
            setCropSessionField(chatId, "endSecond", timeStringToSeconds(ctx.message.text));
        } catch (error) {
            ctx.reply("Please enter the number or a timecode");
        }

        const { videoUrl, startSecond, endSecond } = await getCropSesssionData(chatId);

        ctx.reply("Loading...");
        try {
            const response = await downloadCroppedSong(videoUrl, startSecond, endSecond);
            console.log("data", response.headers);
            replyWithAudioPopulated(ctx, response);
        } catch (error) {
            console.error("Error calling API:", error.message);
            ctx.reply("Error calling the API. Please try again later.");
        }

        clearCropSession(chatId);
    }
};

export const handleOtherInput = async (ctx) => {
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

export const handleCancellation = async (ctx) => {
    const chatId = ctx.message.chat.id;
    ctx.reply("Sure, cancelled the cropping");
    clearCropSession(chatId);
};
