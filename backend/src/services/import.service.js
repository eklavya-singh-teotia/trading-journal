import mongoose from "mongoose";
import { Account } from "../models/account.model.js";
import { Execution } from "../models/execution.model.js";
import { processExecutionsFIFO } from "./fifoMatching.service.js";
import { ApiError } from "../utils/apierror.js";
import { parseBrokerFileBuffer, BROKER_CONFIGS } from "../utils/brokerCsvParser.js";

/**
 * Legacy wrapper function maintaining compatibility with import.controller.js
 */
export async function importUpstoxCsv({ userId, accountId, file }) {
    return importBrokerCsv({ userId, accountId, file });
}

/**
 * Dynamic broker CSV import service resolving account.broker configuration
 */
export async function importBrokerCsv({ userId, accountId, file }) {
    if (!mongoose.isValidObjectId(accountId)) {
        throw new ApiError(404, "Account not found.");
    }

    const account = await Account.findOne({
        _id: accountId,
        user: userId,
    });

    if (!account) {
        throw new ApiError(404, "Account not found.");
    }

    const brokerKey = account.broker ? String(account.broker).trim().toLowerCase() : null;
    const brokerConfig = brokerKey ? BROKER_CONFIGS[brokerKey] : null;

    if (!brokerConfig) {
        const supportedBrokers = Object.keys(BROKER_CONFIGS).join(", ");
        throw new ApiError(
            400,
            `Unsupported or missing broker '${account.broker || "undefined"}' for account. Supported brokers are: ${supportedBrokers}.`
        );
    }

    let rawRows;
    try {
        rawRows = await parseBrokerFileBuffer(file.buffer, {
            userId,
            accountId,
            brokerConfig,
            filename: file.originalname || "",
            mimetype: file.mimetype || "",
        });
    } catch (err) {
        throw new ApiError(400, `Failed to parse trade file: ${err.message}`);
    }

    if (!rawRows || !rawRows.length) {
        throw new ApiError(400, "CSV file is empty.");
    }

    const normalizedRows = rawRows.map((row, index) => ({
        ...row,
        rowNumber: index + 2,
    }));

    const invalidRowDetails = normalizedRows
        .filter(({ validationErrors }) => validationErrors.length > 0)
        .map(({ rowNumber, validationErrors }) => ({
            rowNumber,
            reason: validationErrors.join("; "),
        }));

    const executionsToUpsert = normalizedRows
        .filter(({ validationErrors }) => validationErrors.length === 0)
        .map(({ execution }) => execution);

    if (!executionsToUpsert.length) {
        throw new ApiError(
            400,
            "No valid execution records could be parsed from the file.",
            invalidRowDetails
        );
    }

    const session = await mongoose.startSession();
    let transactionStarted = false;
    try {
        session.startTransaction();
        transactionStarted = true;
    } catch (err) {
        // Transactions require MongoDB replica set; continue without explicit transaction if standalone
    }

    try {
        const sessionOptions = transactionStarted ? { session } : {};
        const bulkOperations = executionsToUpsert.map((execution) => ({
            updateOne: {
                filter: {
                    account: execution.account,
                    brokerExecutionId: execution.brokerExecutionId,
                },
                update: { $setOnInsert: execution },
                upsert: true,
            },
        }));

        const bulkResult = await Execution.bulkWrite(bulkOperations, sessionOptions);
        const newExecutionsImported = bulkResult.upsertedCount || 0;
        const duplicateExecutions = executionsToUpsert.length - newExecutionsImported;

        const fifoSummary = await processExecutionsFIFO(userId, accountId, sessionOptions);

        if (transactionStarted) {
            await session.commitTransaction();
        }

        return {
            totalRowsInCsv: rawRows.length,
            validRows: executionsToUpsert.length,
            invalidRows: invalidRowDetails.length,
            newExecutionsImported,
            duplicateExecutions,
            invalidRowDetails,
            fifoSummary,
        };
    } catch (error) {
        if (transactionStarted) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        session.endSession();
    }
}
