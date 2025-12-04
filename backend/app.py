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
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return f'.{ext}' in ALLOWED_EXTENSIONS


def validate_images(files):
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
        if not file.filename or not allowed_file(file.filename):
            return None, f"Invalid file: {file.filename}"

        if file.content_type not in ALLOWED_MIMES:
            return None, f"Invalid MIME type for {file.filename}: {file.content_type}"
        
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        total_size += file_size
        if total_size > MAX_TOTAL_SIZE:
            return None, "Total size exceeds 50MB"
        
        try:
            img = Image.open(file)
            img.verify()
            file.seek(0)
            validated_images.append(file)
        except Exception as e:
            return None, f"Invalid image file {file.filename}: {str(e)}"
    
    return validated_images, None


def convert_to_pdf_pillow(images):
    pdf_images = []
    
    for img_file in images:
        img = Image.open(img_file)
        if img.mode in ('RGBA', 'LA', 'P'):
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = rgb_img
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        pdf_images.append(img)
    
    pdf_bytes = io.BytesIO()
    pdf_images[0].save(
        pdf_bytes,
        format='PDF',
        save_all=True,
        append_images=pdf_images[1:]
    )
    
    pdf_bytes.seek(0)
    return pdf_bytes


def convert_to_pdf_img2pdf(images):
    image_bytes = []
    
    for img_file in images:
        img_file.seek(0)
        image_bytes.append(img_file.read())
        img_file.seek(0)
    
    pdf_bytes = img2pdf.convert(image_bytes)
    return io.BytesIO(pdf_bytes)


@app.route('/generate', methods=['POST'])
def generate_pdf():
    try:
        images, error = validate_images(request.files)
        if error:
            return jsonify({'error': error}), 400
        
        try:
            pdf_bytes = convert_to_pdf_img2pdf(images)
        except:
            pdf_bytes = convert_to_pdf_pillow(images)
        
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
    return jsonify({'status': 'ok', 'message': 'Photo to PDF converter is running'}), 200


if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
