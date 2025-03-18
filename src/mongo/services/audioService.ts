import { Audio, AudioModel } from "../models/Audio";

export const getAudioByUrl = async (youtube_url: string): Promise<Audio | null> => {
    try {
        const audio = await AudioModel.findOne({ youtube_url });

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
        console.log("audioData in create audio", audioData);

        if (isCropped) {
            audioData.file_id = ""; // Ensure `file_id` is empty if `isCropped` is true
        }

        const filter = { youtube_url: audioData.youtube_url }; // Use `youtube_url` as a unique identifier

        // Create the update logic
        const update = {
            $set: {
                audio_name: audioData.audio_name,
                channel_name: audioData.channel_name,
                duration: audioData.duration,
                ...(audioData.file_id && { file_id: audioData.file_id }), // Update `file_id` only if it's not empty
                updated_at: new Date().toLocaleString()
            },
        };

        const options = { upsert: true, new: true }; // Perform an upsert and return the new document

        const result = await AudioModel.updateOne(filter, update, options);

        if (result.upsertedCount > 0) {
            console.log("Audio successfully created: ", audioData.audio_name);
            return { _id: result.upsertedId, ...audioData } as Audio;
        } else if (result.modifiedCount > 0) {
            console.log("Audio successfully updated: ", audioData.audio_name);
            return (await AudioModel.findOne(filter)) as Audio; // Return the updated document
        } else {
            console.log("No changes made to the audio record: ", audioData.audio_name);
            return null;
        }
    } catch (error) {
        console.error("Error creating or updating audio:", error);
        throw error;
    }
};
