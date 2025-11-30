# Photo to PDF Converter - Backend

A Flask-based backend service that converts multiple images into a single PDF file.

## Features

- Accepts multiple image uploads (JPEG, PNG, WEBP, BMP, TIFF)
- Validates file types and sizes
- Converts images to PDF using `img2pdf` (primary) with Pillow fallback
- CORS enabled for frontend integration
- Error handling and validation

## Installation

1. **Create a virtual environment** (recommended):

```bash
python -m venv venv
```

2. **Activate the virtual environment**:

   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

3. **Install dependencies**:

```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python app.py
```

The server will start at `http://127.0.0.1:5000`

## API Endpoints

### POST `/generate`

Converts uploaded images to a PDF file.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `images` field (multiple files)

**Response:**
- Success (200): PDF file download
- Error (400/500): JSON with error message
  ```json
  {
    "error": "Error message here"
  }
  ```

**Limits:**
- Maximum 50 images per request
- Maximum 50MB total file size
- Supported formats: JPEG, PNG, WEBP, BMP, TIFF

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Photo to PDF converter is running"
}
```

## Usage with Frontend

1. Start the backend server:
   ```bash
   python app.py
   ```

2. Open `frontend/index.html` in your web browser (or serve it with a local server)

3. The frontend will automatically connect to `http://127.0.0.1:5000/generate`

## Troubleshooting

### Port Already in Use

If port 5000 is already in use, modify the last line in `app.py`:

```python
app.run(debug=True, host='127.0.0.1', port=5001)  # Change port number
```

### Missing Dependencies

If you encounter import errors, ensure all dependencies are installed:

```bash
pip install --upgrade -r requirements.txt
```

### CORS Issues

CORS is enabled by default. If you need to restrict origins, modify `app.py`:

```python
CORS(app, resources={r"/generate": {"origins": "http://localhost:3000"}})
```

## Development

- The server runs in debug mode by default
- Check the console for error messages and logs
- All validation errors are returned as JSON responses

## License

This project is provided as-is for educational and personal use.

