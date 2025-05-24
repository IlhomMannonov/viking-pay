import {Router} from 'express';
import {setWebhook} from '../controller/MainBotController';

const router: Router = Router();

router.route('/')
    .post(setWebhook);

export default router;
