# admet_plot.py
import io
import os
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
from admet_predict import predict_admet

def load_drugbank_df():
    import admet_ai, os
    pkg_dir = os.path.dirname(admet_ai.__file__)
    for root, _, files in os.walk(pkg_dir):
        for fn in files:
            if 'drugbank' in fn.lower() and fn.lower().endswith('.csv'):
                return pd.read_csv(os.path.join(root, fn))
    raise FileNotFoundError("cannot find drugbank CSV ")

def make_density_plot(smiles_list, property_key):
    # 1) predict
    preds = predict_admet(smiles_list)
    # preds  DataFrame
    if property_key not in preds.columns:
        raise KeyError(f"did not find key `{property_key}`")
    # 2) load
    db = load_drugbank_df()
    if property_key not in db.columns:
        raise KeyError(f"DrugBank has no  `{property_key}`")
    # 3) plot
    plt.figure(figsize=(6,4))
    sns.kdeplot(db[property_key], fill=True, alpha=0.3, label="DrugBank")
    sns.kdeplot(preds[property_key], fill=True, alpha=0.3, label="Your Compounds")
    plt.title(property_key)
    plt.legend()
    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format="png", dpi=150)
    plt.close()
    buf.seek(0)
    return buf
