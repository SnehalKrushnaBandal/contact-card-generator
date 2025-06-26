import express from "express";
import { PORT } from "../env.js";
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
    res.status(500).send("Internal server error");
  }
});

// app.get("/", async (req, res) => {
//   try {
//     const indexFile = path.join(import.meta.dirname, "views", "index.html");
//     let content = await readFile(indexFile, "utf-8");  // <== FIXED

//     const { error, success } = req.query;

//     if (error) {
//       content = content.replace("{{ alert }}", `<p style="color:red;">${error}</p>`);
//     } else if (success) {
//       content = content.replace("{{ alert }}", `<p style="color:green;">${success}</p>`);
//     } else {
//       content = content.replace("{{ alert }}", "");
//     }

//     res.send(content);  // <== FIXED: now sending modified content
//   } catch (error) {
//     console.error("Error loading homepage:", error);
//     res.status(500).send("Internal server error");
//   }
// });

// get the user data
app.post("/", async (req, res) => {
  try {
    const { name, email, phone, github, linkedin, code } = req.body;
    const finalShortCode = code || crypto.randomBytes(4).toString("hex");

    const newCard = {
      name,
      email,
      phone,
      github,
      linkedin,
      code: finalShortCode,
    };

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
        return res.status(500).send("Could not read card file.");
      }
    }

    // Check duplicate custom code
    if (cards[finalShortCode]) {
      //   return res.status(400).send("Custom code already exists.");
      return res.redirect("/?error=Custom code already exists");
    }

    // Save new card
    cards[finalShortCode] = newCard;
    await writeFile(cardsFilePath, JSON.stringify(cards, null, 2));

    console.log("Card Saved:", newCard);
    return res.redirect(`/card/${finalShortCode}`);
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).send("Internal server error");
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
      return res.status(404).send("Card not found");
    }

    // to add QR code
    const cardUrl = `http://localhost:${PORT}/card/${code}`;
    const qrImageData = await QRCode.toDataURL(cardUrl);

    // Read HTML template
    const cardTemplatePath = path.join(
      import.meta.dirname,
      "views",
      "card.html"
    );
    let content = await readFile(cardTemplatePath, "utf-8");

    // Replace placeholders in template
    content = content
      .replace("{{ name }}", card.name)
      .replace("{{ email }}", card.email)
      .replace("{{ phone }}", card.phone)
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
      .replace(
        "{{ qrCode }}",
        `<a href="${qrImageData}" class"qr" download="${code}.png"><img src="${qrImageData}" class="qr-img" alt="QR Code" /></a>`
      );

    res.send(content);
  } catch (error) {
    console.error("Card display error:", error);
    res.status(500).send("Internal server error");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
