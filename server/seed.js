import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "./models/User.js";
import Link from "./models/Link.js";
import ClickEvent from "./models/ClickEvent.js";
import BioProfile from "./models/BioProfile.js";

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.deleteMany({}), Link.deleteMany({}), ClickEvent.deleteMany({}), BioProfile.deleteMany({})]);

  const user = await User.create({
    name: "Ravish Kumar",
    email: "ravish@example.com",
    username: "ravish",
    emailVerified: true,
    passwordHash: await bcrypt.hash("Password123", 12)
  });

  const links = await Link.insertMany([
    { owner: user._id, title: "Portfolio", destinationUrl: "https://example.com", shortCode: "portfolio" },
    { owner: user._id, title: "Resume", destinationUrl: "https://example.com/resume", shortCode: "resume" },
    { owner: user._id, title: "Launch Campaign", destinationUrl: "https://example.com/launch", shortCode: "launch" }
  ]);

  const devices = ["Desktop", "Mobile", "Tablet"];
  const referrers = ["Direct", "https://linkedin.com", "https://x.com", "https://github.com"];
  const events = [];
  for (let i = 0; i < 36; i += 1) {
    events.push({
      owner: user._id,
      link: links[i % links.length]._id,
      deviceType: devices[i % devices.length],
      referrer: referrers[i % referrers.length],
      ipHash: `seed-${i}`,
      createdAt: new Date(Date.now() - i * 8 * 60 * 60 * 1000)
    });
  }
  await ClickEvent.insertMany(events);

  await BioProfile.create({
    owner: user._id,
    username: "ravish",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop",
    displayName: "Ravish Kumar",
    bio: "Full-stack developer building practical SaaS products.",
    theme: "gradient",
    socialLinks: [
      { label: "Portfolio", url: "https://ravish.dev" },
      { label: "GitHub", url: "https://github.com/ravishkumar" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/ravishkumar" }
    ]
  });

  console.log("Seed complete");
  console.log("Login: ravish@example.com / Password123");
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
