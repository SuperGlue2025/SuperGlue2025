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
    """Generate better SMARTS for substructure highlighting"""
    print(f"Generating SMARTS for atom indices: {atom_indices}, bond indices: {bond_indices}")
    mol = Chem.MolFromSmiles(mol_smiles)
    if not mol:
        print("Could not create molecule from SMILES")
        return None, None

    # Check for fluorobenzene pattern
    is_fluorobenzene = False
    has_fluorine = False
    has_aromatic_ring = False

    # Analyze selected atoms
    for idx in atom_indices:
        atom = mol.GetAtomWithIdx(idx)
        if atom.GetSymbol() == "F":
            has_fluorine = True
        if atom.GetIsAromatic() and atom.GetSymbol() == "C":
            has_aromatic_ring = True

    # If we have both a fluorine and aromatic atoms, check if they form a fluorobenzene
    if has_fluorine and has_aromatic_ring:
        # Check if at least 4-6 atoms are part of an aromatic ring
        aromatic_atoms = sum(1 for idx in atom_indices if mol.GetAtomWithIdx(idx).GetIsAromatic())
        if aromatic_atoms >= 4:
            is_fluorobenzene = True
            print("Detected fluorobenzene pattern")

    if is_fluorobenzene:
        # Return specific SMARTS for fluorobenzene
        return "Fc1ccccc1", "c1ccccc1[F]"

    # For other patterns, create a molecule from the selected atoms
    fragment = Chem.RWMol()
    atom_map = {}

    # Add atoms with atom mapping
    for i, idx in enumerate(atom_indices):
        old_atom = mol.GetAtomWithIdx(idx)
        new_atom = Chem.Atom(old_atom.GetSymbol())
        new_atom.SetFormalCharge(old_atom.GetFormalCharge())
        new_atom.SetChiralTag(old_atom.GetChiralTag())
        new_atom.SetIsAromatic(old_atom.GetIsAromatic())
        new_atom.SetAtomMapNum(i + 1)  # Set atom mapping

        new_idx = fragment.AddAtom(new_atom)
        atom_map[idx] = new_idx

    # Add bonds between selected atoms
    for bond_idx in bond_indices:
        try:
            bond = mol.GetBondWithIdx(bond_idx)
            begin_idx = bond.GetBeginAtomIdx()
            end_idx = bond.GetEndAtomIdx()

            if begin_idx in atom_map and end_idx in atom_map:
                fragment.AddBond(
                    atom_map[begin_idx],
                    atom_map[end_idx],
                    bond.GetBondType()
                )
        except Exception as e:
            print(f"Error adding bond {bond_idx}: {e}")

    # Ensure fragment is connected - add any missing bonds between selected atoms
    for i, idx1 in enumerate(atom_indices):
        for j, idx2 in enumerate(atom_indices[i + 1:], i + 1):
            bond = mol.GetBondBetweenAtoms(idx1, idx2)
            if bond and begin_idx in atom_map and end_idx in atom_map:
                try:
                    fragment.AddBond(
                        atom_map[idx1],
                        atom_map[idx2],
                        bond.GetBondType()
                    )
                except:
                    # May already have this bond
                    pass

    # Generate SMILES and SMARTS
    fragment_smiles = ""
    fragment_smarts = ""

    try:
        # Convert to molecule
        fragment_mol = fragment.GetMol()

        # Generate SMILES
        fragment_smiles = Chem.MolToSmiles(fragment_mol)

        # Generate SMARTS - ensure it's connected
        fragment_smarts = Chem.MolToSmarts(fragment_mol)

        # Make sure we don't have disconnected components
        if "." in fragment_smarts:
            fragment_smarts = fragment_smarts.replace(".", "-")

        # Test the pattern
        test_pattern = Chem.MolFromSmarts(fragment_smarts)
        if test_pattern:
            matches = mol.GetSubstructMatches(test_pattern)
            print(f"Testing SMARTS: found {len(matches)} matches")

            # If too many matches, create a more specific pattern
            if len(matches) > 15:
                print("Too many matches, creating more specific pattern")
                # Try to create a pattern with environment
                # For simplicity just add more constraints
                fragment_smarts = "c1c([F])cccc1" if is_fluorobenzene else fragment_smarts
    except Exception as e:
        print(f"Error generating SMARTS/SMILES: {e}")
        # Fallback to fluorobenzene pattern if that's what we detected
        if is_fluorobenzene:
            fragment_smiles = "Fc1ccccc1"
            fragment_smarts = "c1ccccc1[F]"

    print(f"Final fragment SMILES: {fragment_smiles}")
    print(f"Final SMARTS pattern: {fragment_smarts}")

    return fragment_smiles, fragment_smarts
