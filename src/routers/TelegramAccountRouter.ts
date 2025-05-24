import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {getAllProviders} from "../controller/ProviderController";
import {
    connect_system_card, delete_account,
    enter_code,
    enter_phone,
    get_cards,
    tg_users
} from "../controller/TelegramAccountController";

const router: Router = Router();

router.route('/send-code')
    .post(verifyJwtToken('telegram-connect-account'), enter_phone);

router.route('/verify-code')
    .post(verifyJwtToken('telegram-connect-account'), enter_code);

router.route('/cards')
    .get(verifyJwtToken('telegram-get-cards'), get_cards);
router.route('/users')
    .get(verifyJwtToken('view-telegram-account'), tg_users);

router.route('/connect-card')
    .post(verifyJwtToken('connect-card-to-system-card"'), connect_system_card);

router.route('/delete-account/:id')
    .delete(verifyJwtToken('delete-telegram-account'), delete_account);

export default router;
