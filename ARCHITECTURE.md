# P2P Calling App — Architecture & Approach

## Table of Contents
1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Call Flow — Step by Step](#call-flow--step-by-step)
4. [WebRTC Connection Process](#webrtc-connection-process)
5. [STUN & TURN — How NAT Traversal Works](#stun--turn--how-nat-traversal-works)
6. [Signaling Server](#signaling-server)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Socket.io Events](#socketio-events)
10. [Security](#security)
11. [File Structure](#file-structure)
12. [Frontend Architecture](#frontend-architecture)
13. [State Management](#state-management)
14. [Deployment Considerations](#deployment-considerations)

---

## Overview

This is a **peer-to-peer voice and video calling app**. The key principle: **media never goes through our server**. Audio/video streams flow directly between users. Our server only handles:

- **Signaling** — helping peers find each other and exchange connection info (Socket.io)
- **Authentication** — user accounts and JWT tokens
- **Metadata** — contacts, call history, profiles (MySQL)

The actual media uses **WebRTC** (Web Real-Time Communication), which creates a direct P2P connection between callers.

```
User A <======== Media (audio/video) ========> User B
   |                                              |
   | Socket.io signaling only                    |
   | (SDP offers, ICE candidates)                |
   v                                              v
═════════════════ Our Server (Node.js) ════════════════
═════════════════ MySQL Database     ════════════════
═════════════════ Coturn TURN Server ════════════════
```

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        Client Devices                          │
│  ┌──────────────────┐              ┌──────────────────────┐    │
│  │  Device A        │              │  Device B            │    │
│  │                  │              │                      │    │
│  │  React Native    │              │  React Native        │    │
│  │  Expo SDK 54     │              │  Expo SDK 54         │    │
│  │                  │              │                      │    │
│  │  ┌────────────┐  │              │  ┌────────────┐      │    │
│  │  │ WebRTC     │  │<──MEDIA────>│  │ WebRTC     │      │    │
│  │  │ PeerConn   │  │  (P2P)      │  │ PeerConn   │      │    │
│  │  └─────┬──────┘  │              │  └─────┬──────┘      │    │
│  │        │         │              │        │             │    │
│  │  ┌─────┴──────┐  │              │  ┌─────┴──────┐      │    │
│  │  │ Socket.io  │  │              │  │ Socket.io  │      │    │
│  │  │ Client     │  │              │  │ Client     │      │    │
│  │  └────────────┘  │              │  └────────────┘      │    │
│  └────────┬─────────┘              └────────┬─────────────┘    │
└───────────┼─────────────────────────────────┼──────────────────┘
            │         WebSocket (TLS)         │
            └────────────────┬────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    Our Server                                │
│                        Node.js + Express + Socket.io         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  REST API    │  │  Signaling   │  │  TURN Config     │  │
│  │  /api/auth   │  │  Socket.io   │  │  /api/turn       │  │
│  │  /api/users  │  │  Events      │  │  Returns ICE     │  │
│  │  /api/calls  │  │  SDP/ICE     │  │  Servers         │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                   │             │
│         └─────────────────┼───────────────────┘             │
│                           │                                 │
│  ┌────────────────────────┼────────────────────────────┐   │
│  │         Database Layer │                            │   │
│  │  ┌──────────────┐     │     ┌──────────────────┐    │   │
│  │  │   MySQL      │     │     │  Coturn (Docker) │    │   │
│  │  │   • users    │     │     │  Port 3478       │    │   │
│  │  │   • contacts │     │     │  TURN/STUN relay │    │   │
│  │  │   • calls    │     │     │                  │    │   │
│  │  └──────────────┘     │     └──────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Call Flow — Step by Step

### Scenario: Alice calls Bob (Voice Call)

```
  Alice                           Server                          Bob
    │                               │                               │
    │───1. LOGIN────────────────────▶│                               │
    │◀── auth token (JWT)───────────│                               │
    │                               │                               │
    │───2. CONNECT Socket.io───────▶│                               │
    │   (with JWT token)            │◀──3. CONNECT Socket.io────────│
    │                               │   (with JWT token)            │
    │                               │                               │
    │───4. "call-user"─────────────▶│                               │
    │   { target: Bob, type: voice }│                               │
    │                               │───5. "incoming-call"─────────▶│
    │                               │   { caller: Alice, type: voice }
    │                               │                               │
    │◀──6. WebRTC: Create Offer─────│                               │
    │   (local SDP)                 │                               │
    │                               │                               │
    │───7. "call-user" (with SDP)──▶│                               │
    │   { sdp: offer }              │                               │
    │                               │───8. "incoming-call"─────────▶│
    │                               │   { sdp: offer }              │
    │                               │                               │
    │                               │◀──9. WebRTC: Create Answer────│
    │                               │   (local SDP answer)          │
    │                               │                               │
    │                               │───10. "answer-call"──────────▶│
    │                               │   { sdp: answer, caller: Alice }
    │                               │                               │
    │◀──11. "call-answered"─────────│                               │
    │   { sdp: answer }             │                               │
    │                               │                               │
    │───12. Set Remote Answer───────│                               │
    │   (WebRTC connects)           │                               │
    │                               │                               │
    │◀══════════13. MEDIA (P2P)═══════════════════════════════════▶│
    │   Audio flows directly between Alice and Bob                  │
    │                               │                               │
    │───14. "end-call"─────────────▶│                               │
    │   { target: Bob }             │                               │
    │                               │───15. "call-ended"───────────▶│
    │                               │                               │
    │───16. POST /api/calls────────▶│                               │
    │   { log: completed, 5min }    │                               │
    │                               │                               │
```

### Key Steps Explained

**Step 4-5:** Alice tells the server she wants to call Bob. Server forwards to Bob.

**Step 6-8:** Alice's WebRTC creates an **SDP Offer** (Session Description Protocol). This contains:
- Supported codecs (Opus, VP8, etc.)
- Media capabilities
- ICE candidates (network addresses)

Server relays this to Bob.

**Step 9-11:** Bob's WebRTC creates an **SDP Answer** with his own capabilities. Server relays back to Alice.

**Step 12:** Both peers now have each other's SDP. WebRTC negotiates a direct connection.

**Step 13:** Media flows **P2P** — never touches our server.

---

## WebRTC Connection Process

### What is SDP?

SDP (Session Description Protocol) is a text format describing:
```
v=0
o=- 12345 2 IN IP4 192.168.1.100
s=-
t=0 0
a=group:BUNDLE 0 1
m=audio 9 UDP/TLS/RTP/SAVPF 111
a=rtpmap:111 opus/48000/2
a=ssrc:1234567890 cname:user123
m=video 9 UDP/TLS/RTP/SAVPF 96
a=rtpmap:96 VP8/90000
```

### What are ICE Candidates?

ICE (Interactive Connectivity Establishment) candidates are possible network paths:

```
candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host
candidate:2 1 UDP 1694498815 203.0.113.50 54322 typ srflx raddr 192.168.1.100
candidate:3 1 TCP 1687183359 10.0.0.5 3478 typ relay raddr 203.0.113.50
```

Types:
| Type | Meaning | Example |
|------|---------|---------|
| `host` | Local network IP | `192.168.1.100` |
| `srflx` | Server Reflexive (public IP via STUN) | `203.0.113.50` |
| `relay` | TURN relay (when P2P fails) | `10.0.0.5` |

### ICE Candidate Exchange

Each peer generates multiple candidates and sends them to the other via Socket.io:

```
Alice                          Server                          Bob
  │── "ice-candidate" ─────────▶│                               │
  │   { target: Bob, candidate }│                               │
  │                              │── "ice-candidate" ─────────▶│
  │                              │   { sender: Alice, candidate }
  │                              │                               │
  │                              │◀── "ice-candidate" ─────────│
  │                              │   { target: Alice, candidate }
  │◀── "ice-candidate" ─────────│                               │
  │   { sender: Bob, candidate } │                               │
```

WebRTC tries candidates in order: host → STUN reflexive → TURN relay. First one that works wins.

---

## STUN & TURN — How NAT Traversal Works

### The Problem: NAT

Most devices are behind a router (NAT). Your phone thinks its IP is `192.168.1.50`, but the outside world sees your router's public IP `203.0.113.50`. Without help, Alice can't know Bob's real address.

```
Alice's Phone (192.168.1.50)
         │
         │ NAT translates to public IP
         ▼
    ┌──────────┐
    │ Router   │ Public IP: 203.0.113.50
    │ (NAT)    │
    └────┬─────┘
         │
         ▼
    Internet
         │
         ▼
    ┌──────────┐
    │ Router   │ Public IP: 198.51.100.25
    │ (NAT)    │
    └────┬─────┘
         │
         ▼
Bob's Phone (10.0.0.100)
```

### STUN — Simple NAT Discovery (FREE)

STUN server tells you: "Your public IP is X, and the port Y is open."

```
Alice ── "Who am I?" ──▶ STUN Server (Google)
                          │
                          ◀── "You are 203.0.113.50:54321"
```

**Works when:** At least one peer has a "full cone" or "restricted cone" NAT. This covers ~80-85% of connections.

**Does NOT work when:** Both peers are behind symmetric NATs (most mobile carriers, corporate networks).

### TURN — Relay Fallback (Costs bandwidth)

When STUN fails, TURN relays all media through a server:

```
Alice ── audio ──▶ TURN Server ── audio ──▶ Bob
                   (relays everything)
```

**Works always** — even behind the strictest firewalls.

**Trade-off:** All media goes through the TURN server, consuming its bandwidth.

### How Our App Uses Both

```
1. Fetch ICE servers from /api/turn
   → Returns: [STUN servers] + [TURN server if configured]

2. WebRTC tries in order:
   a. Direct connection (host candidates)
   b. STUN-assisted (srflx candidates)
   c. TURN relay (relay candidates)

3. First successful path wins
```

### When You Need TURN

| Test | Result | Need TURN? |
|------|--------|------------|
| Same WiFi network | Works | No |
| WiFi ↔ Mobile data | Maybe | Yes (usually) |
| Different countries | Fails | Yes |
| Corporate network ↔ Home | Fails | Yes |

**We include Google STUN servers free. TURN is optional but recommended for production.**

---

## Signaling Server

### Why We Need Signaling

WebRTC peers need to exchange data **before** they can connect:
- SDP offers/answers
- ICE candidates
- Call state (ringing, accepted, rejected, ended)

This "meta-communication" is signaling. We use **Socket.io** (WebSocket).

### Socket.io Setup

```js
// Server-side (server/src/index.js)
const io = new Server(server, { cors: { origin: '*' } });

// Authenticate socket connections with JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const decoded = jwt.verify(token, JWT_SECRET);
  socket.userId = decoded.id;
  socket.username = decoded.username;
  next();
});
```

### Connection Tracking

```js
const userSockets = new Map();

io.on('connection', (socket) => {
  userSockets.set(socket.userId, socket.id);
  // Now we can find a user's socket by their user ID
});
```

### All Socket Events

| Event | Sender | Receiver | Data | Purpose |
|-------|--------|----------|------|---------|
| `call-user` | Caller | Server | `{ targetUserId, callType, sdp }` | Start a call |
| `incoming-call` | Server | Target | `{ callerId, callerUsername, callType, sdp }` | Ring the target |
| `answer-call` | Target | Server | `{ callerId, sdp }` | Accept the call |
| `call-answered` | Server | Caller | `{ sdp, answererId }` | Tell caller it's connected |
| `reject-call` | Target | Server | `{ callerId }` | Decline the call |
| `call-rejected` | Server | Caller | `{ rejectedBy }` | Tell caller it was declined |
| `cancel-call` | Caller | Server | `{ targetUserId }` | Cancel before answer |
| `call-cancelled` | Server | Target | `{ cancelledBy }` | Tell target call was cancelled |
| `ice-candidate` | Either | Server | `{ targetUserId, candidate }` | Exchange ICE candidates |
| `end-call` | Either | Server | `{ targetUserId }` | End an active call |
| `call-ended` | Server | Other | `{ endedBy }` | Notify call ended |
| `user-status` | Server | All | `{ userId, status }` | Broadcast online/offline |
| `disconnect` | Client | Server | — | Clean up on disconnect |

---

## Database Schema

```sql
┌──────────────────────────────────────────────────┐
│                     users                        │
├──────────┬───────────────┬───────────────────────┤
│ Column   │ Type          │ Description           │
├──────────┼───────────────┼───────────────────────┤
│ id       │ VARCHAR(36)   │ UUID primary key      │
│ username │ VARCHAR(50)   │ Unique login name     │
│ email    │ VARCHAR(100)  │ Unique email          │
│ password │ VARCHAR(255)  │ Bcrypt hashed         │
│ display_name │ VARCHAR(100) │ Shown name          │
│ avatar_url   │ TEXT      │ Profile image         │
│ phone_number │ VARCHAR(20)│ Phone (optional)      │
│ status   │ VARCHAR(20)   │ online/offline        │
│ created_at │ TIMESTAMP   │ Registration date     │
│ updated_at │ TIMESTAMP   │ Last update           │
└──────────┴───────────────┴───────────────────────┘

┌──────────────────────────────────────────────────┐
│                   contacts                       │
├──────────┬───────────────┬───────────────────────┤
│ Column   │ Type          │ Description           │
├──────────┼───────────────┼───────────────────────┤
│ id       │ VARCHAR(36)   │ UUID primary key      │
│ user_id  │ VARCHAR(36)   │ Owner of contact      │
│ contact_id │ VARCHAR(36) │ Contact's user ID     │
│ alias    │ VARCHAR(100)  │ Custom nickname       │
│ created_at │ TIMESTAMP   │ When added            │
└──────────┴───────────────┴───────────────────────┘
UNIQUE KEY (user_id, contact_id) — no duplicates

┌──────────────────────────────────────────────────┐
│                  call_history                    │
├──────────┬───────────────┬───────────────────────┤
│ Column   │ Type          │ Description           │
├──────────┼───────────────┼───────────────────────┤
│ id       │ VARCHAR(36)   │ UUID primary key      │
│ caller_id │ VARCHAR(36)  │ Who initiated         │
│ receiver_id │ VARCHAR(36)│ Who received          │
│ call_type │ ENUM         │ voice / video         │
│ status   │ ENUM          │ completed/missed/     │
│          │               │ rejected/cancelled    │
│ duration │ INT           │ Call length (seconds) │
│ started_at │ TIMESTAMP   │ When call started     │
│ ended_at │ TIMESTAMP     │ When call ended       │
└──────────┴───────────────┴───────────────────────┘

┌──────────────────────────────────────────────────┐
│                   messages                       │
├──────────┬───────────────┬───────────────────────┤
│ Column   │ Type          │ Description           │
├──────────┼───────────────┼───────────────────────┤
│ id       │ VARCHAR(36)   │ UUID primary key      │
│ sender_id │ VARCHAR(36)  │ Who sent              │
│ receiver_id │ VARCHAR(36)│ Who received          │
│ content  │ TEXT          │ Message text          │
│ type     │ ENUM          │ text/image/file       │
│ is_read  │ BOOLEAN       │ Read status           │
│ created_at │ TIMESTAMP   │ Send time             │
└──────────┴───────────────┴───────────────────────┘
```

### Relationships

```
users 1───N contacts (user_id → users.id)
users 1───N contacts (contact_id → users.id)
users 1───N call_history (caller_id → users.id)
users 1───N call_history (receiver_id → users.id)
users 1───N messages (sender_id → users.id)
users 1───N messages (receiver_id → users.id)
```

---

## API Endpoints

### Authentication

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/auth/register` | No | `{ username, email, password, displayName?, phoneNumber? }` | `{ token, user }` |
| POST | `/api/auth/login` | No | `{ username, password }` | `{ token, user }` |
| GET | `/api/auth/profile` | Yes | — | `{ id, username, email, displayName, ... }` |
| PUT | `/api/auth/profile` | Yes | `{ displayName?, phoneNumber?, avatarUrl? }` | `{ user }` |
| PUT | `/api/auth/password` | Yes | `{ currentPassword, newPassword }` | `{ message }` |

### Contacts

| Method | Path | Auth | Query/Body | Response |
|--------|------|------|------------|----------|
| GET | `/api/contacts` | Yes | — | `[{ id, username, displayName, status, ... }]` |
| GET | `/api/contacts/search?query=` | Yes | `?query=alice` | `[{ id, username, displayName, ... }]` |
| POST | `/api/contacts` | Yes | `{ contactId }` | `{ message }` |
| DELETE | `/api/contacts/:contactId` | Yes | — | `{ message }` |

### Calls

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/calls` | Yes | — | `[{ id, otherUserId, callType, status, duration, ... }]` |
| POST | `/api/calls` | Yes | `{ receiverId, callType, status, duration }` | `{ callId }` |

### TURN/STUN

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/turn` | No | `{ iceServers: [{ urls, username?, credential? }] }` |

---

## Socket.io Events

### Complete Event Reference

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CALL INITIATION                               │
│                                                                       │
│  Caller                          Server                          Target│
│    │                                │                                │  │
│    │── call-user ──────────────────▶│                                │  │
│    │   { targetUserId, callType }   │                                │  │
│    │                                │── incoming-call ─────────────▶│  │
│    │                                │   { callerId, callType, sdp } │  │
│    │                                │                                │  │
├─────────────────────────────────────────────────────────────────────┤
│                        CALL ANSWER                                   │
│                                                                       │
│  Caller                          Server                          Target│
│    │                                │                                │  │
│    │                                │◀── answer-call ──────────────│  │
│    │                                │   { callerId, sdp }           │  │
│    │◀── call-answered ─────────────│                                │  │
│    │   { sdp, answererId }          │                                │  │
│    │                                │                                │  │
├─────────────────────────────────────────────────────────────────────┤
│                        CALL REJECT                                   │
│                                                                       │
│  Caller                          Server                          Target│
│    │                                │                                │  │
│    │                                │◀── reject-call ──────────────│  │
│    │                                │   { callerId }                │  │
│    │◀── call-rejected ─────────────│                                │  │
│    │   { rejectedBy }               │                                │  │
│    │                                │                                │  │
├─────────────────────────────────────────────────────────────────────┤
│                     ICE CANDIDATE EXCHANGE                           │
│                                                                       │
│  Peer A                          Server                          Peer B│
│    │                                │                                │  │
│    │── ice-candidate ──────────────▶│                                │  │
│    │   { targetUserId, candidate }  │                                │  │
│    │                                │── ice-candidate ─────────────▶│  │
│    │                                │   { senderId, candidate }      │  │
│    │                                │                                │  │
│    │                                │◀── ice-candidate ────────────│  │
│    │                                │   { targetUserId, candidate }  │  │
│    │◀── ice-candidate ─────────────│                                │  │
│    │   { senderId, candidate }      │                                │  │
│    │                                │                                │  │
├─────────────────────────────────────────────────────────────────────┤
│                        CALL END                                      │
│                                                                       │
│  Peer A                          Server                          Peer B│
│    │                                │                                │  │
│    │── end-call ───────────────────▶│                                │  │
│    │   { targetUserId }             │                                │  │
│    │                                │── call-ended ───────────────▶│  │
│    │                                │   { endedBy }                  │  │
│    │                                │                                │  │
├─────────────────────────────────────────────────────────────────────┤
│                     PRESENCE BROADCAST                               │
│                                                                       │
│  User connects                     Server                       All Users│
│    │                                │                                │  │
│    │── connect (with JWT) ─────────▶│                                │  │
│    │                                │── user-status ──────────────▶│  │
│    │                                │   { userId, status: 'online' }│  │
│    │                                │                                │  │
│    │── disconnect ─────────────────▶│                                │  │
│    │                                │── user-status ──────────────▶│  │
│    │                                │   { userId, status: 'offline'}│  │
│    │                                │                                │  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Security

### Authentication

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| REST API | JWT Bearer token | Verify user identity |
| Socket.io | JWT in handshake auth | Verify socket connections |
| Passwords | bcrypt (12 rounds) | Hash storage |

### JWT Flow

```
1. User registers → bcrypt hash password → store in DB
2. User logs in → verify password → sign JWT (expires 30 days)
3. Client stores JWT in AsyncStorage
4. Every API request: Authorization: Bearer <token>
5. Every Socket.io connect: auth: { token }
6. Server verifies JWT on every request/connection
```

### Media Security

| Feature | Implementation |
|---------|---------------|
| Encryption | WebRTC uses DTLS-SRTP (mandatory) — all media encrypted |
| No media on server | P2P only — server never sees audio/video |
| TURN relay encryption | DTLS/TLS through TURN |

### Data at Rest

| Data | Protection |
|------|-----------|
| Passwords | bcrypt hash |
| JWT tokens | Signed with secret |
| Personal data | MySQL access controlled |

### What We DON'T Do (Yet)

- End-to-end identity verification (no signal-like safety numbers)
- Encrypted signaling (WebSocket should use wss:// in production)
- Rate limiting (no brute-force protection on login)
- Token refresh (JWT expires in 30 days, no refresh)

---

## File Structure

```
peerToPerr/
│
├── server/                              # Node.js backend
│   ├── src/
│   │   ├── controllers/                 # Business logic
│   │   │   ├── authController.js        # Register, login, profile, password
│   │   │   ├── contactController.js     # Search, add, remove contacts
│   │   │   └── callController.js        # Log calls, get history
│   │   │
│   │   ├── database/
│   │   │   ├── connection.js            # MySQL connection pool
│   │   │   └── init.js                  # Schema creation script
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.js                  # JWT verification middleware
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js                  # POST /api/auth/*
│   │   │   ├── contacts.js              # GET/POST/DELETE /api/contacts/*
│   │   │   ├── calls.js                 # GET/POST /api/calls/*
│   │   │   └── turn.js                  # GET /api/turn (ICE servers)
│   │   │
│   │   └── index.js                     # Express + Socket.io server
│   │
│   ├── .env                             # Environment variables
│   └── package.json
│
├── react-native-app/                    # Mobile app
│   ├── src/
│   │   ├── context/
│   │   │   ├── AuthContext.js           # User auth state, login, logout
│   │   │   └── CallContext.js           # Call state, incoming calls, controls
│   │   │
│   │   ├── navigation/
│   │   │   └── MainTabs.js              # Bottom tab navigator
│   │   │
│   │   ├── screens/
│   │   │   ├── LoginScreen.js           # Login form
│   │   │   ├── RegisterScreen.js        # Registration form
│   │   │   ├── HomeScreen.js            # Contacts list with call buttons
│   │   │   ├── CallHistoryScreen.js     # Recent calls
│   │   │   ├── SettingsScreen.js        # Settings, profile edit, logout
│   │   │   ├── SearchUsersScreen.js     # Search and add users
│   │   │   ├── UserProfileScreen.js     # View user details
│   │   │   └── CallingScreen.js         # Active call UI
│   │   │
│   │   ├── services/
│   │   │   ├── api.js                   # REST API client (fetch)
│   │   │   ├── socket.js                # Socket.io client
│   │   │   └── webrtc.js                # WebRTC peer connection
│   │   │
│   │   └── utils/
│   │       └── theme.js                 # Colors, spacing, shadows
│   │
│   ├── App.js                           # Root: providers + navigation
│   ├── app.json                         # Expo config
│   └── package.json
│
└── README.md
```

---

## Frontend Architecture

### Navigation Structure

```
Root (App.js)
│
├── AuthProvider (context)
│   └── CallProvider (context)
│       └── NavigationContainer
│           └── Stack Navigator
│               │
│               ├── NOT AUTHENTICATED
│               │   ├── LoginScreen
│               │   └── RegisterScreen
│               │
│               └── AUTHENTICATED
│                   ├── MainTabs (Bottom Tabs)
│                   │   ├── HomeScreen (Contacts)
│                   │   ├── CallsScreen (History)
│                   │   └── SettingsScreen
│                   │
│                   ├── SearchUsersScreen (stack)
│                   ├── UserProfileScreen (stack)
│                   └── CallingScreen (fullscreen modal)
```

### Screen Responsibilities

| Screen | Purpose | Key Features |
|--------|---------|-------------|
| Login | Authenticate existing user | Username/email + password |
| Register | Create new account | Validation, password confirmation |
| Home | Main contacts list | Online status, voice/video buttons |
| CallHistory | Past calls | Incoming/outgoing/missed, duration |
| Settings | App configuration | Profile edit, password, toggles |
| SearchUsers | Find people | Real-time search, add contacts |
| UserProfile | User details | Call again, add/remove contact |
| Calling | Active call | Mute, speaker, video toggle, timer |

---

## State Management

### AuthContext

```js
{
  user: { id, username, email, displayName, phoneNumber },
  token: "jwt_token_string",
  loading: false,
  isAuthenticated: true,

  // Actions
  login({ username, password }) → sets user + token
  register({ username, email, password, ... }) → sets user + token
  logout() → clears user + token
  updateUserData(data) → merges into user
}
```

### CallContext

```js
{
  callState: {
    status: 'idle' | 'calling' | 'connected' | 'ended' | 'rejected' | 'cancelled',
    type: 'voice' | 'video',
    otherUser: { id, username },
    duration: 123,
    isMuted: false,
    isSpeakerOn: false,
    isVideoOn: true
  },

  incomingCall: {
    callerId: 'uuid',
    callerUsername: 'alice',
    callType: 'voice',
    sdp: { ... }
  },

  onlineUsers: Set(['uuid1', 'uuid2']),

  // Actions
  startOutgoingCall(userId, username, type)
  answerCall()
  rejectCall()
  endCall()
  resetCallState()
  toggleMute()
  toggleSpeaker()
  toggleVideo()
  updateDuration(seconds)
}
```

---

## Deployment Considerations

### Development (Current)

```
server: localhost:3000
TURN: localhost:3478 (Docker)
MySQL: localhost:3306 (Docker)
app: Expo dev server
```

### Production Checklist

| Component | Change Needed |
|-----------|--------------|
| Server | Deploy to VPS, use HTTPS, set `NODE_ENV=production` |
| WebSocket | Use `wss://` instead of `ws://` |
| TURN | Set external IP in Coturn config |
| MySQL | Use managed database or secure VPS instance |
| JWT Secret | Use strong random string (32+ chars) |
| CORS | Restrict to specific origins |
| Rate Limiting | Add express-rate-limit |
| TURN Credentials | Use time-limited tokens or per-user auth |

### Coturn Production Config

```ini
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
realm=p2pcalling.com

# External IP (your VPS public IP)
external-ip=203.0.113.50

# Relay ports
min-port=49152
max-port=65535

# TLS for secure TURN
cert=/etc/letsencrypt/live/turn.domain.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.domain.com/privkey.pem
```

---

## How Calls Actually Connect

### Best Case (Same WiFi)

```
Alice (192.168.1.50) ──────── Direct ────────▶ Bob (192.168.1.51)
                    Same router, no NAT issues
                    Latency: <1ms
                    Quality: Excellent
```

### Good Case (Different Networks, STUN works)

```
Alice ── STUN discovers public IP ──▶ 203.0.113.50:54321
                                         │
                                    Internet
                                         │
Bob ── STUN discovers public IP ──▶ 198.51.100.25:12345
                    Direct P2P through routers
                    Latency: 20-100ms
                    Quality: Good
```

### Fallback Case (STUN fails, TURN required)

```
Alice ── audio ──▶ TURN Server ── audio ──▶ Bob
                   (relays everything)
                    Latency: 50-200ms extra
                    Quality: Good (depends on TURN server)
                    Bandwidth cost: Server pays for relay
```

---

## What Happens When You Press "Call"

```
1. User taps 📞 on a contact
   ↓
2. App calls startOutgoingCall(userId, name, 'voice')
   → Sets callState.status = 'calling'
   → Navigates to CallingScreen
   ↓
3. CallingScreen renders:
   → Shows contact name + "Calling..." animation
   → Pulsing avatar animation
   ↓
4. WebRTC initializes:
   → Fetches ICE servers from /api/turn
   → Creates RTCPeerConnection
   → Gets microphone access (getUserMedia)
   → Adds audio tracks to connection
   ↓
5. WebRTC creates SDP offer:
   → peerConnection.createOffer()
   → peerConnection.setLocalDescription(offer)
   ↓
6. ICE candidates start generating:
   → peerConnection.onicecandidate fires
   → Each candidate sent via socket: ice-candidate event
   ↓
7. Server relays offer to target:
   → Emits 'call-user' with SDP
   → Target receives 'incoming-call'
   ↓
8. Target's WebRTC creates answer:
   → setRemoteDescription(offer)
   → createAnswer()
   → setLocalDescription(answer)
   ↓
9. Server relays answer back:
   → Target emits 'answer-call'
   → Caller receives 'call-answered'
   ↓
10. Both peers set remote descriptions:
    → setRemoteDescription(answer)
    ↓
11. ICE negotiation:
    → Both sides exchange candidates
    → Try host → STUN → TURN
    → First successful pair connects
    ↓
12. Connection state = 'connected':
    → onconnectionstatechange fires
    → Audio starts flowing P2P
    → Call timer starts
    ↓
13. User taps "End Call":
    → emit 'end-call' via socket
    → WebRTC peerConnection.close()
    → Stop media tracks
    → Log call to /api/calls
    → Return to previous screen
```
