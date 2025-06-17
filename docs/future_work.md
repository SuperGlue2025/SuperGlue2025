# Future Work & Handoff Notes

As the project transitions to the stakeholder company, here are recommended future improvements, ordered from foundational fixes to long-term enhancements.

## ✅ Priority Fixes & Incomplete Features

- **Fix similarity search "View" preview behavior**  
Viewing a compound from similarity search loads it into Ketcher but desynchronizes it from the right panel and other functions (e.g. properties, highlights, substructure match). Fix by either previewing SVG in a separate viewer or using hover previews.

- **Fix multi-user dataset access conflicts**  
When a user opens a dataset uploaded by a different account, similarity search and other backend functions may fail. Add user-level dataset scoping or ownership checks to prevent errors.

- **Enable annotation editing/deletion**  
  Currently, icons are present but not functional.

- **Highlight the current compound on ADMET distribution plots**  
  Previously shown as a red vertical marker; should be restored to help users locate the selected molecule's property within the distribution.

- **Add back button or smoother navigation from filter modal**  
The full-screen filter view in similarity search lacks a back button. Currently, users must use the browser back button, but returns them to the summary page.

- **Improve layout rendering**  
  Some elements shift outside the page on zoom/rescale; layout needs to be more responsive.

- **My Structures table → deep linking**  
  Add functionality to click a row in *My Structures* and jump directly to the annotation page with that highlight loaded in Ketcher.

- **Add similarity threshold filter**  
  Let users set a minimum similarity score before running a search.

- **UI label consistency**  
  Some button names or labels can be improved for clarity.

- **Switch to composite database key**  
  Improve indexing by using (`molecule_id`, `dataset_id`) or similar composite keys.

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
