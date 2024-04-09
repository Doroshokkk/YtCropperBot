import { Context } from "telegraf";

export const replyWithAudioPopulated = async (ctx: Context, data) => {
    await ctx
        .replyWithAudio(
            {
                source: Buffer.from(data.data),
                filename: data.headers["x-song-name"],
            },
            {
                title: data.headers["x-song-name"],
                duration: data.headers["x-audio-duration"],
                performer: data.headers["x-channel-name"],
                thumbnail: { url: data.headers["x-video-thumbnail"] },
                caption: "@ytAudioCropBot",
            },
        )
        .then(({ audio }) => console.log(audio));
};
