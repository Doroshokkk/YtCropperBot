import { Lang, t } from "../i18n";
import { getUserLanguage } from "../mongo/services/userService";
import { refundPendingStar } from "./rateLimiters";
import { sendBotMessage } from "./telegram";

export async function notifyDownloadFailed(chatId: number, lang?: Lang): Promise<void> {
    const userLang = lang ?? (await getUserLanguage(chatId)) ?? "en";
    const refund = await refundPendingStar(chatId);

    if (refund) {
        await sendBotMessage(
            chatId,
            t(userLang, "starsRestored", { restored: refund.starsRestored, left: refund.starsLeft }),
        );
        return;
    }

    await sendBotMessage(chatId, t(userLang, "downloadFailed"));
}
