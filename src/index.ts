import http from 'http';
import app from './app';
import config from './config/config';
import './service/MqWorker';
import "./controller/MainBotController"
const index = http.createServer(app);

index.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});
// process.env.TZ ni o'rnatish
process.env.TZ = 'Asia/Tashkent'; // UTC +05:30  Indian Standard TimeZone.
console.log(new Date("2025-05-03T21:03:42.877Z").getTime())
