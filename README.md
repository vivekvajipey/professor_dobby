# Read with Dobby

Read with Dobby transforms your reading experience by pairing every passage with Dobby’s insightful commentary—whether you prefer a calm, “leashed” perspective or a wild, “unhinged” debate partner. Boring or dense materials turn fun and interactive as you dive into conversational summaries, clarifications, and even playful arguments between Dobby’s two sides. It’s a fresh way to learn, simplify complex topics, and stay engaged with whatever you’re reading!

## Features

- **Interactive PDF Viewer**: View and navigate PDFs with ease
- **Dual AI Personalities**:
  - **Leashed Dobby 😇**: A helpful, professional assistant
  - **Unhinged Dobby 😈**: A more adventurous, creative personality
- **Text-to-Speech**: Listen to Dobby's responses with distinct voices for each personality
- **Smart Text Selection**: Click on any text block to discuss it with Dobby
- **Quick Actions**: Preset buttons for common tasks like summarization
- **Dobby vs. Dobby**: Watch the two personalities debate about the text

## Prerequisites

Before running the app, make sure you have:
- Node.js (v16 or higher)
- npm or yarn
- API keys for:
  - Fireworks AI (for text generation)
  - ElevenLabs (for text-to-speech)

## Installation

### Backend Setup

1. Set up Python virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the `backend` directory:
```env
OPENAI_API_KEY=your_openai_api_key
```

4. Start the backend server:
```bash
uvicorn app:app --reload
```

The backend server will run on [http://localhost:8000](http://localhost:8000)

### Frontend Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/professor_dobby.git
cd professor_dobby
```

2. Install dependencies:
```bash
cd viewer
npm install
```

3. Create a `.env.local` file in the `viewer` directory with your API keys:
```env
NEXT_PUBLIC_FIREWORKS_API_KEY=your_fireworks_api_key
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
professor_dobby/
├── backend/                # FastAPI backend server
│   ├── app.py             # Main server application
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Backend environment variables
│
└── viewer/                # Next.js frontend
    ├── src/
    │   ├── app/          # Next.js app router
    │   ├── components/
    │   │   ├── chat/     # Chat interface components
    │   │   │   └── ChatPane.tsx
    │   │   └── pdf/      # PDF viewer components
    │   │       ├── PDFViewer.tsx
    │   │       └── PDFViewerWrapper.tsx
    │   └── utils/
    │       └── fireworks.ts    # AI API integration
    ├── public/           # Static files
    └── package.json
```

## Key Components

- **PDFViewer**: Handles PDF rendering and text block selection
- **ChatPane**: Manages conversations with Dobby, including:
  - Message history
  - AI personality switching
  - Text-to-speech playback
  - Preset message buttons
- **Fireworks Integration**: Manages communication with AI models

## Usage

1. Upload a PDF using the interface
2. Click on any text block in the PDF to start a conversation
3. Choose between Leashed and Unhinged Dobby using the toggle
4. Use preset buttons for quick actions or type custom questions
5. Click the "Dobby vs. Dobby" button to see both personalities debate