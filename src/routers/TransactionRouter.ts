import {Router} from "express";
import {
    accepting_transaction,
    all_transactions,
    complete_pay,
    create_deposit,
    deposit_withdraw_manual,
    get_my_transaction, get_transaction,
    my_transactions,
    update_transaction,
    withdraw_balance
} from "../controller/TransactionController";
import {verifyJwtToken} from "../middilwares/Security";

const router: Router = Router();

router.route('/deposit/create')
    .post(verifyJwtToken(), create_deposit);

router.route("/deposit/complete")
    .post(verifyJwtToken(), complete_pay)

router.route("/my-transactions")
    .get(verifyJwtToken(), my_transactions);
router.route("/my-transaction/:trans_id")
    .get(verifyJwtToken(), get_my_transaction);

// USER BALANCE WITHDRAW
router.route("/withdraw-balance")
    .post(verifyJwtToken(), withdraw_balance)

//USER UCHUN DEPOZITDA TO'LADIM DEGAN NARSA
router.route("/update-transaction")
    .post(verifyJwtToken(), update_transaction)
// ADMIN
router.route("/filter")
    .post(verifyJwtToken('view-all-transaction'), all_transactions)
// ADMIN
router.route("/deposit/manual")
    .post(verifyJwtToken('deposit-wallet'), deposit_withdraw_manual)

// ADMIN
router.route("/accepting")
    .post(verifyJwtToken('accept-reject-transaction'), accepting_transaction)

router.route("/view/:trans_id")
    .get(get_transaction)


export default router;
