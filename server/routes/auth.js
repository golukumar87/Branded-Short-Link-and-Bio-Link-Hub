import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import BioProfile from "../models/BioProfile.js";
import { clearAuthCookies, hashToken, randomToken, setAuthCookies, signAccessToken, signRefreshToken } from "../utils/tokens.js";
import { normalizeUsername } from "../utils/validators.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimits.js";

const router = express.Router();

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    username: user.username,
    emailVerified: !!user.emailVerified,
    emailVerificationToken: user.emailVerified ? undefined : user.emailVerificationToken
  };
}

router.post("/signup", authLimiter, async (req, res, next) => {
  try {
    const { name, email, password, username } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

    const normalizedUsername = normalizeUsername(username || email.split("@")[0]);
    if (!normalizedUsername || normalizedUsername.length < 3) return res.status(400).json({ message: "Username must be at least 3 characters" });

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: normalizedUsername }] });
    if (existing) return res.status(409).json({ message: "Email or username already exists" });

    const user = await User.create({
      name,
      email,
      username: normalizedUsername,
      passwordHash: await bcrypt.hash(password, 12),
      emailVerificationToken: randomToken()
    });

    await BioProfile.create({
      owner: user._id,
      username: user.username,
      displayName: user.name,
      bio: "Creator, builder and curator of useful links.",
      socialLinks: []
    });

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      user: publicUser(user),
      verificationToken: user.emailVerificationToken,
      message: "Signup complete. Email verification is simulated; use the returned token with /api/auth/verify-email."
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").toLowerCase() });
    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();
    setAuthCookies(res, accessToken, refreshToken);

    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "Refresh token required" });

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || user.refreshTokenHash !== hashToken(token)) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save();
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshTokenHash: 1 } });
    clearAuthCookies(res);
    res.json({ message: "Logged out" });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-email", async (req, res, next) => {
  try {
    const user = await User.findOne({ emailVerificationToken: req.body.token });
    if (!user) return res.status(400).json({ message: "Invalid verification token" });
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();
    res.json({ message: "Email verified", user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", authLimiter, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: String(req.body.email || "").toLowerCase() });
    if (!user) return res.json({ message: "If the account exists, a reset token was generated." });
    user.passwordResetToken = randomToken();
    user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    res.json({ message: "Password reset is simulated. Use the returned token.", resetToken: user.passwordResetToken });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", authLimiter, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiresAt: { $gt: new Date() }
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    res.json({ message: "Password reset complete" });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
