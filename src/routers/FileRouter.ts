import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {download_chek, getFile, getFileById, uploadFile} from "../controller/AttachmentController";

const router: Router = Router();


router.route("/upload")
    .post(verifyJwtToken(), uploadFile);
router.route("/get/:id")
    .get(getFile);


router.route("/get-id/:id")
    .get(getFileById);

router.route("/download-chek/:transaction_id")
    .get(download_chek);
export default router;
