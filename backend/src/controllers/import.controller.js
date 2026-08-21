import { importUpstoxCsv } from "../services/import.service.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asyncHandler } from "../utils/asynchandler.js";

const uploadUpstoxCsv = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { accountId } = req.body;

    if (!req.file) {
        throw new ApiError(400, "No CSV file provided.");
    }

    if (!accountId) {
        throw new ApiError(400, "accountId is required.");
    }

    const result = await importUpstoxCsv({
        userId,
        accountId,
        file: req.file,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "CSV processed and positions matched successfully."
        )
    );
});

export { uploadUpstoxCsv };
