import {verifyJwtToken} from "../middilwares/Security";
import {Router} from "express";
import {getAll, update} from "../controller/StaticOptionController";
const router: Router = Router();

router.route("/")
    .get(verifyJwtToken(), getAll);

router.route("/update")
    .put(verifyJwtToken(), update);

export default router;