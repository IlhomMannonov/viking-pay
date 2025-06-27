import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {add_chanel, all, delete_chanel, update_chanel} from "../controller/ChanelIntegrationController";

const router: Router = Router();

router.route('/create-update')
    .post(verifyJwtToken('add-transaction-chanel'), add_chanel);

router.route('/all')
    .get(verifyJwtToken('see-transaction-chanel'), all);

router.route('/delete/:chanel_id')
    .delete(verifyJwtToken('see-transaction-chanel'), delete_chanel);

export default router;
