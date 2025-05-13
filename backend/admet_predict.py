import torch
import argparse
import numpy as np
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
    np.dtypes.Float64DType,  # Add the specific type from the error message
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