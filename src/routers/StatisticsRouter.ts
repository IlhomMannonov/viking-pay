import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {user_main_statics} from "../controller/StatistcsController";

const router: Router = Router();

router.route("/my-statics")
    .post(verifyJwtToken(), user_main_statics);

router.route("/dashboard")
    .post(verifyJwtToken(), user_main_statics);


export default router;