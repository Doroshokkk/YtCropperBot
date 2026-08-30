import { Audio } from "../models/Audio";
import { User, UserModel } from "../models/User";
import { PaymentModel } from "../models/Payment";
import { Lang } from "../../i18n";
import { createAudioRecord } from "./audioService";
import { createUserDownloadRecord } from "./userAudioDownloadService";

export const getUserLanguage = async (tgId: number): Promise<Lang | null> => {
    const user = await UserModel.findOne({ tg_id: tgId });
    if (!user?.language) {
        return null;
    }
    return user.language as Lang;
};

export const setUserLanguage = async (tgId: number, language: Lang): Promise<void> => {
    await UserModel.updateOne({ tg_id: tgId }, { $set: { language } });
};

export const getStarsLeft = async (tgId: number): Promise<number> => {
    const user = await UserModel.findOne({ tg_id: tgId });
    if (!user) {
        return 0;
    }
    return user.stars_left ?? 0;
};

export const creditStars = async (tgId: number, amount: number, chargeId: string): Promise<number> => {
    const existing = await PaymentModel.findOne({ charge_id: chargeId });
    if (existing) {
        return getStarsLeft(tgId);
    }

    await PaymentModel.create({ tg_id: tgId, charge_id: chargeId, amount });
    const user = await UserModel.findOneAndUpdate(
        { tg_id: tgId },
        { $inc: { stars_left: amount, stars_donated: amount } },
        { new: true },
    );

    if (!user) {
        throw new Error(`User with tg_id ${tgId} not found`);
    }

    return user.stars_left ?? 0;
};

export const refundStar = async (tgId: number, amount = 1): Promise<number> => {
    const user = await UserModel.findOneAndUpdate(
        { tg_id: tgId },
        { $inc: { stars_left: amount } },
        { new: true },
    );

    if (!user) {
        throw new Error(`User with tg_id ${tgId} not found`);
    }

    return user.stars_left ?? 0;
};

export const deductStar = async (tgId: number): Promise<number> => {
    const user = await UserModel.findOneAndUpdate(
        { tg_id: tgId, stars_left: { $gte: 1 } },
        { $inc: { stars_left: -1 } },
        { new: true },
    );

    if (!user) {
        throw new Error(`User ${tgId} has no stars to deduct`);
    }

    return user.stars_left ?? 0;
};

export const setUser = async (userData: User): Promise<void> => {
    try {
        const filter = { tg_id: userData.tg_id }; // Use tg_id as a unique identifier
        const update = {
            $setOnInsert: {
                tg_id: userData.tg_id,
                username: userData?.username,
                first_name: userData?.first_name,
                songs_downloaded: 0,
                stars_left: 0,
                stars_donated: 0
            }, // Only insert the document if it doesn't already exist
        };
        const options = { upsert: true }; // Perform an upsert

        const result = await UserModel.updateOne(filter, update, options);

        if (result.acknowledged && result.upsertedCount === 1) {
            console.log("User successfully created: ", userData?.first_name);
            return;
        } else if (result.acknowledged && result.matchedCount === 1) {
            console.log("User pressed /start but he's registered: ", userData?.first_name);
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

export const addReferencedSong = async (userId: number, youtube_url: string): Promise<User | null> => {
    try {
        const user = await UserModel.findOneAndUpdate({ tg_id: userId }, { $inc: { songs_downloaded: 1 } });

        if (user) {
            console.log(`Updated songs_downloaded for user: ${userId}, new value: ${user?.songs_downloaded}`);
        } else {
            console.error(`User with tg_id ${userId} not found`);
        }

        await createUserDownloadRecord(userId, youtube_url);

        return user as unknown as User;
    } catch (error) {
        console.error("Error creating audio:", error);
        throw error;
    }
};
