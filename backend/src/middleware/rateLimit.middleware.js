import { rateLimit } from "express-rate-limit";

const authRateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  // The frontend shows error.response.data.message in a toast
  message: { message: "Too many attempts, please try again later" },
};

// Separate instances keep separate counters: login and signup each allow
// 10 requests per IP per 15 minutes.
// Login counts only failed attempts (status >= 400), so people who share one
// public IP and log in successfully do not lock each other out.
export const loginRateLimiter = rateLimit({ ...authRateLimitOptions, skipSuccessfulRequests: true });
export const signupRateLimiter = rateLimit(authRateLimitOptions);

// Mounted after protectRoute and counted per logged-in user, so people sharing
// one public IP do not use up each other's quota.
export const sendMessageRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user._id.toString(),
  message: { message: "Too many messages, please try again later" },
});
