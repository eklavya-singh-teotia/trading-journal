import { Account } from "../models/account.model.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

const createAccount = asyncHandler(async (req, res) => {  //connect/add a broker account
    const userId = req.user._id;

    const {
        broker,
        accountName,
        brokerUserId
    } = req.body;

    if (!broker) {
        throw new ApiError(400, "Broker is required.");
    }

    if (!brokerUserId) {
        throw new ApiError(400, "Broker user ID is required.");
    }

    const existingAccount = await Account.findOne({
        user: userId,
        broker,
        brokerUserId
    });

    if (existingAccount) {
        if (!existingAccount.isActive) {
            // Reactivate the account instead of failing
            existingAccount.isActive = true;
            existingAccount.accountName = accountName || existingAccount.accountName;
            await existingAccount.save();

            return res.status(200).json(
                new ApiResponse(200, existingAccount, "Account reconnected successfully.")
            );
        }

        throw new ApiError(409, "This broker account is already connected.");
    }

    const account = await Account.create({
        user: userId,
        broker,
        accountName,
        brokerUserId
    });

    return res.status(201).json(
        new ApiResponse(
            201,
            account,
            "Account created successfully."
        )
    );
});


const getUserAccounts = asyncHandler(async (req, res) => {           //show all broker accounts belonging to logged-in user
    const userId = req.user._id;
    // Optional: allow frontend to request all accounts using ?includeInactive=true
    const includeInactive = req.query.includeInactive === 'true'; 
    
    const query = { user: userId };
    if (!includeInactive) {
        query.isActive = true;
    }

    const accounts = await Account.find(query);

    return res.status(200).json(
        new ApiResponse(200, accounts, "Accounts fetched successfully.")
    );
});


const getAccountById = asyncHandler(async (req, res) => {            //show one specific broker account
    const userId = req.user._id;
    const { accountId } = req.params;

    const account = await Account.findOne({
        _id: accountId,
        user: userId
    });

    if (!account) {
        throw new ApiError(404, "Account not found.");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            account,
            "Account fetched successfully."
        )
    );
});


const disconnectAccount = asyncHandler(async (req, res) => {         //deactivate a broker account
    const userId = req.user._id;
    const { accountId } = req.params;

    const account = await Account.findOneAndUpdate(
        {
            _id: accountId,
            user: userId
        },
        {
            $set: {
                isActive: false
            }
        },
        {
            returnDocument: 'after'
        }
    );

    if (!account) {
        throw new ApiError(404, "Account not found.");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            account,
            "Account disconnected successfully."
        )
    );
});


export {
    createAccount,
    getUserAccounts,
    getAccountById,
    disconnectAccount
};