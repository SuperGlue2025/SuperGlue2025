from rdkit import Chem
from rdkit.Chem import MolToMolBlock
from flask import request, jsonify


def convert_molecule():
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
