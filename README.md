# Photo to PDF Converter

A full-stack web application that converts multiple photos into a single PDF file. Built with HTML/CSS/JavaScript frontend and Python Flask backend.

## Features

- 🖼️ **Multiple Image Upload** - Upload up to 50 images at once
- 🎨 **Drag & Drop Interface** - Intuitive file upload experience
- 👀 **Image Preview** - See all uploaded images before conversion
- 🔄 **Drag to Reorder** - Arrange images in your preferred order
- 🗑️ **Remove Images** - Remove unwanted images before conversion
- 📄 **PDF Generation** - Convert images to PDF with one click
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- ⚡ **Fast Conversion** - Uses img2pdf with Pillow fallback

## Project Structure

```
photo-to-pdf/
├── frontend/
│   ├── index.html      # Main HTML file
│   ├── styles.css      # Styling
│   └── script.js       # Frontend logic
├── backend/
│   ├── app.py          # Flask server
│   ├── requirements.txt # Python dependencies
│   └── README.md       # Backend documentation
└── README.md           # This file
```

## Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Start the Backend Server

```bash
python app.py
```

The server will start at `http://127.0.0.1:5000`

### 3. Open the Frontend

Simply open `frontend/index.html` in your web browser, or serve it with a local server:

```bash
# Using Python's built-in server (from frontend directory)
python -m http.server 8000
# Then open http://localhost:8000
```

## Usage

1. **Upload Images**: Drag and drop images or click "Choose Files"
2. **Preview & Reorder**: View thumbnails and drag to reorder
3. **Remove Images**: Click the × button to remove unwanted images
4. **Generate PDF**: Click "Generate PDF" to convert and download

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WEBP (.webp)
- BMP (.bmp)
- TIFF (.tiff, .tif)

## Limitations

- Maximum 50 images per conversion
- Maximum 50MB total file size
- Images are converted to RGB format (transparency removed)

## API Documentation

### POST `/generate`

Converts uploaded images to PDF.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `images` field (multiple files)

**Response:**
- Success (200): PDF file download
- Error (400/500): JSON with error message

### GET `/health`

Health check endpoint.

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python 3, Flask
- **PDF Generation**: img2pdf, Pillow (PIL)
- **CORS**: Flask-CORS

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Troubleshooting

### Backend won't start

- Ensure Python 3.7+ is installed
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify port 5000 is not in use

### Frontend can't connect to backend

- Ensure backend server is running
- Check browser console for CORS errors
- Verify API URL in `script.js` matches your backend URL

### PDF generation fails

- Check file formats are supported
- Verify file sizes are within limits
- Check backend console for error messages

## Development

To modify the code:

- **Frontend**: Edit files in `frontend/` directory
- **Backend**: Edit `backend/app.py`
- **API URL**: Update `API_URL` constant in `frontend/script.js` if needed

## License

This project is provided as-is for educational and personal use.

## Credits

Built with:
- [Flask](https://flask.palletsprojects.com/)
- [img2pdf](https://github.com/josch/img2pdf)
- [Pillow](https://python-pillow.org/)

