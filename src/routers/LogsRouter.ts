import {Router} from "express";
import {all_logs, get_log} from "../controller/LogsController";
import {verifyJwtToken} from "../middilwares/Security";

const router: Router = Router();


router.route('/all')
    .get(verifyJwtToken('see_logs'), all_logs);

router.route('/get/:filename')
    .get(verifyJwtToken('see_logs'), get_log);

export default router;