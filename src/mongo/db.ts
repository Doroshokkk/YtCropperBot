import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;

const connectDB = async () => {
    try {
        if (!uri) {
            throw new Error("MongoDB URI is not defined in environment variables");
        }

        await mongoose.connect(uri, {
            retryWrites: true,
            appName: "ytAudioCropDb",
        });

        console.log("MongoDB connected successfully with Mongoose");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1); // Exit the application if the connection fails
    }
};

const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log("MongoDB disconnected successfully");
    } catch (error) {
        console.error("Error disconnecting MongoDB:", error);
    }
};

export { connectDB, disconnectDB };
