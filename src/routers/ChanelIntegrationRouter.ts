import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {add_chanel} from "../controller/ChanelIntegrationController";

const router: Router = Router();

router.route('/create')
    .post(verifyJwtToken('system-card-create'), add_chanel);

export default router;
