import { Schema, model, Types } from "mongoose";
export interface User {
    tg_id: number;
    username: string;
    songs_downloaded?: number;
    first_name?: string;
}

const userSchema = new Schema<User>(
    {
        tg_id: { type: Number, required: true, unique: true },
        username: { type: String, required: true },
        songs_downloaded: { type: Number },
        first_name: { type: String },
    },
    {
        collection: "users",
    },
);

export const UserModel = model<User>("User", userSchema);
