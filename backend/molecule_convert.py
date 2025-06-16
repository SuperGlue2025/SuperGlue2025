from rdkit import Chem
from rdkit.Chem import MolToMolBlock
from flask import request, jsonify


def convert_molecule():
    """
    Convert a SMILES string to a mol block using RDKit and return as JSON response.
    Expects JSON input: {"smiles": "..."}
    Returns:
        Response: Flask JSON response with mol_block or error message.
    """
    data = request.json
    smiles = data.get('smiles')

    if not smiles:
        return jsonify({'error': 'No SMILES provided'}), 400

    try:
        mol = Chem.MolFromSmiles(smiles)

        if mol is None:
            return jsonify({'error': 'Invalid SMILES'}), 400

        mol_block = MolToMolBlock(mol)
        return jsonify({'mol_block': mol_block}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
