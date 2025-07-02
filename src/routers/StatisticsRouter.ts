import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {
    all_my_deposit_withdraws,
    getProviderTransactionStats,
    getTopDepositUsersDetailed,
    in_out_statics, main_chart,
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
    .get(verifyJwtToken('view-statistics'), user_chart_statics);

router.route("/main-statics")
    .get(verifyJwtToken('view-statistics'), main_chart);

router.route("/in-out")
    .post(verifyJwtToken('view-statistics'), in_out_statics);

router.route("/provider-statics")
    .post(verifyJwtToken('view-statistics'), getProviderTransactionStats);
router.route("/top-users")
    .post(verifyJwtToken('view-statistics'), getTopDepositUsersDetailed);


export default router;