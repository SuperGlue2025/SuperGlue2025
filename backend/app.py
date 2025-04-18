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


# @app.route('/api/annotate_molecule', methods=['POST'])
# def handle_annotate_molecule():
#     try:
#         request_data = request.get_json()
#         mol_smiles = request_data.get('smiles')
#         atom_indices = request_data.get('atoms', [])
#         bond_indices = request_data.get('bonds', [])
#         filename = request_data.get('filename')
#         id = request_data.get('id')
#
#         # Validate required parameters - this is where the error might be happening
#         if not mol_smiles or not atom_indices:
#             return jsonify({"success": False, "message": "Missing required data"}), 400
#
#         # Process molecular data
#         try:
#             fragment_smiles, fragment_smarts = get_smarts_smiles(mol_smiles, atom_indices, bond_indices)
#         except Exception as e:
#             print(f"Error in get_smarts_smiles: {str(e)}")
#             return jsonify({"success": False, "message": f"Error processing molecular structure: {str(e)}"}), 400
#
#         # Save substructure
#         try:
#             result = substructure_annotate.save_substructure(
#                 id,
#                 mol_smiles,
#                 atom_indices,
#                 bond_indices,
#                 fragment_smiles,
#                 fragment_smarts
#             )
#
#             # Make sure result is not None
#             if result is None:
#                 return jsonify({"success": False, "message": "Substructure saving failed with no result"}), 500
#
#             # Check if result has success key
#             if result.get("success") is not None:
#                 return jsonify(result)  # This should be a valid response
#             else:
#                 # If result doesn't have success key, add it
#                 result["success"] = True
#                 return jsonify(result)  # This should be a valid response
#
#         except Exception as e:
#             print(f"Error in save_substructure: {str(e)}")
#             return jsonify({"success": False, "message": f"Error saving substructure: {str(e)}"}), 400
#
#     except Exception as e:
#         print(f"Error processing request: {str(e)}")
#         return jsonify({"success": False, "message": str(e)}), 400
#
#     # Fallback return - should never reach here, but prevents the TypeError
#     return jsonify({"success": False, "message": "Unknown error occurred"}), 500
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


# @app.route('/api/substructures', methods=['POST'])
# def handle_save_substructure():
#     """Save highlighted substructure for a molecule"""
#     try:
#         data = request.get_json()
#         molecule_id = data.get('compoundId')
#         highlighted_atoms = data.get('highlightedAtoms')
#         highlighted_bonds = data.get('highlightedBonds')
#
#         smiles = data.get('smiles')
#         notes = data.get('notes', '')
#
#
#         if not molecule_id or not highlighted_atoms:
#             return jsonify({
#                 "success": False,
#                 "error": "Molecule ID and highlighted atoms are required"
#             }), 400
#
#         result = substructure_annotate.save_substructure(
#             molecule_id,
#             highlighted_atoms,
#             highlighted_bonds,
#             smiles,
#             notes
#         )
#
#         if result.get("success"):
#             return jsonify(result)
#         else:
#             return jsonify(result), 400
#     except Exception as e:
#         return jsonify({
#             "success": False,
#             "error": str(e)
#         }), 500


# @app.route('/api/substructures/<molecule_id>', methods=['GET'])
# def handle_get_substructures(molecule_id):
#     """Get all substructures for a specific molecule"""
#     result = substructure_annotate.get_molecule_substructures(molecule_id)
#
#     if result.get("success"):
#         return jsonify(result)
#     else:
#         return jsonify(result), 400

if __name__ == '__main__':
    app.run(debug=True, port=5001)