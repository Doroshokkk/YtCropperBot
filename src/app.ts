import * as express from "express";
import * as bodyParser from "body-parser";
import axios from "axios";
import { setupBot } from "./bot/botController";
import * as dotenv from "dotenv";
import { connectDB, disconnectDB } from "./mongo/db";
dotenv.config();

const app = express();
const port = process.env.PORT || 5001;
const { TOKEN, SERVER_URL, ENVIRONMENT } = process.env;

console.log("token, server", TOKEN, SERVER_URL);

const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const URI = `/webhook/${TOKEN}`;
const WEBHOOK_URL = SERVER_URL + URI;

app.use(bodyParser.json());

const init = async () => {
    const webhook = await axios.get(`${TELEGRAM_API}/setwebhook?url=${WEBHOOK_URL}`);
    console.log(webhook.data);
    await connectDB()
        .then(() => {
            console.log("MongoDB connected");
        })
        .catch((error) => {
            console.error("Failed to connect to MongoDB:", error);
            process.exit(1);
        });
};

// Check the environment variable to determine the configuration
if (ENVIRONMENT === "local") {
    app.listen(port, async () => {
        console.log(`running on port ${port}`);
        await init();
    });

    console.log("Running in local environment");
} else if (ENVIRONMENT === "prod") {
    console.log("Running in production environment");
    const https = require("https");
    const fs = require("fs");

    const options = {
        key: fs.readFileSync("/etc/nginx/ssl/selfsigned.key"),
        cert: fs.readFileSync("/etc/nginx/ssl/selfsigned.crt"),
    };

    const server = https.createServer(options, app);

    server.listen(port, async () => {
        console.log(`Server is running on port ${port} in production environment`);
        await init();
    });
} else {
    console.error("Invalid or missing ENVIRONMENT variable");
    process.exit(1);
}

setupBot();

process.on("SIGINT", () => {
    disconnectDB().then(() => {
        process.exit(0);
    });
});

process.on("SIGTERM", () => {
    disconnectDB().then(() => {
        process.exit(0);
    });
});
