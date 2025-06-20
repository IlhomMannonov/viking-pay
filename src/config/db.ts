import {DataSource} from 'typeorm';
import config from './config';
import {User} from '../entity/User';
import {Provider} from "../entity/Provider";
import {Card} from "../entity/Card";
import {Transaction} from "../entity/Transaction";
import {TgAccount} from "../entity/TgAccount";
import {Attachment} from "../entity/Attachment";
import {TelegramMessage} from "../entity/TelegramMessage";
import {Role} from "../entity/Role";
import {Permission} from "../entity/Permission";
import {Module} from "../entity/Module";
import {seedInitialData, seedPermissions,seedStaticOptions} from "../seed/InitialData";
import {Slider} from "../entity/Slider";
import {StaticOptions} from "../entity/StaticOptions";

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: config.db.host,
    port: config.db.port,
    username: config.db.username,
    password: config.db.password,
    database: config.db.database,
    entities: [
        User,
        Provider,
        Card,
        Transaction,
        TgAccount,
        Attachment,
        TelegramMessage,
        Role,
        Permission,
        Module,
        Slider,
        StaticOptions
    ],
    synchronize: true,
});

export const connectDB = async (): Promise<void> => {
    try {
        await AppDataSource.initialize()
            .then(async (datasource) => {
                // MODULLARNI YARATAMIZ
                await seedInitialData(datasource);
                // PERMISSIONLAR
                await seedPermissions(datasource)
                //STATIK OPTIONLAR
                await seedStaticOptions(datasource)
            })
        console.log('PostgreSQL database connected');
    } catch (error) {
        console.error('Database connection error', error);
        process.exit(1);
    }
};
