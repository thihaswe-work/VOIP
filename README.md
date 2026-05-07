# P2P Calling App

A peer-to-peer voice and video calling application built with React Native (Expo SDK 54) and Node.js. Features secure WebRTC connections, contact management, call history, and a beautiful dark-themed UI.

## Features

- **Authentication** — Register/login with JWT-based auth
- **Contacts** — Search users, add/remove contacts
- **Voice Calls** — P2P voice calls via WebRTC
- **Video Calls** — P2P video calling
- **Call History** — Track incoming, outgoing, missed calls with duration
- **User Profiles** — View/edit profile info
- **Real-time Status** — Online/offline presence
- **Settings** — Notifications, sound, dark mode, password change
- **TURN Server Support** — Works across different networks

## Prerequisites

- **Node.js 18+**
- **MySQL** running on localhost (username: `mysql`, password: `password`)
- **Expo Go** app on your phone (SDK 54 compatible)

## Quick Start

### 1. Initialize Database

```bash
cd server
npm install
npm run db:init
```

### 2. Start the Server

```bash
cd server
npm run dev
```

Server runs on `http://localhost:3000`

### 3. Start the App

```bash
cd react-native-app
npm install
npx expo start
```

Then:
- Scan QR code with **Expo Go** on your phone
- Press `a` for Android emulator
- Press `i` for iOS simulator

## TURN Server Setup (Required for Different Networks)

### Do I need a TURN server?

| Scenario | STUN only | TURN needed |
|----------|-----------|-------------|
| Same WiFi network | Yes | No |
| Same WiFi + mobile data | Maybe | Yes |
| Different networks/countries | No | Yes |
| Behind strict NAT/corporate firewall | No | Yes |

STUN (free) discovers your public IP. TURN (relay) is a fallback when direct P2P fails.

### Option 1: Twilio (Recommended — Free 1GB/month)

1. Sign up at [twilio.com](https://www.twilio.com)
2. Go to **Console → Network Traversal**
3. Copy your credentials
4. Update `server/.env`:

```env
TURN_SERVER=turn:global.turn.twilio.com:3478?transport=udp
TURN_USERNAME=your-twilio-username
TURN_PASSWORD=your-twilio-password
```

### Option 2: Metered.ca (Free 100GB/month)

1. Sign up at [metered.ca](https://www.metered.ca)
2. Create a TURN server
3. Copy credentials
4. Update `server/.env`:

```env
TURN_SERVER=turn:your-server.metered.ca:3478
TURN_USERNAME=your-metered-username
TURN_PASSWORD=your-metered-password
```

### Option 3: Self-hosted Coturn (Unlimited)

Install on any VPS (Ubuntu):

```bash
sudo apt install coturn
sudo systemctl enable coturn
```

Edit `/etc/turnserver.conf`:
```
listening-port=3478
fingerprint
lt-cred-mech
user=guest:guest
realm=myturnserver.com
```

Update `server/.env`:
```env
TURN_SERVER=turn:your-vps-ip:3478
TURN_USERNAME=guest
TURN_PASSWORD=guest
```

### Verify TURN is Working

```bash
# Test the server endpoint
curl http://localhost:3000/api/turn
```

Response should show your configured TURN server in `iceServers`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |
| GET | `/api/contacts` | Get all contacts |
| GET | `/api/contacts/search?query=` | Search users |
| POST | `/api/contacts` | Add contact |
| DELETE | `/api/contacts/:id` | Remove contact |
| GET | `/api/calls` | Get call history |
| POST | `/api/calls` | Log a call |
| GET | `/api/turn` | Get TURN/STUN ICE servers |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `call-user` | Client → Server | Initiate outgoing call with SDP offer |
| `incoming-call` | Server → Client | Notify target of incoming call |
| `answer-call` | Client → Server | Accept call with SDP answer |
| `reject-call` | Client → Server | Decline incoming call |
| `cancel-call` | Client → Server | Cancel outgoing call |
| `call-answered` | Server → Client | Call was accepted |
| `call-rejected` | Server → Client | Call was declined |
| `call-ended` | Server → Client | Active call ended |
| `ice-candidate` | Both | Exchange WebRTC ICE candidates |
| `user-status` | Server → All | Online/offline presence broadcast |

## Project Structure

```
peerToPerr/
├── server/
│   ├── src/
│   │   ├── controllers/       # Auth, contacts, calls handlers
│   │   ├── database/          # MySQL connection & schema init
│   │   ├── middleware/        # JWT auth middleware
│   │   ├── routes/            # REST endpoints (auth, contacts, calls, turn)
│   │   └── index.js           # Express + Socket.io server
│   ├── .env                   # Config (MySQL, JWT, TURN)
│   └── package.json
│
└── react-native-app/
    ├── src/
    │   ├── context/           # AuthContext, CallContext
    │   ├── navigation/        # Bottom tabs + stack navigator
    │   ├── screens/           # Login, Register, Home, Calls, Settings, Calling
    │   ├── services/          # API client, Socket.io, WebRTC
    │   └── utils/             # Theme colors, spacing, shadows
    ├── App.js                 # Root with providers + navigation
    ├── app.json               # Expo SDK 54 config
    └── package.json
```

## Environment Variables

**Server** (`server/.env`):
```env
PORT=3000
JWT_SECRET=p2p_calling_secret_key_2024
MYSQL_HOST=localhost
MYSQL_USER=mysql
MYSQL_PASSWORD=password
MYSQL_DATABASE=p2p_calling
MYSQL_PORT=3306

# TURN server (optional but recommended for cross-network calls)
TURN_SERVER=turn:your-turn-server.com:3478
TURN_USERNAME=your-username
TURN_PASSWORD=your-password
```

## Testing

1. Start server: `cd server && npm run dev`
2. Start app on **two devices**: `cd react-native-app && npx expo start`
3. Register **User A** on device 1, **User B** on device 2
4. On device 1: Search → Add User B → Tap 📞 or 📹 to call
5. User B receives incoming call → Answer
6. Test mute, speaker, video toggle, end call
7. Check **Calls** tab for call history with duration

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Project incompatible with Expo Go" | Make sure Expo Go matches SDK version (54) |
| Calls fail on different networks | Add a TURN server in `.env` |
| "User is offline" | Both devices must be connected to server |
| No audio/video | Check microphone/camera permissions |
| MySQL connection refused | Verify MySQL is running with correct credentials |
