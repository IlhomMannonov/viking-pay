import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {create, getAll, remove, update} from "../controller/SliderController";

const router: Router = Router();

router.route("/create")
.post(verifyJwtToken('add-slider'), create);

router.route("/update/:id")
.put(verifyJwtToken('update-slider'), update);

router.route("/remove/:id")
.delete(verifyJwtToken('delete-slider'), remove);

router.route("/all")
.get(verifyJwtToken(), getAll);

export default router;