import express from "express";
import { PORT } from "./env.js";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import QRCode from "qrcode";

const app = express();
const cardsFilePath = path.join(import.meta.dirname, "data", "card_info.json");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// send index.html file
app.get("/", async (req, res) => {
  try {
    const indexFile = path.join(import.meta.dirname, "views", "index.html");
    res.sendFile(indexFile);
  } catch (error) {
         res.status(500).send(
        `
        <div style="width:100%; height:100%;  display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h1> Internal server error </h1>
        <a href="/"> <h2> Go to home page </h2> </a>
        </div> `
      );}
});

// get the user data
app.post("/", async (req, res) => {
  try {
    const { name, email, phone, github, linkedin, code } = req.body;
    const finalShortCode = code || crypto.randomBytes(4).toString("hex");

    const newCard = {
      name, email, phone, github, linkedin, code: finalShortCode, };

    // Load existing cards
    let cards = {};
    try {
      const CardData = await readFile(cardsFilePath, "utf-8");
      cards = CardData.trim() === "" ? {} : JSON.parse(CardData);
    } catch (err) {
      console.error("FULL FILE READ ERROR:", err);
      if (err.code === "ENOENT") {
        await writeFile(cardsFilePath, JSON.stringify({}));
        cards = {};
      } else {
        console.error("Error reading file:", err);
        return res.status(500).send( `
        <div style="width:100%; height:100%;  display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h1> Could not read card file. </h1>
        <a href="/"> <h2> Go to home page </h2> </a>
        </div>`);
      }
    }

    // Check duplicate custom code
    if (cards[finalShortCode]) {
      res.status(400).send(
        `<div style="width:100%; height:100%;  display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h1> Custom code already exists. </h1>
        <a href="/"> <h2> Go to home page </h2> </a>
        </div>`
      );
    }

    // Save new card
    cards[finalShortCode] = newCard;
    await writeFile(cardsFilePath, JSON.stringify(cards, null, 2));

    console.log("Card Saved:", newCard);
    return res.redirect(`/card/${finalShortCode}`);
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).send(
          `<div style="width:100%; height:100%;  display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h1> Internal server error </h1>
        <a href="/"> <h2> Go to home page </h2> </a>
        </div> `
    );
  }
});

// show from data in the card.html
app.get("/card/:code", async (req, res) => {
  try {
    const { code } = req.params;

    // Read and parse saved cards
    const cardData = await readFile(cardsFilePath, "utf-8");
    const cards = cardData.trim() === "" ? {} : JSON.parse(cardData);

    const card = cards[code];

    if (!card) {
      return res.status(404).send(
        `
        <div style="width:100%; height:100%;  display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h1> Card not found </h1>
        <a href="/"> <h2> Go to home page </h2> </a>
        </div>
        `
      );
    }

    // to add QR code
    const cardUrl = `http://localhost:${PORT}/card/${code}`;
    const qrImageData = await QRCode.toDataURL(cardUrl);

    // Read HTML template
    const cardTemplatePath = path.join( import.meta.dirname, "views", "card.html");
    let content = await readFile(cardTemplatePath, "utf-8");

    // Replace placeholders in template
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
      res.status(500).send(
        `
        <div style="width:100%; height:100%;  display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h1> Internal server error </h1>
        <a href="/"> <h2> Go to home page </h2> </a>
        </div>
        `
      );
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
