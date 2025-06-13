# file_upload.py
from datetime import datetime
import os
from flask import request, jsonify
import json
import pandas as pd
import sqlite3
from molecule_annotate import service  # Import the service instance
from substructure_annotate import init_db

# Configure the directory for storing uploaded files
UPLOAD_FOLDER = 'data/'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'molecular_annotate_V2.db')


def upload_file():
    """Handle file upload"""
    print("Received file upload request")
    init_db()

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

            # insert file info into dataset
            dataset_name = file.filename
            timestamp = datetime.now().isoformat()
            
            # Add debug info
            print(f"Connecting to database at: {DB_PATH}")
            print(f"Database exists: {os.path.exists(DB_PATH)}")
            
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # Check if table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='dataset'")
            if not cursor.fetchone():
                print("Error: dataset table does not exist!")
                return jsonify({'error': 'Database table not found'}), 500
                
            # Check if dataset already exists
            cursor.execute(
                "SELECT dataset_id FROM dataset WHERE file_name = ?",
                (dataset_name,)
            )
            row = cursor.fetchone()
            
            if row:
                dataset_id = row[0]
                print(f"Dataset already exists, dataset_id={dataset_id}")
            else:
                # Add debug info
                print(f"Inserting new dataset: {dataset_name}, timestamp: {timestamp}")
                
                cursor.execute(
                    "INSERT INTO dataset (file_name, timestamp) VALUES (?, ?)",
                    (dataset_name, timestamp)
                )
                dataset_id = cursor.lastrowid
                print(f"Dataset record inserted, dataset_id={dataset_id}")
                
                # Verify insertion success
                cursor.execute("SELECT * FROM dataset WHERE dataset_id = ?", (dataset_id,))
                inserted_row = cursor.fetchone()
                print(f"Verification - Inserted row: {inserted_row}")
            
            conn.commit()
            conn.close()

            ext = os.path.splitext(file.filename)[1].lower()
            # support multiple structured file
            if ext == '.csv':
                df = pd.read_csv(file_path)
            elif ext in ['.tsv', '.txt']:
                df = pd.read_csv(file_path, sep='\t')
            elif ext in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path)
            elif ext == '.json':
                df = pd.read_json(file_path)
            else:
                return jsonify({'error': 'Unsupported file type', 'dataset_id': dataset_id}), 400

            for _, row in df.iterrows():
                cmpd_id = str(row['cmpd_id']) if 'cmpd_id' in row else ''
                # auto detect smiles column
                possible_smiles_columns = ['SMILES', 'smiles', 'Smiles', 'smile', 'SMILE']
                smiles_column = next((col for col in possible_smiles_columns if col in row.index), None)
                smiles = str(row[smiles_column]) if smiles_column else ''
                # other properties, exclude cmpd_id and smiles_column
                prop_dict = {k: row[k] for k in row.index if k not in ['cmpd_id', smiles_column]}
                property_json = json.dumps(prop_dict, ensure_ascii=False)
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT OR IGNORE INTO compound (dataset_id, molecule_id, smiles, property) VALUES (?, ?, ?, ?)",
                    (dataset_id, cmpd_id, smiles, property_json)
                )
                conn.commit()
                conn.close()
            print("Compound table records inserted.")

            # Load compound data
            compounds = service.load_compounds(file_path)
            print(f"Compounds loaded: {compounds}")
            print(f"Dataframe empty: {service.compounds_df.empty}")

            if compounds is not None and not service.compounds_df.empty:
                print("File uploaded and compounds loaded successfully")
                return jsonify({
                    'message': 'File uploaded and compounds loaded successfully',
                    'fileUrl': f"/data/{file.filename}",
                    'dataset_id': dataset_id
                }), 200
            else:
                print("Error loading compounds from file")
                return jsonify({
                    'error': 'Error loading compounds from file',
                    'dataset_id': dataset_id
                }), 500

        except Exception as e:
            print(f"Error processing file: {str(e)}")
            return jsonify({'error': f'Error processing file: {str(e)}'}), 500
