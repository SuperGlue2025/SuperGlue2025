# admet_plot.py
import io
import os
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
from admet_predict import predict_admet
import base64

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
    plt.figure(figsize=(10, 6))
    
    # 绘制DrugBank分布
    sns.kdeplot(db[property_key], fill=True, alpha=0.3, label="DrugBank", color='gray')
    
    # 绘制用户化合物的分布
    if len(preds) > 1:
        # 如果有多个化合物，绘制密度图
        sns.kdeplot(preds[property_key], fill=True, alpha=0.5, label="Your Compounds", color='blue')
    else:
        # 如果只有一个化合物，绘制垂直线
        plt.axvline(x=preds[property_key].iloc[0], color='blue', linestyle='--', label='Your Compound')
    
    plt.title(f"{property_key} Distribution")
    plt.xlabel(property_key)
    plt.ylabel("Density")
    plt.legend()
    
    # 添加统计信息
    stats_text = f"DrugBank: mean={db[property_key].mean():.2f}, std={db[property_key].std():.2f}\n"
    stats_text += f"Your Compounds: mean={preds[property_key].mean():.2f}, std={preds[property_key].std():.2f}"
    plt.text(0.02, 0.98, stats_text, transform=plt.gca().transAxes, 
             verticalalignment='top', bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
    
    # 保存图像到内存
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150, bbox_inches='tight')
    plt.close()
    buf.seek(0)
    
    # 将图像转换为base64字符串
    image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    return image_base64
