# app.py  ─────────────────────────────────────────────────────────────────────
import json, os, sqlite3, traceback
from datetime import datetime

import seaborn as sns
import base64

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from rdkit import Chem
from rdkit.Chem import AllChem
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
from flask import send_file

from flask_bcrypt        import Bcrypt
from flask_jwt_extended  import JWTManager, jwt_required
from auth                import auth_bp                      

# ── Internal project modules ────────────────────────────────────────────────
from molecule_annotate   import get_compounds, get_smarts_smiles, auto_complete_ring_bonds
from file_upload         import upload_file
from molecule_convert    import convert_molecule
from molecule_visualize  import MoleculeVisualizer
from molecule_similarity import similarity_search
import substructure_annotate
from substructure_annotate import init_db, DB_PATH
from admet_predict import predict_admet
from admet_plot import make_density_plot

# ────────────────────────────────────────────────────────────────────────────
class NumpyEncoder(json.JSONEncoder):
    """
    Custom JSON encoder for handling numpy data types.
    """
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
    JWT_ACCESS_TOKEN_EXPIRES     = 60 * 60 * 24 * 7  # 7 days
)


CORS(app,
     supports_credentials=True,
     resources={
         r"/api/.*": {"origins": "*"},
         r"/data/.*": {"origins": "*"},
         r"/get_molecule_image/.*": {"origins": "*"}
     })



# crypto / JWT
bcrypt = Bcrypt(app)
jwt    = JWTManager(app)

app.register_blueprint(auth_bp, url_prefix="/api")

visualizer    = MoleculeVisualizer(data_dir="data")
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "data")

# ════════════════════════════════  ROUTES  ══════════════════════════════════
# ----------------------------------------------------------------------------
# File upload & static download 
# ----------------------------------------------------------------------------
@app.route("/api/upload", methods=["POST"])
# @jwt_required()
def handle_upload():
    """
    Handle file upload via POST request.
    Returns:
        Response: The response from the upload_file function.
    """
    return upload_file()

@app.route("/data/<filename>")
def serve_file(filename):
    """
    Serve a static file from the upload folder.
    Args:
        filename (str): The name of the file to serve.
    Returns:
        Response: The file as a Flask response.
    """
    return send_from_directory(UPLOAD_FOLDER, filename)

# ----------------------------------------------------------------------------
# list sub‑structures  
# ----------------------------------------------------------------------------
@app.route("/api/substructures", methods=["GET"])
# @jwt_required()
def list_substructures():
    """
    List all substructures for a given molecule_id (if provided).
    Returns:
        Response: JSON response with substructure data or error message.
    """
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
# Similarity search  
# ----------------------------------------------------------------------------
@app.route("/api/similarity_search", methods=["POST"])
def handle_similarity_search():
    """
    Perform a similarity search for a given query SMILES and dataset.
    Returns:
        Response: JSON response with search results or error message.
    """
    try:
        # get data from post
        request_data = request.get_json()

        # get params from request
        query_smiles = request_data.get('query_smiles')
        similarity_method = request_data.get('similarity_metric')
        dataset_id = request_data.get('dataset_id')

        # validate params
        if not query_smiles:
            return jsonify({
                "success": False,
                "error": "Missing required parameter: query_smiles"
            }), 400

        if not dataset_id:
            return jsonify({
                "success": False,
                "error": "Missing required parameter: dataset_id"
            }), 400

        # similarity search
        results_df = similarity_search(query_smiles, dataset_id, similarity_method)
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

# ----------------------------------------------------------------------------
# Save highlighted fragment + annotation
# ----------------------------------------------------------------------------
@app.route("/api/annotate_molecule", methods=["POST"])
# @jwt_required()
def handle_annotate_molecule():
    """
    Save a highlighted fragment and its annotation for a molecule.
    Returns:
        Response: JSON response indicating success or failure.
    """
    try:
        request_data = request.get_json()
        print(f"Received data: {json.dumps(request_data, cls=NumpyEncoder)}")

        # Extract parameters
        mol_smiles = request_data.get('smiles')
        molfile = request_data.get('molfile')
        atom_indices = request_data.get('atoms', [])
        bond_indices = request_data.get('bonds', [])
        filename = request_data.get('filename')
        id = request_data.get('id')
        annotation_text = request_data.get('annotation', '')  # Get annotation text
        dataset_id = request_data.get('dataset_id')

        # Validate required parameters
        if not molfile or not atom_indices:
            print("Error: Missing required parameters")
            return jsonify({
                "success": False,
                "message": "Missing required data: molfile or atom indices"
            }), 400

        try:
            # Restore molecule object from molfile
            mol = Chem.MolFromMolBlock(molfile)
            if mol is None:
                print("Error: Invalid molfile")
                return jsonify({
                    "success": False,
                    "message": "Invalid molfile"
                }), 400

            # Auto-complete ring bonds
            bond_indices = auto_complete_ring_bonds(mol, atom_indices, bond_indices)

            # Generate fragment_smiles, fragment_smarts
            fragment_smiles, fragment_smarts = get_smarts_smiles(mol, atom_indices, bond_indices)

            # Save to database with annotation
            print("DEBUG: dataset_id received in save_substructure:", dataset_id)
            result = substructure_annotate.save_substructure(
                dataset_id,
                id,
                mol_smiles,
                atom_indices,
                bond_indices,
                fragment_smiles,
                fragment_smarts,
                annotation_text
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



@app.route("/api/convert_molecule",  methods=["POST"]) 
def handle_convert_molecule(): 
    """
    Convert a molecule using the convert_molecule function.
    Returns:
        Response: The response from convert_molecule.
    """
    return convert_molecule()
@app.route("/api/compounds",         methods=["GET"])       
def handle_get_compounds():    
    """
    Get compounds using the get_compounds function.
    Returns:
        Response: The response from get_compounds.
    """
    return get_compounds()
@app.route("/get_molecule_image/<cmpd_id>", methods=["GET"])
def handle_visualize(cmpd_id):
    """
    Visualize a molecule by its compound ID and filename.
    Args:
        cmpd_id (str): The compound ID.
    Returns:
        Response: JSON response with visualization data or error message.
    """
    try:
        filename = request.args.get("filename")
        if not filename:
            return jsonify(success=False, error="Missing filename"), 400
        return jsonify(visualizer.process_request(cmpd_id, filename))
    except Exception as e:
        return jsonify(success=False, error=str(e)), 500

@app.route("/api/get_molecule_highlights", methods=["GET"])
# @jwt_required()
def handle_get_molecule_highlights():
    """
    Retrieve all highlighted substructures for a specific molecule.
    Returns:
        Response: JSON response with highlight data or error message.
    """
    try:
        molecule_id = request.args.get('molecule_id') or request.args.get('id')
        dataset_id = request.args.get('dataset_id')

        if not molecule_id:
            return jsonify({
                "success": False,
                "message": "Missing required molecule ID parameter"
            }), 400

        # If molecule_id has a prefix, remove the prefix before querying
        if molecule_id.startswith('cmpd_') or molecule_id.startswith('Compound-'):
            molecule_id = molecule_id.replace('cmpd_', '').replace('Compound-', '')

        # Call the function from the substructure_annotate module
        result = substructure_annotate.get_molecule_highlights(molecule_id, dataset_id)

        print("DEBUG: molecule_id:", molecule_id)
        print("DEBUG: dataset_id:", dataset_id)

        return jsonify(result)
    except Exception as e:
        print(f"Error getting molecule highlights: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

def get_fragment_mol(mol, atoms, bonds):
    """
    Create a fragment molecule from the given atoms and bonds.
    Args:
        mol (rdkit.Chem.Mol): The original molecule.
        atoms (list): List of atom indices.
        bonds (list): List of bond indices.
    Returns:
        rdkit.Chem.Mol: The fragment molecule.
    """
    from rdkit import Chem
    em = Chem.EditableMol(Chem.Mol())
    atom_map = {}
    for idx in atoms:
        a = mol.GetAtomWithIdx(idx)
        new_idx = em.AddAtom(Chem.Atom(a.GetAtomicNum()))
        atom_map[idx] = new_idx
    for bidx in bonds:
        b = mol.GetBondWithIdx(bidx)
        begin = atom_map.get(b.GetBeginAtomIdx())
        end = atom_map.get(b.GetEndAtomIdx())
        if begin is not None and end is not None:
            em.AddBond(begin, end, b.GetBondType())
    frag = em.GetMol()
    Chem.SanitizeMol(frag)
    return frag

#########################################

@app.route('/api/match_smarts', methods=['POST'])
def handle_match_smarts():
    """
    Match a SMARTS pattern against a molecule and return the matched atom indices.
    Returns:
        Response: JSON response with match results or error message.
    """
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
    """
    Match multiple SMARTS patterns against a molecule.
    Returns:
        Response: JSON response with match results or error message.
    """
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


@app.route('/api/substructure_search', methods=['POST'])
def substructure_search():
    """
    Perform an exact substructure match search without saving results to the database.
    Returns:
        Response: JSON response with search results or error message.
    """
    try:
        # Get request parameters
        data = request.json
        query_smiles = data.get('query_smiles')
        query_id = data.get('query_id')
        atoms = data.get('atoms', [])
        bonds = data.get('bonds', [])
        filename = data.get('filename', '')
        molfile = data.get('molfile')
        print(f"\n===== Substructure Search Started =====")
        print(f"Query ID: {query_id}")
        print(f"Selected atoms: {atoms}")
        print(f"Selected bonds: {bonds}")

        if not query_smiles:
            return jsonify({"success": False, "error": "Missing query SMILES"}), 400
        if not molfile:
            return jsonify({"success": False, "error": "Missing molfile"}), 400
        if not atoms or len(atoms) == 0:
            return jsonify({"success": False, "error": "No substructure (atoms) selected"}), 400

        # Define data directory
        data_dir = os.path.join(os.path.dirname(__file__), 'data')
        csv_path = os.path.join(data_dir, filename)

        # Create molecule object from molfile
        mol = Chem.MolFromMolBlock(molfile)
        if mol is None:
            return jsonify({"success": False, "error": "Invalid molfile"}), 400

        # If bonds not provided or empty, auto-complete them
        if not bonds or len(bonds) == 0:
            print("No bonds provided, auto-completing bonds...")
            bonds = auto_complete_ring_bonds(mol, atoms, bonds)
            print(f"Auto-completed bonds: {bonds}")

        # Create fragment molecule
        fragment_mol = get_fragment_mol(mol, atoms, bonds)
        if fragment_mol is None:
            return jsonify({"success": False, "error": "Failed to create fragment molecule"}), 400

        # Generate SMARTS and SMILES
        fragment_smiles, fragment_smarts = get_smarts_smiles(mol, atoms, bonds)
        if not fragment_smarts:
            return jsonify({"success": False, "error": "Failed to generate SMARTS pattern"}), 400

        print(f"Generated SMARTS: {fragment_smarts}")
        print(f"Generated SMILES: {fragment_smiles}")

        # Create substructure pattern from SMARTS
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

        # Check if CSV file exists
        if not os.path.exists(csv_path):
            return jsonify({"success": False, "error": f"File not found: {filename}"}), 404

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
        total_molecules = len(df)
        processed_molecules = 0
        matched_molecules = 0

        for _, row in df.iterrows():
            processed_molecules += 1
            if processed_molecules % 100 == 0:
                print(
                    f"Processed {processed_molecules}/{total_molecules} molecules, found {matched_molecules} matches so far")

            smiles = row[smiles_column]
            try:
                # Create target molecule
                target_mol = Chem.MolFromSmiles(smiles)
                if not target_mol:
                    continue

                # Prefer using SMARTS pattern for matching
                if target_mol.HasSubstructMatch(pattern, useChirality=True):
                    # Find all matches
                    all_matches = target_mol.GetSubstructMatches(pattern, useChirality=True)

                    # Also verify using fragment molecule for better integrity
                    if target_mol.HasSubstructMatch(fragment_mol, useChirality=True):
                        for match in all_matches:
                            # Record matched atoms
                            match_atoms = list(match)

                            # Record matched bonds
                            match_bonds = []
                            match_set = set(match)

                            # Strictly match bonds
                            for bond in target_mol.GetBonds():
                                begin_atom = bond.GetBeginAtomIdx()
                                end_atom = bond.GetEndAtomIdx()
                                # Match bond only if both atoms are in the matched set
                                if begin_atom in match_set and end_atom in match_set:
                                    match_bonds.append(bond.GetIdx())

                            # Validate bond count
                            expected_bonds_count = len(bonds)
                            actual_bonds_count = len(match_bonds)

                            if actual_bonds_count < expected_bonds_count:
                                print(
                                    f"Warning: Found fewer bonds than expected. Expected: {expected_bonds_count}, Found: {actual_bonds_count}")
                                continue

                            result = {
                                "id": str(row[id_column]),
                                "smiles": smiles,
                                "fragment_smarts": fragment_smarts,
                                "fragment_smiles": fragment_smiles,
                                "match_atoms": match_atoms,
                                "match_bonds": match_bonds
                            }

                            # Add other column values
                            for col in df.columns:
                                if col not in [id_column, smiles_column]:
                                    result[col] = row[col]

                            matches.append(result)
                            matched_molecules += 1
                            break  # Only take the first match
            except Exception as e:
                print(f"Error processing molecule {row.get(id_column, 'unknown')}: {str(e)}")
                continue

        print(f"Processed all {total_molecules} molecules")
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
            "from_database": False,  # Always use newly generated matches
            "matches_count": len(matches)
        })

    except Exception as e:
        print(f"Substructure search error: {str(e)}")
        return jsonify({"success": False, "error": f"Substructure search failed: {str(e)}"}), 500


