import { getDB } from "../db";
import { UserAudioDownloadModel } from "../models/UserAudioDownload"; // Adjust the import path as necessary

export const createUserDownloadRecord = async (user_id: number, youtube_url: string) => {
    try {
        const db = getDB();
        if (!db) return null;
        const userDownloadCollection = db.collection("user_downloads");

        // Create a new download record for the user with youtube_url
        const userDownloadRecord = {
            user_id,
            youtube_url,
        };

        // Save the new record to the database
        const result = await userDownloadCollection.insertOne(userDownloadRecord);

        console.log(`User download record created for user: ${user_id}, youtube_url: ${youtube_url}`);
        return result;
    } catch (error) {
        console.error("Error creating user download record:", error);
        throw error;
    }
};
