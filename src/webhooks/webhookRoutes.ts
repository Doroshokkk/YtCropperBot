import { Router } from "express";
import * as dotenv from "dotenv";
import { addDownloadedSong } from "../mongo/services/userService";
dotenv.config();

const webhookRouter = Router();
const { TOKEN } = process.env;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

console.log("webhook init");

webhookRouter.post("/webhook/audio-processed", async (req, res) => {
    const { chatId, s3Url } = req.body;

    console.log("Received audio-processed data from webhook:");
    console.log(`Chat ID: ${chatId}`);

    // await replyWithAudioWebhook(chatId, req.body);
    // await clearCropSession(chatId);

    await addDownloadedSong(chatId, s3Url);

    res.sendStatus(200);
});

export default webhookRouter;
