import { Schema, model, Types } from "mongoose";
export interface User {
    tg_id: number;
    username: string;
    songs_downloaded?: number;
    first_name?: string;
    created_at?: string;
    updated_at?: string;
}

const userSchema = new Schema<User>(
    {
        tg_id: { type: Number, required: true, unique: true },
        username: { type: String, required: true },
        songs_downloaded: { type: Number },
        first_name: { type: String },
        created_at: { type: String, default: () => new Date().toLocaleString() },
        updated_at: { type: String, default: () => new Date().toLocaleString() },
    },
    {
        collection: "users",
    },
);

export const UserModel = model<User>("User", userSchema);
