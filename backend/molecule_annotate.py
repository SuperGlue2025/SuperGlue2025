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

def auto_complete_ring_bonds(mol, atom_indices, bond_indices):
    atom_set = set(atom_indices)
    bond_set = set(bond_indices)
    completed_bonds = list(bond_indices)

    # Directly check if there are any bonds connecting the selected atoms that are not included
    for bond in mol.GetBonds():
        begin_idx = bond.GetBeginAtomIdx()
        end_idx = bond.GetEndAtomIdx()

        # If both atoms connected by the bond are in the selected atom_indices
        if begin_idx in atom_set and end_idx in atom_set:
            bond_idx = bond.GetIdx()
            # Add the bond if it is not already selected
            if bond_idx not in bond_set:
                completed_bonds.append(bond_idx)
                bond_set.add(bond_idx)
                print(f"Added missing bond: {bond_idx} (between atoms {begin_idx}-{end_idx})")

    return completed_bonds


def get_smarts_smiles(mol, atom_indices, bond_indices):
    """
    Generate SMARTS and SMILES representations of the fragment
    based on the molecule object and selected atoms/bonds.
    """
    if not mol:
        print("Could not create molecule from molfile")
        return None, None

    # Add atom mapping numbers to selected atoms for tracking
    for i, idx in enumerate(atom_indices):
        mol.GetAtomWithIdx(idx).SetAtomMapNum(i + 1)

    # Ensure indices are of integer type
    atom_indices = list(map(int, atom_indices))
    bond_indices = list(map(int, bond_indices))

    print(f"Bond indices used: {bond_indices}")

    # Special handling for single atom fragments to generate more precise SMARTS
    if len(atom_indices) == 1:
        atom_idx = atom_indices[0]
        atom = mol.GetAtomWithIdx(atom_idx)
        atom_symbol = atom.GetSymbol()

        # Get total explicit and implicit hydrogen count for the atom
        h_count = atom.GetTotalNumHs()

        # Generate more precise SMARTS for hydrogenated single atoms
        if h_count > 0:
            # Use specific hydrogen count in SMARTS
            custom_smarts = f'[{atom_symbol}H{h_count}:1]'
            print(f"Using detailed SMARTS for {atom_symbol} with {h_count} H: {custom_smarts}")

            # Try generating SMILES if possible
            try:
                fragment_smiles = Chem.MolFragmentToSmiles(
                    mol,
                    atomsToUse=atom_indices,
                    bondsToUse=bond_indices,
                    isomericSmiles=True
                )
            except Exception as e:
                print(f"Error generating SMILES: {e}")
                fragment_smiles = None

            # Reset atom map numbers
            for idx in atom_indices:
                mol.GetAtomWithIdx(idx).SetAtomMapNum(0)

            print(f"Generated custom SMARTS for single atom: {custom_smarts}")
            print(f"Generated SMILES: {fragment_smiles}")

            return fragment_smiles, custom_smarts

    # Fallback to standard method for SMARTS and SMILES generation
    try:
        fragment_smarts = Chem.MolFragmentToSmarts(
            mol,
            atomsToUse=atom_indices,
            bondsToUse=bond_indices,
            isomericSmarts=True
        )
    except Exception as e:
        print(f"Error generating SMARTS: {e}")
        fragment_smarts = None

    try:
        fragment_smiles = Chem.MolFragmentToSmiles(
            mol,
            atomsToUse=atom_indices,
            bondsToUse=bond_indices,
            isomericSmiles=True
        )
    except Exception as e:
        print(f"Error generating SMILES: {e}")
        fragment_smiles = None

    # Reset atom mapping numbers
    for idx in atom_indices:
        mol.GetAtomWithIdx(idx).SetAtomMapNum(0)

    print(f"Generated SMARTS: {fragment_smarts}")
    print(f"Generated SMILES: {fragment_smiles}")

    return fragment_smiles, fragment_smarts
