import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {check_id, deposit, withdraw} from "../controller/TransactionProviderController";

const router: Router = Router();

router.route('/deposit')
    .post(verifyJwtToken(), deposit);

router.route('/withdraw')
    .post(verifyJwtToken(), withdraw);

router.route('/check-id')
    .post(verifyJwtToken(), check_id);

export default router;
