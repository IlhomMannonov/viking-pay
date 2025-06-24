import {AppDataSource} from "../config/db";
import {Module} from "../entity/Module";
import {DataSource} from "typeorm";
import {Permission} from "../entity/Permission";
import {StaticOptions} from "../entity/StaticOptions";

export const seedInitialData = async (dataSource: DataSource) => {
    const moduleRepository = dataSource.getRepository(Module)

    const modules = [
        {
            name: "Отчеты",
            order_index: 1,
            route: "reports",
            unique_key: "reports",
        },
        {
            name: "Платежная система",
            unique_key:"payment_system",
            order_index: 2,
            children: [
                { name: "Ожидается платеж", order_index: 2, route: "withdraw-pending",unique_key:"withdraw-pending" },
                { name: "Транзакция кошелька", order_index: 2, route: "wallet-transaction" ,unique_key:"wallet-transaction" },
                { name: "Транзакция провайдера", order_index: 3, route: "provider-transaction" ,unique_key:"provider-transaction" },
                { name: "Настройки оплаты", order_index: 4, route: "payment-settings",unique_key:"payment-settings" },
            ],
        },
        {
            name: "Системные карты",
            order_index: 3,
            route: "system-cards",
            unique_key:"system-cards",

        },
        {
            name: "Провайдер",
            order_index: 4,
            route: "provider",
            unique_key:"provider",
        },
        {
            name: "Интеграция с Telegram",
            order_index: 5,
            route: "telegram-integration",
            unique_key:"telegram-integration",
            children: [
                {
                    name: "Аккунт",
                    order_index: 6,
                    route: "telegram-accounts",
                    unique_key:"telegram-accounts",
                },
                {
                    name: "Управление картами",
                    order_index: 6,
                    route: "cards-management",
                    unique_key:"cards-management",
                },
            ]
        },
        {
            name: "Пользователи бота",
            order_index: 2,
            route: "users",
            unique_key:"users",
        },
        {
            name: "Сотрудники",
            order_index: 6,
            route: "staff",
            unique_key:"staff",
            children:[
                { name: "Пользователи", order_index: 1, route: "staff-users" ,unique_key:"staff-users" },
                { name: "Роли", order_index: 2, route: "roles", unique_key:"roles" },
                { name: "Разрешение", order_index: 4, route: "permissions", unique_key:"permissions" },

            ]
        },
        {
            name: "Настройки",
            order_index: 7,
            unique_key:"settings",
            children: [
                { name: "Статические параметры", order_index: 1, route: "static-options",unique_key:"static-options" },
                { name: "Слайдер", order_index: 2, route: "slider",unique_key:"slider" },
                { name: "Системные журналы", order_index: 2, route: "logs",unique_key:"logs" },
                { name: "Empty-2", order_index: 3, route: "-2",unique_key:"2empty" },
            ],
        },
        {
            name: "Телеграм Сообщение",
            order_index: 9,
            route: "telegram-message",
            unique_key:"telegram-message",
        },
        {
            name: "Профиль",
            order_index: 10,
            route: "profile",
            unique_key:"profile",
        },
    ]

    for (const mod of modules) {
        let parent = await moduleRepository.findOne({ where: { unique_key: mod.unique_key } })
        if (parent) {
            moduleRepository.merge(parent, mod)
            parent = await moduleRepository.save(parent)
        } else {
            parent = await moduleRepository.save(moduleRepository.create(mod))
        }

        if (mod.children && mod.children.length > 0) {
            for (const child of mod.children) {
                const data = { ...child, module: parent, module_id: parent.id }
                let existing = await moduleRepository.findOne({ where: { unique_key: child.unique_key } })
                if (existing) {
                    moduleRepository.merge(existing, data)
                    await moduleRepository.save(existing)
                } else {
                    await moduleRepository.save(moduleRepository.create(data))
                }
            }
        }
    }

    console.log('Modules seeded/updated successfully')
}

export const seedPermissions = async (dataSource: DataSource) => {
    const permissionRepository = dataSource.getRepository(Permission)
    const moduleRepository = dataSource.getRepository(Module)

    const permissions = [
        { name: "system-card-create", desc: "Системада карта яратиш", module_key: "system-cards" },
        { name: "system-card-get-all", desc: "Системадаги карталарни кўриш", module_key: "system-cards" },
        { name: "system-card-delete", desc: "Системадаги картани ўчириш", module_key: "system-cards" },
        { name: "system-card-update", desc: "Системадаги картани ўзгартириш", module_key: "system-cards" },
        { name: "view-user-cards", desc: "Фойдаланувчи карталарини кўриш", module_key: "system-cards" },

        { name: "provider-create", desc: "Провайдер яратиш", module_key: "provider" },
        { name: "provider-delete", desc: "Провайдерни ўчириш", module_key: "provider" },
        { name: "provider-get-all", desc: "Провайдерлар рўйхатини кўриш", module_key: "provider" },
        { name: "provider-update", desc: "Провайдерни янгилаш", module_key: "provider" },

        { name: "telegram-connect-account", desc: "Телеграм аккаунтни тизимга улаш", module_key: "telegram-accounts" },
        { name: "telegram-get-cards", desc: "CardXabar'даги карталарни кўриш", module_key: "cards-management" },
        { name: "connect-card-to-system-card", desc: "CardXabar картасини система картасига улаш", module_key: "cards-management" },
        { name: "view-telegram-account", desc: "Телеграм фойдаланувчиларини кўриш", module_key: "telegram-accounts" },
        { name: "delete-telegram-account", desc: "Телеграм аккаунтни ўчириш", module_key: "telegram-accounts" },

        { name: "deposit-wallet", desc: "Фойдаланувчи ҳисобига қўлда пул қўшиш", module_key: "wallet-transaction" },
        { name: "view-all-transaction", desc: "Барча транзакцияларни кўриш", module_key: "wallet-transaction" },
        { name: "accept-reject-transaction", desc: "Транзакцияни тасдиқлаш ёки рад этиш", module_key: "wallet-transaction" },

        { name: "view-all-users", desc: "Тизим ва бот фойдаланувчиларини кўриш", module_key: "users" },

        { name: "send-telegram-message", desc: "Телеграм ботга хабар юбориш", module_key: "telegram-message" },
        { name: "view-messages-history", desc: "Юборилган хабарлар тарихини кўриш", module_key: "telegram-message" },

        { name: "add-slider", desc: "Слайдер яратиш", module_key: "settings" },
        { name: "update-slider", desc: "Слайдерни таҳрирлаш", module_key: "settings" },
        { name: "delete-slider", desc: "Слайдерни ўчириш", module_key: "settings" },
    ]


    for (const perm of permissions) {
        const module = await moduleRepository.findOne({ where: { unique_key: perm.module_key } })

        if (!module) {
            console.warn(`Module with unique_key "${perm.module_key}" not found.`)
            continue
        }

        const exists = await permissionRepository.findOne({ where: { name: perm.name } })

        if (!exists) {
            await permissionRepository.save(permissionRepository.create({
                name: perm.name,
                desc: perm.desc,
                module_id: module.id,
            }))
        }
    }

    console.log("Permissions seeded successfully")
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
