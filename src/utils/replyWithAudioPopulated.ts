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
            thumb: { url: data.headers["x-video-thumbnail"] },
            caption: "@ytAudioCropBot",
        },
    ).then(({ audio }) => console.log(audio));
};
