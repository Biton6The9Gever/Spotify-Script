import express from "express";
import fetch from "node-fetch";
import open from "open";
import crypto from "crypto";
import SpotifyWebApi from "spotify-web-api-node";

import pkg from "./config.js";
const { clientId, redirectUri } = pkg;

// Get command-line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node index.js <playlistId> <artistName>");
  process.exit(1);
}

const playlistId = args[0];
const artistName = args[1];

const scopes = [
  "playlist-read-private",
  "playlist-modify-private",
  "playlist-modify-public",
];

const app = express();
let codeVerifier;
let spotifyApi;

// --- PKCE helpers ---
function generateCodeVerifier(length = 128) {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
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

// --- OAuth flow ---
app.get("/login", (req, res) => {
  codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("code_challenge", codeChallenge);

  res.redirect(authUrl.toString());
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code found.");

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
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

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return res.send("Login failed.");
    }

    // Create Spotify API client
    spotifyApi = new SpotifyWebApi({
      clientId,
      redirectUri,
    });
    spotifyApi.setAccessToken(tokenData.access_token);

    res.send("✅ Logged in! You can close this window.");
    runScript();
  } catch (err) {
    console.error("Error exchanging code:", err);
    res.send("Login failed.");
  }
});

// --- Main script ---
async function runScript() {
  try {
    const me = await spotifyApi.getMe();
    const userId = me.body.id;

    // Get playlist tracks
    let tracks = [];
    let offset = 0;
    let batch;

    do {
      batch = await spotifyApi.getPlaylistTracks(playlistId, {
        offset,
        limit: 100,
      });
      if (!batch.body.items || batch.body.items.length === 0) break;
      tracks = tracks.concat(batch.body.items);
      offset += 100;
    } while (batch.body.items.length > 0);

    if (tracks.length === 0) {
      console.log("The playlist is empty.");
      return;
    }

    // Filter songs by artist
    const artistTracks = tracks
      .filter((item) => {
        if (!item.track || !item.track.artists) return false;
        return item.track.artists.some((a) =>
          a.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes(
              artistName
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
            )
        );
      })
      .map((item) => item.track.uri);

    if (artistTracks.length === 0) {
      console.log(`No tracks by ${artistName} were found.`);
      return;
    }

    console.log(`Found ${artistTracks.length} tracks by ${artistName}`);

    // Create new playlist
    const newPlaylist = await spotifyApi.createPlaylist(userId, {
      name: `${artistName} Songs`,
      public: false,
    });

    // Add tracks in chunks of 100
    for (let i = 0; i < artistTracks.length; i += 100) {
      await spotifyApi.addTracksToPlaylist(
        newPlaylist.body.id,
        artistTracks.slice(i, i + 100)
      );
    }

    console.log(`Playlist created: ${artistName} Songs`);
  } catch (err) {
    console.error("Error running script:", err);
  }
}

// --- Start server ---
app.listen(6967, () => {
  console.log("Go to http://127.0.0.1:6967/login to authenticate");
  open("http://127.0.0.1:6967/login").catch(console.error);
});
