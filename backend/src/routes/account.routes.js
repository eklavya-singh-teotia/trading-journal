import { Router } from "express";
import {
    createAccount,
    getUserAccounts,
    getAccountById,
    disconnectAccount
} from "../controllers/accounts.controller.js";
import { verifyJWT } from "../middlewares/auth.js";

const router = Router();

router.use(verifyJWT);

router
    .route("/")
    .post(createAccount)
    .get(getUserAccounts);

router
    .route("/:accountId")
    .get(getAccountById);

router
    .patch("/:accountId/disconnect", disconnectAccount);

export default router;