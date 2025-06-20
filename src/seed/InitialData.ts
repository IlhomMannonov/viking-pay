import {AppDataSource} from "../config/db";
import {Module} from "../entity/Module";
import {DataSource} from "typeorm";
import {Permission} from "../entity/Permission";
import {StaticOptions} from "../entity/StaticOptions";


export const seedInitialData = async (dataSource: DataSource) => {
    const moduleRepository = dataSource.getRepository(Module)

    const existing = await moduleRepository.findOne({where: {name: 'Users'}})
    if (existing) {
        console.log('Modules already seeded')
        return
    }

    // Avval parent modullarni yozamiz
    const modules = [
        {name: "Hisobotlar", order_index: 1, route: "reports"},
        {name: "Payment System", order_index: 2},
        {name: "Tizim kartalari", order_index: 3, route: "system-cards"},
        {name: "Provider", order_index: 4, route: "provider"},
        {name: "Telegram integration", order_index: 5, route: "telegram-integration"},
        {name: "Users", order_index: 6, route: "users"},
        {name: "Settings", order_index: 7, route: "settings"},
    ]

    const savedParents: Module[] = []

    for (const mod of modules) {
        const saved = await moduleRepository.save(moduleRepository.create(mod))
        savedParents.push(saved)
    }

    // Endi `Payment System` sub-modullari (parent = order_index 2 bo‘lgan modul)
    const paymentParent = savedParents.find(m => m.name === 'Payment System')
    if (paymentParent) {
        const sub_modules = [
            {name: "Chiqarish Kutilmoqda", order_index: 1, route: "withdraw-pending"},
            {name: "Wallet Transaction", order_index: 2, route: "wallet-transaction"},
            {name: "Provider Transction", order_index: 3, route: "provider-transaction"},
            {name: "Payment Settings", order_index: 4, route: "payment-settings"},
        ]

        for (const sub of sub_modules) {
            await moduleRepository.save(moduleRepository.create({
                ...sub,
                module: paymentParent,
                module_id: paymentParent.id
            }))
        }
    }

    console.log('Modules seeded successfully')
}

export const seedPermissions = async (dataSource: DataSource) => {
    const permissionRepository = dataSource.getRepository(Permission)

    const permissions = [
        {"name": "system-card-create", "desc": "Sistemada karta yaratish", "module_id": 3},
        {"name": "system-card-get-all", "desc": "Sistemadagi kartalarni ko'rish", "module_id": 3},
        {"name": "system-card-delete", "desc": "Sistemadagi kartani o'chirish", "module_id": 3},
        {"name": "system-card-update", "desc": "Sistemadagi kartani o'zkartirish", "module_id": 3},
        {"name": "view-user-cards", "desc": "Userning kartalarini ko'rish", "module_id": 3},
        {"name": "provider-create", "desc": "Providerni yaratish", "module_id": 4},
        {"name": "provider-delete", "desc": "Providerni O'chirish", "module_id": 4},
        {"name": "provider-get-all", "desc": "Providerlar ro'yxatini ko'rish", "module_id": 4},
        {"name": "provider-update", "desc": "Providerni yangilash", "module_id": 4},
        {"name": "telegram-connect-account", "desc": "Telegram accountni sistemaga ulash", "module_id": 5},
        {"name": "telegram-get-cards", "desc": "Card Xabardagi kartalarni ko'rish", "module_id": 5},
        {
            "name": "connect-card-to-system-card",
            "desc": "CardXabar botdagi kartani sistema kartasi bilan ulash",
            "module_id": 5
        },
        {"name": "view-telegram-account", "desc": "Telegram userlar ro'yxatini ko'rish", "module_id": 5},
        {"name": "delete-telegram-account", "desc": "Sistemadan telegram accountni o'chirish", "module_id": 5},
        {"name": "deposit-wallet", "desc": "User hisobini ruchnoy to'ldirish", "module_id": 2},
        {"name": "view-all-transaction", "desc": "Barcha tranzaksiyalarni ko'rish", "module_id": 2},
        {
            "name": "accept-reject-transaction",
            "desc": "Hamyon Tranzaksiyani tasdiqlash va bekor qilish",
            "module_id": 2
        },
        {"name": "view-all-users", "desc": "Tizim va Bot userlarini ko'rish", "module_id": 2},
        {"name": "send-telegram-message", "desc": "Telegram botga xabar jonatish", "module_id": 2},
        {"name": "view-messages-history", "desc": "Telegramga yuborilayotgan xabarlarini ko'rish", "module_id": 2},
        {"name": "add-slider", "desc": "Slider yaratish", "module_id": 7},
        {"name": "update-slider", "desc": "Slider taxrirlash", "module_id": 7},
        {"name": "delete-slider", "desc": "Sliderni o'chirish", "module_id": 7},
    ];

    for (const perm of permissions) {
        const exists = await permissionRepository.findOne({
            where: {name: perm.name}
        });

        if (!exists) {
            await permissionRepository.save(permissionRepository.create(perm));
        }
    }

    console.log('Permissions seeded successfully');
}

export const seedStaticOptions = async (dataSource: DataSource) => {
    const staticOptionsRepository = dataSource.getRepository(StaticOptions)

    const staticOptions:StaticOptions[] = [
        { key: "min_deposit", value: '5000' ,desc:"Hamyonga minimal pul toldirish"},
        { key: "max_deposit", value: '99000000' ,desc:"Hamyonga maximal pul toldirish"},
        { key: "min_withdraw", value: '100000' ,desc:"Minimal pul chiqarish"},
        { key: "max_withdraw", value: '99000000' ,desc:"Maksimal pul chiqarish"},
    ]

    for (const option of staticOptions) {
        const exists = await staticOptionsRepository.findOneBy({ key: option.key })
        if (!exists) {
            await staticOptionsRepository.save(option)
        }
    }

    console.log('StaticOptions seeded successfully');

}
