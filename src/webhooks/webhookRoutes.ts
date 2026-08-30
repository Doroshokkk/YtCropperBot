import { Router } from "express";
import * as dotenv from "dotenv";
import { addDownloadedSong } from "../mongo/services/userService";
import { Audio } from "../mongo/models/Audio";
import { createAudioRecord } from "../mongo/services/audioService";
import { confirmDownloadCredit } from "../utils/rateLimiters";
import { notifyDownloadFailed } from "../utils/downloadFailure";
dotenv.config();

const webhookRouter = Router();

console.log("webhook init");

webhookRouter.post("/webhook/audio-processed", async (req, res) => {
    try {
        const { chatId, youtube_url, audio_name, duration, isCropped, channel_name, file_id } = req.body;

        console.log("Received audio-processed data from webhook:");
        console.log(`Chat ID: ${chatId}`);

        const audioInfo: Audio = {
            youtube_url,
            audio_name,
            duration,
            channel_name,
            file_id,
        };

        const audioRecord = await createAudioRecord(audioInfo, isCropped);
        console.log("audioRecord", audioRecord);

        await addDownloadedSong(chatId, audioInfo);
        await confirmDownloadCredit(chatId);

        res.sendStatus(200);
    } catch (error) {
        console.log("error", error);
        res.sendStatus(500);
    }
});

webhookRouter.post("/webhook/audio-failed", async (req, res) => {
    try {
        const { chatId } = req.body;
        console.log("Received audio-failed webhook for chatId:", chatId);

        await notifyDownloadFailed(chatId);
        res.sendStatus(200);
    } catch (error) {
        console.log("error", error);
        res.sendStatus(500);
    }
});

export default webhookRouter;
