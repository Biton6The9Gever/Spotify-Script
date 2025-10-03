## How to Use the Script (OUTDATED)

1. **Create a Spotify Developer account**  
   - Go to [Spotify for Developers](https://developer.spotify.com/) and sign up (free).  
   - Open the [Spotify Dashboard](https://developer.spotify.com/dashboard) and click **Create an App**.  

2. **App details**  
   - **App name**: `ExtractArtist`  
   - **App description**: `Extract one artist from a playlist and create a new playlist containing only their tracks.`  
   - **Redirect URI**: `http://127.0.0.1:6967/callback`  
     > You can change the port number if you like, but make sure you update it in the code as well.  
   - **APIs used**: Web API  

3. **Configure your credentials**  
   - Copy `config.example.js` to `config.js`:  
     ```bash
     cp config.example.js config.js
     ```  
   - Open `config.js` and paste in your **Spotify Client ID** and **Client Secret** from the app you just created.  

4. **Install dependencies**  
   Run this inside the project folder:  
   ```bash
   npm install
   ```

5. **Run the script**
   ```bash
   node script.js <playlist_id> <artist_name>
   ```
   - Replace `<playlist_id>` with your playlist ID (how to find playlist ID is down below)
   - Replace `<artist_name>` with the name of the artist you want to extract
  
    **Example**
    ```bash
        node script.js 37i9dQZF1DXcBWIGoYBM5M Coldplay
    ```
    This will create a new private playlist called "Coldplay Songs" containing only Coldplay tracks from the given playlist.
## How to find playlist ID
  - Open Spotify in your browser or desktop app
  - Right–click the playlist you want to use → click Share → Copy link to playlist.
  - The link will look like that
    ```https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abcd1234```
  - The playlist ID is the long string between `/playlist/` and `?`

---

## Project structure

```tex
SpotifyScript
├─ node_modules/          # Installed dependencies 
├─.gitignore
├─ config.example.js      # Template for Spotify credentials
├─ config.js              # (Created by user) Holds actual credentials, ignored by git 
├─ package.json         
├─ package-lock.json
├─ TopArtist.js           # TopArtists scripts
└─ script.js              # New artist playlist script
```

---
## Requirements
- Node.js v16 or higher

