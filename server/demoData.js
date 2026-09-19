import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "./models/User.js";
import Link from "./models/Link.js";
import ClickEvent from "./models/ClickEvent.js";
import BioProfile from "./models/BioProfile.js";

const realLinks = [
  { title: "Personal Portfolio", destinationUrl: "https://vercel.com/templates", shortCode: "portfolio" },
  { title: "GitHub Projects", destinationUrl: "https://github.com", shortCode: "github" },
  { title: "LinkedIn Profile", destinationUrl: "https://www.linkedin.com", shortCode: "linkedin" },
  { title: "Resume PDF", destinationUrl: "https://drive.google.com", shortCode: "resume" },
  { title: "Frontend Notes", destinationUrl: "https://developer.mozilla.org/en-US/docs/Learn/Front-end_web_developer", shortCode: "frontend" },
  { title: "React Docs", destinationUrl: "https://react.dev", shortCode: "react" },
  { title: "Node.js Docs", destinationUrl: "https://nodejs.org/en/learn", shortCode: "nodejs" },
  { title: "MongoDB Docs", destinationUrl: "https://www.mongodb.com/docs", shortCode: "mongodb" },
  { title: "Deployment Guide", destinationUrl: "https://render.com/docs", shortCode: "deploy" },
  { title: "Contact Form", destinationUrl: "https://forms.gle", shortCode: "contact" }
];

const referrers = ["Direct", "https://www.linkedin.com", "https://github.com", "https://x.com", "https://google.com"];
const devices = ["Desktop", "Mobile", "Tablet"];

async function run() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email: "ravish@example.com" });
  if (!user) {
    user = await User.create({
      name: "Ravish Kumar",
      email: "ravish@example.com",
      username: "ravish",
      emailVerified: true,
      passwordHash: await bcrypt.hash("Password123", 12)
    });
  }

  const links = [];
  for (const item of realLinks) {
    const link = await Link.findOneAndUpdate(
      { shortCode: item.shortCode },
      { ...item, owner: user._id, archived: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    links.push(link);
  }

  await BioProfile.findOneAndUpdate(
    { owner: user._id },
    {
      owner: user._id,
      username: "ravish",
      avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop",
      displayName: "Ravish Kumar",
      bio: "Full-stack developer building practical SaaS products.",
      theme: "gradient",
      socialLinks: [
        { label: "Portfolio", url: "https://vercel.com/templates" },
        { label: "GitHub", url: "https://github.com" },
        { label: "LinkedIn", url: "https://www.linkedin.com" },
        { label: "Resume", url: "https://drive.google.com" }
      ]
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const existingEvents = await ClickEvent.countDocuments({ owner: user._id });
  if (existingEvents < 80) {
    const events = [];
    for (let i = 0; i < 120; i += 1) {
      const link = links[i % links.length];
      events.push({
        owner: user._id,
        link: link._id,
        referrer: referrers[i % referrers.length],
        deviceType: devices[(i + link.shortCode.length) % devices.length],
        ipHash: `demo-ip-${i}`,
        createdAt: new Date(Date.now() - i * 3 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - i * 3 * 60 * 60 * 1000)
      });
    }
    await ClickEvent.insertMany(events);
  }

  console.log("Realistic demo data ready");
  console.log("Login: ravish@example.com / Password123");
  console.log("Public bio: http://localhost:5173/bio/ravish");
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
