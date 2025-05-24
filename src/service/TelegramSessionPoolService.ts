import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const apiId = process.env.TG_APIID || 17403927; // O'zingizning API ID'ingizni yozing
const apiHash = process.env.TG_API_HASH || "6f3b02b8ba446d2c76a31033d6717dc2"; // O'zingizning API Hash'ingiz

// Pool: session_id ga mos TelegramClient
const telegramClientPool: Record<string, TelegramClient> = {};

// Clientni olish (agar yo'q bo‘lsa yaratish)
export async function getTelegramClient(sessionId: string): Promise<TelegramClient> {
    // Agar session poolda bo'lsa, clientni qaytarish
    if (telegramClientPool[sessionId]) {
        const client = telegramClientPool[sessionId];

        // Clientning holatini tekshirish
        try {
            // Authentifikatsiya tekshiruvi
            const isAuthorized = await client.isUserAuthorized();
            if (isAuthorized) {
                return client;
            } else {
                // Agar client autentifikatsiyadan o'tmagan bo'lsa, uni yangilaymiz
                console.log(`Session autentifikatsiya qilinmagan, yangilash...`);
                await client.disconnect(); // Oldingi clientni disconnect qilish
                delete telegramClientPool[sessionId]; // Pooldan olib tashlash
            }
        } catch (error) {
            console.log("Clientda xato yuz berdi:", error);
            // Agar error bo‘lsa, clientni yangilaymiz
            await client.disconnect();
            delete telegramClientPool[sessionId];
        }
    }

    // Yangi session yaratish
    const stringSession = new StringSession(sessionId);
    const client = new TelegramClient(stringSession, Number(apiId), apiHash, {
        connectionRetries: 3,
    });

    // Clientni poolga qo'shish
    await client.connect();
    telegramClientPool[sessionId] = client;

    return client;
}

// Dastur tugaganda disconnect qilish
export async function closeAllTelegramClients() {
    for (const client of Object.values(telegramClientPool)) {
        try {
            await client.disconnect();
            console.log("Client disconnected successfully.");
        } catch (error) {
            console.error("Error disconnecting client:", error);
        }
    }
}

// Qo'shimcha: max vaqtga ulanishni cheklash (misol: 10 soniya)
async function connectWithTimeout(client: TelegramClient, timeout: number) {
    const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), timeout)
    );
    const connectPromise = client.connect();

    return Promise.race([connectPromise, timeoutPromise]);
}

// Misol: max vaqtga ulanishni cheklash
async function getTelegramClientWithTimeout(sessionId: string) {
    const stringSession = new StringSession(sessionId);
    const client = new TelegramClient(stringSession, Number(apiId), apiHash, {
        connectionRetries: 3,
    });

    try {
        await connectWithTimeout(client, 10000); // 10 soniya kutish
        telegramClientPool[sessionId] = client;
        console.log(`Client connected for session: ${sessionId}`);
    } catch (error) {
        console.error(`Error connecting client for session ${sessionId}:`, error);
        throw new Error(`Failed to connect client for session ${sessionId}`);
    }

    return client;
}
