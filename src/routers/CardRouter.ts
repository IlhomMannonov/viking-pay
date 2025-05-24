import {Router} from 'express';
import {create, getAll, remove, update} from "../controller/CardController";
import {verifyJwtToken} from "../middilwares/Security";

const router: Router = Router();

router.route('/create')
    .post(verifyJwtToken('system-card-create'), create);

router.route('/all')
    .get(verifyJwtToken('system-card-get-all'), getAll);

router.route('/update/:id')
    .put(verifyJwtToken('system-card-update'), update);

router.route('/remove/:id')
    .delete(verifyJwtToken('system-card-delete'), remove);

export default router;
