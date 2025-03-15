import unittest
import os
import pandas as pd
from unittest.mock import patch, mock_open, MagicMock
import sys

# Import the module to test
# Assuming the module is named similarity_search.py
# First, set up path - adjust this to match your project structure
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.molecule_similarity import similarity_search, compute_similarity


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

    def test_similarity_search(self):
        """Test the similarity_search function with real data"""
        # Run the function with test data
        results = similarity_search(self.query_smiles, self.mock_filename)

        # Check that the results are as expected
        self.assertIsInstance(results, pd.DataFrame)
        self.assertGreater(len(results), 0)

        # The first compound should be Aspirin (perfect match)
        self.assertEqual(results.iloc[0]['cmpd_id'], 'COMP1')
        self.assertEqual(results.iloc[0]['similarity'], 1.0)

        # Check columns are ordered correctly
        self.assertEqual(results.columns[0], 'similarity')

        # Check all compounds are returned and sorted by similarity
        self.assertEqual(len(results), 4)
        for i in range(len(results) - 1):
            self.assertGreaterEqual(results.iloc[i]['similarity'], results.iloc[i + 1]['similarity'])

    def test_similarity_search_invalid_query(self):
        """Test similarity_search with invalid query SMILES"""
        with self.assertRaises(ValueError):
            similarity_search("invalid_smiles", self.mock_filename)

    @patch('pandas.read_csv')
    def test_similarity_search_file_not_found(self, mock_read_csv):
        """Test similarity_search when file is not found"""
        mock_read_csv.side_effect = FileNotFoundError("File not found")

        with self.assertRaises(FileNotFoundError):
            similarity_search(self.query_smiles, "non_existent_file.csv")

    def test_similarity_search_empty_result(self):
        """Test similarity_search with data that produces no valid results"""
        # Create a dataset with invalid SMILES
        invalid_data = pd.DataFrame({
            'cmpd_id': ['INVALID1', 'INVALID2'],
            'SMILES': ['invalid_smiles_1', 'invalid_smiles_2'],
            'Name': ['Invalid1', 'Invalid2']
        })

        invalid_filename = 'invalid_compounds.csv'
        invalid_filepath = os.path.join('data', invalid_filename)
        invalid_data.to_csv(invalid_filepath, index=False)

        try:
            # Test with invalid data
            results = similarity_search(self.query_smiles, invalid_filename)

            # Should return empty DataFrame
            self.assertIsInstance(results, pd.DataFrame)
            self.assertEqual(len(results), 0)
        finally:
            # Clean up
            if os.path.exists(invalid_filepath):
                os.remove(invalid_filepath)

    def test_similarity_search_different_metrics(self):
        """Test similarity_search with different similarity metrics"""
        metrics = ['Tanimoto', 'Dice', 'Cosine']

        for metric in metrics:
            results = similarity_search(self.query_smiles, self.mock_filename, similarity_metric=metric)

            # Basic checks
            self.assertIsInstance(results, pd.DataFrame)
            self.assertGreater(len(results), 0)

            # Perfect match should still be 1.0 regardless of metric
            self.assertEqual(results.iloc[0]['cmpd_id'], 'COMP1')
            self.assertEqual(results.iloc[0]['similarity'], 1.0)


if __name__ == '__main__':
    unittest.main()