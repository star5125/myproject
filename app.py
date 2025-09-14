from flask import Flask, render_template, request, send_file, flash, redirect, url_for
import fitz  # PyMuPDF
import os
import io
from werkzeug.utils import secure_filename
from PIL import Image
import tempfile
import shutil

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this'

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB 제한

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/merge', methods=['POST'])
def merge_files():
    if 'files[]' not in request.files:
        flash('파일을 선택해주세요.')
        return redirect(url_for('index'))

    files = request.files.getlist('files[]')

    if not files or all(file.filename == '' for file in files):
        flash('파일을 선택해주세요.')
        return redirect(url_for('index'))

    valid_files = []
    uploaded_file_paths = []

    # 업로드된 파일들을 임시 저장
    for file in files:
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # 중복 파일명 방지를 위해 timestamp 추가
            import time
            timestamp = str(int(time.time() * 1000))
            name, ext = os.path.splitext(filename)
            unique_filename = f"{name}_{timestamp}{ext}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            uploaded_file_paths.append(file_path)
            valid_files.append((file_path, filename))

    if not valid_files:
        flash('유효한 파일이 없습니다. PDF, PNG, JPG, JPEG 파일만 업로드 가능합니다.')
        return redirect(url_for('index'))

    try:
        # 새로운 PDF 문서 생성
        merged_pdf = fitz.open()

        # 각 파일을 처리하여 PDF에 추가
        for file_path, original_filename in valid_files:
            file_ext = file_path.rsplit('.', 1)[1].lower()

            if file_ext == 'pdf':
                # PDF 파일인 경우 모든 페이지를 추가
                src_pdf = fitz.open(file_path)
                merged_pdf.insert_pdf(src_pdf)
                src_pdf.close()

            elif file_ext in ['png', 'jpg', 'jpeg']:
                # 이미지 파일인 경우 PDF 페이지로 변환 후 추가
                img = Image.open(file_path)

                # RGBA 이미지를 RGB로 변환 (PDF 호환성을 위해)
                if img.mode == 'RGBA':
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1])
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')

                # 이미지를 임시 PDF로 저장
                img_buffer = io.BytesIO()
                img.save(img_buffer, format='PDF')
                img_buffer.seek(0)

                # 임시 PDF를 메인 PDF에 삽입
                img_pdf = fitz.open(stream=img_buffer.read(), filetype="pdf")
                merged_pdf.insert_pdf(img_pdf)
                img_pdf.close()
                img_buffer.close()
                img.close()

        # 최종 PDF를 메모리에 저장
        output_buffer = io.BytesIO()
        merged_pdf.save(output_buffer)
        merged_pdf.close()
        output_buffer.seek(0)

        # 임시 파일들 정리
        for file_path, _ in valid_files:
            try:
                os.remove(file_path)
            except:
                pass

        return send_file(
            output_buffer,
            as_attachment=True,
            download_name='merged_output.pdf',
            mimetype='application/pdf'
        )

    except Exception as e:
        # 에러 발생 시 임시 파일들 정리
        for file_path in uploaded_file_paths:
            try:
                os.remove(file_path)
            except:
                pass

        flash(f'파일 처리 중 오류가 발생했습니다: {str(e)}')
        return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)