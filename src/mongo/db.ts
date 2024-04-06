import { MongoClient, Db } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;

let client: MongoClient;
let db: Db;

const connectDB = async () => {
    try {
        client = new MongoClient(uri as string);
        await client.connect();
        db = client.db("users"); // Get the database instance
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        //process.exit(1); // Exit with failure
    }
};

const getDB = (): Db => {
    if (!db) {
        console.error("mongo is not connected");
        return;
        // throw new Error("MongoDB is not connected");
    }
    return db;
};

const disconnectDB = async () => {
    if (client) {
        await client.close();
        console.log("MongoDB disconnected successfully");
    }
};

export { connectDB, getDB, disconnectDB };
