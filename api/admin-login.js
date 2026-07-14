const crypto = require("crypto");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

module.exports = async (req, res) => {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method Not Allowed"
        });
    }

    const { username, password } = req.body || {};

    if (
        username !== ADMIN_USERNAME ||
        password !== ADMIN_PASSWORD
    ) {
        return res.status(401).json({
            error: "Invalid username or password"
        });
    }

    const token = crypto.randomBytes(32).toString("hex");

    return res.status(200).json({
        token
    });
};