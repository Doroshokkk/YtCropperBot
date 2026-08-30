import IORedis from "ioredis";
import * as dotenv from "dotenv";
import { env } from "../utils/env";

dotenv.config();

export const redis = new IORedis({
    host: env("REDIS_HOST"),
    port: parseInt(env("REDIS_PORT")),
});

redis.on("connect", () => {
    console.log("Connected to Redis server");
});

redis.on("error", (err) => {
    console.error("Error connecting to Redis server:", err);
});
