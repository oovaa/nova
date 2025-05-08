# Nova - AI Chat Application

Nova is an interactive chat application powered by AI, featuring standard chat functionalities along with Retrieval-Augmented Generation (RAG) capabilities. Users can engage in conversations, ask questions, and upload documents for the AI to reference, providing contextually relevant answers.

**Deployed Application**: [https://nova-frontend-q1g1.onrender.com/](https://nova-frontend-q1g1.onrender.com/) (Note: Backend might be on a different URL, check environment variables)
**Backend API (example)**: [https://nova-8x6l.onrender.com](https://nova-8x6l.onrender.com) (Configured via `VITE_API_BASE_URL` in the frontend)

## Table of Contents

- [Nova - AI Chat Application](#nova---ai-chat-application)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Technologies Used](#technologies-used)
  - [Setup and Installation](#setup-and-installation)
  - [Running the Application](#running-the-application)
  - [API Endpoints](#api-endpoints)
    - [`GET /z`](#get-z)
    - [`POST /ask`](#post-ask)
    - [`POST /rag`](#post-rag)
    - [`POST /add-document`](#post-add-document)
  - [Deployment](#deployment)
  - [Project Structure](#project-structure)

## Features

- **Interactive Chat Interface**: Real-time messaging with an AI.
- **Streaming Responses**: AI responses are streamed word by word for a dynamic experience.
- **Document Upload**: Users can upload documents (PDF, DOCX, TXT, PPTX).
- **Retrieval-Augmented Generation (RAG)**: AI can use uploaded documents to answer questions.
- **Dark Mode**: Toggle between light and dark themes.
- **Responsive Design**: Adapts to various screen sizes.

## Technologies Used

- **Frontend**:
  - Vite
  - React
  - TypeScript
  - Tailwind CSS
  - shadcn-ui (for UI components)
  - Lucide React (for icons)
  - `react-dropzone` (for file uploads)
  - `react-markdown` (for rendering Markdown responses)
- **Backend**:
  - Node.js
  - Express.js
  - TypeScript
  - LangChain.js (for AI chain and RAG implementation)
  - Cohere (as the LLM provider)
  - Zod (for request validation)
  - Multer (for handling file uploads)
  - `temp-write` (for temporarily storing uploaded files)
- **Development & Build**:
  - Bun (as a JavaScript runtime, package manager, and bundler - can be used as an alternative to Node/npm/yarn)
  - `tsx` (for running TypeScript files directly)
  - `nodemon` (for automatic server restarts during development)

## Setup and Installation

**Prerequisites**:
- Node.js (v18+ recommended) or Bun
- npm, yarn, or bun (package manager)

**Environment Variables**:
Create a `.env` file in the root of the project (for the backend, typically in `src/` or the root if running from there) and another one in the frontend's root directory (if you have a separate frontend project folder, or in the main root if it's a monorepo setup).

**Backend (`.env` in project root or `src/`):**
```env
VITE_COHERE_API_KEY=your_cohere_api_key_here
PORT=3001 # Or any port you prefer for the backend
# Optional: If your frontend is served from a different origin during development
# FRONTEND_URL=http://localhost:5173
```

**Frontend (`.env` in frontend project root, or main root for Vite):**
```env
VITE_API_BASE_URL=http://localhost:3001 # URL of your local backend
# For production, this would be your deployed backend URL:
# VITE_API_BASE_URL=https://nova-8x6l.onrender.com
```

**Installation Steps**:

1.  **Clone the repository**:
    ```sh
    git clone <YOUR_GIT_REPOSITORY_URL>
    cd nova # Or your project directory name
    ```

2.  **Install Backend Dependencies**:
    If you have a separate backend folder, `cd` into it first.
    ```sh
    npm install
    # or
    yarn install
    # or
    bun install
    ```

3.  **Install Frontend Dependencies**:
    If you have a separate frontend folder, `cd` into it. If Vite is set up in the root:
    ```sh
    npm install
    # or
    yarn install
    # or
    bun install
    ```
    (Often, if it's a full-stack setup in one `package.json`, one `npm install` in the root is sufficient).

## Running the Application

1.  **Start the Backend Server**:
    From the directory containing `server.ts` (likely `src/` or project root if scripts are configured):
    ```sh
    npm run dev:server # Example script, adjust based on your package.json
    # or if using tsx directly and server.ts is in src/
    # npx tsx watch src/server.ts
    # or if using bun
    # bun run src/server.ts
    ```
    The backend should typically run on `http://localhost:3001` (or the `PORT` you set).

2.  **Start the Frontend Development Server**:
    From the root directory (where `index.html` and `vite.config.ts` are):
    ```sh
    npm run dev
    # or
    yarn dev
    # or
    bun run dev
    ```
    The frontend should typically run on `http://localhost:5173`.

## API Endpoints

The backend server exposes the following API endpoints (default base URL: `http://localhost:3001`):

### `GET /z`
A simple health check endpoint.
- **Response (200 OK)**: `{"status":"ok","timestamp":"YYYY-MM-DDTHH:mm:ss.sssZ"}`

### `POST /ask`
Handles standard chat messages. Streams responses using Server-Sent Events (SSE).
- **Request Body**: `{"question": "Your message to the AI"}`
  - `question` (string, required): The user's message.
- **Response (200 OK)**:
  - `Content-Type: text/event-stream; charset=utf-8`
  - The body is a stream of SSE events. Each event's `data` field contains a chunk of the AI's response.
    Example SSE chunk: `data: Hello there!\n\n`
- **Error Responses**:
  - `400 Bad Request`: Invalid input.
  - `500 Internal Server Error`: Server-side issues.

### `POST /rag`
Handles chat messages using Retrieval-Augmented Generation (RAG) with uploaded documents. Streams plain text responses.
- **Request Body**: `{"question": "Your question", "history": "Optional conversation history"}`
  - `question` (string, required): User's question.
  - `history` (string, optional): Previous conversation context.
- **Response (200 OK)**:
  - `Content-Type: text/plain; charset=utf-8`
  - The body is a stream of plain text chunks.
- **Error Responses**:
  - `400 Bad Request`: Invalid input or RAG not initialized (no documents).
  - `500 Internal Server Error`: Server-side issues.

### `POST /add-document`
Uploads a document for RAG.
- **Request Body**: `multipart/form-data` with a `file` field.
  - **Allowed types**: PDF, DOCX, PPTX, TXT.
  - **Max size**: 10MB (configurable in `server.ts`).
- **Response (200 OK)**: `{"message": "Document processed successfully.", "filename": "original_filename.ext"}`
- **Error Responses**:
  - `400 Bad Request`: No file, invalid type, or size limit exceeded.
  - `500 Internal Server Error`: Processing error.

## Deployment

This application is designed to be deployed on platforms like Render, Vercel, or similar services that support Node.js backends and static frontends (or Node.js frontends if using SSR).

**General Steps for Render (example)**:

1.  **Backend Service (Node.js)**:
    - Create a new "Web Service" on Render.
    - Connect your Git repository.
    - **Build Command**: `npm install` (or `yarn install`, `bun install`)
    - **Start Command**: `npm start` (or `yarn start`, `bun run src/server.ts`). Ensure your `package.json` has a suitable start script like `"start": "tsx src/server.ts"`.
    - Set environment variables (e.g., `VITE_COHERE_API_KEY`, `PORT` - Render usually sets `PORT` automatically).

2.  **Frontend Service (Static Site or Vite App)**:
    - Create a new "Static Site" or "Web Service" on Render.
    - Connect your Git repository.
    - **Build Command**: `npm install && npm run build` (or `yarn install && yarn build`, `bun install && bun run build`)
    - **Publish Directory**: `dist` (or the output directory configured in your `vite.config.ts`).
    - Set environment variables: `VITE_API_BASE_URL` pointing to your deployed backend service URL.

Ensure your backend service allows CORS from your frontend's deployed URL.

## Project Structure

```
/
├── bun.lockb             # Bun lockfile
├── index.html            # Main HTML entry for Vite frontend
├── package.json          # Project dependencies and scripts
├── README.md             # This file
├── tsconfig.json         # TypeScript configuration for the project
├── tsconfig.node.json    # TypeScript configuration for Node.js specific parts (e.g., backend)
├── vite.config.ts        # Vite configuration file
├── .env.example          # Example environment variables
├── public/               # Static assets for the frontend
└── src/                  # Source code
    ├── main.tsx          # Frontend entry point (React)
    ├── App.tsx           # Main React application component
    ├── components/       # React UI components
    │   ├── Chat/
    │   │   ├── ChatContainer.tsx
    │   │   ├── ChatInput.tsx
    │   │   ├── ChatMessage.tsx
    │   │   └── DarkModeToggle.tsx
    │   └── ui/           # shadcn-ui components (e.g., button, toast)
    ├── hooks/            # Custom React hooks (e.g., use-mobile.ts)
    ├── assets/           # Frontend assets like images, svgs
    ├── lib/              # Backend and shared libraries
    │   ├── basic_chain.ts# LangChain setup for basic chat
    │   ├── rag.ts        # LangChain setup for RAG
    │   ├── parser.ts     # Custom parsers (if any, e.g. for document processing)
    │   └── utils.ts      # Utility functions
    ├── server.ts         # Backend Express server setup and API routes
    └── styles/           # Global styles and Tailwind CSS setup
        └── globals.css
```
(Note: The project structure above is an example and might vary slightly based on your exact setup, especially regarding frontend/backend separation and `tsconfig.json` files.)

---

This README provides a comprehensive overview of the Nova application. For more specific details, refer to the source code and comments within the respective files.
