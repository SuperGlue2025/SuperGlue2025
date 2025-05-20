import json
import os
import sqlite3
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'molecular_annotate.db')


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
    # Create new table for storing molecule ID with SDF files
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS molecule_structures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            molecule_id TEXT NOT NULL,
            smiles TEXT,
            sdf_content TEXT NOT NULL,
            timestamp TEXT,
            UNIQUE(molecule_id)  /* Ensure each molecule ID has only one structure record */
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
        print(f"存入数据库的 bond_indices: {highlighted_bonds}")
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


def save_molecule_structure(molecule_id, sdf_content, smiles=None, is_optimized=True, source='upload'):
    """Save molecule structure (SDF) to database"""
    try:
        # Ensure DB is initialized
        init_db()

        # Validate input parameters
        if not molecule_id or not sdf_content:
            print(
                f"Error: Missing required parameters - molecule_id: {molecule_id}, sdf_content length: {len(sdf_content) if sdf_content else 0}")
            return {
                "success": False,
                "error": "Missing required parameters: molecule_id or sdf_content"
            }

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        timestamp = datetime.now().isoformat()

        # Use REPLACE strategy to update record if molecule_id already exists
        cursor.execute('''
        INSERT OR REPLACE INTO molecule_structures
        (molecule_id, smiles, sdf_content, timestamp)
        VALUES (?, ?, ?, ?)
        ''', (molecule_id, smiles, sdf_content, timestamp))

        # Log the row count to confirm the insertion
        row_count = cursor.rowcount
        structure_id = cursor.lastrowid

        conn.commit()
        conn.close()

        print(
            f"Successfully saved structure for molecule {molecule_id}, rows affected: {row_count}, ID: {structure_id}")

        return {
            "success": True,
            "structure_id": structure_id,
            "message": f"Successfully saved 3D structure for molecule {molecule_id}"
        }
    except Exception as e:
        print(f"Database error saving structure: {str(e)}")
        # Return detailed error information
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }


def get_molecule_structure(molecule_id):
    """Retrieve molecular structure data, supporting flexible ID formats."""
    try:
        # Ensure the database is initialized
        init_db()

        if not molecule_id:
            return {
                "success": False,
                "message": "No molecule ID provided"
            }

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # Return rows as dictionaries
        cursor = conn.cursor()

        # Execute query with debug output
        print(f"DB: Looking up structure for molecule_id: {molecule_id}")

        # Attempt exact match
        cursor.execute('''
        SELECT * FROM molecule_structures
        WHERE molecule_id = ?
        ''', (molecule_id,))

        row = cursor.fetchone()

        # If not found, try alternate formats
        if not row:
            print(f"DB: No exact match found for molecule_id: {molecule_id}, trying alternative formats...")

            # If ID starts with a prefix like 'cmpd_', try without it
            if molecule_id.startswith('cmpd_'):
                numeric_id = molecule_id.replace('cmpd_', '')
                cursor.execute('''
                SELECT * FROM molecule_structures
                WHERE molecule_id = ?
                ''', (numeric_id,))
                row = cursor.fetchone()

                if not row:
                    # Try a fuzzy match using LIKE
                    cursor.execute('''
                    SELECT * FROM molecule_structures
                    WHERE molecule_id LIKE ?
                    ''', (f"%{numeric_id}%",))
                    row = cursor.fetchone()
            else:
                # If ID doesn't start with prefix, try adding one
                cursor.execute('''
                SELECT * FROM molecule_structures
                WHERE molecule_id = ? OR molecule_id = ?
                ''', (f"cmpd_{molecule_id}", f"Compound-{molecule_id}"))
                row = cursor.fetchone()

                if not row:
                    # Try a fuzzy match using LIKE
                    cursor.execute('''
                    SELECT * FROM molecule_structures
                    WHERE molecule_id LIKE ?
                    ''', (f"%{molecule_id}%",))
                    row = cursor.fetchone()

        conn.close()

        if not row:
            print(f"DB: No structure found for molecule_id: {molecule_id} after all attempts")
            return {
                "success": False,
                "message": f"No structure found for molecule {molecule_id}"
            }

        # Log the found record
        print(
            f"DB: Found structure with ID: {row['id']} for molecule_id: {molecule_id}. Stored as molecule_id: {row['molecule_id']}")
        structure = {
            "id": row['id'],
            "molecule_id": row['molecule_id'],
            "smiles": row['smiles'],
            "sdf_content": row['sdf_content'],
            "timestamp": row['timestamp']
        }

        return {
            "success": True,
            "structure": structure
        }

    except Exception as e:
        print(f"DB Error in get_molecule_structure: {str(e)}")
        import traceback
        return {
            "success": False,
            "message": f"Failed to retrieve structure: {str(e)}",
            "traceback": traceback.format_exc()
        }



def list_molecule_structures():
    """List all molecule structures in the database"""
    try:
        init_db()

        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
        SELECT molecule_id, smiles, timestamp 
        FROM molecule_structures
        ORDER BY timestamp DESC
        ''')

        rows = cursor.fetchall()
        conn.close()

        structures = []
        for row in rows:
            structures.append({
                "molecule_id": row['molecule_id'],
                "smiles": row['smiles'],
                "timestamp": row['timestamp']
            })

        return {
            "success": True,
            "count": len(structures),
            "structures": structures
        }
    except Exception as e:
        print(f"Error listing molecule structures: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }