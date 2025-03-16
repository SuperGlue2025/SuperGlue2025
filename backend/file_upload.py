# file_upload.py
from flask import request, jsonify
import os
from molecule_annotate import service  # Import the service instance

# Configure the directory for storing uploaded files
UPLOAD_FOLDER = 'data/'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def upload_file():
    """Handle file upload"""
    print("Received file upload request")

    if 'file' not in request.files:
        print("No file part in request")
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    print(f"Uploaded filename: {file.filename}")

    if file.filename == '':
        print("No file selected")
        return jsonify({'error': 'No selected file'}), 400

    if file:
        try:
            # Save the file
            file_path = os.path.join(UPLOAD_FOLDER, file.filename)
            print(f"Saving file to: {file_path}")
            file.save(file_path)

            # Load compound data
            compounds = service.load_compounds(file_path)
            print(f"Compounds loaded: {compounds}")
            print(f"Dataframe empty: {service.compounds_df.empty}")

            if compounds is not None and not service.compounds_df.empty:
                print("File uploaded and compounds loaded successfully")
                return jsonify({
                    'message': 'File uploaded and compounds loaded successfully',
                    'fileUrl': f"/data/{file.filename}"
                }), 200
            else:
                print("Error loading compounds from file")
                return jsonify({'error': 'Error loading compounds from file'}), 500
        except Exception as e:
            print(f"Error processing file: {str(e)}")
            return jsonify({'error': f'Error processing file: {str(e)}'}), 500