@app.route('/api/get_molecule_svg', methods=['POST'])
def get_molecule_svg():
    """
    Generate a molecule SVG with precise substructure highlights.
    Returns:
        Response: JSON response with SVG data or error message.
    """
    try:
        data = request.json
        smiles = data.get('smiles')
        fragment_smarts = data.get('fragment_smarts')
        input_highlight_bonds = data.get('highlight_bonds', [])
        match_atoms = data.get('match_atoms', [])  # Matched atoms directly from request
        match_bonds = data.get('match_bonds', [])  # Matched bonds directly from request

        # Ensure all indices are integers
        match_atoms = [int(i) for i in match_atoms] if match_atoms else []
        match_bonds = [int(i) for i in match_bonds] if match_bonds else []
        input_highlight_bonds = [int(i) for i in input_highlight_bonds] if input_highlight_bonds else []

        print(f"\n===== Generating SVG Started =====")
        print(f"SMILES: {smiles}")
        print(f"Substructure SMARTS: {fragment_smarts}")
        print(f"Match atoms: {match_atoms}")
        print(f"Match bonds: {match_bonds}")
        print(f"Highlight bonds: {input_highlight_bonds}")

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

        # Debug: print molecule info
        print(f"Number of atoms: {mol.GetNumAtoms()}")
        print(f"Number of bonds: {mol.GetNumBonds()}")

        # Print atom details
        for i, atom in enumerate(mol.GetAtoms()):
            print(f"Atom {i}: {atom.GetSymbol()} (connected to {atom.GetDegree()} atoms)")

        # Print bond details
        for i, bond in enumerate(mol.GetBonds()):
            begin_idx = bond.GetBeginAtomIdx()
            end_idx = bond.GetEndAtomIdx()
            begin_symbol = mol.GetAtomWithIdx(begin_idx).GetSymbol()
            end_symbol = mol.GetAtomWithIdx(end_idx).GetSymbol()
            print(f"Bond {i}: {begin_idx}({begin_symbol})-{end_idx}({end_symbol}) {bond.GetBondType()}")

        # Initialize highlight dictionaries
        highlight_atoms_dict = {}
        highlight_bonds_dict = {}

        # Handle matched atoms and bonds
        if match_atoms and len(match_atoms) > 0:
            print(f"Using provided matched atoms: {match_atoms}")

            # Validate and highlight atoms
            for atom_idx in match_atoms:
                if 0 <= atom_idx < mol.GetNumAtoms():
                    atom_symbol = mol.GetAtomWithIdx(atom_idx).GetSymbol()
                    print(f"Highlighting atom {atom_idx} ({atom_symbol})")
                    highlight_atoms_dict[atom_idx] = (1, 0, 0)  # Red RGB
                else:
                    print(f"Warning: Atom index {atom_idx} out of range [0, {mol.GetNumAtoms() - 1}]")

            # Highlight matched bonds
            if match_bonds and len(match_bonds) > 0:
                print(f"Using provided matched bonds: {match_bonds}")
                for bond_idx in match_bonds:
                    if 0 <= bond_idx < mol.GetNumBonds():
                        bond = mol.GetBondWithIdx(bond_idx)
                        begin_idx = bond.GetBeginAtomIdx()
                        end_idx = bond.GetEndAtomIdx()
                        begin_symbol = mol.GetAtomWithIdx(begin_idx).GetSymbol()
                        end_symbol = mol.GetAtomWithIdx(end_idx).GetSymbol()
                        print(f"Highlighting bond {bond_idx}: {begin_idx}({begin_symbol})-{end_idx}({end_symbol})")
                        highlight_bonds_dict[bond_idx] = (1, 0.5, 0)  # Orange RGB
                    else:
                        print(f"Warning: Bond index {bond_idx} out of range [0, {mol.GetNumBonds() - 1}]")

            # If no valid match bonds were provided, infer from atoms
            if len(highlight_bonds_dict) == 0:
                print("Inferring match bonds from atom set...")
                atom_set = set(match_atoms)
                for i, bond in enumerate(mol.GetBonds()):
                    begin_atom = bond.GetBeginAtomIdx()
                    end_atom = bond.GetEndAtomIdx()
                    if begin_atom in atom_set and end_atom in atom_set:
                        print(f"Auto-added bond {i}: {begin_atom}-{end_atom}")
                        highlight_bonds_dict[i] = (1, 0.5, 0)  # Orange RGB

        # Handle input highlight bonds (backward compatibility)
        for bond_idx in input_highlight_bonds:
            if 0 <= bond_idx < mol.GetNumBonds():
                highlight_bonds_dict[bond_idx] = (1, 0.5, 0)
            else:
                print(f"Warning: Input bond index {bond_idx} out of range [0, {mol.GetNumBonds() - 1}]")

        print(f"Final highlights: {len(highlight_atoms_dict)} atoms, {len(highlight_bonds_dict)} bonds")
        print(f"Highlighted atoms: {list(highlight_atoms_dict.keys())}")
        print(f"Highlighted bonds: {list(highlight_bonds_dict.keys())}")

        # Optional verification: check if the structure is a complete ring
        if len(match_atoms) >= 3:
            is_cycle = True
            atom_set = set(match_atoms)
            for atom_idx in match_atoms:
                atom = mol.GetAtomWithIdx(atom_idx)
                connections = sum(1 for neighbor in atom.GetNeighbors() if neighbor.GetIdx() in atom_set)
                if connections < 1:
                    is_cycle = False
                    break

            if is_cycle:
                print("Match forms a ring structure")
            else:
                print("Warning: Match does not form a complete ring")

            # If it's a 5-membered ring, inspect atom types
            if len(match_atoms) == 5:
                atom_symbols = [mol.GetAtomWithIdx(idx).GetSymbol() for idx in match_atoms]
                print(f"5-membered ring atom types: {atom_symbols}")

                # If nitrogen is present, locate its index
                if 'N' in atom_symbols:
                    n_idx = match_atoms[atom_symbols.index('N')]
                    print(f"Nitrogen atom at index {n_idx}")

        # Generate SVG (show atom indices for debugging)
        from rdkit.Chem.Draw import rdMolDraw2D
        drawer = rdMolDraw2D.MolDraw2DSVG(500, 400)
        drawer.drawOptions().addStereoAnnotation = True
        drawer.drawOptions().addAtomIndices = True
        drawer.drawOptions().useBWAtomPalette = False
        drawer.drawOptions().highlightRadius = 0.5

        # Draw the molecule with highlights
        drawer.DrawMolecule(
            mol,
            highlightAtoms=list(highlight_atoms_dict.keys()),
            highlightAtomColors=highlight_atoms_dict,
            highlightBonds=list(highlight_bonds_dict.keys()),
            highlightBondColors=highlight_bonds_dict
        )
        drawer.FinishDrawing()
        svg = drawer.GetDrawingText()

        return jsonify({
            "success": True,
            "svg": svg,
            "highlighted_atoms": list(highlight_atoms_dict.keys()),
            "highlighted_bonds": list(highlight_bonds_dict.keys())
        })

    except Exception as e:
        print(f"Error while generating molecule SVG: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Failed to generate molecule SVG: {str(e)}"}), 500

def fix_smarts_pattern(smarts):
    """
    Fix a SMARTS pattern to make it more reliable.
    Args:
        smarts (str): The SMARTS pattern to fix.
    Returns:
        str: The fixed SMARTS pattern.
    """
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



@app.route('/api/optimize_structure', methods=['POST'])
def optimize_structure():
    """
    Optimize the 3D structure of a molecule using either SMILES or molfile input.
    Returns:
        Response: JSON response with optimized structure or error message.
    """
    try:
        data = request.json
        molfile = data.get('molfile')
        smiles = data.get('smiles', '')
        use_smiles = data.get('use_smiles', False)
        molecule_id = data.get('molecule_id')

        # Validate required parameters
        if not molecule_id:
            return jsonify({'success': False, 'error': 'Missing required parameter: molecule_id'}), 400

        if use_smiles and not smiles:
            return jsonify({'success': False, 'error': 'SMILES method selected but no SMILES provided'}), 400

        if not use_smiles and not molfile:
            return jsonify({'success': False, 'error': 'SDF method selected but no molfile provided'}), 400

        mol = None

        print(f"Processing structure for molecule ID: {molecule_id}")
        print(f"Method: {'SMILES' if use_smiles else 'SDF/Molfile'}")

        # Determine which method to use for 3D structure generation
        if use_smiles and smiles:
            # Use SMILES to generate 3D structure
            mol = Chem.MolFromSmiles(smiles)
            if mol:
                # Add hydrogen atoms
                mol = Chem.AddHs(mol)
                # Generate 3D coordinates
                result = AllChem.EmbedMolecule(mol, AllChem.ETKDG())
                if result == -1:
                    return jsonify({'success': False, 'error': 'Failed to generate 3D coordinates from SMILES'}), 400

                # For SMILES-generated structures, we don't save to database,
                # but still return the optimized structure to display
        else:
            # Use SDF (molfile) input
            # First check if the molfile already contains 3D coordinates
            mol = Chem.MolFromMolBlock(molfile)

            if mol:
                # Safely check if molecule has 3D coordinates
                has_3d = False
                try:
                    # Get the conformer
                    conf = mol.GetConformer()

                    # Check if all Z coordinates are ~0 (usually indicates 2D structure)
                    z_coords = [conf.GetAtomPosition(i).z for i in range(mol.GetNumAtoms())]
                    all_z_zero = all(abs(z) < 0.001 for z in z_coords)

                    # If not all Z are zero, it's likely a 3D structure
                    has_3d = not all_z_zero

                    print(f"Molecule has {mol.GetNumAtoms()} atoms, all Z=0: {all_z_zero}, determined as 3D: {has_3d}")
                except Exception as e:
                    print(f"Error checking 3D status: {str(e)}")
                    # Assume it's not 3D if checking fails
                    has_3d = False

                if not has_3d:
                    # If only 2D coordinates, generate 3D
                    mol = Chem.AddHs(mol)
                    result = AllChem.EmbedMolecule(mol, AllChem.ETKDG())
                    if result == -1:
                        return jsonify({
                            'success': False,
                            'error': 'Failed to generate 3D coordinates from molfile'
                        }), 400

        if mol is None:
            return jsonify({'success': False, 'error': 'Failed to parse molecular structure'}), 400

        # Perform energy minimization
        try:
            result = AllChem.MMFFOptimizeMolecule(mol)
            if result == -1:
                print("Warning: MMFF optimization failed, continuing with unoptimized structure")
        except Exception as e:
            print(f"Warning: MMFF optimization error: {str(e)}, continuing with unoptimized structure")

        # Convert optimized molecule to SDF format
        optimized_sdf = Chem.MolToMolBlock(mol)

        # Update SMILES if not already provided
        if not smiles and mol:
            mol_no_h = Chem.RemoveHs(mol)  # Remove Hs for cleaner SMILES
            smiles = Chem.MolToSmiles(mol_no_h)

        # Save to database only if using molfile (not SMILES)
        db_saved = False
        if not use_smiles:
            from substructure_annotate import save_molecule_structure

            save_result = save_molecule_structure(
                molecule_id=molecule_id,
                sdf_content=optimized_sdf,
                smiles=smiles
            )

            if not save_result.get('success'):
                print(f"Warning: Failed to save structure to database: {save_result.get('error')}")
                traceback_info = save_result.get('traceback', 'No traceback available')
                return jsonify({
                    'success': True,
                    'optimized_sdf': optimized_sdf,
                    'db_saved': False,
                    'db_error': save_result.get('error'),
                    'db_traceback': traceback_info
                })
            else:
                db_saved = True
                structure_id = save_result.get('structure_id')

        response_data = {
            'success': True,
            'optimized_sdf': optimized_sdf,
            'db_saved': db_saved
        }

        if db_saved:
            response_data['structure_id'] = structure_id

        return jsonify(response_data)

    except Exception as e:
        import traceback
        print(f"Error in optimize_structure: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500
@app.route('/api/get_molecule_structure/<molecule_id>', methods=['GET'])
def get_molecule_structure_api(molecule_id):
    """
    API endpoint: Retrieve molecule structure by molecule_id.
    Args:
        molecule_id (str): The molecule ID.
    Returns:
        Response: JSON response with structure data or error message.
    """
    try:
        # Import the function to retrieve structure from the database
        from substructure_annotate import get_molecule_structure

        print(f"API: Looking up structure for molecule_id: {molecule_id}")

        # Fetch structure data
        result = get_molecule_structure(molecule_id)

        if not result.get('success'):
            print(f"API: Structure not found for molecule_id: {molecule_id}")
            return jsonify({
                'success': False,
                'message': f"No structure found for molecule {molecule_id}"
            }), 404

        print(f"API: Found structure for molecule_id: {molecule_id}")
        return jsonify(result)

    except Exception as e:
        import traceback
        print(f"API Error in get_molecule_structure: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f"Error retrieving structure: {str(e)}"
        }), 500

