from flask import Flask,send_from_directory,jsonify,request
from flask_cors import CORS
from molecule_annotate import get_compounds, get_smarts_smiles, auto_complete_ring_bonds
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
import sqlite3
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

@app.route('/api/annotate_molecule', methods=['POST'])
def handle_annotate_molecule():
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
        molecule_id = request.args.get('molecule_id') or request.args.get('id')
        dataset_id = request.args.get('dataset_id')

        if not molecule_id:
            return jsonify({
                "success": False,
                "message": "Missing required molecule ID parameter"
            }), 400

        # Call the function from the substructure_annotate module
        result = substructure_annotate.get_molecule_highlights(molecule_id, dataset_id)

        return jsonify(result)
    except Exception as e:
        print(f"Error getting molecule highlights: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

def get_fragment_mol(mol, atoms, bonds):
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
    """Generate a molecule SVG with precise substructure highlights."""
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


@app.route('/api/optimize_structure', methods=['POST'])
def optimize_structure():
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
    """API endpoint: Retrieve molecule structure"""
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
    molecule_id = request.args.get('molecule_id')
    filename = request.args.get('filename')
    DB_PATH = 'data/molecular_annotate.db'  # 路径按实际情况调整
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

if __name__ == '__main__':
    app.run(debug=True, port=5001)