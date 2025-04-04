import { Telegraf } from "telegraf";
import {
    cancelCrop,
    cropFromStart,
    cropSong,
    cropToEnd,
    firstMessage,
    getFullSong,
    handleCancellation,
    handleNumberInput,
    handleOtherInput,
    respondToYoutubeLink,
    silenceSong,
    handleVolumeAdjustments,
} from "./botService";
import { messageRateLimiter } from "../middlewares/messageRateLimiter";
import * as dotenv from "dotenv";
dotenv.config();
const { TOKEN } = process.env;

export const setupBot = () => {
    const bot = new Telegraf(TOKEN);

    bot.use(messageRateLimiter);

    bot.start(firstMessage);

    bot.hears(/.*youtube\.com.*|.*youtu\.be.*/, respondToYoutubeLink);

    bot.action("full", getFullSong);

    bot.action("crop", cropSong);

    bot.action("silence", silenceSong);

    bot.action("cancel", cancelCrop);

    bot.hears(["Start", "start"], cropFromStart);

    bot.hears(["End", "end"], cropToEnd);

    bot.hears(["Cancel", "cancel"], handleCancellation);

    bot.hears(/^(\d+(?::\d+)?-\d+(?::\d+)?=\d+%)(,\s*\d+(?::\d+)?-\d+(?::\d+)?=\d+%)*$/, handleVolumeAdjustments);
    bot.hears(["Done", "done"], handleVolumeAdjustments);

    bot.hears(/\d+/, handleNumberInput);

    bot.hears(/.*/, handleOtherInput);

    bot.launch();
};
