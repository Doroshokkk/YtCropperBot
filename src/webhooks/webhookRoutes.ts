import { Router } from "express";
import * as dotenv from "dotenv";
import { addDownloadedSong } from "../mongo/services/userService";
import { Audio } from "src/mongo/models/Audio";
import { createAudioRecord } from "../mongo/services/audioService";
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

        // if (!isCropped) {
        const audioRecord = await createAudioRecord(audioInfo, isCropped);
        console.log("audioRecord", audioRecord);
        // }

        // await replyWithAudioWebhook(chatId, req.body);
        // await clearCropSession(chatId);

        await addDownloadedSong(chatId, audioInfo);

        res.sendStatus(200);
    } catch (error) {
        console.log("error", error);
    }
});

export default webhookRouter;
