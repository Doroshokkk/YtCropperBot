import { Audio } from "../models/Audio";
import { User, UserModel } from "../models/User";
import { createAudioRecord } from "./audioService";
import { createUserDownloadRecord } from "./userAudioDownloadService";

export const setUser = async (userData: User): Promise<null> => {
    try {
        const filter = { tg_id: userData.tg_id }; // Use youtube_url as a unique identifier
        const update = {
            $setOnInsert: userData, // Only insert the document if it doesn't already exist
        };
        const options = { upsert: true }; // Perform an upsert

        const newUser = {
            tg_id: userData.tg_id,
            username: userData?.username,
            first_name: userData?.first_name,
            songs_downloaded: 0,
        };

        const result = await UserModel.updateOne(filter, update, options);

        if (result.acknowledged && result.upsertedCount === 1) {
            console.log("User successfully created: ", newUser?.first_name);
            return;
        } else if (result.acknowledged && result.matchedCount === 1) {
            console.log("User pressed /start but he's registered: ", newUser?.first_name);
            return;
        } else {
            console.log("user error", result);
            throw new Error("Failed to create user");
        }
    } catch (error) {
        console.error("Error setting user:", error);
        throw error;
    }
};

export const addDownloadedSong = async (userId: number, audioInfo: Audio): Promise<User | null> => {
    try {
        const user = await UserModel.findOneAndUpdate({ tg_id: userId }, { $inc: { songs_downloaded: 1 } });

        if (user) {
            console.log(`Updated songs_downloaded for user: ${userId}, new value: ${user?.songs_downloaded}`);
        } else {
            console.error(`User with tg_id ${userId} not found`);
        }

        await createUserDownloadRecord(userId, audioInfo.youtube_url);

        return user as unknown as User;
    } catch (error) {
        console.error("Error creating audio:", error);
        throw error;
    }
};
