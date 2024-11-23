import { getDB } from "../db";
import { Audio } from "../models/Audio";
import { User, UserModel } from "../models/User";
import { createAudioRecord } from "./audioService";
import { createUserDownloadRecord } from "./userAudioDownloadService";

export const setUser = async (userData: User): Promise<User | null> => {
    try {
        const db = getDB();
        if (!db) return;
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({ tg_id: userData.tg_id });

        if (user) {
            console.log("User already exists:", user.username);
            return null;
        }

        const newUser = {
            tg_id: userData.tg_id,
            username: userData.username,
            first_name: userData.first_name,
            songs_downloaded: 0,
        };

        const result = await usersCollection.insertOne(newUser);

        if (result.acknowledged && result.insertedId) {
            console.log("User successfully created: ", newUser.username);
            return { _id: result.insertedId, ...newUser } as User;
        } else {
            throw new Error("Failed to create user");
        }
    } catch (error) {
        console.error("Error setting user:", error);
        throw error;
    }
};

export const addDownloadedSong = async (userId: number, audioInfo: Audio): Promise<User | null> => {
    try {
        const db = getDB();
        if (!db) return;
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOneAndUpdate({ tg_id: userId }, { $inc: { songs_downloaded: 1 } });

        if (user) {
            console.log(`Updated songs_downloaded for user: ${userId}, new value: ${user?.value?.songs_downloaded}`);
        } else {
            console.error(`User with tg_id ${userId} not found`);
        }

        await createUserDownloadRecord(userId, audioInfo.youtube_url);

        // user.songs_downloaded.push(songId);

        // const result = await usersCollection.updateOne({ tg_id: userId }, { $push: { songs_downloaded: songId } });
        // if (result.modifiedCount !== 1) {
        //     throw new Error("Failed to add downloaded song");
        // }
        return user as unknown as User;
    } catch (error) {
        console.error("Error creating audio:", error);
        throw error;
    }
};
