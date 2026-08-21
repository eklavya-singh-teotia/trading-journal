export const BROKER_CONFIGS = {
    upstox: {
        headers: {
            brokerExecutionId: [
                "trade id",
                "trade_id",
                "trade no",
                "trade number",
                "trade_no",
                "execution id",
                "exchange trade id",
                "exchange_trade_id"
            ],
            symbol: [
                "scrip name",
                "scrip_name",
                "scrip",
                "symbol",
                "trading symbol",
                "tradingsymbol",
                "symbol name",
                "instrument",
                "instrument name"
            ],
            transactionType: [
                "type",
                "buy/sell",
                "transaction type",
                "side",
                "trade type",
                "action"
            ],
            quantity: [
                "quantity",
                "qty",
                "shares",
                "filled qty",
                "traded qty"
            ],
            price: [
                "price",
                "rate",
                "trade price",
                "avg price",
                "execution price",
                "average price"
            ],
            executionTime: [
                "trade date",
                "trade_date",
                "execution time",
                "trade time",
                "date",
                "order timestamp",
                "exchange time"
            ]
        },
        normalizeSide: (val) => {
            if (!val) return null;
            const clean = String(val).trim().toUpperCase();
            if (clean.includes("BUY") || clean === "B" || clean === "BUYING") return "BUY";
            if (clean.includes("SELL") || clean === "S" || clean === "SELLING") return "SELL";
            return null;
        }
    },
    zerodha: {
        headers: {
            brokerExecutionId: [
                "trade_id", 
                "trade id", 
                "order_id", 
                "order id", 
                "execution_id",
                "exchange_order_id"
            ],
            symbol: [
                "tradingsymbol", 
                "trading symbol", 
                "symbol", 
                "scrip",
                "instrument"
            ],
            transactionType: [
                "trade_type", 
                "trade type", 
                "type", 
                "transaction_type", 
                "side", 
                "buy/sell",
                "action"
            ],
            quantity: [
                "quantity", 
                "qty", 
                "traded_qty", 
                "shares",
                "filled quantity"
            ],
            price: [
                "price", 
                "trade_price", 
                "average_price", 
                "rate",
                "avg_price",
                "execution price"
            ],
            executionTime: [
                "order_execution_time",
                "order execution time",
                "trade_date",
                "trade date",
                "execution_time",
                "date",
                "time"
            ]
        },
        normalizeSide: (val) => {
            if (!val) return null;
            const clean = String(val).trim().toUpperCase();
            if (clean.includes("BUY") || clean === "B" || clean === "BUYING") return "BUY";
            if (clean.includes("SELL") || clean === "S" || clean === "SELLING") return "SELL";
            return null;
        }
    },
    groww: {
        headers: {
            brokerExecutionId: [
                "exchange order id",
                "exchange_order_id",
                "order id",
                "order_id",
                "trade id",
                "trade_id"
            ],
            symbol: [
                "symbol", 
                "stock name", 
                "scrip name", 
                "tradingsymbol", 
                "instrument"
            ],
            transactionType: [
                "type", 
                "buy/sell", 
                "transaction type", 
                "side",
                "trade type"
            ],
            quantity: [
                "quantity", 
                "qty", 
                "shares",
                "traded qty",
                "filled qty"
            ],
            price: [
                "price", 
                "avg price", 
                "execution price", 
                "value", 
                "rate",
                "average price"
            ],
            executionTime: [
                "execution date and time",
                "execution_date_and_time",
                "order date and time",
                "trade date",
                "trade_date",
                "date",
                "time"
            ]
        },
        normalizeSide: (val) => {
            if (!val) return null;
            const clean = String(val).trim().toUpperCase();
            if (clean.includes("BUY") || clean === "B" || clean === "BUYING") return "BUY";
            if (clean.includes("SELL") || clean === "S" || clean === "SELLING") return "SELL";
            return null;
        }
    }
};