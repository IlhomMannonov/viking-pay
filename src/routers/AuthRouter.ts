import {login, login_tg, register} from "../controller/AuthController";
import {Router} from "express";

const router: Router = Router();


router.route("/register")
    .post(register);
router.route("/login")
    .post(login);

router.route("/login-tg/:chat_id")
    .get(login_tg);


export default router;