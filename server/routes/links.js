import express from "express";
import { customAlphabet } from "nanoid";
import QRCode from "qrcode";
import mongoose from "mongoose";
import Link from "../models/Link.js";
import ClickEvent from "../models/ClickEvent.js";
import { requireAuth } from "../middleware/auth.js";
import { creationLimiter } from "../middleware/rateLimits.js";
import { isValidSlug, isValidUrl } from "../utils/validators.js";

const router = express.Router();
const generateCode = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

function baseUrl(req) {
  return process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

export function cleanSlug(slug) {
  return String(slug || "")
    .trim()
    .replace(/^https?:\/\/[^\/]+\/r\//i, "")
    .replace(/^\/?(r\/)?/i, "")
    .trim();
}

async function generateShortCode() {
  for (let i = 0; i < 20; i += 1) {
    const code = generateCode();
    const exists = await Link.exists({ shortCode: code });
    if (!exists) return code;
  }
  throw Object.assign(new Error("Could not generate a unique short code"), { status: 500 });
}

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const search = String(req.query.search || "").trim();
    const query = { owner: req.user._id, archived: false };
    if (search) {
      query.$or = [
        { destinationUrl: { $regex: search, $options: "i" } },
        { shortCode: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { tag: { $regex: search, $options: "i" } }
      ];
    }

    const [items, total] = await Promise.all([
      Link.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Link.countDocuments(query)
    ]);

    const clickCounts = await ClickEvent.aggregate([
      { $match: { link: { $in: items.map((item) => item._id) } } },
      { $group: { _id: "$link", clicks: { $sum: 1 } } }
    ]);
    const countMap = new Map(clickCounts.map((item) => [String(item._id), item.clicks]));

    res.json({
      items: items.map((item) => ({
        ...item.toObject(),
        shortUrl: `${baseUrl(req)}/r/${item.shortCode}`,
        clicks: countMap.get(String(item._id)) || 0
      })),
      page,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", creationLimiter, async (req, res, next) => {
  try {
    const { destinationUrl, vanitySlug, title, tag } = req.body;
    if (!isValidUrl(destinationUrl)) return res.status(400).json({ message: "Enter a valid http(s) destination URL" });

    const cleaned = cleanSlug(vanitySlug);
    const shortCode = cleaned || (await generateShortCode());
    if (!isValidSlug(shortCode)) return res.status(400).json({ message: "Slug must be 3-32 letters, numbers or hyphens" });
    if (await Link.exists({ shortCode })) return res.status(409).json({ message: "This short link slug is already taken" });

    const link = await Link.create({
      owner: req.user._id,
      destinationUrl,
      shortCode,
      title: title || "",
      tag: tag ? String(tag).trim() : "General"
    });

    res.status(201).json({ link: { ...link.toObject(), shortUrl: `${baseUrl(req)}/r/${link.shortCode}` } });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", creationLimiter, async (req, res, next) => {
  try {
    const { destinationUrl, vanitySlug, title, tag } = req.body;
    if (!isValidUrl(destinationUrl)) return res.status(400).json({ message: "Enter a valid http(s) destination URL" });

    const shortCode = cleanSlug(vanitySlug);
    if (!isValidSlug(shortCode)) return res.status(400).json({ message: "Slug must be 3-32 letters, numbers or hyphens" });

    const duplicate = await Link.findOne({ shortCode, _id: { $ne: req.params.id } });
    if (duplicate) return res.status(409).json({ message: "This short link slug is already taken" });

    const updateData = { destinationUrl, shortCode, title: title || "" };
    if (tag) updateData.tag = String(tag).trim();

    const link = await Link.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updateData,
      { new: true }
    );
    if (!link) return res.status(404).json({ message: "Link not found" });

    res.json({ link: { ...link.toObject(), shortUrl: `${baseUrl(req)}/r/${link.shortCode}` } });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await Link.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { archived: true });
    res.json({ message: "Link deleted" });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/qr", async (req, res, next) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, owner: req.user._id });
    if (!link) return res.status(404).json({ message: "Link not found" });
    const dataUrl = await QRCode.toDataURL(`${baseUrl(req)}/r/${link.shortCode}`);
    res.json({ dataUrl });
  } catch (error) {
    next(error);
  }
});

router.get("/analytics/summary", async (req, res, next) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user._id);
    const matchCriteria = { owner: ownerId };
    
    if (req.query.linkId && mongoose.Types.ObjectId.isValid(req.query.linkId)) {
      matchCriteria.link = new mongoose.Types.ObjectId(req.query.linkId);
    }

    const [totals, clicksOverTime, topReferrers, deviceDistribution] = await Promise.all([
      ClickEvent.countDocuments(matchCriteria),
      ClickEvent.aggregate([
        { $match: matchCriteria },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, clicks: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 14 }
      ]),
      ClickEvent.aggregate([
        { $match: matchCriteria },
        { $group: { _id: "$referrer", clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } },
        { $limit: 5 }
      ]),
      ClickEvent.aggregate([
        { $match: matchCriteria },
        { $group: { _id: "$deviceType", clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } }
      ])
    ]);

    res.json({
      totalClicks: totals,
      clicksOverTime: clicksOverTime.map((item) => ({ date: item._id, clicks: item.clicks })),
      topReferrers: topReferrers.map((item) => ({ referrer: item._id, clicks: item.clicks })),
      deviceDistribution: deviceDistribution.map((item) => ({ device: item._id, clicks: item.clicks }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
