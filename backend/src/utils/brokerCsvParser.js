import { Readable } from "stream";
import csvParser from "csv-parser";
import * as XLSX from "xlsx";

/**
 * Supported Broker Configurations with Header Mappings & Side Normalization
 */
export const BROKER_CONFIGS = {
    upstox: {
        name: "Upstox",
        source: "UPSTOX_CSV",
        headers: {
            brokerExecutionId: ["trade id", "trade_id", "trade no", "execution id"],
            symbol: ["scrip", "symbol", "trading symbol", "tradingsymbol"],
            side: ["type", "buy/sell", "transaction type", "side"],
            quantity: ["quantity", "qty", "shares"],
            price: ["price", "rate", "trade price"],
            exchange: ["exchange"],
            date: ["trade date", "execution time", "trade time", "date"],
        },
        normalizeSide: (rawSide) => {
            if (!rawSide) return null;
            const str = String(rawSide).trim().toUpperCase();
            if (str.includes("BUY") || str === "B") return "BUY";
            if (str.includes("SELL") || str === "S") return "SELL";
            return null;
        },
    },
    zerodha: {
        name: "Zerodha",
        source: "ZERODHA_CSV",
        headers: {
            brokerExecutionId: ["trade_id", "trade id", "order_id", "order id", "execution id"],
            symbol: ["symbol", "trading_symbol", "tradingsymbol", "scrip"],
            side: ["trade_type", "type", "transaction_type", "buy/sell", "side"],
            quantity: ["quantity", "qty"],
            price: ["price", "trade_price", "rate"],
            exchange: ["exchange"],
            date: ["trade_date", "order_execution_time", "trade_time", "date"],
        },
        normalizeSide: (rawSide) => {
            if (!rawSide) return null;
            const str = String(rawSide).trim().toUpperCase();
            if (str.includes("BUY") || str === "B") return "BUY";
            if (str.includes("SELL") || str === "S") return "SELL";
            return null;
        },
    },
    groww: {
        name: "Groww",
        source: "GROWW_CSV",
        headers: {
            brokerExecutionId: ["order id", "order_id", "trade id", "trade_id", "execution id", "order no", "order_no", "exchange order id"],
            symbol: ["stock name", "stock_name", "company name", "symbol", "scrip", "stock", "instrument", "trading symbol"],
            side: ["type", "order type", "transaction type", "action", "buy/sell", "side", "b/s"],
            quantity: ["quantity", "qty", "no. of shares", "executed qty", "filled qty", "shares"],
            price: ["price", "average price", "avg price", "rate", "trade price", "avg. price", "executed price"],
            rawValue: ["total value", "total_value", "amount", "value", "total amount", "trade value", "invested amount"],
            exchange: ["exchange", "segment"],
            date: ["order time", "order date", "date", "trade time", "execution time", "time", "date & time", "trade date"],
        },
        normalizeSide: (rawSide) => {
            if (!rawSide) return null;
            const str = String(rawSide).trim().toUpperCase();
            if (str.includes("BUY") || str === "B") return "BUY";
            if (str.includes("SELL") || str === "S") return "SELL";
            return null;
        },
    },
};

/**
 * Dynamic CSV/Excel header lookup helper.
 * Case-insensitive & whitespace tolerant column matching.
 */
function getCsvValue(row, keys = []) {
    if (!row || !keys || !keys.length) return null;
    const normalizedKeys = keys.map((key) => key.trim().toLowerCase());
    const key = Object.keys(row).find((rowKey) =>
        normalizedKeys.includes(rowKey.trim().toLowerCase())
    );
    return (key !== undefined && row[key] !== undefined && row[key] !== null) ? String(row[key])?.trim() : null;
}

/**
 * Flexible Date parser supporting multiple date/time string formats:
 * - DD-MM-YYYY / DD/MM/YYYY with optional HH:mm:ss
 * - YYYY-MM-DD / YYYY/MM/DD with optional HH:mm:ss
 * - Standard Date string fallback
 */
