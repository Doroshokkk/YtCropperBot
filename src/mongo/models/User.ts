import { Schema, model, Document } from "mongoose";

export interface User {
    tg_id: number;
    username: string;
    first_name: string | undefined;
    songs_downloaded?: Array<string>;
}

const userSchema = new Schema<User>({
    tg_id: { type: Number, required: true },
    username: { type: String, required: true },
    first_name: { type: String, required: false },
    songs_downloaded: [{ type: String, required: true, default: [] }],
});

export const UserModel = model<User>("User", userSchema);
