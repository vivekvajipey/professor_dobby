from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import uuid
from pathlib import Path
import requests
import time
from dotenv import load_dotenv
from typing import Dict, Any, List
import json
import hashlib

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
UPLOAD_DIR = Path("temp_uploads")
CACHE_DIR = Path("cache")
MARKER_URL = "https://www.datalab.to/api/v1/marker"
MAX_POLLS = 300  # Maximum number of polling attempts
POLL_INTERVAL = 2  # Seconds between polls

# Create required directories
UPLOAD_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

def calculate_file_hash(file_path: Path) -> str:
    """Calculate SHA-256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read the file in chunks to handle large files
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def get_cached_result(file_hash: str) -> Dict[str, Any] | None:
    """Get cached result for a file hash if it exists."""
    cache_file = CACHE_DIR / f"{file_hash}.json"
    if cache_file.exists():
        print(f"Cache hit for hash {file_hash}")
        with open(cache_file, 'r') as f:
            return json.load(f)
    return None

def save_to_cache(file_hash: str, result: Dict[str, Any]) -> None:
    """Save result to cache."""
    cache_file = CACHE_DIR / f"{file_hash}.json"
    with open(cache_file, 'w') as f:
        json.dump(result, f)
    print(f"Saved result to cache for hash {file_hash}")

def cleanup_old_files(directory: Path, max_age_minutes: int = 60) -> None:
    """Clean up old files from a directory."""
    current_time = time.time()
    for file_path in directory.glob("*.*"):
        if (current_time - file_path.stat().st_mtime) > (max_age_minutes * 60):
            file_path.unlink(missing_ok=True)

@app.post("/api/process-pdf")
async def process_pdf(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Process a PDF file and return the block structure."""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Get API key
    api_key = os.getenv('DATALAB_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="DATALAB_API_KEY not configured")
    
    # Create unique temporary file
    temp_id = str(uuid.uuid4())
    temp_path = UPLOAD_DIR / f"{temp_id}.pdf"
    
    try:
        # Save uploaded file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Calculate file hash
        file_hash = calculate_file_hash(temp_path)
        
        # Check cache
        cached_result = get_cached_result(file_hash)
        if cached_result is not None:
            return cached_result
        
        # Prepare form data for Marker API
        form_data = {
            'file': (os.path.basename(temp_path), open(temp_path, 'rb'), 'application/pdf'),
            'langs': (None, "English"),
            "force_ocr": (None, False),
            "paginate": (None, True),
            'output_format': (None, 'json'),
            "use_llm": (None, False),
            "strip_existing_ocr": (None, False),
            "disable_image_extraction": (None, False)
        }
        
        headers = {"X-Api-Key": api_key}
        
        # Send initial request
        response = requests.post(MARKER_URL, files=form_data, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, 
                              detail=f"Marker API request failed: {response.text}")
        
        data = response.json()
        if not data.get('success'):
            raise HTTPException(status_code=400, 
                              detail=f"Marker API request failed: {data.get('error')}")
        
        # Poll for results
        check_url = data["request_check_url"]
        for _ in range(MAX_POLLS):
            time.sleep(POLL_INTERVAL)
            response = requests.get(check_url, headers=headers)
            data = response.json()
            
            if data["status"] == "complete":
                if not data["success"]:
                    raise HTTPException(status_code=400, 
                                      detail=f"Processing failed: {data.get('error')}")
                
                result = {
                    "success": True,
                    "blocks": data.get('json', {}),
                    "images": data.get('images', {})
                }
                
                # Save to cache
                save_to_cache(file_hash, result)
                
                return result
        
        raise HTTPException(status_code=408, detail="Processing timeout")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up
        if temp_path.exists():
            temp_path.unlink()
        # Cleanup old files
        cleanup_old_files(UPLOAD_DIR)
        cleanup_old_files(CACHE_DIR, max_age_minutes=24*60)  # Cache for 24 hours

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
