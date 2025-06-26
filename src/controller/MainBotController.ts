import {Markup, Telegraf} from 'telegraf';
import {Request, Response} from 'express';
import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {Context} from "node:vm";

const bot = new Telegraf('7958191913:AAFzyiOb4Xo9J9D1S2_X76WgECtbrfRWJjI');
const userRepository = AppDataSource.getRepository(User);

bot.start(async (ctx) => {
    const user = await getBotUser(ctx.chat.id.toString());
    if (!user.first_name) {
        await ctx.reply(
            'Пожалуйста, отправьте свой номер телефона.',
            Markup.keyboard([
                Markup.button.contactRequest("📞 Отправить номер телефона")
            ])
                .resize()
        );
    } else {
        await userHome(ctx)

    }

});

bot.on('contact', async (ctx) => {
    try {
        const user = await getBotUser(ctx.chat.id.toString());
        if (!user) {
            return await ctx.reply("❗ Siz ro‘yxatdan o‘tmagansiz. Avval /start buyrug‘ini yuboring.");
        }

        const contact = ctx.message?.contact;
        if (!contact || !contact.phone_number) {
            return await ctx.reply("📵 Kontakt raqamini yuborishda xatolik. Tugmani bosib o‘z raqamingizni yuboring.");
        }

        let number = contact.phone_number;
        if (!number.startsWith('+')) {
            number = '+' + number;
        }

        user.state = "user_home";
        user.phone_number = number;

        await userRepository.save(user);
        await ctx.reply("🏴‍☠️ Добро пожаловать в бот Viking Pay!", Markup.removeKeyboard());
        await userHome(ctx);
    } catch (error) {
        console.error("❌ Kontaktni qayta ishlashda xatolik:", error);
        await ctx.reply("❗ Ichki xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring.");
    }
});


bot.on("text", async (ctx) => {
    const user = await getBotUser(ctx.chat.id.toString());
    if (user.state === 'send_FIO') {
        const text = ctx.message.text.trim();
        const parts = text.split(' ');

        if (parts.length === 2 && parts[0].length > 3 && parts[1].length > 3) {
            const firstName = parts[0];
            const lastName = parts[1];


            user.first_name = firstName;
            user.last_name = lastName;
            await userRepository.save(user);
            // Tekshiruv muvaffaqiyatli
            await userHome(ctx);
            // Yangi holatga o'tkazish yoki boshqa amallarni bajarish
            await updateUserState(ctx.chat.id.toString(), 'user_home');
        } else {
            // Tekshiruv muvaffaqiyatsiz
            ctx.reply('Пожалуйста, введите правильно свое имя и фамилию. Оба имени должны быть длиной не менее 3 букв.');
        }
    }
})
export const userHome = async (ctx: Context) => {
    // const user = await getBotUser(ctx.chat.id.toString());
    // const payme = await paymeRepository.findOne({where: {user_id: user.id}})
    await ctx.reply(
        "👋 Приветствуем вас!\n" +
        "\n" +
        "💼 Наши услуги:\n" +
        "🔁 Пополнение счетов букмекерских сайтов\n" +
        "💸 Вывод средств с букмекерских сайтов — быстро, надежно и удобно!\n" +
        "\n" +
        "⚙️ Как мы работаем?\n" +
        "1️⃣ Вы отправляете заявку\n" +
        "2️⃣ Наши операторы связываются с вами\n" +
        "3️⃣ Деньги пополняются или выводятся по вашему запросу\n" +
        "\n" +
        "✅ Работаем 24/7\n" +
        "✅ Надежные и быстрые выплаты\n" +
        "✅ Популярные способы оплаты\n" +
        "\n" +
        "🚀 Чтобы начать, выберите нужную услугу из меню ниже или нажмите кнопку “🆘 Начать”.",
        Markup.inlineKeyboard([
            [Markup.button.url("🆘 Начать", "https://t.me/VikingPaybot?startapp=start")]
        ])
    );

    // await ctx.reply("👆 Bu to'lov tizimlari orqali to'lov qilishingiz uchun avval to'lov accountlarinigzni faollashtiring", Markup.removeKeyboard())
};
export const getBotUser = async (chat_id: string): Promise<User> => {
    const findUser = await userRepository.findOne({where: {chat_id, deleted: false}, order: {id: "desc"}});
    if (!findUser) {
        const newUser = userRepository.create({
            chat_id,
            is_bot_user: true,
            state: 'send_phone'
        });
        // Yaratilgan foydalanuvchini saqlash
        await userRepository.save(newUser);
        return newUser;
    }
    return findUser;
};
export const updateUserState = async (chat_id: string, state: string): Promise<User> => {
    const user = await getBotUser(chat_id);
    user.state = state;
    await userRepository.save(user);
    return user;
};

export const setWebhook = (req: Request, res: Response) => {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
};


// bot.launch();
export const launchBot = () => {
    console.log('Telegram bot started');
};
console.log('Bot is running...');


// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
