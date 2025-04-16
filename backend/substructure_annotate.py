import json
import os
import sqlite3
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'molecular_annotations.db')

def init_db():
    """Initialize database with substructure table if it doesn't exist"""
    # Make sure data directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table for substructure highlights
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS molecule_substructures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        molecule_id TEXT NOT NULL,
        highlighted_atoms TEXT NOT NULL,
        highlighted_bonds TEXT,
        smiles TEXT,
        timestamp TEXT,
        notes TEXT
    )
    ''')
    
    conn.commit()
    conn.close()

def save_substructure(molecule_id, highlighted_atoms, highlighted_bonds=None, smiles=None, notes=None):
    """Save highlighted substructure information to database"""
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
        (molecule_id, highlighted_atoms, highlighted_bonds, smiles, timestamp, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (molecule_id, atoms_json, bonds_json, smiles, timestamp, notes))
        
        substructure_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "substructure_id": substructure_id,
            "message": f"Successfully saved substructure with {len(highlighted_atoms)} atoms"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def get_molecule_substructures(molecule_id):
    """Get all substructures for a specific molecule"""
    try:
        # Ensure DB is initialized
        init_db()
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # Return results as dictionaries
        cursor = conn.cursor()
        
        cursor.execute('''
        SELECT * FROM molecule_substructures
        WHERE molecule_id = ?
        ORDER BY timestamp DESC
        ''', (molecule_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        substructures = []
        for row in rows:
            row_dict = dict(row)
            # Parse JSON fields
            row_dict['highlighted_atoms'] = json.loads(row_dict['highlighted_atoms'])
            if row_dict['highlighted_bonds']:
                row_dict['highlighted_bonds'] = json.loads(row_dict['highlighted_bonds'])
            substructures.append(row_dict)
        
        return {
            "success": True,
            "substructures": substructures
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }