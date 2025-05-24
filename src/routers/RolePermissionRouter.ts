import {Router} from "express";
import {verifyJwtToken} from "../middilwares/Security";
import {
    assign_to_user,
    createRole,
    deleteRole,
    get_one_role,
    getRoles,
    set_module_permission,
    updateRole
} from "../controller/RolePermissionController";

const router: Router = Router();

router.route('/create-role')
    .post(verifyJwtToken(), createRole);

router.route('/all-role')
    .get(verifyJwtToken(), getRoles);

router.route('/update-role/:id')
    .put(verifyJwtToken(), updateRole);

router.route('/delete-role/:id')
    .delete(verifyJwtToken(), deleteRole);

router.route("/one-role/:id")
    .get(verifyJwtToken(), get_one_role);

router.route("/set")
    .post(verifyJwtToken(), set_module_permission);
router.route("/assign-to-user")
    .post(verifyJwtToken(), assign_to_user);


export default router;
