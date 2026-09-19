import crypto from "crypto";
import { UAParser } from "ua-parser-js";

export function parseClickMetadata(req) {
  const parser = new UAParser(req.headers["user-agent"] || "");
  const device = parser.getDevice();
  const type = device.type;
  const forwarded = req.headers["x-forwarded-for"];
  const rawIp = (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") || req.ip || req.socket?.remoteAddress || "unknown";

  return {
    referrer: req.get("referer") || "Direct",
    deviceType: type === "mobile" ? "Mobile" : type === "tablet" ? "Tablet" : "Desktop",
    ipHash: crypto.createHash("sha256").update(String(rawIp)).digest("hex")
  };
}
