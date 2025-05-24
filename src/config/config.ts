import dotenv from 'dotenv';

dotenv.config();

const config = {
    tg_apiId: process.env.TG_API_ID,
    tg_apiHash: process.env.TG_API_HASH,
    port: process.env.PORT || 3000,
    db: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    },
};

export default config;
