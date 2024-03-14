import {
    userSessions,
    initCropSession,
    getCropSesssionData,
    getVideoUrl,
    clearCropSession,
    setCropSessionField,
} from "../utils/userSessions";
import { replyWithAudioPopulated } from "../utils/replyWithAudioPopulated";
import { downloadFullSong, downloadCroppedSong } from "../utils/apiUtils";
import { timeStringToSeconds } from "../utils/secondsConverter";

export const respondToYoutubeLink = async (ctx) => {
    const chatId = ctx.message.chat.id;
    const keyboard = {
        reply_markup: {
            inline_keyboard: [[{ text: "Full", callback_data: "full" }], [{ text: "Crop", callback_data: "crop" }]],
        },
    };

    await initCropSession(chatId, ctx.message.text);

    ctx.reply("Choose an option:", keyboard);
};

export const getFullSong = async (ctx) => {
    const chatId = ctx.update.callback_query.message.chat.id;
    const videoUrl = await getVideoUrl(chatId);

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
    const keyboard = {
        reply_markup: {
            keyboard: [[{ text: "Start" }]],
            one_time_keyboard: false,
        },
    };

    setCropSessionField(chatId, "state", "start");

    ctx.reply("Enter start time (in plain seconds or MM:SS format): ", keyboard);
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

    // userSession.startSecond = "start";
    // userSession.state = "end";

    const keyboard = {
        reply_markup: {
            keyboard: [[{ text: "End" }]],
            one_time_keyboard: true, // Hide the keyboard after a button is pressed
        },
    };

    ctx.reply("Enter end time: ", keyboard);
};

export const cropToEnd = async (ctx) => {
    const chatId = ctx.message.chat.id;
    const userSession = await getCropSesssionData(chatId);

    if (!userSession || userSession.state !== "end") {
        ctx.reply("Invalid session. Please start again.");
        return;
    }

    setCropSessionField(chatId, "endSecond", "end");

    // userSession.endSecond = "end";

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
    const userSession = userSessions.get(chatId);

    if (!userSession) {
        ctx.reply("Invalid session. Please start again.");
        return;
    }

    if (userSession.state === "start") {
        try {
            // userSession.startSecond = parseFloat(ctx.message.text);
            userSession.startSecond = timeStringToSeconds(ctx.message.text);
        } catch (error) {
            ctx.reply(error);
        }

        const keyboard = {
            reply_markup: {
                keyboard: [[{ text: "End" }]],
                one_time_keyboard: true, // Hide the keyboard after a button is pressed
            },
        };

        ctx.reply("Please provide the end timecode", keyboard);
        userSession.state = "end";
    } else if (userSession.state === "end") {
        try {
            // userSession.endSecond = parseFloat(ctx.message.text);
            userSession.endSecond = timeStringToSeconds(ctx.message.text);
        } catch (error) {
            ctx.reply("Enter a number pls man");
        }

        const { videoUrl, startSecond, endSecond } = userSession;

        ctx.reply("Loading...");
        try {
            const response = await downloadCroppedSong(videoUrl, startSecond, endSecond);

            console.log("data", response.headers);

            replyWithAudioPopulated(ctx, response);
        } catch (error) {
            console.error("Error calling API:", error.message);
            ctx.reply("Error calling the API. Please try again later.");
        }

        userSessions.delete(chatId);
    }
};

export const handleOtherInput = (ctx) => {
    const chatId = ctx.message.chat.id;
    const userSession = userSessions.get(chatId);

    if (userSession && userSession.state) {
        if (userSession.state === "start") {
            ctx.reply("Enter starting time you want to crop from");
            return;
        }

        if (userSession.state === "end") {
            ctx.reply("Enter ending time you want to crop to");
            return;
        }
        //cancel behaviour
    }
    console.log(ctx.message?.chat);
    ctx.reply("Hello");
};
