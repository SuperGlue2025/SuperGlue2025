# Future Work & Handoff Notes

As the project transitions to the stakeholder company, here are recommended future improvements, ordered from foundational fixes to long-term enhancements.

## ✅ Priority Fixes & Incomplete Features

- **Similarity Search Errors**  
  **Issue**: If multiple users are logged in and share the same backend session, similarity search may throw errors.

  **Temporary Fix**: Return to the homepage and re-upload the dataset to reset your session state.

- **Preview Molecule Misalignment**  
  **Current Behavior**: Clicking the "**View**" button in similarity search results sends the selected molecule to **Ketcher** for preview.

  **Issue**: The molecule stays in Ketcher after switching tabs (e.g. to Properties or Highlights), which causes a mismatch between the displayed molecule and the right-side info.
  - This also affects **View Highlights**, as it incorrectly references atom indices from the previewed molecule.

  **Temporary Fix**: Return to the summary page and re-select the molecule.  
  **Planned Fixes**:
  - Show preview in a **separate preview box**, not in **Ketcher**.
  - Or enable **hover-to-preview** via SVG rendering for a more isolated and accurate display.
- **Enable annotation editing/deletion**  
  Currently, icons are present but not functional.
  
- **Fix similarity search preview**  
  "View" button in similarity results should display the compound preview.

- **Improve layout rendering**  
  Some elements shift outside the page on zoom/rescale; layout needs to be more responsive.

- **My Structures table → deep linking**  
  Add functionality to click a row in *My Structures* and jump directly to the annotation page with that highlight loaded in Ketcher.

- **Add similarity threshold filter**  
  Let users set a minimum similarity score before running a search.

- **UI label consistency**  
  Some button names or labels can be improved for clarity.

- **Switch to composite database key**  
  Improve indexing by using (molecule_id, dataset_id) or similar composite keys.

- **Schema naming cleanup**  
  Rename fields like `molecule_id` → `cmpd_id` for clarity and consistency.

---

## 🚀 Planned Feature Enhancements

- **Export annotations & highlights**  
  Let users download their work for offline reference or publication.

- **Editable molecule canvas**  
  Enable molecule editing in Ketcher with the option to save as updated or new compound. Currently, edits are visual-only.

- **Centralized/cloud database**  
  Consider hosting the database to enable shared access and team collaboration.

- **Complete login functionality**  
  Placeholder auth is implemented; future versions can support user-specific data and permissions.

- **Multi-user collaboration**  
  Support features like shared annotations, likes, comments, and team review.

---

## 🧪 Long-Term Ideas & Research Prototypes

- **Automated similarity search across external databases**  
  - Compare uploaded compounds to curated external databases (e.g., PubChem, ChEMBL, DrugBank).  
  - Consider filtering candidates by molecular weight or functional groups before running full similarity search.  
  - Add SVG previews of matched molecules.  
  - Explore database options: [List of Chemical Databases](https://en.wikipedia.org/wiki/List_of_chemical_databases).

- **Protein Data Bank integration**  
  Embed relevant protein-ligand interaction data using PDB IDs and 3D viewers for structural context.

---

These notes are intended to guide future developers and collaborators as they evolve Super-Glue into a more powerful, collaborative chemical informatics platform.
