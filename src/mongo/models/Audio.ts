import { Schema, model } from "mongoose";

export interface Audio {
    youtube_url: string;
    audio_name: string;
    duration: number;
    file_id?: string;
    channel_name?: string;
}

const audioSchema = new Schema<Audio>({
    youtube_url: { type: String, required: true },
    audio_name: { type: String, required: true },
    duration: { type: Number, required: true },
    file_id: { type: String, required: false },
    channel_name: { type: String, required: false },
});

export const AudioModel = model<Audio>("Audio", audioSchema);
