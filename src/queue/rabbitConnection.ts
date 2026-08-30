const amqp = require("amqplib");
require("dotenv").config();
import { env } from "../utils/env";

let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;

export async function getRabbitConnection() {
    if (!connection) {
        connection = await amqp.connect(`amqp://${env("RABBITMQ_USER")}:${env("RABBITMQ_PASSWORD")}@localhost:5672`);
        console.log("RabbitMQ connection established.");
    }
    return connection;
}
