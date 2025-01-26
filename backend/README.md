# PDF Viewer Backend

A simple FastAPI backend that processes PDFs using the Datalab Marker API to extract structured block data.

## Setup

1. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp env.example .env
# Edit .env and add your Datalab API key
```

## Running the Server

Start the development server:
```bash
uvicorn app:app --reload --port 8000
```

The server will be available at `http://localhost:8000`.

## API Endpoints

### POST /api/process-pdf
Process a PDF file and return block structure.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: PDF file

**Response:**
```json
{
    "success": true,
    "blocks": {
        // Block structure from Marker API
    },
    "images": {
        // Image data if any
    }
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
    "status": "healthy"
}
```
