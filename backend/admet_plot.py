# admet_plot.py
import io
import os
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
from admet_predict import predict_admet
import base64

def load_drugbank_df():
    """
    Load the DrugBank dataset as a pandas DataFrame by searching for a CSV file in the admet_ai package directory.
    Returns:
        pd.DataFrame: The loaded DrugBank data.
    Raises:
        FileNotFoundError: If no DrugBank CSV file is found.
    """
    import admet_ai, os
    pkg_dir = os.path.dirname(admet_ai.__file__)
    for root, _, files in os.walk(pkg_dir):
        for fn in files:
            if 'drugbank' in fn.lower() and fn.lower().endswith('.csv'):
                return pd.read_csv(os.path.join(root, fn))
    raise FileNotFoundError("cannot find drugbank CSV ")

def make_density_plot(smiles_list, property_key):
    """
    Generate a density plot comparing the distribution of a given property between DrugBank compounds and user compounds.
    Args:
        smiles_list (list): List of SMILES strings for user compounds.
        property_key (str): The property to plot (must exist in both DrugBank and prediction results).
    Returns:
        str: The base64-encoded PNG image of the plot.
    Raises:
        KeyError: If the property_key is not found in either dataset.
    """
    # 1) Predict properties for user compounds
    preds = predict_admet(smiles_list)
    # preds is a DataFrame
    if property_key not in preds.columns:
        raise KeyError(f"did not find key `{property_key}`")
    # 2) Load DrugBank data
    db = load_drugbank_df()
    if property_key not in db.columns:
        raise KeyError(f"DrugBank has no  `{property_key}`")
    # 3) Plot
    plt.figure(figsize=(10, 6))
    
    # Plot DrugBank distribution
    sns.kdeplot(db[property_key], fill=True, alpha=0.3, label="DrugBank", color='gray')
    
    # Plot user compound distribution
    if len(preds) > 1:
        # If there are multiple compounds, plot density
        sns.kdeplot(preds[property_key], fill=True, alpha=0.5, label="Your Compounds", color='blue')
    else:
        # If only one compound, plot a vertical line
        plt.axvline(x=preds[property_key].iloc[0], color='blue', linestyle='--', label='Your Compound')
    
    plt.title(f"{property_key} Distribution")
    plt.xlabel(property_key)
    plt.ylabel("Density")
    plt.legend()
    
    # Add statistics information
    stats_text = f"DrugBank: mean={db[property_key].mean():.2f}, std={db[property_key].std():.2f}\n"
    stats_text += f"Your Compounds: mean={preds[property_key].mean():.2f}, std={preds[property_key].std():.2f}"
    plt.text(0.02, 0.98, stats_text, transform=plt.gca().transAxes, 
             verticalalignment='top', bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
    
    # Save the image to memory
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150, bbox_inches='tight')
    plt.close()
    buf.seek(0)
    
    # Convert the image to a base64 string
    image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return image_base64
