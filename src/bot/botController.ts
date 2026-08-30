import { Telegraf } from "telegraf";
import { message } from 'telegraf/filters';
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
    replyWithInvoice,
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

    bot.action("donate_stars", replyWithInvoice);

    bot.hears(["Start", "start"], cropFromStart);

    bot.hears(["End", "end"], cropToEnd);

    bot.hears(["Cancel", "cancel"], handleCancellation);

    bot.hears(/^(\d+(?::\d+)?-\d+(?::\d+)?=\d+%)(,\s*\d+(?::\d+)?-\d+(?::\d+)?=\d+%)*$/, handleVolumeAdjustments); // volume adjustmentsadjustmentsadjustmentsadjustmentsadjustmentsadjustmentsadjustmentsadjustmentsadjustmentsadjustmentsadjustmentsadjustmentsadjustmentsadjustmentsadjustmentsadjustments
    bot.hears(["Done", "done"], handleVolumeAdjustments);

    bot.hears(/\d+/, handleNumberInput);

    bot.hears(/.*/, handleOtherInput);

    // 2. Handle pre_checkout_query
    bot.on('pre_checkout_query', async (ctx) => {
        try {
            console.log('Pre-checkout query:', ctx.update.pre_checkout_query);

            // Always answer pre-checkout query to approve payment
            await ctx.answerPreCheckoutQuery(true);
        } catch (error) {
            console.error('Error answering pre-checkout query:', error);
            // Optionally reject: await ctx.answerPreCheckoutQuery(false, 'Error message');
        }
    });


    // bot.on("successful_payment", async (ctx) => {
    //     console.log('Successful payment');
    //     const paymentInfo = ctx.message.successful_payment;
    //     console.log('Successful payment:', paymentInfo);

    //     const chargeId = paymentInfo.telegram_payment_charge_id;
    //     const amountPaid = paymentInfo.total_amount;
    //     const userId = ctx.from.id;

    //     console.log(`User ${userId} paid ${amountPaid} stars. Charge ID: ${chargeId}`);

    //     await ctx.reply(`🎉 Payment successful! You've donated ${amountPaid} stars. Thank you!`);
    // });

    bot.on(message('successful_payment'), async (ctx) => {
        const paymentInfo = ctx.message.successful_payment;
        console.log('Successful payment:', paymentInfo);

        const chargeId = paymentInfo.telegram_payment_charge_id;
        const amountPaid = paymentInfo.total_amount;
        const userId = ctx.from.id;

        console.log(`User ${userId} paid ${amountPaid} stars. Charge ID: ${chargeId}`);

        await ctx.reply(`🎉 Payment successful! You've donated ${amountPaid} stars. Thank you!`);

        // Deliver goods here
    });

    bot.launch();
};
