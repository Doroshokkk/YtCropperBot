export const replyWithAudioPopulated = (ctx, data) => {
    ctx.replyWithAudio(
        {
            source: Buffer.from(data.data),
            filename: data.headers["x-song-name"],
        },
        {
            title: data.headers["x-song-name"],
            duration: data.headers["x-audio-duration"],
            performer: data.headers["x-channel-name"],
            caption: "@ytAudioCropBot",
        },
    );
};
