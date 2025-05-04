<<<<<<< HEAD
from flask import Flask,send_from_directory,jsonify,request
from flask_cors import CORS
from molecule_annotate import get_compounds, get_smarts_smiles
from file_upload import upload_file
from molecule_convert import convert_molecule
from molecule_visualize import MoleculeVisualizer
from molecule_similarity import similarity_search
import substructure_annotate
import json
import os
import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem
import pandas as pd
import traceback
# add the definition of NumpyEncoder
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)

app = Flask(__name__)
CORS(app,resources={
    r"/api/*":{"origins":"*"},
    r"/data/*": {"origins": "*"},
    r"/get_molecule_image/*": {"origins": "*"}
    })


visualizer = MoleculeVisualizer(data_dir='data')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'data')
@app.route('/api/upload', methods=['POST'])
def handle_upload():
    return upload_file()

@app.route('/data/<filename>')
def serve_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route('/api/similarity_search', methods=['POST'])
def handle_similarity_search():
    try:
        # get data from post
        request_data = request.get_json()

        # get params from request
        query_smiles = request_data.get('query_smiles')
        similarity_method = request_data.get('similarity_metric')
        filename = request_data.get('filename')

        # validate params
        if not query_smiles:
            return jsonify({
                "success": False,
                "error": "Missing required parameter: query_smiles"
            }), 400

        if not filename:
            return jsonify({
                "success": False,
                "error": "Missing required parameter: filename"
            }), 400

        # similarity search
        results_df = similarity_search(query_smiles, filename, similarity_method)
        if results_df.empty:
            return jsonify({
                "success": False,
                "error": "No matching compounds found"
            }), 404

        # convert DataFrame to dict
        results = results_df.to_dict(orient='records')

        # return results
        return app.response_class(
            response=json.dumps({"success": True, "results": results}, cls=NumpyEncoder),
            status=200,
            mimetype='application/json'
        )
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/annotate_molecule', methods=['POST'])
def handle_annotate_molecule():
    try:
        request_data = request.get_json()
        print(f"Received data: {json.dumps(request_data, cls=NumpyEncoder)}")

        # Extract parameters
        mol_smiles = request_data.get('smiles')
        atom_indices = request_data.get('atoms', [])
        bond_indices = request_data.get('bonds', [])
        filename = request_data.get('filename')
        id = request_data.get('id')
        annotation_text = request_data.get('annotation', '')  # Get annotation text

        # Validate required parameters
        if not mol_smiles or not atom_indices:
            print("Error: Missing required parameters")
            return jsonify({
                "success": False,
                "message": "Missing required data: SMILES or atom indices"
            }), 400

        try:
            # Get SMARTS and SMILES for the fragment
            fragment_smiles, fragment_smarts = get_smarts_smiles(mol_smiles, atom_indices, bond_indices)

            # Save to database with annotation
            result = substructure_annotate.save_substructure(
                id,
                mol_smiles,
                atom_indices,
                bond_indices,
                fragment_smiles,
                fragment_smarts,
                annotation_text  # Add annotation text to save function
            )

            if result.get("success"):
                return jsonify(result)
            else:
                print(f"Error in save_substructure: {result}")
                return jsonify(result), 400

        except Exception as e:
            print(f"Error processing molecular data: {str(e)}")
            return jsonify({
                "success": False,
                "message": f"Error processing molecular data: {str(e)}"
            }), 400

    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 400

@app.route('/api/convert_molecule', methods=['POST'])
def handle_convert_molecule():
    return convert_molecule()
@app.route('/api/compounds', methods=['GET'])
def handle_get_compounds():
    return get_compounds()

@app.route('/get_molecule_image/<cmpd_id>', methods=['GET'])
def handle_visualize(cmpd_id):
    try:
        filename = request.args.get('filename')
        if not filename:
            return jsonify({
                'success': False,
                'error': 'Missing filename'
            }), 400
        result = visualizer.process_request(cmpd_id, filename)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/get_molecule_highlights', methods=['GET'])
def handle_get_molecule_highlights():
    """Retrieve all highlighted substructures for a specific molecule."""
    try:
        molecule_id = request.args.get('id')
        filename = request.args.get('filename', '')

        if not molecule_id:
            return jsonify({
                "success": False,
                "message": "Missing required molecule ID parameter"
            }), 400

        # Call the function from the substructure_annotate module
        result = substructure_annotate.get_molecule_highlights(molecule_id, filename)

        return jsonify(result)
    except Exception as e:
        print(f"Error getting molecule highlights: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
=======
# app.py  ─────────────────────────────────────────────────────────────────────
import json, os, sqlite3, traceback
from datetime import datetime

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from rdkit import Chem
from rdkit.Chem import AllChem

from flask_bcrypt        import Bcrypt
from flask_jwt_extended  import JWTManager, jwt_required
from auth                import auth_bp                         # 登录/注册蓝图

# ── Internal project modules ────────────────────────────────────────────────
from molecule_annotate   import get_compounds, get_smarts_smiles
from file_upload         import upload_file
from molecule_convert    import convert_molecule
from molecule_visualize  import MoleculeVisualizer
from molecule_similarity import similarity_search
import substructure_annotate
from substructure_annotate import init_db, DB_PATH

# ────────────────────────────────────────────────────────────────────────────
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):  return int(obj)
        if isinstance(obj, np.floating): return float(obj)
        if isinstance(obj, np.ndarray):  return obj.tolist()
        return super().default(obj)

# ── Flask initialisation ────────────────────────────────────────────────────
app = Flask(__name__)
app.config.update(
    SECRET_KEY                   = "REPLACE_ME",
    JWT_SECRET_KEY               = "REPLACE_ME_TOO",
    JWT_ACCESS_TOKEN_EXPIRES     = 60 * 60 * 24 * 7  # 7 days
)


CORS(app, resources={
    r"/api/*":                {"origins": "*"},
    r"/data/*":               {"origins": "*"},
    r"/get_molecule_image/*": {"origins": "*"}
})
# CORS（Bearer‑token 方式，无需 cookie）
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)


# crypto / JWT
bcrypt = Bcrypt(app)
jwt    = JWTManager(app)

# 注册登录/验证码蓝图
app.register_blueprint(auth_bp, url_prefix="/api")

visualizer    = MoleculeVisualizer(data_dir="data")
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "data")

# ════════════════════════════════  ROUTES  ══════════════════════════════════
# ----------------------------------------------------------------------------
# File upload & static download (登录后才允许)
# ----------------------------------------------------------------------------
@app.route("/api/upload", methods=["POST"])
@jwt_required()
def handle_upload():
    return upload_file()

@app.route("/data/<filename>")
def serve_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# ----------------------------------------------------------------------------
# list sub‑structures  (需要登录)
# ----------------------------------------------------------------------------
@app.route("/api/substructures", methods=["GET"])
@jwt_required()
def list_substructures():
    try:
        init_db()
        mol_id = request.args.get("molecule_id")

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur  = conn.cursor()

        sql = (
            "SELECT id, molecule_id, smiles, "
            "highlighted_atoms, highlighted_bonds, "
            "highlight_smarts, annotation_text, timestamp "
            "FROM molecule_substructures "
        )
        params = ()
        if mol_id:
            sql += "WHERE molecule_id=? "
            params = (mol_id,)
        sql += "ORDER BY timestamp DESC"

        cur.execute(sql, params)
        rows = []
        for r in cur.fetchall():
            d = dict(r)
            d["atoms"] = json.loads(d.pop("highlighted_atoms")  or "[]")
            d["bonds"] = json.loads(d.pop("highlighted_bonds") or "[]")
            rows.append(d)

        conn.close()
        return jsonify(success=True, substructures=rows)

    except Exception as e:
        print("list_substructures error:", e)
        return jsonify(success=False, error=str(e)), 500

# ----------------------------------------------------------------------------
# Similarity search  (保持开放，如要保护再加 jwt_required)
# ----------------------------------------------------------------------------
@app.route("/api/similarity_search", methods=["POST"])
def handle_similarity_search():
    try:
        req = request.get_json()
        query_smiles      = req.get("query_smiles")
        similarity_method = req.get("similarity_metric")
        filename          = req.get("filename")

        if not query_smiles or not filename:
            return jsonify(success=False,
                           error="query_smiles and filename are required"), 400

        df = similarity_search(query_smiles, filename, similarity_method)
        if df.empty:
            return jsonify(success=False, error="No matching compounds found"), 404

        return app.response_class(
            response=json.dumps({"success": True,
                                 "results": df.to_dict("records")},
                                cls=NumpyEncoder),
            status=200,
            mimetype="application/json"
        )
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

# ----------------------------------------------------------------------------
# Save highlighted fragment + annotation
# ----------------------------------------------------------------------------
@app.route("/api/annotate_molecule", methods=["POST"])
@jwt_required()
def handle_annotate_molecule():
    """
    Body JSON fields:
        smiles      – parent molecule SMILES  (required)
        atoms       – list[int] selected atoms
        bonds       – list[int] selected bonds
        id          – molecule_id (frontend)
        annotation  – free‑text comment
    """
    try:
        req          = request.get_json()
        mol_smiles   = req.get("smiles")
        atom_indices = req.get("atoms", [])
        bond_indices = req.get("bonds", [])
        mol_id       = req.get("id")
        annotation   = req.get("annotation", "")

        if not mol_smiles or not atom_indices:
            return jsonify(success=False,
                           message="Missing SMILES or atom indices"), 400

        frag_smiles, frag_smarts = get_smarts_smiles(mol_smiles,
                                                     atom_indices,
                                                     bond_indices)

        result = substructure_annotate.save_substructure(
            mol_id, mol_smiles,
            atom_indices, bond_indices,
            frag_smiles, frag_smarts,
            annotation
        )

        status = 200 if result.get("success") else 400
        return jsonify(result), status

    except Exception as e:
        return jsonify(success=False, message=str(e)), 400

# ----------------------------------------------------------------------------
# Misc endpoints below（保持原样）
# ----------------------------------------------------------------------------
@app.route("/api/convert_molecule",  methods=["POST"]) 
def handle_convert_molecule():  return convert_molecule()
@app.route("/api/compounds",         methods=["GET"])       
def handle_get_compounds():     return get_compounds()
@app.route("/get_molecule_image/<cmpd_id>", methods=["GET"])
def handle_visualize(cmpd_id):
    try:
        filename = request.args.get("filename")
        if not filename:
            return jsonify(success=False, error="Missing filename"), 400
        return jsonify(visualizer.process_request(cmpd_id, filename))
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

@app.route("/api/get_molecule_highlights", methods=["GET"])
@jwt_required()
def handle_get_molecule_highlights():
    try:
        mol_id   = request.args.get("id")
        filename = request.args.get("filename", "")

        if not mol_id:
            return jsonify(success=False, message="id is required"), 400

        return jsonify(substructure_annotate.get_molecule_highlights(mol_id, filename))
    except Exception as e:
        return jsonify(success=False, message=str(e)), 500
>>>>>>> 2c86fda (Initial commit on update1)


