import {Router} from 'express';
import {create, getAll, getAllProviders, getBiyId, remove, update} from "../controller/ProviderController";
import {verifyJwtToken} from "../middilwares/Security";

const router: Router = Router();

router.route('/f-all')
    .get(verifyJwtToken(), getAllProviders);

router.route('/by_id/:provider_id')
    .get(verifyJwtToken(), getBiyId);

// ADMIN
router.route('/create')
    .post(verifyJwtToken('provider-create'), create);
// ADMIN
router.route('/update/:id')
    .put(verifyJwtToken('provider-update'), update);
// ADMIN
router.route('/remove/:id')
    .delete(verifyJwtToken('provider-delete'), remove);
// ADMIN
router.route('/all')
    .get(verifyJwtToken('provider-get-all'), getAll);


export default router;
