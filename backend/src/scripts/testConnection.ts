import { connectDatabase, disconnectDatabase, isDatabaseConnected } from "../config/database.js";

async function main() {
    console.log("Connecting to MongoDB Atlas...");
    const success = await connectDatabase();
    if (success && isDatabaseConnected()) {
        console.log("? Successfully connected to MongoDB Atlas!");
    }
    else {
        console.log("? Failed to connect to MongoDB Atlas. Please verify your connection string and IP whitelist in Atlas.");
    }
    await disconnectDatabase();
    process.exit(success ? 0 : 1);
}
main().catch((err) => {
    console.error("Error testing connection:", err.message);
    process.exit(1);
});
