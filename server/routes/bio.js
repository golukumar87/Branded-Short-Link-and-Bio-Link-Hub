import express from "express";
import BioProfile from "../models/BioProfile.js";
import { requireAuth } from "../middleware/auth.js";
import { creationLimiter } from "../middleware/rateLimits.js";
import { isValidUrl, normalizeUsername } from "../utils/validators.js";

const router = express.Router();

router.get("/public/:username", async (req, res, next) => {
  try {
    const profile = await BioProfile.findOne({ username: normalizeUsername(req.params.username) });
    if (!profile) return res.status(404).json({ message: "Bio profile not found" });
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

router.use(requireAuth);

router.get("/me", async (req, res, next) => {
  try {
    const profile = await BioProfile.findOne({ owner: req.user._id });
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

router.put("/me", creationLimiter, async (req, res, next) => {
  try {
    const { avatar, displayName, bio, theme, socialLinks } = req.body;
    const normalizedLinks = Array.isArray(socialLinks)
      ? socialLinks
          .filter((item) => item.label && item.url)
          .map((item) => {
            let url = String(item.url).trim();
            if (url && !/^https?:\/\//i.test(url)) {
              url = `https://${url}`;
            }
            return { label: String(item.label).trim(), url };
          })
      : [];

    const invalidLink = normalizedLinks.find((item) => !isValidUrl(item.url));
    if (invalidLink) return res.status(400).json({ message: `Invalid URL for ${invalidLink.label}` });

    const profile = await BioProfile.findOneAndUpdate(
      { owner: req.user._id },
      {
        avatar: avatar || "",
        displayName: displayName || req.user.name,
        bio: bio || "",
        theme: ["minimal-light", "dark-slate", "gradient", "cyber-neon"].includes(theme) ? theme : "minimal-light",
        socialLinks: normalizedLinks
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

export default router;
