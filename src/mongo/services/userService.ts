import { getDB } from "../db";
import { User, UserModel } from "../models/User";

export const setUser = async (userData: User): Promise<User | null> => {
    try {
        const db = getDB();
        if (!db) return;
        const usersCollection = db.collection("user");

        const user = await usersCollection.findOne({ tg_id: userData.tg_id });

        if (user) {
            console.log("User already exists:", user.username);
            return null;
        }

        const newUser = {
            tg_id: userData.tg_id,
            username: userData.username,
            first_name: userData.first_name,
            songs_downloaded: [],
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

export const addDownloadedSong = async (userId: number, songId: string): Promise<User | null> => {
    try {
        const db = getDB();
        if (!db) return;
        const usersCollection = db.collection("user");

        const user = await usersCollection.findOne({ tg_id: userId });

        if (!user) {
            throw new Error("User not found");
        }

        user.songs_downloaded.push(songId);

        const result = await usersCollection.updateOne({ tg_id: userId }, { $push: { songs_downloaded: songId } });
        if (result.modifiedCount !== 1) {
            throw new Error("Failed to add downloaded song");
        }

        const updatedUser = (await usersCollection.findOne({ tg_id: userId })) as unknown as User;
        console.log("updated:", updatedUser.username);
        return updatedUser;
    } catch (error) {
        console.error("Error adding downloaded song:", error);
        throw error;
    }
};
