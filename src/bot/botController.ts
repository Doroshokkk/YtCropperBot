import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import {
    cancelCrop,
    cropFromStart,
    cropSong,
    cropToEnd,
    firstMessage,
    getFullSong,
    handleCancellation,
    handleDonateAction,
    handleNumberInput,
    handleOtherInput,
    handleSuccessfulPayment,
    respondToYoutubeLink,
    showDonateMenu,
    silenceSong,
    handleVolumeAdjustments,
} from "./botService";
import { messageRateLimiter } from "../middlewares/messageRateLimiter";
import * as dotenv from "dotenv";
dotenv.config();
const { TOKEN } = process.env;

export const setupBot = () => {
    const bot = new Telegraf(TOKEN as string);

    bot.use(messageRateLimiter);

    bot.start(firstMessage);

    bot.hears(/.*youtube\.com.*|.*youtu\.be.*/, respondToYoutubeLink);

    bot.action("full", getFullSong);

    bot.action("crop", cropSong);

    bot.action("silence", silenceSong);

    bot.action("cancel", cancelCrop);

    bot.action(/^donate_(\d+)$/, handleDonateAction);

    bot.hears(["Start", "start"], cropFromStart);

    bot.hears(["End", "end"], cropToEnd);

    bot.hears(["Cancel", "cancel"], handleCancellation);

    bot.hears(["Donate", "donate"], showDonateMenu);

    bot.hears(/^(\d+(?::\d+)?-\d+(?::\d+)?=\d+%)(,\s*\d+(?::\d+)?-\d+(?::\d+)?=\d+%)*$/, handleVolumeAdjustments);
    bot.hears(["Done", "done"], handleVolumeAdjustments);

    bot.hears(/\d+/, handleNumberInput);

    bot.hears(/.*/, handleOtherInput);

    bot.on("pre_checkout_query", async (ctx) => {
        try {
            console.log("Pre-checkout query:", ctx.update.pre_checkout_query);
            await ctx.answerPreCheckoutQuery(true);
        } catch (error) {
            console.error("Error answering pre-checkout query:", error);
        }
    });

    bot.on(message("successful_payment"), handleSuccessfulPayment);

    bot.launch();
};
