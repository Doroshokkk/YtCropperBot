import { Context } from "telegraf";
import { Telegraf } from "telegraf";
import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

const { TOKEN } = process.env;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const bot = new Telegraf(process.env.TOKEN as string);

export const replyWithAudioPopulated = async (ctx: Context, data) => {
    const params = data.data;
    console.log("params:", params);
    await ctx
        .replyWithAudio(
            {
                url: params.s3Url,
            },
            {
                title: params.songName,
                duration: params.duration,
                performer: params.channelName,
                thumbnail: { url: data.headers["x-video-thumbnail"] },
                caption: "@ytAudioCropBot",
            },
        )
        .then(({ audio }) => console.log(audio));
};

export const replyWithAudioWebhook = async (chatId: number, params: any) => {
    console.log("params:", params);
    try {
        const response = await axios.post(`${TELEGRAM_API}/sendAudio`, {
            chat_id: chatId,
            audio: params.s3Url,
            // audio: "https://s3.amazonaws.com/yt.crop.test/tagmp3_8029759.mp3",
            // title: params.songName,
            // duration: params.duration,
            // performer: params.channelName,
            // thumbnail: { url: params.thumbnail }, // Thumbnail should be a file ID, URL, or file itself
            caption: "@ytAudioCropBot",
        });

        // const response = await bot.telegram.sendAudio(
        //     chatId,
        //     // {
        //     //     url: params.s3Url,
        //     // },
        //     params.s3Url,
        //     {
        //         title: params.songName,
        //         duration: params.duration,
        //         performer: params.channelName,
        //         thumbnail: { url: params.thumbnail },
        //         caption: "@ytAudioCropBot",
        //     },
        // );

        console.log("Audio sent:", response.data);
    } catch (error) {
        console.error("Error sending audio:", error);
    }
};