@app.route('/api/compound_info')
def get_compound_info():
    """
    Retrieve compound information by molecule_id and filename.
    Returns:
        Response: JSON response with compound info or error message.
    """
    molecule_id = request.args.get('molecule_id')
    filename = request.args.get('filename')
    DB_PATH = 'data/molecular_annotate.db'  # Adjust the path as needed
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT dataset_id, molecule_id, smiles, property FROM compound WHERE molecule_id=? AND dataset_id=(SELECT dataset_id FROM dataset WHERE file_name=?)",
        (molecule_id, filename)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        print("DEBUG: molecule_id:", molecule_id)
        print("DEBUG: filename:", filename)
        print("DEBUG: SQL result:", row)
        return jsonify({
            'dataset_id': row[0],
            'molecule_id': row[1],
            'smiles': row[2],
            'property': row[3]
        })
    else:
        return jsonify({'error': 'Not found'}), 404

@app.route('/api/predict_admet', methods=['POST'])
def handle_predict_admet():
    """
    Predict ADMET properties for a list of SMILES strings.
    Returns:
        Response: JSON response with prediction results or error message.
    """
    try:
        data = request.get_json()
        smiles = data.get('smiles')

        if not smiles:
            return jsonify({'success': False, 'message': 'SMILES is required'}), 400

        if isinstance(smiles, str):
            smiles = [smiles]

        predictions_df = predict_admet(smiles)
        predictions = predictions_df.to_dict(orient='records')

        return jsonify({'success': True, 'predictions': predictions}), 200

    except Exception as e:
        print(f"ADMET prediction failed: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500
    
@app.route('/api/admet_plot', methods=['POST'])
def handle_admet_plot():
    """
    Given JSON { smiles: [...], property: "<property_name>" },
    generate a density plot comparing DrugBank vs. all compounds distribution,
    and return it as image/png.
    """
    data = request.get_json(force=True)
    smiles_list   = data.get('smiles', [])
    property_name = data.get('property')
    
    print(f"Received request - SMILES count: {len(smiles_list)}, Property: {property_name}")
    
    if not smiles_list or not property_name:
        return jsonify({"success": False, "message": "smiles & property must"}), 400

    try:
        preds_df = predict_admet(smiles_list)
        print(f"Predictions shape: {preds_df.shape}")
        print(f"Available properties: {preds_df.columns.tolist()}")
        print(f"Property {property_name} values:\n{preds_df[property_name].describe()}")
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({"success": False, "message": f"error: {e}"}), 500

    import admet_ai
    pkg_dir = os.path.dirname(admet_ai.__file__)
    drugbank_csv = None
    for root, _, files in os.walk(pkg_dir):
        for fn in files:
            if 'drugbank' in fn.lower() and fn.endswith('.csv'):
                drugbank_csv = os.path.join(root, fn)
                break
        if drugbank_csv:
            break

    if drugbank_csv:
        drugbank_df = pd.read_csv(drugbank_csv)
        print(f"DrugBank data shape: {drugbank_df.shape}")
        print(f"DrugBank properties: {drugbank_df.columns.tolist()}")
    else:
        drugbank_df = pd.DataFrame()
        print("No DrugBank data found")

    # Create figure
    fig, ax = plt.subplots(figsize=(10, 6))

    # Plot DrugBank distribution
    if property_name in drugbank_df.columns and drugbank_df[property_name].dropna().shape[0] >= 2:
        print(f"Plotting DrugBank distribution for {property_name}")
        sns.kdeplot(
            drugbank_df[property_name].dropna(),
            ax=ax,
            label='DrugBank',
            color='gray',
            fill=True,
            alpha=0.3,
            bw_method=0.3
        )

    # Plot your compounds distribution
    if property_name in preds_df.columns and not preds_df[property_name].isna().all():
        print(f"Plotting compounds distribution for {property_name}")
        print(f"Number of non-null values: {preds_df[property_name].count()}")
        sns.kdeplot(
            preds_df[property_name].dropna(),
            ax=ax,
            label='Your Compounds',
            color='blue',
            fill=True,
            alpha=0.3,
            bw_method=0.3
        )
        
        # Add individual points
        sns.rugplot(
            preds_df[property_name].dropna(),
            ax=ax,
            color='blue',
            alpha=0.5,
            height=0.05
        )
    else:
        print(f"Warning: Property {property_name} not found in predictions or all values are null")
        return jsonify({"success": False, "message": f"Property {property_name} not in prediction results"}), 400

    # Customize plot
    ax.set_title(f'Distribution of {property_name.replace("_", " ")}')
    ax.set_xlabel(property_name.replace('_', ' '))
    ax.set_ylabel('Density')
    ax.legend()
    
    # Add statistics
    stats_text = f"Your Compounds:\n"
    stats_text += f"Mean: {preds_df[property_name].mean():.2f}\n"
    stats_text += f"Std: {preds_df[property_name].std():.2f}\n"
    stats_text += f"Min: {preds_df[property_name].min():.2f}\n"
    stats_text += f"Max: {preds_df[property_name].max():.2f}"
    
    plt.text(0.02, 0.98, stats_text,
             transform=ax.transAxes,
             verticalalignment='top',
             bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))

    fig.tight_layout()
    
    # Save and return
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=150)
    plt.close(fig)
    buf.seek(0)
    
    # Convert to base64
    image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return jsonify({
        "success": True,
        "plot": f"data:image/png;base64,{image_base64}"
    })