@app.route('/api/match_smarts', methods=['POST'])
def handle_match_smarts():
    """Match a SMARTS pattern against a molecule and return the matched atom indices"""
    try:
        request_data = request.get_json()
        mol_smiles = request_data.get('smiles')
        smarts_pattern = request_data.get('smarts')

        if not mol_smiles or not smarts_pattern:
            return jsonify({
                "success": False,
                "message": "Missing required parameters: SMILES or SMARTS"
            }), 400

        # Create RDKit molecule from SMILES
        mol = Chem.MolFromSmiles(mol_smiles)
        if not mol:
            return jsonify({
                "success": False,
                "message": "Invalid SMILES string"
            }), 400

        # Create RDKit molecule from SMARTS
        patt = Chem.MolFromSmarts(smarts_pattern)
        if not patt:
            return jsonify({
                "success": False,
                "message": "Invalid SMARTS pattern"
            }), 400

        # Find all matches
        matches = mol.GetSubstructMatches(patt)

        # Convert matches to the format expected by the front-end
        result_matches = []
        for match in matches:
            # Get the bonds connecting the matched atoms
            bonds = []
            for bond_idx, bond in enumerate(mol.GetBonds()):
                begin_atom = bond.GetBeginAtomIdx()
                end_atom = bond.GetEndAtomIdx()
                if begin_atom in match and end_atom in match:
                    bonds.append(bond_idx)

            result_matches.append({
                "atoms": list(match),
                "bonds": bonds
            })

        return jsonify({
            "success": True,
            "matches": result_matches
        })

    except Exception as e:
        print(f"Error matching SMARTS: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/match_multiple_smarts', methods=['POST'])
def handle_match_multiple_smarts():
    """Match multiple SMARTS patterns against a molecule"""
    try:
        request_data = request.get_json()
        mol_smiles = request_data.get('smiles')
        patterns = request_data.get('patterns', [])

        if not mol_smiles or not patterns:
            return jsonify({
                "success": False,
                "message": "Missing required parameters"
            }), 400

        # Create RDKit molecule from SMILES
        mol = Chem.MolFromSmiles(mol_smiles)
        if not mol:
            return jsonify({
                "success": False,
                "message": "Invalid SMILES string"
            }), 400

        # Match each pattern
        results = []
        for pattern_data in patterns:
            pattern_id = pattern_data.get('id')
            smarts = pattern_data.get('smarts')

            if not smarts:
                results.append({
                    "id": pattern_id,
                    "matches": []
                })
                continue

            try:
                patt = Chem.MolFromSmarts(smarts)
                if not patt:
                    results.append({
                        "id": pattern_id,
                        "matches": []
                    })
                    continue

                # Find all matches
                matches = mol.GetSubstructMatches(patt)

                # Convert matches
                match_results = []
                for match in matches:
                    # Get bonds
                    bonds = []
                    for bond_idx, bond in enumerate(mol.GetBonds()):
                        begin_atom = bond.GetBeginAtomIdx()
                        end_atom = bond.GetEndAtomIdx()
                        if begin_atom in match and end_atom in match:
                            bonds.append(bond_idx)

                    match_results.append({
                        "atoms": list(match),
                        "bonds": bonds
                    })

                results.append({
                    "id": pattern_id,
                    "matches": match_results
                })

            except Exception as e:
                print(f"Error matching pattern {pattern_id}: {str(e)}")
                results.append({
                    "id": pattern_id,
                    "error": str(e),
                    "matches": []
                })

        return jsonify({
            "success": True,
            "matches": results
        })

    except Exception as e:
        print(f"Error matching multiple SMARTS: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

<<<<<<< HEAD
# @app.route('/api/substructure_search', methods=['POST'])
# def substructure_search():
#     """
#     Perform substructure search.
#     Request parameters:
#     - query_smiles: SMILES of the current molecule
#     - query_id: molecule ID
#     - atoms: list of selected atoms
#     - bonds: list of selected bonds
#     - filename: name of the CSV file
#     """
#     try:
#         # Get request parameters
#         data = request.json
#         query_smiles = data.get('query_smiles')
#         query_id = data.get('query_id')
#         atoms = data.get('atoms', [])
#         bonds = data.get('bonds', [])
#         filename = data.get('filename', '')
#
#         if not query_smiles:
#             return jsonify({"success": False, "error": "Missing query SMILES"}), 400
#
#         if not atoms or len(atoms) == 0:
#             return jsonify({"success": False, "error": "No substructure (atoms) selected"}), 400
#
#         # Define data directory
#         data_dir = os.path.join(os.path.dirname(__file__), 'data')
#         csv_path = os.path.join(data_dir, filename)
#
#         # Check if highlights for this molecule already exist in the database
#         highlights_result = substructure_annotate.get_molecule_highlights(query_id, filename)
#
#         fragment_smarts = None
#         fragment_smiles = None
#         db_result = False
#
#         if highlights_result.get('success') and 'highlights' in highlights_result:
#             # Try to find a highlight that matches the selected atoms
#             for highlight in highlights_result['highlights']:
#                 highlight_atoms = highlight.get('atoms', [])
#                 if sorted(highlight_atoms) == sorted(atoms):
#                     fragment_smarts = highlight.get('fragment_smarts')
#                     fragment_smiles = highlight.get('fragment_smiles')
#                     db_result = True
#                     print(f"SMARTS retrieved from DB: {fragment_smarts}")
#                     break
#
#         # If not found in DB, compute a new SMARTS pattern
#         if not fragment_smarts:
#             print("No matching substructure found in DB. Generating new SMARTS pattern.")
#             fragment_smiles, fragment_smarts = get_smarts_smiles(query_smiles, atoms, bonds)
#
#             if not fragment_smarts:
#                 return jsonify({"success": False, "error": "Failed to generate SMARTS pattern"}), 400
#
#         # Check if the CSV file exists
#         if not os.path.exists(csv_path):
#             return jsonify({"success": False, "error": f"File not found: {filename}"}), 404
#
#         # Create substructure pattern
#         pattern = Chem.MolFromSmarts(fragment_smarts)
#         if not pattern:
#             return jsonify({"success": False, "error": "Failed to create substructure pattern"}), 400
#         # Read CSV
#         try:
#             df = pd.read_csv(csv_path)
#         except Exception as e:
#             return jsonify({"success": False, "error": f"Failed to read CSV: {str(e)}"}), 500
#
#         # Detect SMILES column
#         smiles_column = None
#         possible_smiles_columns = ['SMILES', 'smiles', 'Smiles', 'smile', 'SMILE']
#         for col in possible_smiles_columns:
#             if col in df.columns:
#                 smiles_column = col
#                 break
#
#         if not smiles_column:
#             return jsonify({"success": False, "error": "SMILES column not found in CSV"}), 400
#
#         # Detect ID column
#         id_column = None
#         possible_id_columns = ['ID', 'id', 'cmpd_id', 'Compound_ID', 'compound_id', 'molecule_id']
#         for col in possible_id_columns:
#             if col in df.columns:
#                 id_column = col
#                 break
#
#         if not id_column:
#             id_column = df.columns[0]  # Use the first column as fallback
#
#         # Perform substructure search
#         matches = []
#
#         for _, row in df.iterrows():
#             smiles = row[smiles_column]
#             try:
#                 mol = Chem.MolFromSmiles(smiles)
#
#                 if mol and mol.HasSubstructMatch(pattern):
#                     result = {
#                         "id": str(row[id_column]),
#                         "smiles": smiles,
#                         "fragment_smarts": fragment_smarts,
#                         "fragment_smiles": fragment_smiles
#                     }
#
#                     for col in df.columns:
#                         if col not in [id_column, smiles_column]:
#                             result[col] = row[col]
#
#                     matches.append(result)
#             except Exception as e:
#                 print(f"Error processing molecule {row[id_column]}: {str(e)}")
#                 continue
#
#         # Save new substructure to DB if not already stored
#         if not db_result and len(matches) > 0:
#             try:
#                 save_result = substructure_annotate.save_substructure(
#                     query_id,
#                     query_smiles,
#                     atoms,
#                     bonds,
#                     fragment_smiles,
#                     fragment_smarts,
#                     f"Auto-saved substructure query - matched {len(matches)} compounds"
#                 )
#                 print(f"New substructure saved to DB: {save_result}")
#             except Exception as e:
#                 print(f"Error saving substructure to DB: {str(e)}")
#
#         return jsonify({
#             "success": True,
#             "results": matches,
#             "fragment_smarts": fragment_smarts,
#             "fragment_smiles": fragment_smiles,
#             "query_id": query_id,
#             "selected_atoms": atoms,
#             "selected_bonds": bonds,
#             "from_database": db_result,
#             "matches_count": len(matches)
#         })
#
#     except Exception as e:
#         print(f"Substructure search error: {str(e)}")
#         return jsonify({"success": False, "error": f"Substructure search failed: {str(e)}"}), 500
=======
>>>>>>> 2c86fda (Initial commit on update1)

@app.route('/api/substructure_search', methods=['POST'])
def substructure_search():
    """Perform an exact substructure match search without saving results to the database."""
    try:
        # Get request parameters
        data = request.json
        query_smiles = data.get('query_smiles')
        query_id = data.get('query_id')
        atoms = data.get('atoms', [])
        bonds = data.get('bonds', [])
        filename = data.get('filename', '')

        print(f"\n===== Substructure Search Started =====")
        print(f"Query ID: {query_id}")
        print(f"Selected atoms: {atoms}")
        print(f"Selected bonds: {bonds}")

        if not query_smiles:
            return jsonify({"success": False, "error": "Missing query SMILES"}), 400

        if not atoms or len(atoms) == 0:
            return jsonify({"success": False, "error": "No substructure (atoms) selected"}), 400

        # Define data directory
        data_dir = os.path.join(os.path.dirname(__file__), 'data')
        csv_path = os.path.join(data_dir, filename)

        # Check if highlights already exist in the database
        highlights_result = substructure_annotate.get_molecule_highlights(query_id, filename)

        fragment_smarts = None
        fragment_smiles = None
        db_result = False

        if highlights_result.get('success') and 'highlights' in highlights_result:
            # Try to find a highlight that matches the selected atoms
            for highlight in highlights_result['highlights']:
                highlight_atoms = highlight.get('atoms', [])
                if sorted(highlight_atoms) == sorted(atoms):
                    fragment_smarts = highlight.get('fragment_smarts')
                    fragment_smiles = highlight.get('fragment_smiles')
                    db_result = True
                    print(f"SMARTS retrieved from database: {fragment_smarts}")
                    break

        # If not found in the database, generate a new SMARTS pattern
        if not fragment_smarts:
            print("No matching substructure found in database. Generating new SMARTS pattern.")
            fragment_smiles, fragment_smarts = get_smarts_smiles(query_smiles, atoms, bonds)

            if not fragment_smarts:
                return jsonify({"success": False, "error": "Failed to generate SMARTS pattern"}), 400

        # Check if CSV file exists
        if not os.path.exists(csv_path):
            return jsonify({"success": False, "error": f"File not found: {filename}"}), 404

        # Create substructure pattern
        pattern = Chem.MolFromSmarts(fragment_smarts)
        if not pattern:
            print(f"Invalid SMARTS '{fragment_smarts}', attempting to fix...")
            fixed_smarts = fix_smarts_pattern(fragment_smarts)
            pattern = Chem.MolFromSmarts(fixed_smarts)
            if pattern:
                fragment_smarts = fixed_smarts
                print(f"Using fixed SMARTS: {fragment_smarts}")
            else:
                return jsonify({"success": False, "error": "Failed to create substructure pattern"}), 400

        # Read CSV file
        try:
            df = pd.read_csv(csv_path)
        except Exception as e:
            return jsonify({"success": False, "error": f"Failed to read CSV: {str(e)}"}), 500

        # Detect SMILES column
        smiles_column = None
        possible_smiles_columns = ['SMILES', 'smiles', 'Smiles', 'smile', 'SMILE']
        for col in possible_smiles_columns:
            if col in df.columns:
                smiles_column = col
                break

        if not smiles_column:
            return jsonify({"success": False, "error": "No SMILES column found in CSV"}), 400

        # Detect ID column
        id_column = None
        possible_id_columns = ['ID', 'id', 'cmpd_id', 'Compound_ID', 'compound_id', 'molecule_id']
        for col in possible_id_columns:
            if col in df.columns:
                id_column = col
                break

        if not id_column:
            id_column = df.columns[0]  # Use the first column as fallback

        # Perform substructure search
        matches = []

        for _, row in df.iterrows():
            smiles = row[smiles_column]
            try:
                mol = Chem.MolFromSmiles(smiles)

                if mol and mol.HasSubstructMatch(pattern, useChirality=True):
                    # Get matching atom indices
                    all_matches = mol.GetSubstructMatches(pattern, useChirality=True)
                    if all_matches:
                        match = all_matches[0]

                        # Get bonds connecting these atoms
                        match_bonds = []
                        for bond in mol.GetBonds():
                            begin_atom = bond.GetBeginAtomIdx()
                            end_atom = bond.GetEndAtomIdx()
                            if begin_atom in match and end_atom in match:
                                match_bonds.append(bond.GetIdx())

                        result = {
                            "id": str(row[id_column]),
                            "smiles": smiles,
                            "fragment_smarts": fragment_smarts,
                            "fragment_smiles": fragment_smiles,
                            "match_atoms": list(match),
                            "match_bonds": match_bonds
                        }

                        # Add additional columns
                        for col in df.columns:
                            if col not in [id_column, smiles_column]:
                                result[col] = row[col]

                        matches.append(result)
            except Exception as e:
                print(f"Error processing molecule {row.get(id_column, 'unknown')}: {str(e)}")
                continue

        # Saving to database has been removed

        print(f"Found {len(matches)} matching molecules")
        print(f"===== Substructure Search Completed =====\n")

        return jsonify({
            "success": True,
            "results": matches,
            "fragment_smarts": fragment_smarts,
            "fragment_smiles": fragment_smiles,
            "query_id": query_id,
            "selected_atoms": atoms,
            "selected_bonds": bonds,
            "from_database": db_result,
            "matches_count": len(matches)
        })

    except Exception as e:
        print(f"Substructure search error: {str(e)}")
        return jsonify({"success": False, "error": f"Substructure search failed: {str(e)}"}), 500


@app.route('/api/get_molecule_svg', methods=['POST'])
def get_molecule_svg():
    """Generate a molecule SVG with precise substructure highlights."""
    try:
        data = request.json
        smiles = data.get('smiles')
        fragment_smarts = data.get('fragment_smarts')

        print(f"\n===== Generating SVG Started =====")
        print(f"SMILES: {smiles}")
        print(f"Substructure SMARTS: {fragment_smarts}")

        if not smiles:
            return jsonify({"success": False, "error": "SMILES not provided"}), 400

        # Create molecule object
        mol = Chem.MolFromSmiles(smiles)
        if not mol:
            return jsonify({"success": False, "error": "Failed to parse SMILES"}), 400

        # Generate 2D coordinates
        mol = Chem.AddHs(mol)
        AllChem.Compute2DCoords(mol)
        mol = Chem.RemoveHs(mol)

        # Initialize highlight sets
        highlight_atoms = {}
        highlight_bonds = {}

        if fragment_smarts:
            try:
                pattern = Chem.MolFromSmarts(fragment_smarts)
                if not pattern:
                    print(f"Invalid SMARTS pattern: {fragment_smarts}")
                    return jsonify({
                        "success": True,
                        "svg": generate_svg_without_highlights(mol),
                        "highlighted_atoms": [],
                        "highlighted_bonds": []
                    })

                # Find matches
                matches = mol.GetSubstructMatches(pattern, useChirality=True)
                print(f"Found {len(matches)} matches")

                if matches and len(matches) > 0:
                    # Use the first match
                    match = matches[0]
                    print(f"Using match: {match}")

                    # Highlight atoms in red
                    for atom_idx in match:
                        highlight_atoms[atom_idx] = (1, 0, 0)  # RGB red

                    # Highlight bonds in orange
                    for bond in mol.GetBonds():
                        begin_atom = bond.GetBeginAtomIdx()
                        end_atom = bond.GetEndAtomIdx()
                        if begin_atom in match and end_atom in match:
                            highlight_bonds[bond.GetIdx()] = (1, 0.5, 0)  # RGB orange

                    print(f"Highlighting {len(highlight_atoms)} atoms: {list(highlight_atoms.keys())}")
                    print(f"Highlighting {len(highlight_bonds)} bonds: {list(highlight_bonds.keys())}")
                else:
                    print("No matches found")
            except Exception as e:
                print(f"SMARTS matching error: {str(e)}")

        # Generate SVG
        from rdkit.Chem.Draw import rdMolDraw2D
        drawer = rdMolDraw2D.MolDraw2DSVG(500, 400)

        # Set drawing options
        drawer.drawOptions().addStereoAnnotation = True
        drawer.drawOptions().addAtomIndices = False
        drawer.drawOptions().useBWAtomPalette = False
        drawer.drawOptions().highlightRadius = 0.5

        # Draw molecule
        drawer.DrawMolecule(mol, highlightAtoms=highlight_atoms, highlightBonds=highlight_bonds)
        drawer.FinishDrawing()
        svg = drawer.GetDrawingText()

        print(f"===== Generating SVG Completed =====\n")

        return jsonify({
            "success": True,
            "svg": svg,
            "highlighted_atoms": list(highlight_atoms.keys()),
            "highlighted_bonds": list(highlight_bonds.keys())
        })

    except Exception as e:
        print(f"Error generating molecule SVG: {str(e)}")
        return jsonify({"success": False, "error": f"Failed to generate molecule SVG: {str(e)}"}), 500


def fix_smarts_pattern(smarts):
    """Fix a SMARTS pattern to make it more reliable."""
    if not smarts:
        return "[#6]"  # Match any carbon atom if empty

    if '.' in smarts:
        if '[#9]' in smarts or 'F' in smarts:
            return "c1ccccc1[F]"  # fluorobenzene
        if '[#17]' in smarts or 'Cl' in smarts:
            return "c1ccccc1[Cl]"  # chlorobenzene
        if '[#8]' in smarts and '=' in smarts:
            return "C(=O)O"  # carboxylic acid

        # General fix: connect disconnected fragments
        parts = smarts.split('.')
        connected = '-'.join(parts)
        return connected

    import re
    if len(smarts) > 200 or smarts.count('[') > 10:
        simplified = re.sub(r':[0-9]+', '', smarts)
        return simplified

    return smarts


def generate_svg_without_highlights(mol):
    """Generate a molecule SVG without highlights."""
    from rdkit.Chem.Draw import rdMolDraw2D
    drawer = rdMolDraw2D.MolDraw2DSVG(500, 400)
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    return drawer.GetDrawingText()


@app.route('/api/convert_to_3d', methods=['POST'])
def convert_to_3d():
    try:
        data = request.get_json()

        if not data or 'smiles' not in data:
            return jsonify({'success': False, 'error': 'SMILES data not provided'})

        smiles = data['smiles']

        # Create molecule from SMILES
        mol = Chem.MolFromSmiles(smiles)
        if not mol:
            return jsonify({'success': False, 'error': 'Invalid SMILES structure'})

        # Add hydrogens
        mol = Chem.AddHs(mol)

        # Generate 3D coordinates using ETKDG
        AllChem.EmbedMolecule(mol, AllChem.ETKDG())

        # Optimize geometry using MMFF
        AllChem.MMFFOptimizeMolecule(mol)

        # Convert to molblock
        molblock = Chem.MolToMolBlock(mol)

        return jsonify({
            'success': True,
            'molblock': molblock
        })

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': f'Error occurred during conversion: {str(e)}'
        })

if __name__ == '__main__':
    app.run(debug=True, port=5001)