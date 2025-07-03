import express from "express";
import { readFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import QRCode from "qrcode";
import { fileURLToPath } from "url";

import { client } from "./config/db_client.js";
import { env } from "./config/env.js";

const app = express();

// Required for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// MongoDB Setup
const db = client.db(env.MONGODB_DB_NAME);
const cardsCollection = db.collection("cardsCollection");

// Helper: Get card by short code
const loadCardByCode = async (code) => {
  return await cardsCollection.findOne({ code });
};

// Helper: Save card
const saveCard = async (card) => {
  return await cardsCollection.insertOne(card);
};

// Route: Home (form)
app.get("/", async (req, res) => {
  try {
    const indexFile = path.join(__dirname, "views", "index.html");
    res.sendFile(indexFile);
  } catch (error) {
    console.error("Home load error:", error);
    res.status(500).send(errorPage("Internal server error"));
  }
});

// Route: Form submit
app.post("/", async (req, res) => {
  try {
    const { name, email, phone, github, linkedin, code } = req.body;
    const finalShortCode = code || crypto.randomBytes(4).toString("hex");

    // Check if code exists
    const existing = await loadCardByCode(finalShortCode);
    if (existing) {
      return res.status(400).send(errorPage("Custom code already exists."));
    }

    const newCard = { name, email, phone, github, linkedin, code: finalShortCode };
    await saveCard(newCard);

    console.log("Card saved:", newCard);
    res.redirect(`/card/${finalShortCode}`);
  } catch (error) {
    console.error("Form submission error:", error);
    res.status(500).send(errorPage("Internal server error"));
  }
});

// Route: Card display
app.get("/card/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const card = await loadCardByCode(code);

    if (!card) {
      return res.status(404).send(errorPage("Card not found"));
    }

    const cardUrl = `http://localhost:${env.PORT}/card/${code}`;
    const qrImageData = await QRCode.toDataURL(cardUrl);

    const cardTemplatePath = path.join(__dirname, "views", "card.html");
    let content = await readFile(cardTemplatePath, "utf-8");

    content = content
      .replace("{{ name }}", card.name)
      .replace("{{ email }}", card.email)
      .replace("{{ phone }}", card.phone)
      .replace("{{ code }}", card.code)
      .replace(
        "{{ github }}",
        card.github
          ? `<p><strong>GitHub:</strong> <a href="${card.github}" target="_blank">${card.github}</a></p>`
          : ""
      )
      .replace(
        "{{ linkedin }}",
        card.linkedin
          ? `<p><strong>LinkedIn:</strong> <a href="${card.linkedin}" target="_blank">${card.linkedin}</a></p>`
          : ""
      )
      .replace("{{ qrImage }}", qrImageData);

    res.send(content);
  } catch (error) {
    console.error("Card display error:", error);
    res.status(500).send(errorPage("Internal server error"));
  }
});

// Helper: Reusable error page
function errorPage(message) {
  return `
    <div style="width:100%; height:100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <h1>${message}</h1>
      <a href="/"><h2>Go to Home Page</h2></a>
    </div>
  `;
}

// Start server
app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
