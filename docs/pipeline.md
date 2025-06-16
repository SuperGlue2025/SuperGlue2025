# Pipeline Documentation

## Overview

Super-Glue is a browser-based platform for molecule exploration, substructure annotation and property prediction. Under the hood, it combines cheminformatics tools like RDKit, admet_ai, and a structured backend pipeline to support consistent analysis.

This documentation explains how each core function works internally, from data flow and logic to model assumptions, so chemists can better interpret outputs and ensure scientific accuracy.

## Table of Contents

1. [Molecule Upload](#molecule-upload)
2. [Annotation / Highlight](#annotation--highlight)
3. [Substructure Matching](#substructure-matching)
4. [Similarity Search](#similarity-search)
5. [3D Visualization](#3d-visualization)
6. [ADMET Property Prediction](#admet-property-prediction)
7. [Data Storage and Database Design](#data-storage-and-database-design)

## Molecule Upload

Super-Glue accepts two types of input:

- **CSV files** (required) at main page
  - Must contain identifiers (`cmpd_id`), SMILES strings (`SMILES`).
  - Optional properties.
- **SDF files** (optional) at 3D Visualization functionality
  - Used for accurate 3D structures.

### How It works behind the scenes

#### Parsing

- Uploaded CSV/SDF files are parsed and linked by a shared compound ID and dataset ID.

#### Storage

- SMILES and properties are stored in the database.
- SDF files are stored as plain text fields in the database.

#### Access

- The uploaded structures are accessible across all downstream functions
- If an SDF is present, 3D rendering is automatically enabled on the Annotation Page.

## Annotation / Highlight

Chemists can select atoms or bonds in a molecule and annotate them with functional notes. Annotations are useful for marking active groups, recording hypotheses, or flagging regions of interest.

### How Highlighting Works

Selections are made using the Ketcher editor:

- Users highlight atoms and bonds using the drawing tools
- The selected substructure must contain at least two atoms and one bond for valid substructure matching

### Behind the Scenes

#### Highlight Capture

- We use Ketcher’s API to detect what the user selects:

  ```js
  ketcher.editor.selection()
  ```

- Atom and bond indices are retrieved from this selection
- When saving a highlight, we use:  

  ```js
  ketcher.editor.highlights.create({ atoms, bonds, color })
  ```

#### Atom Indices and Matching

- Atom indices in Ketcher are based on how it parses the molecule (from molfile or SMILES) into an internal object
- Indices in RDKit may differ — especially if the molecule is loaded from a SMILES, since RDKit can reorder atoms during standardization

**To ensure consistency**, we convert the structure into a **molfile** before matching:

- This keeps the atom ordering consistent between Ketcher and RDKit
- Example function: `has_substructure_match()` in `backend/app.py`
- Related: `similarity_search()` in `backend/molecule_similarity.py`

#### 3D Compatibility

- These same molfile-based indices are used for visual consistency in:
  - `SimpleMoleculeViewer.jsx` (3D Viewer)

#### Annotation Structure

Annotations are saved in the database with:

- Atom and bond indices
- SMILES and SMARTS of the substructure
- User-entered annotation text
- Timestamp

All entries are linked to the dataset and compound IDs.

**Multiple annotations per molecule** are supported via the `molecule_structures` table.

> For more details, see the [Data Storage and Database Design](#-data-storage-and-database-design) section below.

#### Re-Rendering

When a molecule is reloaded:

- All related annotations are pulled from the database
- Each is dynamically re-rendered using saved atom/bond indices
- Visual highlights are applied automatically on the canvas

## Substructure Matching

Super-Glue lets users search for molecules containing a highlighted substructure, based on SMARTS patterns stored in the database.

### How It Works

#### Substructure Capture

- When a user highlights a substructure (e.g., a functional group), it is saved as a **SMARTS pattern** in the database.
- SMARTS is a chemical pattern language capable of describing complex atom and bond patterns.

#### Substructure Matching Logic

- All molecules in the dataset are converted to **RDKit Mol objects** using their SMILES strings.
- The saved SMARTS pattern is also converted into an RDKit Mol object.
- RDKit’s `HasSubstructMatch()` function is used to determine if each molecule contains the selected substructure:  

  ```python
  mol.HasSubstructMatch(substructure)
  ```

- This returns `True` if the molecule contains the pattern, and False otherwise.

#### Displaying Results

- All matching molecules are returned to the user.
- RDKit is used to **highlight the matched substructures** in the results.
- Molecules are rendered as **SVG images** showing the matched fragments.

### Example (Python Pseudocode)

```python
from rdkit import Chem

# Convert SMARTS pattern to Mol
substructure = Chem.MolFromSmarts('[c]1:[c]:[c]:[c]:[c]:[c]1')  # Benzene example

# Convert dataset molecules to Mol
df['mol'] = df['SMILES'].apply(Chem.MolFromSmiles)

# Perform substructure search
df['match'] = df['mol'].apply(lambda mol: mol.HasSubstructMatch(substructure))

# Filter matched molecules
matched = df[df['match']]
```

### Notes

- The SMARTS pattern is extracted directly from the user’s highlight using atom and bond indices.
- This feature supports flexible queries: as long as the highlight is stored as a valid SMARTS string, it can be used for substructure matching.
- Matching is exact, so small changes (e.g., missing bonds or atoms) may result in no match.

> For more information on how highlights and SMARTS patterns are stored, see the [Data Storage and Database Design](#data-storage-and-database-design) section below.

## Similarity Search

Super-Glue enables users to find molecules that are structurally similar to a selected compound, based on molecular fingerprints and similarity metrics.

### How It Works

#### Molecule Conversion

- SMILES strings from the uploaded dataset are converted to **RDKit Mol objects**.

#### Fingerprint Generation

- Each molecule is converted into a **fingerprint vector** using RDKit (e.g., Morgan fingerprint):  

  ```python
  from rdkit.Chem import AllChem
  fingerprint = AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=2048)
  ```

#### Similarity Calculation

- A target molecule is selected by the user.
- Its fingerprint is compared against all other molecules in the dataset using a similarity metric, such as:
  - `TanimotoSimilarity`
  - `DiceSimilarity`
  - `CosineSimilarity`
- RDKit’s `DataStructs` module is used:  

  ```python
  from rdkit import DataStructs
  similarity = DataStructs.TanimotoSimilarity(fp1, fp2)
  ```

#### Results

- The system returns a **ranked table** of molecules, sorted by similarity score (highest to lowest).
- All metadata and properties from the original dataset are included.
- Similarity score is included as a new column.  

### Notes

- Fingerprints are compact binary representations of chemical structure.
- Different metrics can highlight different kinds of similarity—users may choose which metric to apply.
- This approach supports fast, scalable comparisons across large datasets.

> For more technical details on fingerprinting and similarity methods, see [RDKit’s official documentation](https://www.rdkit.org/docs/GettingStartedInPython.html#fingerprinting-and-molecular-similarity).

## 3D Visualization

SuperGlue supports interactive 3D rendering of molecules using **3Dmol.js**. This feature helps chemists inspect spatial structure and geometry.

### How it Works

- 3Dmol.js can render molecules from **SMILES** or **SDF** strings.
- When the **"3D View"** button is clicked:
  - The system retrieves the **SMILES** using `ketcher.getSmiles()`, or
  - Loads the **SDF** file if the user has uploaded one.
- The appropriate format is passed to 3Dmol.js for rendering in the viewer.

### Notes

- **SDF** provides more accurate 3D structures and is preferred when available.
- If no SDF is uploaded, 3Dmol.js generates a structure from the SMILES string.

## ADMET Property Prediction

SuperGlue integrates **ADMET-ai**, an open-source machine learning platform trained on datasets from the **Therapeutics Data Commons**, to predict drug-like properties.

### How it Works

- The `admet_model.predict()` function takes a molecule’s **SMILES** string as input.
- It returns:
  - **49 predicted ADMET properties**
  - The **percentile rank** of each property compared to DrugBank molecules

### Notes

- Predictions are stored in the database for reuse and comparison.
- No need to convert to 3D—only SMILES is required.

> For model details, visit: [ADMET-ai GitHub](https://github.com/swansonk14/admet_ai)

## Data Storage and Database Design

Super-Glue uses a relational SQL database to manage uploaded molecules, annotations, and predictions. All data is linked by a central `dataset_id`, allowing storage and retrieval across multiple datasets.

### ER Diagram

![ER Diagram]()

### Tables

#### `dataset`

- Serves as the anchor of the system
- Stores metadata for each uploaded dataset (e.g., file name, upload time)
- The dataset_id enables multiple datasets to share the same structure across other tables (e.g., annotations, properties)

#### `compound`

- Stores molecule-level metadata such as SMILES strings and basic identifiers
- Links to `dataset_id` and `molecule_id`
- Optional: uploaded properties from CSV are saved as a **`TEXT` field** (property)
  - This allows flexibility, as each dataset may contain different columns
  - Parsing and formatting happen in JavaScript before saving

#### `molecule_structures`

- Stores user-defined annotations and highlights
- Includes:
  - `highlighted_atom` (atom indices)
  - `highlighted_bond` (bond indices)
  - `highlighted_smiles` and `highlighted_smarts` (Used for substructure search)
  - `annotation_text`
- Supports **multiple annotations per molecule**, all linked by `molecule_id` and `dataset_id`

#### `sdf`

- Stores user-uploaded 3D structures (e.g., `.sdf` files) as **`TEXT`**
- Allows molecules to be rendered in 3D (via `3Dmol.js`)
- Each record is tied to a specific molecule and dataset

#### `admet`

- Stores machine learning–predicted ADMET properties
- Properties are **fixed and predefined** in the schema
- Unlike CSV-uploaded properties, these are **hard-coded** into columns for consistency and visualization
- Precomputed predictions are stored for efficiency and future reuse

### Future Improvement

For tables like compound, molecule_structures, sdf, and admet, we currently use an auto-increment id as the primary key. In the future, these tables could instead adopt a **composite primary key** of (`dataset_id`, `molecule_id`).

**Benefits:**

- Ensures uniqueness at the dataset-molecule level without relying on synthetic IDs
- Simplifies data merging, filtering, and integrity checks
- Makes it easier to trace all entries related to a specific molecule in a dataset

This change would help enforce consistency, especially if molecule IDs are reused across datasets or imported from external systems.
