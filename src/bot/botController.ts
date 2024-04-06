import { Telegraf } from "telegraf";
import {
    cropFromStart,
    cropSong,
    cropToEnd,
    firstMessage,
    getFullSong,
    handleCancellation,
    handleNumberInput,
    handleOtherInput,
    respondToYoutubeLink,
} from "./botService";
import * as dotenv from "dotenv";
dotenv.config();
const { TOKEN } = process.env;

export const setupBot = () => {
    const bot = new Telegraf(TOKEN);

    bot.start(firstMessage);

    bot.hears(/.*youtube\.com.*|.*youtu\.be.*/, respondToYoutubeLink);

    bot.action("full", getFullSong);

    bot.action("crop", cropSong);

    bot.hears(["Start", "start"], cropFromStart);

    bot.hears(["End", "end"], cropToEnd);

    bot.hears(["Cancel", "cancel"], handleCancellation);

    bot.hears(/\d+/, handleNumberInput);

    bot.hears(/.*/, handleOtherInput);

    bot.launch();
};
