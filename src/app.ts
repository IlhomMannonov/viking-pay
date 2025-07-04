import 'reflect-metadata';
import express, {Application} from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import {errorHandler} from './middilwares/errorHandlers';
import mainBotRouter from "./routers/MainBotRouter";
import providerRouter from "./routers/ProviderRouter";
import authenticateToken from "./middilwares/TwtAuth";
import cardRouter from "./routers/CardRouter";

import i18 from "./config/i18";
import transactionRouter from "./routers/TransactionRouter";
import authRouter from "./routers/AuthRouter";
import userRouter from "./routers/UserRouter";
import userCardRouter from "./routers/UserCardRouter";
import telegramAccountRouter from "./routers/TelegramAccountRouter";
import transactionProviderRouter from "./routers/TransactionProviderRouter";
import fileRouter from "./routers/FileRouter";
import rolePermissionRouter from "./routers/RolePermissionRouter";
import cors from "cors";
import sliderRouter from "./routers/SliderRouter";
import statisticsRouter from "./routers/StatisticsRouter";
import staticOptionsRouter from "./routers/StaticOptionsRouter";
import logsRouter from "./routers/LogsRouter";
import chanelIntegrationRouter from "./routers/ChanelIntegrationRouter";


const app: Application = express();

app.use(i18.init);
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(cors());




app.use('/telegram', authenticateToken, mainBotRouter);
app.use('/api/v1/provider', providerRouter);
app.use('/api/v1/card', cardRouter);
app.use('/api/v1/user-card', userCardRouter);
app.use('/api/v1/transaction', transactionRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/tg-account', telegramAccountRouter);
app.use('/api/v1/tr-provider', transactionProviderRouter);
app.use('/api/v1/file', fileRouter);
app.use('/api/v1/role-permission', rolePermissionRouter);
app.use('/api/v1/slider', sliderRouter);
app.use('/api/v1/statics', statisticsRouter);
app.use('/api/v1/static-options', staticOptionsRouter);
app.use('/api/v1/logs', logsRouter);
app.use('/api/v1/chanel-integration', chanelIntegrationRouter);



app.use(errorHandler);

export default app;
