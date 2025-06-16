# Use Cases

*Note this was an exercise in ideating what functionalities our project will have. While we have implemented most of them, there are still a few to be added to the project in the future.*

## 1. Visualizing Molecules

🟡 **■ User Action:** Input a molecule name, SMILES string, or chemical formula.  
🔵 **▲ Expected Outcome:** The system displays a **2D skeletal structure** of the input molecule along with its properties.  

---

## 2. Interactive Molecular Modeling

🟡 **■ User Action:** Draw a molecule or edit an existing structure using Ketcher.  
🔵 **▲ Expected Outcome:** The user-created molecular structure is saved and can be annotated or modified later.  

---

## 3. Highlighting Molecular Structures

🟡 **■ User Action:** Click and drag the cursor over a molecular structure to highlight specific functional groups or substructures.  
🔵 **▲ Expected Outcome:** The selected sections are **visually marked** and saved for annotation.  

---

## 4. Text-Based Annotation

🟡 **■ User Action:** Click on a highlighted section and enter notes in a text box.  
🔵 **▲ Expected Outcome:** The text annotation is saved and linked to the highlighted molecular region. The user can edit or export these annotations later.  

---

## 5. Saving Work

🟡 **■ User Action:** Click the "Save" button or allow **automatic saving** at set intervals.  
🔵 **▲ Expected Outcome:**  
✅ Annotations and modifications are saved locally or in the database.  
✅ Users can manually save and name different versions of their work.  
✅ Undo/redo features allow reverting to previous versions.  

---

## 6. Preprocessing Data

🟡 **■ User Action:** Upload a CSV file containing molecular data.  
🔵 **▲ Expected Outcome:**  
✅ Data is parsed into structured molecular properties.  
✅ Duplicates are removed, missing values handled, and data formatted for analysis.  
❌ If the file format is invalid, the system displays an error message and suggests corrections.  

---

## 7. Similarity Search

🟡 **■ User Action:** Input a molecule (by name, SMILES, or drawn structure) to find structurally similar compounds.  
🔵 **▲ Expected Outcome:**  
✅ The system calculates **structural similarity using molecular fingerprints**.  
✅ A **ranked list of similar compounds** is displayed, including similarity scores.  
✅ Users can filter results based on **threshold values** (e.g., solubility, toxicity).  

---

## 8. Obtaining Molecular Properties

🟡 **■ User Action:** Input a molecule name, chemical formula, or structure.  
🔵 **▲ Expected Outcome:**  
✅ The system retrieves a **list of physical and chemical properties**.  
✅ Users can view **predicted values alongside experimental data**.  

---

## 9. Compatibility with Prebuilt Workflows

🟡 **■ User Action:** Upload molecular datasets and configure workflow integration settings.  
🔵 **▲ Expected Outcome:** The dataset integrates with **existing cheminformatics pipelines**, enabling **automated workflow execution**.  

---

## 10. Importing, Exporting, and Saving Files

🟡 **■ User Action:** Click the **import/export** button and select a file from the computer.  
🔵 **▲ Expected Outcome:** The system allows the user to:  
✅ **Import** molecular datasets.  
✅ **Export** annotated molecules in **CSV, JSON, or SDF formats**.  
✅ **Save** session data for later access.  

---

## 11. Automated Data Cleaning

🟡 **■ User Action:** Upload a raw molecular dataset.  
🔵 **▲ Expected Outcome:**  
✅ The system **removes duplicates**, **handles missing values**, and **formats data** for easier analysis.  
✅ A summary of **cleaned data** is displayed.  

---

## 12. Feature Engineering for Machine Learning

🟡 **■ User Action:** Select dataset features to be engineered for ML models.  
🔵 **▲ Expected Outcome:** The system generates engineered features **based on molecular properties**, ready for training predictive models.  

---

## 13. Submitting Annotations as Structured Graph Data

🟡 **■ User Action:** Annotate molecular structures with **highlights and text notes**.  
🔵 **▲ Expected Outcome:**  
✅ The annotations are **stored as structured graph data**.  
✅ Relationships between molecules and annotations are maintained in the backend for structured analysis.  

---

## 14. Navigating Through Molecular Lists

🟡 **■ User Action:** Scroll or use navigation buttons to browse molecular structures.  
🔵 **▲ Expected Outcome:** The system allows **paging through large datasets**, displaying molecular properties dynamically.  

---

## 15. Retrieving Molecule Data from Backend

🟡 **■ User Action:** Request molecular data from the backend via an API query.  
🔵 **▲ Expected Outcome:** The system retrieves and displays relevant molecular structures, properties, and annotations.  

---

## 16. Machine Learning Integration

🟡 **■ User Action:** Submit a molecular dataset and select an ML model for prediction.  
🔵 **▲ Expected Outcome:**  
✅ The ML model generates **predictions for properties like ADMET, solubility, and toxicity risks**.  
✅ Users can export results for further analysis.  
✅ Adjustable **confidence thresholds** allow fine-tuning predictions.  

---

## 17. User Registration & Login

🟡 **■ User Action:** Sign up using an email address and password.  
🔵 **▲ Expected Outcome:**  
✅ Users create an account and log in securely.  
✅ Previous work is saved and accessible in future sessions.  

---

## 18. Flagging Deviations from Specifications

🟡 **■ User Action:** Compare a molecule’s properties against predefined specifications.  
🔵 **▲ Expected Outcome:**  
✅ Properties **outside of set thresholds** are **highlighted or flagged**.  
✅ A detailed report of deviations is generated for further review.  

---
