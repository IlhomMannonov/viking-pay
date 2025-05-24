import {login, register} from "../controller/AuthController";
import {Router} from "express";

const router: Router = Router();


router.route("/register")
    .post(register);
router.route("/login")
    .post(login);


export default router;