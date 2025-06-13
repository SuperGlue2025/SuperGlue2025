import torch
import argparse
import numpy as np
import os
import json
import pandas as pd
from pathlib import Path
from admet_ai import ADMETModel

# More comprehensive list of NumPy dtypes to add to safe globals
torch.serialization.add_safe_globals([
    argparse.Namespace,
    np.core.multiarray._reconstruct,
    np.ndarray,
    np.dtype,
    np.float64,
    np.float32,
    np.int64,
    np.int32,
    np.dtypes.Float64DType,
    np.dtypes.Float32DType,
    np.dtypes.Int64DType,
    np.dtypes.Int32DType
])

# model initialization
try:
    admet_model = ADMETModel()
except Exception as e:
    print(f"Failed to load ADMET model: {str(e)}")
    admet_model = None

def predict_admet(smiles_list):
    if not admet_model:
        raise RuntimeError("ADMET model not initialized")

    try:
        predictions = admet_model.predict(smiles=smiles_list)
        return predictions
    except Exception as e:
        raise RuntimeError(f"Prediction error: {str(e)}")

def process_csv_file(csv_file_path):
    """
    Process a CSV file containing SMILES strings and calculate ADMET properties.
    
    Args:
        csv_file_path (str): Path to the input CSV file
        
    Returns:
        str: Path to the saved JSON file with ADMET properties
    """
    # Create output directory if it doesn't exist
    output_dir = Path("data/admet_properties")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Read input CSV
    df = pd.read_csv(csv_file_path)
    if 'SMILES' not in df.columns:
        raise ValueError("CSV file must contain a 'SMILES' column")
    
    # Calculate ADMET properties
    smiles_list = df['SMILES'].tolist()
    admet_properties = predict_admet(smiles_list)
    
    # Convert to dictionary format
    results = {
        'file_name': os.path.basename(csv_file_path),
        'compounds': []
    }
    
    for idx, row in admet_properties.iterrows():
        compound_data = {
            'smiles': smiles_list[idx],
            'properties': row.to_dict()
        }
        results['compounds'].append(compound_data)
    
    # Save to JSON
    output_file = output_dir / f"{os.path.splitext(os.path.basename(csv_file_path))[0]}_admet.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    return str(output_file)

def get_property_distribution(json_file_path, property_name=None):
    """
    Get the distribution of ADMET properties from a JSON file.
    
    Args:
        json_file_path (str): Path to the JSON file containing ADMET properties
        property_name (str, optional): Name of the specific property to get distribution for
        
    Returns:
        dict: Dictionary containing property distributions
    """
    with open(json_file_path, 'r') as f:
        data = json.load(f)
    
    if not data['compounds']:
        return {}
    
    # Get all property names from the first compound
    all_properties = list(data['compounds'][0]['properties'].keys())
    
    if property_name:
        if property_name not in all_properties:
            raise ValueError(f"Property {property_name} not found")
        return {
            property_name: [compound['properties'][property_name] 
                          for compound in data['compounds']]
        }
    
    # Return distributions for all properties
    distributions = {}
    for prop in all_properties:
        distributions[prop] = [compound['properties'][prop] 
                             for compound in data['compounds']]
    return distributions