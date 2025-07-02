import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {all_my_deposit_withdraws, user_chart_statics, user_main_statics} from "../controller/StatistcsController";

const router: Router = Router();

router.route("/my-statics")
    .post(verifyJwtToken(), user_main_statics);

router.route("/dashboard")
    .post(verifyJwtToken(), user_main_statics);

router.route("/my-deposits-withdraws")
    .get(verifyJwtToken(), all_my_deposit_withdraws);

router.route("/user-statics/:user_id")
    .get(verifyJwtToken('see-user-chart'), user_chart_statics);


export default router;