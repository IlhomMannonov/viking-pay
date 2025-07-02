import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {
    all_my_deposit_withdraws, getProviderTransactionStats,
    in_out_statics,
    user_chart_statics,
    user_main_statics
} from "../controller/StatistcsController";

const router: Router = Router();

router.route("/my-statics")
    .post(verifyJwtToken(), user_main_statics);

router.route("/dashboard")
    .post(verifyJwtToken(), user_main_statics);

router.route("/my-deposits-withdraws")
    .get(verifyJwtToken(), all_my_deposit_withdraws);

router.route("/user-statics/:user_id")
    .get(verifyJwtToken('see-user-chart'), user_chart_statics);

router.route("/in-out")
    .get(verifyJwtToken('see-user-chart'), in_out_statics);

router.route("/in-out")
    .get(verifyJwtToken('see-user-chart'), in_out_statics);

router.route("/provider-statics")
    .get(verifyJwtToken('see-user-chart'), getProviderTransactionStats);


export default router;