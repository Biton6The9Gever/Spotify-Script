const SpotifyWebApi = require("spotify-web-api-node");
const express = require("express");
const open = (...args) => import("open").then(({ default: open }) => open(...args));

// Load credentials from config.js
const { clientId, clientSecret, redirectUri } = require("./config");

// Get command-line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node index.js <playlistId> <artistName>");
  process.exit(1);
}

const playlistId = args[0];
const artistName = args[1];

const spotifyApi = new SpotifyWebApi({
  clientId,
  clientSecret,
  redirectUri,
});

const scopes = [
  "playlist-read-private",
  "playlist-modify-private",
  "playlist-modify-public",
];

const app = express();

// Login endpoint
app.get("/login", (req, res) => {
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, "state");
  res.redirect(authorizeURL);
});

// Callback endpoint
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    spotifyApi.setAccessToken(data.body["access_token"]);
    spotifyApi.setRefreshToken(data.body["refresh_token"]);
    res.send("Logged in! You can close this window.");
    
    // Run the playlist script
    runScript();
  } catch (err) {
    console.error("Error getting tokens:", err);
    res.send("Login failed.");
  }
});

async function runScript() {
  try {
    const me = await spotifyApi.getMe();
    const userId = me.body.id;

    // Get all tracks from playlist
    let tracks = [];
    let offset = 0;
    let batch;

    do {
      batch = await spotifyApi.getPlaylistTracks(playlistId, {
        offset,
        limit: 100,
      });

      if (!batch.body.items || batch.body.items.length === 0) break; // Stop if empty

      tracks = tracks.concat(batch.body.items);
      offset += 100;
    } while (batch.body.items.length > 0);

    if (tracks.length === 0) {
      console.log("The playlist is empty. Nothing to do.");
      return;
    }

    // Filter songs by artist, ignore null tracks
    const artistTracks = tracks
      .filter((item) => {
        if (!item.track || !item.track.artists) return false;
        // Normalize artist names and search for substring
        return item.track.artists.some((a) =>
          a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .includes(artistName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
        );
      })
      .map((item) => item.track.uri);

    if (artistTracks.length === 0) {
      console.log(`No tracks by ${artistName} were found in the playlist.`);
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

app.listen(6967, () => {
  console.log("Go to http://localhost:6967/login to authenticate");
  open("http://localhost:6967/login").catch(console.error);
});