export function parseFlexibleDate(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;

    const str = String(dateStr).trim();

    // 1. DD-MM-YYYY or DD/MM/YYYY with optional time
    const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ddmmyyyyMatch) {
        const [, day, month, year, hours = "0", minutes = "0", seconds = "0"] = ddmmyyyyMatch;
        return new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hours, 10),
            parseInt(minutes, 10),
            parseInt(seconds, 10)
        );
    }

    // 2. YYYY-MM-DD or YYYY/MM/DD with optional time
    const yyyymmddMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (yyyymmddMatch) {
        const [, year, month, day, hours = "0", minutes = "0", seconds = "0"] = yyyymmddMatch;
        return new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hours, 10),
            parseInt(minutes, 10),
            parseInt(seconds, 10)
        );
    }

    const parsed = new Date(str);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Normalizes a raw CSV/Excel row into standard Execution record using brokerConfig.
 */
function normalizeBrokerCsvRow(row, { userId, accountId, brokerConfig, rowIndex = 0 }) {
    const headers = brokerConfig.headers || {};

    const symbol = (
        getCsvValue(row, headers.symbol) || ""
    ).toUpperCase();

    const rawSide = getCsvValue(row, headers.side) || "";
    const transactionType = typeof brokerConfig.normalizeSide === "function"
        ? brokerConfig.normalizeSide(rawSide)
        : null;

    const rawQtyStr = getCsvValue(row, headers.quantity) || "";
    const quantity = Math.abs(
        parseFloat(rawQtyStr.replace(/,/g, "") || 0)
    );

    // Price calculation with Groww unit-price derivation (rawValue / quantity)
    const rawPriceStr = getCsvValue(row, headers.price) || "";
    const rawValueStr = getCsvValue(row, headers.rawValue) || "";
    const rawPrice = parseFloat(rawPriceStr.replace(/,/g, "") || 0);
    const rawValue = parseFloat(rawValueStr.replace(/,/g, "") || 0);
    let price = rawPrice;
    if ((!price || price <= 0) && rawValue > 0 && quantity > 0) {
        price = Math.abs(rawValue / quantity);
    }

    const rawExchange = (getCsvValue(row, headers.exchange) || "NSE").toUpperCase();
    const exchange = ["NSE", "BSE", "NFO", "MCX", "CDS"].includes(rawExchange)
        ? rawExchange
        : "NSE";

    const rawDate = getCsvValue(row, headers.date);
    const executionTime = parseFlexibleDate(rawDate);

    let brokerExecutionId = getCsvValue(row, headers.brokerExecutionId);
    // If Groww or other broker doesn't provide an order/trade ID per row, generate a deterministic synthetic ID
    if (!brokerExecutionId && symbol && transactionType && quantity > 0) {
        const timeStamp = executionTime.getTime() || 0;
        brokerExecutionId = `SYNTH_${symbol}_${transactionType}_${quantity}_${timeStamp}_${rowIndex}`;
    }

    return {
        user: userId,
        account: accountId,
        brokerExecutionId,
        symbol,
        exchange,
        transactionType,
        quantity,
        price,
        executionTime,
        source: brokerConfig.source || "FILE_IMPORT",
    };
}

/**
 * Validates normalized execution object.
 */
function validateBrokerExecution(execution) {
    const errors = [];

    if (!execution.brokerExecutionId) errors.push("Missing broker execution ID");
    if (!execution.symbol) errors.push("Missing symbol");
    if (!execution.transactionType) errors.push("Invalid transaction type");
    if (!Number.isFinite(execution.quantity) || execution.quantity <= 0) {
        errors.push("Quantity must be greater than 0");
    }
    if (!Number.isFinite(execution.price) || execution.price <= 0) {
        errors.push("Price must be greater than 0");
    }
    if (Number.isNaN(execution.executionTime.getTime())) {
        errors.push("Invalid execution time");
    }

    return errors;
}

