import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {me} from "../controller/UserController";
import {getFile, uploadFile} from "../controller/AttachmentController";

const router: Router = Router();


router.route("/upload")
    .post(verifyJwtToken(), uploadFile);
router.route("/get/:id")
    .get(getFile);

export default router;
