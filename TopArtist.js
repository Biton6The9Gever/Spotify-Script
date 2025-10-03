import express from "express";
import fetch from "node-fetch";
import open from "open";
import crypto from "crypto";

import pkg from "./config.js";
const { clientId, redirectUri } = pkg;

const app = express();
const port = 6967;

let codeVerifier;
let accessToken;

function generateCodeVerifier(length = 128) {
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function generateCodeChallenge(verifier) {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send("No code returned");
  }

  // Exchange code for token
  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  const tokenData = await tokenResponse.json();
  accessToken = tokenData.access_token;

  // Get top artists
  const topArtistsRes = await fetch("https://api.spotify.com/v1/me/top/artists?limit=10", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const artistsData = await topArtistsRes.json();

  const artistsList = artistsData.items.map((a, i) => `${i + 1}. ${a.name}`).join("<br>");
  res.send(`<h1>Your Top Artists</h1><p>${artistsList}</p>`);
});

app.listen(port, async () => {
  console.log(`Server running on http://127.0.0.1:${port}`);

  codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "user-top-read");
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("code_challenge", codeChallenge);

  console.log("Opening browser for Spotify login...");
  await open(authUrl.toString());
});