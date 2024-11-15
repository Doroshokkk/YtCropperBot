const amqp = require("amqplib");
require("dotenv").config();

let connection;

export async function getRabbitConnection() {
    if (!connection) {
        connection = await amqp.connect(`amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@localhost:5672`);
        console.log("RabbitMQ connection established.");
    }
    return connection;
}
