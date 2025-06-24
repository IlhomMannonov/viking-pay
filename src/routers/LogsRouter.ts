import {Router} from "express";
import {all_logs} from "../controller/LogsController";

const router: Router = Router();


router.route('/all')
    .get(all_logs);

export default router;