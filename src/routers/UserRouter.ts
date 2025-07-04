import {Router} from "express";
import {
    all_users, create_user, delete_user,
    get_user,
    me, send_ask_phone,
    send_message_telegram,
    telegram_message_history,
    update_profile, update_user, update_user_status
} from "../controller/UserController";
import {verifyJwtToken} from "../middilwares/Security";

const router: Router = Router();


router.route("/me")
    .post(verifyJwtToken(), me);
router.route("/update-profile")
    .post(verifyJwtToken(), update_profile);

router.route("/update-status/:id")
    .post(verifyJwtToken(), update_user_status);

router.route("/get-user/:user_id")
    .get(verifyJwtToken(), get_user);

// ADMIN
router.route("/all-users")
    .get(verifyJwtToken('view-all-users'), all_users);


router.route("/send-message")
    .post(verifyJwtToken('send-telegram-message'), send_message_telegram);

router.route("/message-history")
    .get(verifyJwtToken('view-messages-history'), telegram_message_history);

router.route("/ask-phone")
    .post(verifyJwtToken(), send_ask_phone);

router.route("/delete-user/:id")
    .delete(verifyJwtToken("delete-staff-user"), delete_user);


router.route("/create-user")
    .post(verifyJwtToken('create-staff-user'), create_user);


router.route("/update-user/:id")
    .put(verifyJwtToken('create-staff-user'), update_user);

export default router;