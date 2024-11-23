import { getDB } from "../db";
import { Audio } from "../models/Audio";

export const getAudioByUrl = async (youtube_url: string): Promise<Audio | null> => {
    try {
        const db = getDB();
        if (!db) return null;
        const audioCollection = db.collection("downloaded_audio");

        const audio = await audioCollection.findOne({ youtube_url: youtube_url });

        if (!audio) {
            console.log("Audio not found");
            return null;
        }

        console.log("Audio found: ", audio.audio_name);
        return audio as unknown as Audio;
    } catch (error) {
        console.error("Error fetching audio by URL:", error);
        throw error;
    }
};

export const createAudioRecord = async (audioData: Audio, isCropped: boolean) => {
    try {
        const db = getDB();
        if (!db) return null;
        const audioCollection = db.collection("downloaded_audio");

        if (isCropped) {
            audioData.file_id = "";
        }

        const filter = { youtube_url: audioData.youtube_url }; // Use youtube_url as a unique identifier
        const update = {
            $setOnInsert: audioData, // Only insert the document if it doesn't already exist
        };

        const options = { upsert: true }; // Perform an upsert

        const result = await audioCollection.updateOne(filter, update, options);

        if (result.upsertedCount > 0) {
            console.log("Audio successfully created: ", audioData.audio_name);
            return { _id: result.upsertedId, ...audioData } as Audio;
        } else {
            console.log("Audio already exists. No new record created for: ", audioData.audio_name);
            return null;
        }
    } catch (error) {
        console.error("Error creating audio:", error);
        throw error;
    }
};