@app.route('/api/dataset_admet_plot', methods=['POST'])
@app.route('/api/dataset_admet_plot', methods=['POST'])
def handle_dataset_admet_plot():
    """
    Given JSON {
      filename: "<uploaded_csv_name>",
      property: "<property_name>",
      highlight_smiles: "<SMILES to mark>"    # optional
    },
    load the CSV, predict ADMET for all its SMILES,
    plot DrugBank vs. dataset distribution,
    and draw a red dashed line at the highlighted SMILES value.
    """
    try:
        data = request.get_json(force=True)
        filename         = data.get('filename')
        property_name    = data.get('property')
        highlight_smiles = data.get('highlight_smiles')

        # --- Validate inputs ---
        if not filename or not property_name:
            return jsonify({
                "success": False,
                "message": "filename & property are required"
            }), 400

        # --- Load the CSV from disk ---
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(file_path):
            return jsonify({
                "success": False,
                "message": f"File not found: {filename}"
            }), 404

        df = pd.read_csv(file_path)
        if 'SMILES' not in df.columns:
            return jsonify({
                "success": False,
                "message": "SMILES column not found in dataset"
            }), 400

        smiles_list = df['SMILES'].dropna().astype(str).tolist()
        if len(smiles_list) == 0:
            return jsonify({
                "success": False,
                "message": "No SMILES entries in dataset"
            }), 400

        # --- Predict ADMET for the entire dataset ---
        preds_df = predict_admet(smiles_list)

        # --- Load DrugBank data as before ---
        import admet_ai
        pkg_dir = os.path.dirname(admet_ai.__file__)
        drugbank_csv = None
        for root, _, files in os.walk(pkg_dir):
            for fn in files:
                if 'drugbank' in fn.lower() and fn.endswith('.csv'):
                    drugbank_csv = os.path.join(root, fn)
                    break
            if drugbank_csv:
                break

        if drugbank_csv:
            drugbank_df = pd.read_csv(drugbank_csv)
        else:
            drugbank_df = pd.DataFrame()

        # --- Plotting ---
        fig, ax = plt.subplots(figsize=(10, 6))

        # DrugBank KDE
        if property_name in drugbank_df.columns:
            vals = drugbank_df[property_name].dropna()
            if len(vals) >= 2:
                sns.kdeplot(vals, ax=ax,
                            label='DrugBank',
                            color='gray', fill=True, alpha=0.3,
                            bw_method=0.3)

        # Dataset KDE + rug
        if property_name in preds_df.columns:
            vals2 = preds_df[property_name].dropna()
            if len(vals2) >= 2:
                sns.kdeplot(vals2, ax=ax,
                            label='Your Compounds',
                            color='blue', fill=True, alpha=0.3,
                            bw_method=0.3)
                sns.rugplot(vals2, ax=ax,
                            color='blue', alpha=0.5, height=0.05)
            else:
                sns.rugplot(vals2, ax=ax,
                            color='blue', alpha=0.5, height=0.05)
        else:
            return jsonify({
                "success": False,
                "message": f"Property {property_name} not in prediction results"
            }), 400

        # Highlight the specific SMILES
        if highlight_smiles:
            try:
                idx = smiles_list.index(highlight_smiles)
                val = float(preds_df[property_name].iloc[idx])
                ax.axvline(val,
                           color='red', linestyle='--', linewidth=2,
                           label='Current Compound')
            except ValueError:
                pass

        # Final styling
        ax.set_title(f'Distribution of {property_name.replace("_"," ")}')
        ax.set_xlabel(property_name.replace('_',' '))
        ax.set_ylabel('Density')
        ax.legend()

        # Stats box
        stats = preds_df[property_name]
        stats_text = (
            f"Dataset:\n"
            f"Mean: {stats.mean():.2f}\n"
            f"Std:  {stats.std():.2f}\n"
            f"Min:  {stats.min():.2f}\n"
            f"Max:  {stats.max():.2f}"
        )
        plt.text(0.02, 0.98, stats_text,
                 transform=ax.transAxes,
                 verticalalignment='top',
                 bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))

        fig.tight_layout()

        # Encode image
        buf = BytesIO()
        fig.savefig(buf, format='png', dpi=150)
        plt.close(fig)
        buf.seek(0)
        image_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')

        return jsonify({
            "success": True,
            "plot": f"data:image/png;base64,{image_b64}"
        })

    except Exception as e:
        print(f"Error generating dataset plot: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


    except Exception as e:
        print(f"Error generating dataset plot: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

        

if __name__ == '__main__':
    app.run(debug=True, port=5001)