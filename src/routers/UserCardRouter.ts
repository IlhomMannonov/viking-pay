import {Router} from 'express';
import {create, my_cards, remove, update, user_cards} from "../controller/UserCardController";
import {verifyJwtToken} from "../middilwares/Security";

const router: Router = Router();

router.route('/create')
    .post(verifyJwtToken(), create);

router.route('/my-cards')
    .get(verifyJwtToken(), my_cards);

router.route('/update/:id')
    .put(verifyJwtToken(), update);

router.route('/remove/:id')
    .delete(verifyJwtToken(), remove);

router.route('/user/:id')
    .get(verifyJwtToken(), user_cards);

export default router;