/**
 * Helper function to resolve broker configuration object.
 */
function resolveBrokerConfig(broker, brokerConfig) {
    let resolvedConfig = brokerConfig;

    if (!resolvedConfig && typeof broker === "string") {
        resolvedConfig = BROKER_CONFIGS[broker.toLowerCase()];
    }

    if (!resolvedConfig || !resolvedConfig.headers) {
        throw new Error(`Invalid or unsupported broker configuration provided.`);
    }

    return resolvedConfig;
}

/**
 * Parses Excel file buffer (.xlsx / .xls) into normalized execution records.
 * Auto-detects header row if Groww Excel sheet includes top metadata or title rows.
 */
export function parseBrokerExcelBuffer(buffer, { userId, accountId, broker, brokerConfig }) {
    const resolvedConfig = resolveBrokerConfig(broker, brokerConfig);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
        throw new Error("Excel spreadsheet contains no readable worksheets.");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    
    // Attempt 1: Default sheet_to_json
    let rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    // Check if headers match. If not, Groww Excel file might have title/metadata rows at the top.
    const checkHeadersMatched = (rows) => {
        if (!rows.length) return false;
        const sampleRow = rows[0];
        const headers = resolvedConfig.headers;
        return (
            getCsvValue(sampleRow, headers.symbol) !== null ||
            getCsvValue(sampleRow, headers.side) !== null
        );
    };

    // If default sheet_to_json didn't find symbol or side columns, search for the header row
    if (!checkHeadersMatched(rawRows)) {
        const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(matrix.length, 25); i++) {
            const rowArr = matrix[i];
            if (!Array.isArray(rowArr)) continue;
            const rowStr = rowArr.map(c => String(c).toLowerCase()).join(" ");
            // Check if row contains typical column keywords
            if ((rowStr.includes("stock") || rowStr.includes("symbol") || rowStr.includes("scrip")) &&
                (rowStr.includes("buy") || rowStr.includes("sell") || rowStr.includes("type") || rowStr.includes("action"))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex !== -1) {
            rawRows = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: "" });
        }
    }

    return rawRows
        .filter(row => row && Object.values(row).some(v => v !== "" && v !== null && v !== undefined))
        .map((row, rowIndex) => {
            const execution = normalizeBrokerCsvRow(row, {
                userId,
                accountId,
                brokerConfig: resolvedConfig,
                rowIndex,
            });
            return {
                execution,
                validationErrors: validateBrokerExecution(execution),
            };
        });
}

/**
 * Generalized parser supporting CSV and Excel files.
 */
export function parseBrokerFileBuffer(buffer, { userId, accountId, broker, brokerConfig, filename = "", mimetype = "" }) {
    const isExcel =
        filename.endsWith(".xlsx") ||
        filename.endsWith(".xls") ||
        mimetype.includes("spreadsheetml") ||
        mimetype.includes("excel");

    if (isExcel) {
        return Promise.resolve(parseBrokerExcelBuffer(buffer, { userId, accountId, broker, brokerConfig }));
    }

    return parseBrokerCsvBuffer(buffer, { userId, accountId, broker, brokerConfig });
}

/**
 * Legacy CSV buffer parser.
 */
export function parseBrokerCsvBuffer(buffer, { userId, accountId, broker, brokerConfig }) {
    return new Promise((resolve, reject) => {
        let resolvedConfig;
        try {
            resolvedConfig = resolveBrokerConfig(broker, brokerConfig);
        } catch (err) {
            return reject(err);
        }

        const rows = [];
        const stream = Readable.from(buffer);

        stream
            .pipe(csvParser())
            .on("data", (row) => {
                const execution = normalizeBrokerCsvRow(row, {
                    userId,
                    accountId,
                    brokerConfig: resolvedConfig,
                });
                rows.push({
                    execution,
                    validationErrors: validateBrokerExecution(execution),
                });
            })
            .on("end", () => resolve(rows))
            .on("error", reject);
    });
}

