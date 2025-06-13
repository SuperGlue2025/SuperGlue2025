import sqlite3
import json

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



def similarity_search(query_smiles, dataset_id, similarity_metric='Tanimoto'):
    """
    Computes similarity between a query molecule and all molecules in the dataset.

    Parameters:
        query_smiles (str): The SMILES string of the query molecule.
        dataset_id (int): The dataset id in the database.
        similarity_metric (str): The similarity metric to use (default: tanimoto).

    Returns:
        pd.DataFrame: A DataFrame with all dataset properties and similarity scores.
    """
    print(f"[DEBUG] dataset_id: {dataset_id}")
    print(f"[DEBUG] query_smiles: {query_smiles}")
    conn = sqlite3.connect('data/molecular_annotate_V2.db')
    df = pd.read_sql_query(
        "SELECT DISTINCT molecule_id as cmpd_id, smiles, property FROM compound WHERE dataset_id=?",
        conn,
        params=(dataset_id,)
    )
    conn.close()
    print(f"[DEBUG] df rows: {len(df)}")

    # Expand the property field
    property_dicts = []
    for prop in df['property']:
        try:
            property_dicts.append(json.loads(prop) if prop else {})
        except Exception:
            property_dicts.append({})
    property_df = pd.DataFrame(property_dicts)
    df = pd.concat([df.drop(columns=['property']), property_df], axis=1)

    query_mol = Chem.MolFromSmiles(query_smiles)
    if query_mol is None:
        print("[ERROR] Invalid query SMILES string!")
        raise ValueError("Invalid query SMILES string")

    gen = GetMorganGenerator(radius=2)
    query_fp = gen.GetFingerprint(query_mol)

    results = []
    df.columns = [col.lower() for col in df.columns]
    for _, row in df.iterrows():
        target_smiles = row.get("smiles")
        target_id = row.get("cmpd_id")
        target_mol = Chem.MolFromSmiles(target_smiles)
        print(f"[DEBUG] target_id: {target_id}, smiles: {target_smiles}, can_parse: {target_mol is not None}")
        if target_mol is None:
            continue
        target_fp = gen.GetFingerprint(target_mol)
        try:
            similarity = compute_similarity(query_fp, target_fp, similarity_metric)
        except Exception as e:
            print(f"Error computing similarity for {target_id}: {e}")
            continue
        result_entry = row.to_dict()
        result_entry["similarity"] = similarity
        results.append(result_entry)

    print(f"[DEBUG] results count: {len(results)}")
    if not results:
        return pd.DataFrame()
    results_df = pd.DataFrame(results)
    results_df = results_df.sort_values(by="similarity", ascending=False)
    results_df = results_df.drop_duplicates(subset=["cmpd_id", "smiles"])
    columns = ["similarity"] + [col for col in results_df.columns if col != "similarity"]
    results_df = results_df[columns]
    return results_df