const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDb connected successfully!");
    } catch (error) {
        console.error("MongoDb connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;