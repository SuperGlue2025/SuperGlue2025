import json
import os
import sqlite3
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'molecular_annotation.db')


def init_db():
    """Initialize database with substructure table if it doesn't exist"""
    # Make sure data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create table for substructure highlights with annotation text field
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS molecule_substructures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        molecule_id TEXT NOT NULL,
        smiles TEXT,
        highlighted_atoms TEXT NOT NULL,
        highlighted_bonds TEXT,
        highlight_smiles TEXT,
        highlight_smarts TEXT,
        annotation_text TEXT,
        timestamp TEXT
    )
    ''')

    conn.commit()
    conn.close()

def save_substructure(molecule_id, smiles, highlighted_atoms, highlighted_bonds=None,
                      fragment_smiles=None, fragment_smarts=None, annotation_text=None):
    """Save highlighted substructure information and annotation to database"""
    try:
        # Ensure DB is initialized
        init_db()

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Convert atom/bond lists to JSON strings
        atoms_json = json.dumps(highlighted_atoms)
        bonds_json = json.dumps(highlighted_bonds) if highlighted_bonds else None
        timestamp = datetime.now().isoformat()

        cursor.execute('''
        INSERT INTO molecule_substructures
        (molecule_id, smiles, highlighted_atoms, highlighted_bonds, highlight_smiles, highlight_smarts, annotation_text, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (molecule_id, smiles, atoms_json, bonds_json, fragment_smiles, fragment_smarts, annotation_text, timestamp))

        substructure_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return {
            "success": True,
            "substructure_id": substructure_id,
            "message": f"Successfully saved substructure with {len(highlighted_atoms)} atoms" +
                      (f" and {len(highlighted_bonds) if highlighted_bonds else 0} bonds" ) +
                      (f" and annotation" if annotation_text else ""),
            "canonicalAtoms": highlighted_atoms,
            "canonicalBonds": highlighted_bonds,
            "smiles": fragment_smiles,
            "smarts": fragment_smarts
        }
    except Exception as e:
        print(f"Database error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def get_molecule_highlights(molecule_id, filename=''):
    """Retrieve all highlighted substructures for a specific molecule."""
    try:
        # Ensure the database is initialized
        init_db()

        import sqlite3
        import json

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # Return results as dictionaries
        cursor = conn.cursor()

        # Adjust the query based on your table schema
        cursor.execute('''
        SELECT * FROM molecule_substructures
        WHERE molecule_id = ?
        ORDER BY timestamp DESC
        ''', (molecule_id,))

        rows = cursor.fetchall()
        conn.close()

        highlights = []
        for row in rows:
            row_dict = dict(row)
            # Parse JSON fields
            highlight = {
                "id": row_dict.get('id'),
                "smiles": row_dict.get('smiles', ''),
                "atoms": json.loads(row_dict.get('highlighted_atoms', '[]')),
                "bonds": json.loads(row_dict.get('highlighted_bonds', '[]')) if row_dict.get(
                    'highlighted_bonds') else [],
                "fragment_smiles": row_dict.get('highlight_smiles', ''),
                "fragment_smarts": row_dict.get('highlight_smarts', ''),
                "annotation": row_dict.get('annotation_text', ''),
                "timestamp": row_dict.get('timestamp')
            }
            print(f"Constructed highlight object: {highlight}")

            highlights.append(highlight)

        return {
            "success": True,
            "highlights": highlights
        }
    except Exception as e:
        print(f"Error in get_molecule_highlights: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to retrieve highlighted substructures: {str(e)}"
        }
