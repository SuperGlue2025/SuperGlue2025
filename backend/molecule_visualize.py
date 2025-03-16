from rdkit import Chem
from rdkit.Chem import Draw
import io
import pandas as pd
import os
from functools import lru_cache
import base64
import logging
<<<<<<< HEAD
=======

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0

class MoleculeVisualizer:
    """
    A class to visualize molecular structures using RDKit based on compound IDs
    from CSV files.
    """
<<<<<<< HEAD
    
    def __init__(self, data_dir='data'):
        """
        Initialize the MoleculeVisualizer with a data directory.
        
=======

    def __init__(self, data_dir='data'):
        """
        Initialize the MoleculeVisualizer with a data directory.

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
        Args:
            data_dir (str): Path to the directory containing molecule data files
        """
        self.data_dir = data_dir
        self._setup_logging()
<<<<<<< HEAD
    
=======

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
    def _setup_logging(self):
        """Set up logging for the visualizer"""
        self.logger = logging.getLogger('MoleculeVisualizer')
        self.logger.setLevel(logging.DEBUG)
<<<<<<< HEAD
        
=======

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
        # Create console handler if none exists
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
<<<<<<< HEAD
    
    def process_request(self, element_id, filename):
        """
        Process an incoming request to visualize a molecule.
        
        Args:
            element_id: The identifier for the molecule (could be numeric or string)
            filename: The CSV file containing the molecule data
            
=======

    def process_request(self, element_id, filename):
        """
        Process an incoming request to visualize a molecule.

        Args:
            element_id: The identifier for the molecule (could be numeric or string)
            filename: The CSV file containing the molecule data

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
        Returns:
            dict: A dictionary containing the result (success/failure, data/error)
        """
        self.logger.info(f"Processing request for element_id: {element_id}, filename: {filename}")
<<<<<<< HEAD
        
        try:
            # Generate compound image
            img_io = self.generate_structure_image(element_id, filename)
            
            # Transform image to base64 string
            img_io.seek(0)
            img_base64 = base64.b64encode(img_io.getvalue()).decode()
            
=======

        try:
            # Generate compound image
            img_io = self.generate_structure_image(element_id, filename)

            # Transform image to base64 string
            img_io.seek(0)
            img_base64 = base64.b64encode(img_io.getvalue()).decode()

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
            return {
                'success': True,
                'data': img_base64,
                'message': 'Image generated successfully'
            }
        except ValueError as e:
            self.logger.error(f"Value error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
        except FileNotFoundError as e:
            self.logger.error(f"File not found: {filename}")
            return {
                'success': False,
                'error': f'File not found: {filename}'
            }
        except Exception as e:
            self.logger.error(f"Unexpected error: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}'
            }
    
    def generate_structure_image(self, element_id, filename):
        """
        Generate a structure image of a molecule.
<<<<<<< HEAD
        
        Args:
            element_id: The identifier for the molecule
            filename: The CSV file containing the molecule data
            
=======

        Args:
            element_id: The identifier for the molecule
            filename: The CSV file containing the molecule data

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
        Returns:
            BytesIO: An in-memory binary stream containing the image
        """
        try:
            # Validate file extension
            if not filename.endswith('.csv'):
                raise ValueError('Only CSV files are supported')
<<<<<<< HEAD
            
=======

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
            # Find SMILES by ID
            smiles = self._find_smiles_by_id_and_file(element_id, filename)
            if not smiles:
                raise ValueError(f'SMILES not found for ID: {element_id}')
<<<<<<< HEAD
            
            self.logger.debug(f"Found SMILES: {smiles[:30]}...")
            
=======

            self.logger.debug(f"Found SMILES: {smiles[:30]}...")

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
            # Create molecule from SMILES
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                raise ValueError(f'Invalid SMILES: {smiles}')
<<<<<<< HEAD
            
            # Generate an image of the molecule
            img = Draw.MolToImage(mol, size=(300, 300), bgcolor='white')
            
=======

            # Generate an image of the molecule
            img = Draw.MolToImage(mol, size=(300, 300), bgcolor='white')

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
            # Convert image to byte stream
            img_io = io.BytesIO()
            img.save(img_io, format='PNG')
            img_io.seek(0)
<<<<<<< HEAD
            
=======

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
            return img_io
        except Exception as e:
            self.logger.error(f"Error generating structure: {str(e)}", exc_info=True)
            raise Exception(f'Error generating structure: {str(e)}')
    
    @lru_cache(maxsize=1000)
    def _find_smiles_by_id_and_file(self, element_id, filename):
        """
        Find a SMILES string by ID and filename.
<<<<<<< HEAD
        
        Args:
            element_id: The identifier for the molecule
            filename: The CSV file containing the molecule data
            
=======

        Args:
            element_id: The identifier for the molecule
            filename: The CSV file containing the molecule data

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
        Returns:
            str: The SMILES string for the molecule, or None if not found
        """
        try:
            file_path = os.path.join(self.data_dir, filename)
            df = pd.read_csv(file_path, dtype={'cmpd_id': str})
<<<<<<< HEAD
            
            # Handle different ID formats
            element_id_str = str(element_id)
            
            # First try using the element_id as provided
            result = df[df['cmpd_id'] == element_id_str]
            
=======

            # Handle different ID formats
            element_id_str = str(element_id)

            # First try using the element_id as provided
            result = df[df['cmpd_id'] == element_id_str]

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
            # If that fails, try with "cmpd_" prefix
            if result.empty and not element_id_str.startswith("cmpd_"):
                cmpd_id_str = f"cmpd_{element_id_str}"
                self.logger.debug(f"Trying with prefix: {cmpd_id_str}")
                result = df[df['cmpd_id'] == cmpd_id_str]
<<<<<<< HEAD
            
=======

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
            # If still nothing, log some debug info and return None
            if result.empty:
                self.logger.warning(f"No matching compound found for ID: {element_id}")
                # Print first few entries for debugging
                if not df.empty:
                    self.logger.debug(f"CSV columns: {df.columns.tolist()}")
                    self.logger.debug(f"Sample entries: {df['cmpd_id'].head(5).tolist()}")
                return None
<<<<<<< HEAD
            
=======

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
            # Check for SMILES column and get the SMILES
            if 'SMILES' not in df.columns:
                smiles_col = next((col for col in df.columns if 'smiles' in col.lower()), None)
                if not smiles_col:
                    raise ValueError(f"No SMILES column found in {filename}")
                self.logger.debug(f"Using '{smiles_col}' as the SMILES column")
                return result[smiles_col].iloc[0]
<<<<<<< HEAD
            
=======

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
            return result['SMILES'].iloc[0]
        except FileNotFoundError:
            self.logger.error(f"File not found: {filename}")
            raise FileNotFoundError(f'File not found: {filename}')
        except Exception as e:
            self.logger.error(f"Error reading file {filename}: {str(e)}", exc_info=True)
            raise Exception(f'Error reading file {filename}: {str(e)}')

<<<<<<< HEAD
=======

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
if __name__ == "__main__":
    # Simple test code
    visualizer = MoleculeVisualizer()
    test_id = "cmpd_1"
    test_file = "test_compounds.csv"
<<<<<<< HEAD
    
=======

>>>>>>> 6151a1d65cddda8f19473fbcc9cbf26559d2dba0
    try:
        result = visualizer.process_request(test_id, test_file)
        if result['success']:
            print(f"Successfully generated image for {test_id}")
        else:
            print(f"Failed to generate image: {result['error']}")
    except Exception as e:
        print(f"Test failed with error: {str(e)}")