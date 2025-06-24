import {Router} from "express";
import {all_logs, get_log} from "../controller/LogsController";

const router: Router = Router();


router.route('/all')
    .get(all_logs);

router.route('/get/:filename')
    .get(get_log);

export default router;