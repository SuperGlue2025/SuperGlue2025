# 🧪 **Super Glue: User Guide**

Welcome to **Super Glue** — a web-based platform for molecular visualization, annotation, and similarity analysis. This guide will walk you through each step, from uploading a dataset to annotating molecules and running searches.  

## 📁 **Table of Contents**

1. [Getting Started](#-getting-started)
2. [Homepage](#-homepage)
    - [Upload Dataset](#-upload-dataset)
    - [Select Recent Dataset](#-select-recent-dataset)
3. [Summary Page](#-summary-page)
    - [Compound Table](#-compound-table)
    - [All Highlights *(In Progress)*](#️-all-highlights-in-progress)
4. [Annotation Page](#️-annotation-page)
    - [Highlights and Text Annotations](#-highlights-and--text-annotations)
    - [Substructure Matching](#-substructure-matching)
    - [Similarity Search](#-similarity-search)
    - [Property Calculation *(In Progress)*](#-property-calculation-in-progress)
    - [3D Visualization *(In Progress)*](#-3d-visualization-in-progress)
    - [Export *(Planned)*](#-export-planned)
5. [Troubleshooting](#️-troubleshooting)
6. [Feedback and Support](#-feedback-and-support)

---

## 🚀 **Getting Started**

To use Super Glue, you only need a modern web browser (Chrome, Edge, Firefox) and a CSV file containing molecular data.  

⚙️ To install and run Super Glue locally, see the [Installation Guide in README.md](../README.md#installation).

---

## 🏠 **Homepage**

The Homepage is your starting point. Here, you can upload a dataset or select a recent one.

### 📤 Upload Dataset

- Click **Upload CSV** to select a CSV file from your computer.
- Your CSV file should include at least:  
  - A `cmpd_id` column (Compound ID)
  - A `SMILES` column (Simplified Molecular Input Line Entry System)
- Optional: Any number of property columns (e.g., activity, solubility)

### 📁 Select Recent Dataset

- If you have previously uploaded datasets, you can select it from the **Recent Files** list.

---

## 🧾 **Summary Page**

The Summary Page provides an overview of your dataset and lets you select compounds to explore.

### 🧪 Compound Table

- Here you'll see a preview of your dataset:
  - A list of all compounds and their SMILES.
  - Click any compound to go to the **Annotation Page**.

### 🖍️ All Highlights *(In Progress)*

- Click "**View All Highlights**" to view all saved highlights and annotations across your dataset.
- Select a highlight or annotation to view it in detail in the **Annotation Page**.

---

## ✏️ **Annotation Page**

The Annotation Page is where most of your work happens. Here, you can visualize, annotate, and analyze individual compounds. You can select tools from the left sidebar to perform various tasks.

### 📊 Property Table

- Displays the properties from your dataset for the selected compound.

### 🟡 Highlights and 💬 Text Annotations

- Select atoms or substructures to visually mark them of interest in the compound.
- Add comments to highlighted regions to describe reactions, hypotheses, or notes.
- View all highlights and annotations for the selected compound.
- Step-by-step guide:
  1. Select a compound from the **Summary Page**.
  2. Click on the **Annotate** on the left sidebar.
  3. Use the Ketcher **select tool** to select atoms or substructures.
  4. Click "**Capture**" to capture the selection.
  5. Add a comment in the text box to describe the highlight. *Note: User can either add a highlight or a text annotation, or both.*
  6. Click "**Save Annotation**" to save your highlight. *Note: Please do not use the Ketcher highlight function to highlight because it will not save the highlight.*
  7. View all saved highlights by clicking "**View Highlights**" on the left sidebar. *Note: For now this is a separate tab, but in the future they will be integrated into one for easier access.*
  8. All highlights associated with the compound will be displayed in a table. Select a highlight to view it on Ketcher. *Note: Text displayed in the table is the comment you added when saving the highlight. If you did not add a comment, it will display system-generated highlight_id with italic text.*
  9. *(Planned)* Edit or delete existing highlights.

### 🧩 Substructure Matching

- Search for compounds that contain a specific substructure you highlighted.
- Step-by-step guide:
  1. From **View Highlights** tab mentioned above, select a highlight.
  2. Click on the **Substructure Matching** tool below on the right sidebar.
  3. Returns a list of compounds that contains the selected substructure.

### 🔎 Similarity Search

- Search for similar compounds using different similarity metrics (Tanimoto, Russel,Dice, Sokal, Kulczynski, McConnaughey, Cosine).
- Return a list of similar compounds based on the selected metric.
- Step-by-step guide:
  1. Select a compound from the **Summary Page**.
  2. Click on the **Similarity Search** on the left sidebar.
  3. Choose a **similarity metric** from the dropdown menu.
  4. (Optional) Adjust the **threshold** for similarity.
  5. Click "Search" to find similar compounds.
  6. View results in the table below.

### 🧮 Property Calculation *(In Progress)*

- Calculate molecular properties (e.g., LogP, TPSA) using RDKit.

### 🌐 3D Visualization *(In Progress)*

- Visualize molecular structures in an interactive 3D viewer.
- Rotate, zoom, and explore molecular geometries directly in your browser.
- Future updates will include advanced rendering options and export capabilities.

### 📥 Export *(Planned)*

- Export your annotated dataset in various formats (CSV, JSON, etc.) for further analysis or sharing.

---

## 🛠️ **Troubleshooting**

| Problem | Solution |
|---------|----------|
| Molecules not displaying | Ensure your dataset has valid SMILES. |
| Highlight doesn't save | Check if you clicked "Save Annotation". |
| Long loading times | Large datasets may take longer. |

## 📬 **Feedback and Support**

Thank you for using Super Glue! This is a work in progress, and we welcome your feedback. If you encounter any issues or have suggestions, please reach out to us using GitHub Issues.
