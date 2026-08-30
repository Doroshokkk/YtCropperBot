import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const { TOKEN } = process.env;

export async function sendBotMessage(chatId: number, text: string): Promise<void> {
    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        chat_id: chatId,
        text,
    });
}
