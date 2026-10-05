const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const connectDB = require("./config/db");
require("dotenv").config();

const app = express();
const PORT = 5000;

// Connect to MongoDB
connectDB();

app.get("/", (req, res) => {
    res.send("UniCheck Backend is running!");
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});