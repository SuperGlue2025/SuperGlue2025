from rdkit import Chem, DataStructs
from rdkit.Chem.rdFingerprintGenerator import GetMorganGenerator
import pandas as pd

def compute_similarity(fp1, fp2, metric="Tanimoto"):
    """Compute similarity based on the chosen metric."""

    similarity_methods = {
        "Tanimoto": DataStructs.TanimotoSimilarity,
        "Russel": DataStructs.RusselSimilarity,
        "Dice": DataStructs.DiceSimilarity,
        "Sokal": DataStructs.SokalSimilarity,
        "Kulczynski": DataStructs.KulczynskiSimilarity,
        "McConnaughey": DataStructs.McConnaugheySimilarity,
        "Cosine": DataStructs.CosineSimilarity,
    }
    if metric in similarity_methods:
        return similarity_methods[metric](fp1, fp2)

    raise ValueError(f"Invalid similarity metric: {metric}. Choose from {list(similarity_methods.keys())}")



def similarity_search(query_smiles, filename, similarity_metric='Tanimoto'):
    """
    Computes similarity between a query molecule and all molecules in the dataset.

    Parameters:
        query_smiles (str): The SMILES string of the query molecule.
        filename (str): The CSV file containing compound IDs, SMILES, and other properties.
        similarity_metric (str): The similarity metric to use (default: tanimoto).

    Returns:
        pd.DataFrame: A DataFrame with all dataset properties and similarity scores.
    """
    # Load dataset from CSV
    dataset_df = pd.read_csv(f"data/{filename}")

    # # Normalize column names to lowercase for case-insensitive matching
    # dataset_df.columns = [col.lower() for col in dataset_df.columns]

    # Convert query SMILES to an RDKit molecule
    query_mol = Chem.MolFromSmiles(query_smiles)
    if query_mol is None:
        raise ValueError("Invalid query SMILES string")

    # Generate fingerprint for the query molecule using Morgan Generator
    gen = GetMorganGenerator(radius=2)
    query_fp = gen.GetFingerprint(query_mol)

    results = []
    dataset_df.columns = [col.lower() for col in dataset_df.columns]
    # Iterate through the dataset and compute similarity
    for _, row in dataset_df.iterrows():
        target_smiles = row.get("smiles")
        target_id = row.get("cmpd_id")

        # Convert target SMILES to RDKit molecule
        target_mol = Chem.MolFromSmiles(target_smiles)
        if target_mol is None:
            continue  # Skip invalid SMILES

        # Generate fingerprint for target molecule
        target_fp = gen.GetFingerprint(target_mol)

        # Compute similarity using the chosen metric
        try:
            similarity = compute_similarity(query_fp, target_fp, similarity_metric)
        except Exception as e:
            print(f"Error computing similarity for {target_id}: {e}")
            continue

        # Create result entry with all dataset properties
        result_entry = row.to_dict()
        result_entry["similarity"] = similarity
        results.append(result_entry)

    # If no results, return empty DataFrame
    if not results:
        return pd.DataFrame()

    # Convert results to DataFrame and sort by similarity score
    results_df = pd.DataFrame(results)
    results_df = results_df.sort_values(by="similarity", ascending=False)

    # Reorder columns: Move similarity_score to the beginning for better readability
    columns = ["similarity"] + [col for col in results_df.columns if col != "similarity"]
    results_df = results_df[columns]
    # Return all results
    return results_df