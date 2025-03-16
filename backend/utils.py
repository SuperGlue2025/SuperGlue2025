from flask import jsonify

def handle_file_validation(request):
    """Validate file upload request and return file or error response"""
    print("Received file upload request")

    if 'file' not in request.files:
        print("No file part in request")
        return None, (jsonify({'error': 'No file part'}), 400)

    file = request.files['file']
    print(f"Uploaded filename: {file.filename}")

    if file.filename == '':
        print("No file selected")
        return None, (jsonify({'error': 'No selected file'}), 400)

    return file, None  # 返回文件对象和None表示没有错误