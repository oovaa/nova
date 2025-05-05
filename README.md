# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/ea8bb02b-68b8-43b7-86ad-ed8082c593ba

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/ea8bb02b-68b8-43b7-86ad-ed8082c593ba) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## API Endpoints

This project exposes the following API endpoints:

### `POST /ask`

Interact with the simple AI chat chain.

**Request Body:**

```json
{
  "input": "Your message to the AI"
}
```

- `input` (string, required): The user's message.

**Response (Success - 200):**

```json
{
  "response": "AI's streamed response"
}
```

**Responses (Error):**

- `400 Bad Request`: If the `input` is missing or invalid.
- `500 Internal Server Error`: For general server issues.

### `POST /rag`

Interact with the Retrieval-Augmented Generation (RAG) chat chain. This requires documents to be added first via `/add-document`.

**Request Body:**

```json
{
  "question": "Your question about the documents",
  "history": "Optional conversation history"
}
```

- `question` (string, required): The user's question.
- `history` (string, optional): Previous conversation context.

**Response (Success - 200):**

- `Content-Type: text/plain`
- The response body is a stream of text chunks representing the AI's answer based on the provided documents and history.

**Responses (Error):**

- `400 Bad Request`: If the `question` is missing/invalid, or if the RAG system hasn't been initialized (no documents added via `/add-document`).
- `500 Internal Server Error`: For general server issues.

### `POST /add-document`

Upload a document to be processed and added to the RAG vector store.

**Request Body:**

- `Content-Type: multipart/form-data`
- A form field named `file` containing the document to upload.
- **Allowed file types:** PDF, DOCX, PPTX, TXT.
- **Maximum file size:** 10MB (configurable in `server.ts`).

**Response (Success - 200):**

```json
{
  "message": "Document processed successfully.",
  "filename": "original_filename.ext"
}
```

**Responses (Error):**

- `400 Bad Request`: If no file is uploaded, the file type is invalid, or the file exceeds the size limit.
- `500 Internal Server Error`: If there's an error during file processing.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/ea8bb02b-68b8-43b7-86ad-ed8082c593ba) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
