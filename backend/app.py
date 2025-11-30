from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import img2pdf
from PIL import Image
import io
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
MAX_FILES = 50
MAX_TOTAL_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'}
ALLOWED_MIMES = {'image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'}


def allowed_file(filename):
    """Check if file has allowed extension and is valid image."""
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return f'.{ext}' in ALLOWED_EXTENSIONS


def validate_images(files):
    """Validate uploaded images."""
    if not files:
        return None, "No files uploaded"
    
    file_list = files.getlist('images')
    
    if not file_list:
        return None, "No images found in request"
    
    if len(file_list) > MAX_FILES:
        return None, f"Maximum {MAX_FILES} files allowed"
    
    total_size = 0
    validated_images = []
    
    for file in file_list:
        # Check filename
        if not file.filename or not allowed_file(file.filename):
            return None, f"Invalid file: {file.filename}. Only JPEG, PNG, WEBP, BMP, TIFF are allowed"
        
        # Check MIME type
        if file.content_type not in ALLOWED_MIMES:
            return None, f"Invalid MIME type for {file.filename}: {file.content_type}"
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        total_size += file_size
        if total_size > MAX_TOTAL_SIZE:
            return None, f"Total file size exceeds {MAX_TOTAL_SIZE / (1024 * 1024)}MB limit"
        
        # Validate image can be opened
        try:
            img = Image.open(file)
            img.verify()  # Verify it's a valid image
            file.seek(0)  # Reset file pointer
            validated_images.append(file)
        except Exception as e:
            return None, f"Invalid image file {file.filename}: {str(e)}"
    
    return validated_images, None


def convert_to_pdf_pillow(images):
    """Convert images to PDF using Pillow (fallback method)."""
    pdf_images = []
    
    for img_file in images:
        try:
            img = Image.open(img_file)
            # Convert to RGB if necessary (for PNG with transparency, etc.)
            if img.mode in ('RGBA', 'LA', 'P'):
                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = rgb_img
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            pdf_images.append(img)
        except Exception as e:
            raise Exception(f"Error processing image {img_file.filename}: {str(e)}")
    
    # Create PDF in memory
    pdf_bytes = io.BytesIO()
    if pdf_images:
        pdf_images[0].save(
            pdf_bytes,
            format='PDF',
            save_all=True,
            append_images=pdf_images[1:] if len(pdf_images) > 1 else []
        )
    pdf_bytes.seek(0)
    return pdf_bytes


def convert_to_pdf_img2pdf(images):
    """Convert images to PDF using img2pdf (primary method)."""
    image_bytes_list = []
    
    for img_file in images:
        img_file.seek(0)
        image_bytes_list.append(img_file.read())
        img_file.seek(0)
    
    try:
        pdf_bytes = img2pdf.convert(image_bytes_list)
        return io.BytesIO(pdf_bytes)
    except Exception as e:
        raise Exception(f"img2pdf conversion failed: {str(e)}")


@app.route('/generate', methods=['POST'])
def generate_pdf():
    """Generate PDF from uploaded images."""
    try:
        # Validate images
        images, error = validate_images(request.files)
        if error:
            return jsonify({'error': error}), 400
        
        if not images:
            return jsonify({'error': 'No valid images to process'}), 400
        
        # Try img2pdf first (faster and better quality)
        try:
            pdf_bytes = convert_to_pdf_img2pdf(images)
        except Exception as img2pdf_error:
            # Fallback to Pillow
            print(f"img2pdf failed, using Pillow fallback: {img2pdf_error}")
            try:
                pdf_bytes = convert_to_pdf_pillow(images)
            except Exception as pillow_error:
                return jsonify({'error': f'PDF conversion failed: {str(pillow_error)}'}), 500
        
        # Return PDF file
        pdf_bytes.seek(0)
        return send_file(
            pdf_bytes,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='photos.pdf'
        )
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'message': 'Photo to PDF converter is running'}), 200


if __name__ == '__main__':
    print("Starting Photo to PDF Converter server...")
    print("Server running at http://127.0.0.1:5000")
    print("Open frontend/index.html in your browser")
    app.run(debug=True, host='127.0.0.1', port=5000)

