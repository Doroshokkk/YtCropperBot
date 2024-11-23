import { Schema, model } from "mongoose";

export interface UserAudioDownload {
    user_id: number; // Using tg_id
    youtube_url: string; // Reference to Audio by youtube_url
}

const userDownloadSchema = new Schema<UserAudioDownload>({
    user_id: { type: Number, required: true },
    youtube_url: { type: String, ref: "Audio", required: true },
});

export const UserAudioDownloadModel = model<UserAudioDownload>("user_downloads", userDownloadSchema);
