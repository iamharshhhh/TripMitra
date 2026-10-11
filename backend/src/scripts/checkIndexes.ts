import { connectDatabase, disconnectDatabase } from "../config/database.js";
import mongoose from "mongoose";

async function main() {
    const connected = await connectDatabase();
    if (!connected) {
        console.error("Failed to connect to DB");
        process.exit(1);
    }
    const collection = mongoose.connection.collection("messages");
    const indexes = await collection.indexes();
    console.log("INDEX_LIST_START");
    for (const idx of indexes) {
        console.log(JSON.stringify(idx));
    }
    console.log("INDEX_LIST_END");
    const total = await collection.countDocuments();
    const withStringId = await collection.countDocuments({ externalMessageId: { $type: "string" } });
    const withoutStringId = await collection.countDocuments({ externalMessageId: { $not: { $type: "string" } } });
    console.log("STATS:", JSON.stringify({ total, withStringId, withoutStringId }));
    await disconnectDatabase();
}
main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
