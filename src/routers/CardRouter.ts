import {Router} from 'express';
import {verifyJwtToken} from "../middilwares/Security";
import {add_chanel} from "../controller/ChanelIntegrationController";

const router: Router = Router();

router.route('/add')
    .post(verifyJwtToken('add-transaction-chanel'), add_chanel);
router.route('/delete')
    .post(verifyJwtToken('delete-transaction-chanel'), add_chanel);


export default router;
