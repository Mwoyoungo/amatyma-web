# Amatyma Web - Chat Application

A modern web chat application built with React, Vite, Firebase, and CometChat SDK.

## Features

- 🔐 **Authentication**: Sign Up, Login, Forgot Password with Firebase
- 💬 **Full Chat Features**: Powered by CometChat UI Kit v6
  - One-on-one messaging
  - Group chats
  - Voice & Video calls
  - File sharing
  - Reactions, mentions, polls
  - Collaborative whiteboard & documents
- 👤 **Profile Management**: Edit profile with photo upload
- 🎨 **Theme**: Black & Red design

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Chat SDK**: CometChat UI Kit v6.3.2
- **Hosting**: Vercel

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Deployment to Vercel

1. Push to GitHub: https://github.com/Mwoyoungo/amatyma-web.git
2. Import repository in Vercel
3. Deploy automatically

## Project Structure

```
src/
├── components/        # React components
├── CometChat/        # CometChat SDK
├── firebase.ts       # Firebase config
└── cometchat.ts      # CometChat config
```
