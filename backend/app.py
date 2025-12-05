from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import img2pdf
from PIL import Image
import io
import os

app = Flask(__name__)
CORS(app)  # Allow all frontend origins (Vercel, localhost, etc.)

# --------------------- CONFIG ---------------------
MAX_FILES = 50
MAX_TOTAL_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'}
ALLOWED_MIMES = {'image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'}


# --------------------- HELPERS ---------------------
def allowed_file(filename):
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return f'.{ext}' in ALLOWED_EXTENSIONS


def validate_images(files):
    if not files:
        return None, "No files uploaded"

    file_list = files.getlist('images')
    if not file_list:
        return None, "No images found in the request"

    if len(file_list) > MAX_FILES:
        return None, f"Maximum {MAX_FILES} files allowed"

    total_size = 0
    validated_images = []

    for file in file_list:

        # Validate filename & extension
        if not file.filename or not allowed_file(file.filename):
            return None, f"Invalid file type: {file.filename}"

        # Validate MIME type
        if file.content_type not in ALLOWED_MIMES:
            return None, f"Invalid MIME type for {file.filename}: {file.content_type}"

        # Validate file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        total_size += file_size

        if total_size > MAX_TOTAL_SIZE:
            return None, "Total file size exceeds 50MB"

        # Validate image integrity
        try:
            img = Image.open(file)
            img.verify()
            file.seek(0)
            validated_images.append(file)
        except Exception:
            return None, f"Corrupted or unsupported image: {file.filename}"

    return validated_images, None


def convert_to_pdf_img2pdf(images):
    """Primary conversion using img2pdf"""
    img_data = []
    for f in images:
        f.seek(0)
        img_data.append(f.read())
        f.seek(0)
    pdf_bytes = img2pdf.convert(img_data)
    return io.BytesIO(pdf_bytes)


def convert_to_pdf_pillow(images):
    """Fallback conversion using Pillow"""
    processed = []

    for f in images:
        img = Image.open(f)

        # Convert non-RGB (RGBA, LA, P) to RGB
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")

        processed.append(img)

    pdf_buffer = io.BytesIO()
    processed[0].save(pdf_buffer, format="PDF", save_all=True, append_images=processed[1:])
    pdf_buffer.seek(0)
    return pdf_buffer


# --------------------- ROUTES ---------------------

@app.route("/")
def home():
    return "Backend is running successfully!", 200


@app.route("/health")
def health():
    return jsonify({"status": "ok", "message": "Photo to PDF converter is working"}), 200


@app.route("/generate", methods=["POST"])
def generate_pdf():
    try:
        images, error = validate_images(request.files)
        if error:
            return jsonify({"error": error}), 400

        # Try img2pdf first (best quality)
        try:
            pdf_bytes = convert_to_pdf_img2pdf(images)
        except:
            pdf_bytes = convert_to_pdf_pillow(images)

        pdf_bytes.seek(0)
        return send_file(
            pdf_bytes,
            mimetype="application/pdf",
            as_attachment=True,
            download_name="converted.pdf"
        )

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# --------------------- MAIN ---------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
