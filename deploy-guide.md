# Stranger Chat Deployment Guide

This guide provides step-by-step instructions to deploy your React app built with Vite to any web hosting provider that supports static websites (e.g., Hostinger, Bluehost, HostGator, etc.).

## Step 1: Build the Production Version of Your App
1. Open your terminal/command prompt
2. Navigate to your project folder (stranger-chat)
3. Install dependencies: `npm install`
4. Build the app: `npm run build`
5. Verify the build: Check that a `dist` folder is created in your project directory

## Step 2: Prepare Your Hosting Account
1. Log in to your hosting provider's control panel (e.g., Hostinger's hPanel)
2. Make sure you have a domain name associated with your hosting plan
3. If needed, create or ensure the main directory for web files exists (usually `public_html`, `www`, or similar)

## Step 3: Upload Files to Hosting
### Option A: Using File Manager (Recommended for beginners)
1. In your hosting panel, find the "File Manager" or "File Manager" section
2. Navigate to the public web directory (e.g., public_html)
3. Clear any existing files in the root directory if you want a fresh start (optional, but backup first)
4. Upload files:
   - Upload `dist/index.html` to the root directory
   - Create an `assets` folder in the root directory
   - Upload all files from `dist/assets/` folder into the newly created `assets` folder
   - If there are any other files in `dist` (like CSS), upload them to the root

### Option B: Using FTP Client
1. Get FTP credentials from your hosting provider:
   - Host: Your domain or IP
   - Username: Provided FTP username
   - Password: FTP password
   - Port: Usually 21
2. Download and install an FTP client like FileZilla
3. Connect to your FTP server using the credentials
4. On the right panel (Remote site), navigate to public_html or www
5. On the left panel (Local site), navigate to your project's dist folder
6. Select all files/folders in dist and upload them to the root of the remote directory

## Step 4: Configure API Keys (Not Required)
Your app now works completely without any external APIs:
1. **Text Chat**: Fully functional with engaging mock responses
2. **Audio Chat**: Simulated audio conversation experience
3. **Video Chat**: Video connectivity with mock responses

**Note**: The app has been modified to work as a complete demo without any external API dependencies. All chat modes are fully functional for demonstration purposes.

## Step 5: Test Your Deployed Site
1. Wait 5-10 minutes for DNS propagation (or immediately if using same IP)
2. Open your web browser
3. Go to your domain name (e.g., www.yoursite.com)
4. Your app should load like it did locally
5. Test basic functionality:
   - Check if the chat interface appears
   - If chat works (may require API key setup)

## Step 6: Deploy and Run the Server

### Important: Server Requirements
❗ **Node.js applications require VPS/Cloud hosting, not shared hosting.**
- **Hostinger Shared Hosting**: Only supports PHP/HTML/CSS - Node.js will NOT work
- **Hostinger VPS/Cloud**: Required for Node.js applications

### For Hostinger VPS/Cloud Hosting:

1. **Choose the Right Plan**: Select a VPS or Cloud hosting plan (minimum $4/month)
2. **Access Server**: Use SSH to connect to your VPS
3. **Install Node.js**: Most VPS plans come with Node.js pre-installed
4. **Upload Project**: Clone or upload your project files via Git or SFTP
5. **Install Dependencies**:
   ```bash
   npm install
   npm run build  # Build the React app
   ```
6. **Run the Server**:
   ```bash
   npm run server
   ```
   Or for production with auto-restart:
   ```bash
   npm install -g pm2
   pm2 start npm --name "stranger-chat" -- start
   pm2 startup
   pm2 save
   ```

### Alternative: Deploy to Free/Heroku-like Platforms (Better for Testing)
If you want to test first, use free platforms:
- **Railway**: Free tier available
- **Render**: Free tier for web services
- **Heroku**: Free tier available

### 🚀 Deploy to Render (Recommended Free Option)

#### Step-by-Step Render Deployment:

1. **Create Render Account**: Go to render.com and sign up (free tier available)

2. **Connect Your Git Repository**:
   - Push your project to GitHub/GitLab first
   - Click "New" → "Web Service" in Render dashboard
   - Connect your repository

3. **Configure Build Settings**:
   - **Name**: stranger-chat
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run server`

4. **Add Environment Variables** (if needed):
   - PORT: `10000` (or leave blank, server defaults to 3001)
   - NODE_ENV: `production`

5. **Deploy**:
   - Render will build and deploy automatically
   - Provides a free domain: `stranger-chat.onrender.com`

6. **Test Real Chat**:
   - Open multiple browser tabs at your Render URL
   - Click "Text Chat" in each tab
   - Users get matched automatically!
   - Send messages to chat with real people

#### Render-Specific Notes:
- Render has usage limits on free tier (750 hours/month)
- Free services spin down after 15 minutes of inactivity
- WebSocket connections supported in free tier
- Auto-SSL certificates included

### Key Hostinger Considerations:
- **Shared Hosting**: ❌ NOT suitable (only for static websites)
- **VPS Hosting**: ✅ Works perfectly for Node.js
- **Premium Hosting**: ✅ Also supports Node.js
- **Custom Domain**: Configure in Hostinger DNS settings

## Step 7: Configure Domain and Start Chat
- Point your domain to the VPS IP address in Hostinger DNS
- The app serves both frontend AND backend from the same server
- Users can immediately start chatting once deployed!

## Troubleshooting Check List
- **Site not loading**: Check if files are in the correct directory
- **Blank page**: Verify main index.html is uploaded and contains correct HTML
- **Assets missing**: Ensure assets folder is uploaded correctly
- **API errors**: Double-check Google Gemini API key in code or environment
- **Cross-origin issues**: If using external services, ensure CORS is configured
- **Refresh gives 404**: Most static hosts don't need special routing config for SPAs

## Provider-Specific Notes
- **Hostinger/Godaddy/Bluehost**: Use public_html as root, File Manager for easy upload
- **cPanel-based hosts**: Same as above
- **DirectAdmin**: Uses public_html, similar process
- **VPS with Apache/Nginx**: Upload to webroot (e.g., /var/www/html)

## Final Step: After Deployment
- Keep your source code backed up
- Monitor for any issues
- Update DNS if needed
