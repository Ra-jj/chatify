import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const JWT_VERIFY_ERROR_NAMES = new Set(["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"]);

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    // sessionId stays loaded for the check below; responses must not send req.user as-is.
    const user = await User.findById(decoded.userId).select("-password -pushSubscriptions");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.sessionId !== decoded.sessionId) {
      return res.status(401).json({ message: "Unauthorized - Logged in from another device" });
    }

    req.user = user;

    next();
  } catch (error) {
    // jwt.verify throws these for malformed, forged, expired or not-yet-valid tokens
    if (JWT_VERIFY_ERROR_NAMES.has(error.name)) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    console.log("Error in protectRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
