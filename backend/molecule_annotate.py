from flask import jsonify
import pandas as pd
from rdkit import Chem
import os


class MoleculeAnnotationService:
    def __init__(self):
        self.compounds_df = None
        self.annotations = {}
        self.data_folder = 'data/'  # Path to the data folder
        self.current_file = None  # Currently loaded file name

    def load_compounds(self, csv_path):
        """Load compounds from CSV file"""
        try:
            self.compounds_df = pd.read_csv(csv_path)
            self.current_file = csv_path
            return self.compounds_df
        except Exception as e:
            print(f"Error loading CSV file: {str(e)}")
            self.compounds_df = None
            return None

    def get_mol_from_smiles(self, smiles):
        """Convert SMILES to RDKit mol object"""
        return Chem.MolFromSmiles(smiles)

    def save_annotation(self, cmpd_id, annotation_data):
        """Save annotation for a compound"""
        self.annotations[cmpd_id] = annotation_data
        return True

    def get_latest_csv(self):
        """Get the most recently modified CSV file from the data folder"""
        try:
            # Get all CSV files in the data folder
            csv_files = [f for f in os.listdir(self.data_folder) if f.endswith('.csv')]
            if not csv_files:
                return None

            # Get the latest CSV file
            latest_file = max(
                csv_files,
                key=lambda x: os.path.getmtime(os.path.join(self.data_folder, x))
            )
            return os.path.join(self.data_folder, latest_file)
        except Exception as e:
            print(f"Error finding CSV file: {str(e)}")
            return None


# Create service instance
service = MoleculeAnnotationService()


def get_compounds():
    """Get all compounds"""
    if service.compounds_df is None:
        # Get the latest CSV file
        csv_path = service.get_latest_csv()
        if csv_path is None:
            return jsonify({'error': 'No CSV file found in data folder'}), 404

        if service.load_compounds(csv_path) is None:
            return jsonify({'error': 'Error loading compounds from file'}), 500

    compounds = service.compounds_df.to_dict('records')
    return jsonify(compounds)


def get_compound(cmpd_id):
    """Get specific compound details"""
    if service.compounds_df is None:
        # Get the latest CSV file
        csv_path = service.get_latest_csv()
        if csv_path is None:
            return jsonify({'error': 'No CSV file found in data folder'}), 404

        if service.load_compounds(csv_path) is None:
            return jsonify({'error': 'Error loading compounds from file'}), 500

    compound = service.compounds_df[service.compounds_df['cmpd_id'] == cmpd_id].to_dict('records')
    return jsonify(compound[0] if compound else {})
def get_smarts_smiles(mol_smiles, atom_indices, bond_indices):
    mol = Chem.MolFromSmiles(mol_smiles)
    if not mol:
        return jsonify({"success": False, "message": "Invalid SMILES"}), 400

    # create substructure
    rwmol = Chem.RWMol()
    old_idx_to_new = {}

    # add atoms
    for idx in atom_indices:
        old_atom = mol.GetAtomWithIdx(idx)
        new_atom = Chem.Atom(old_atom.GetSymbol())
        new_idx = rwmol.AddAtom(new_atom)
        old_idx_to_new[idx] = new_idx

    # add bonds
    for bond_idx in bond_indices:
        bond = mol.GetBondWithIdx(bond_idx)
        begin_idx = bond.GetBeginAtomIdx()
        end_idx = bond.GetEndAtomIdx()
        if begin_idx in old_idx_to_new and end_idx in old_idx_to_new:
            rwmol.AddBond(old_idx_to_new[begin_idx], old_idx_to_new[end_idx], bond.GetBondType())

    fragment_mol = rwmol.GetMol()
    fragment_smiles = Chem.MolToSmiles(fragment_mol)
    print(fragment_smiles)

    # using isomericSmiles=True for simple
    fragment_smarts = Chem.MolToSmarts(fragment_mol, isomericSmiles=True)
    # fragment_smarts = Chem.MolFragmentToSmiles(fragment_mol)
    print(fragment_smarts)
    return fragment_smiles, fragment_smarts
