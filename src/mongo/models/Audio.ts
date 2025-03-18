import { Schema, model } from "mongoose";

export interface Audio {
    youtube_url: string;
    audio_name: string;
    duration: number;
    file_id?: string;
    channel_name?: string;
    created_at?: string;
    updated_at?: string;
}

const audioSchema = new Schema<Audio>(
    {
        youtube_url: { type: String, required: true },
        audio_name: { type: String, required: true },
        duration: { type: Number, required: true },
        file_id: { type: String, required: false },
        channel_name: { type: String, required: false },
        created_at: { type: String, default: () => new Date().toLocaleString() },
        updated_at: { type: String, default: () => new Date().toLocaleString() },
    },
    {
        collection: "downloaded_audio",
    },
);

export const AudioModel = model<Audio>("Audio", audioSchema);
