import unittest
import os
import sys
import pandas as pd
from unittest.mock import patch

# Import the module to test
# Assuming the module is named similarity_search.py
# First, set up path - adjust this to match your project structure
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from molecule_similarity import similarity_search, compute_similarity


class TestSimilaritySearch(unittest.TestCase):

    def setUp(self):
        """Set up test data"""
        # Create a mock dataset for testing
        self.mock_data = pd.DataFrame({
            'cmpd_id': ['COMP1', 'COMP2', 'COMP3', 'COMP4'],
            'SMILES': ['CC(=O)OC1=CC=CC=C1C(=O)O', 'CC1=CC=C(C=C1)NC(=O)CC(CC2=CC=C(C=C2)S(=O)(=O)N)CC(=O)O',
                       'CCN(CCO)CCCC(C)NC1=C2C=CC(=CC2=NC=C1)Cl', 'CC1=C(C=C(C=C1)NC(=O)C)NC2=CC=CC=C2C(=O)O'],
            'Name': ['Aspirin', 'Glipizide', 'Amodiaquine', 'Mefenamic acid']
        })

        # Define test query molecule (acetylsalicylic acid - Aspirin)
        self.query_smiles = 'CC(=O)OC1=CC=CC=C1C(=O)O'

        # Create a directory for the mock CSV if it doesn't exist
        os.makedirs('data', exist_ok=True)

        # Save mock data to a CSV file
        self.mock_filename = 'test_compounds.csv'
        self.mock_filepath = os.path.join('data', self.mock_filename)
        self.mock_data.to_csv(self.mock_filepath, index=False)

    def tearDown(self):
        """Clean up after tests"""
        # Remove the test file
        if os.path.exists(self.mock_filepath):
            os.remove(self.mock_filepath)

    def test_compute_similarity(self):
        """Test the compute_similarity function"""
        # Import RDKit modules for testing
        from rdkit import Chem
        from rdkit.Chem.rdFingerprintGenerator import GetMorganGenerator

        # Create two molecules for testing
        mol1 = Chem.MolFromSmiles('CC(=O)OC1=CC=CC=C1C(=O)O')  # Aspirin
        mol2 = Chem.MolFromSmiles('CC1=C(C=C(C=C1)NC(=O)C)NC2=CC=CC=C2C(=O)O')  # Mefenamic acid

        # Generate fingerprints
        gen = GetMorganGenerator(radius=2)
        fp1 = gen.GetFingerprint(mol1)
        fp2 = gen.GetFingerprint(mol2)

        # Test Tanimoto similarity
        result = compute_similarity(fp1, fp2, "Tanimoto")
        self.assertIsInstance(result, float)
        self.assertTrue(0 <= result <= 1)

        # Test another metric
        result = compute_similarity(fp1, fp2, "Dice")
        self.assertIsInstance(result, float)
        self.assertTrue(0 <= result <= 1)

        # Test invalid metric
        with self.assertRaises(ValueError):
            compute_similarity(fp1, fp2, "InvalidMetric")

    @patch('pandas.read_sql_query')
    def test_similarity_search(self, mock_read_sql):
        # Construct mock data returned from the database
        mock_df = pd.DataFrame({
            'cmpd_id': ['COMP1', 'COMP2', 'COMP3', 'COMP4'],
            'smiles': [
                'CC(=O)OC1=CC=CC=C1C(=O)O',
                'CC1=CC=C(C=C1)NC(=O)CC(CC2=CC=C(C=C2)S(=O)(=O)N)CC(=O)O',
                'CCN(CCO)CCCC(C)NC1=C2C=CC(=CC2=NC=C1)Cl',
                'CC1=C(C=C(C=C1)NC(=O)C)NC2=CC=CC=C2C(=O)O'
            ],
            'property': [
                '{"prop1": 1}', '{"prop1": 2}', '{"prop1": 3}', '{"prop1": 4}'
            ]
        })
        mock_read_sql.return_value = mock_df

        results = similarity_search(self.query_smiles, 1)
        self.assertIsInstance(results, pd.DataFrame)
        self.assertGreater(len(results), 0)
        self.assertEqual(results.iloc[0]['cmpd_id'], 'COMP1')
        self.assertEqual(results.columns[0], 'similarity')

    @patch('pandas.read_sql_query')
    def test_similarity_search_invalid_query(self, mock_read_sql):
        # Just mock a valid data row
        mock_df = pd.DataFrame({
            'cmpd_id': ['COMP1'],
            'smiles': ['CC(=O)OC1=CC=CC=C1C(=O)O'],
            'property': ['{"prop1": 1}']
        })
        mock_read_sql.return_value = mock_df

        with self.assertRaises(ValueError):
            similarity_search("invalid_smiles", 1)

    @patch('pandas.read_sql_query')
    def test_similarity_search_empty_result(self, mock_read_sql):
        # Return an empty DataFrame
        mock_read_sql.return_value = pd.DataFrame(columns=['cmpd_id', 'smiles', 'property'])
        results = similarity_search(self.query_smiles, 1)
        self.assertIsInstance(results, pd.DataFrame)
        self.assertEqual(len(results), 0)

    @patch('pandas.read_sql_query')
    def test_similarity_search_different_metrics(self, mock_read_sql):
        mock_df = pd.DataFrame({
            'cmpd_id': ['COMP1', 'COMP2'],
            'smiles': [
                'CC(=O)OC1=CC=CC=C1C(=O)O',
                'CC1=CC=C(C=C1)NC(=O)CC(CC2=CC=C(C=C2)S(=O)(=O)N)CC(=O)O'
            ],
            'property': [
                '{"prop1": 1}', '{"prop1": 2}'
            ]
        })
        mock_read_sql.return_value = mock_df

        metrics = ['Tanimoto', 'Dice', 'Cosine']
        for metric in metrics:
            results = similarity_search(self.query_smiles, 1, similarity_metric=metric)
            self.assertIsInstance(results, pd.DataFrame)
            self.assertGreater(len(results), 0)
            self.assertEqual(results.iloc[0]['cmpd_id'], 'COMP1')
            self.assertEqual(results.iloc[0]['similarity'], 1.0)

    @patch('pandas.read_sql_query')
    def test_similarity_search_file_not_found(self, mock_read_sql):
        """Test similarity_search when file is not found"""
        mock_read_sql.side_effect = Exception("File not found")
        with self.assertRaises(Exception):
            similarity_search(self.query_smiles, "non_existent_file.csv")


if __name__ == '__main__':
    unittest.main()
