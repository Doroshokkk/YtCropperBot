import { getRabbitConnection } from "./rabbitConnection";

export async function sendToQueue(message) {
    try {
        const connection = await getRabbitConnection();
        const channel = await connection.createChannel();

        const queue = "audio_queue";
        await channel.assertQueue(queue, { durable: true });

        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log("Message sent to queue:", message);

        await channel.close(); // Close the channel after use
    } catch (error) {
        console.error("Failed to send message:", error);
    }
}
