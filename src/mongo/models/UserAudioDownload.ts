import { Schema, model } from "mongoose";

export interface UserAudioDownload {
    user_id: number; // Using tg_id
    youtube_url: string; // Reference to Audio by youtube_url
    created_at?: string; // Add created_at field as a formatted string
    updated_at?: string; // Add updated_at field as a formatted string
}

const userDownloadSchema = new Schema<UserAudioDownload>(
    {
        user_id: { type: Number, required: true },
        youtube_url: { type: String, ref: "Audio", required: true },
        created_at: { type: String, default: () => new Date().toLocaleString() },
        updated_at: { type: String, default: () => new Date().toLocaleString() },
    },
    { collection: "user_downloads" },
);

export const UserAudioDownloadModel = model<UserAudioDownload>("user_downloads", userDownloadSchema);
