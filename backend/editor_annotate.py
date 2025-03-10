from flask import jsonify, request
import sqlite3
import os
import datetime

# Create a database path relative to the current file
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(CURRENT_DIR, "data", "annotations.db")

def init_db():
    """Initialize the annotations database if it doesn't exist"""
    # Ensure the data directory exists
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create annotations table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS annotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        molecule_id TEXT NOT NULL,
        annotation TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create index on molecule_id for faster lookups
    cursor.execute('''
    CREATE INDEX IF NOT EXISTS idx_molecule_id ON annotations(molecule_id)
    ''')
    
    conn.commit()
    conn.close()

# Initialize the database when the module is loaded
init_db()

def get_annotations(molecule_id):
    """Get all annotations for a specific molecule"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row  # Return rows as dictionaries
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id, molecule_id, annotation, created_at, updated_at FROM annotations WHERE molecule_id = ? ORDER BY created_at DESC", 
            (molecule_id,)
        )
        
        rows = cursor.fetchall()
        annotations = []
        
        for row in rows:
            annotations.append({
                "id": row["id"],
                "molecule_id": row["molecule_id"],
                "annotation": row["annotation"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            })
        
        conn.close()
        return {"success": True, "annotations": annotations}
    except Exception as e:
        return {"success": False, "error": str(e)}

def add_annotation(molecule_id, annotation):
    """Add a new annotation for a molecule"""
    try:
        if not molecule_id or not annotation:
            return {"success": False, "error": "Molecule ID and annotation text are required"}
        
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO annotations (molecule_id, annotation, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (molecule_id, annotation, now, now)
        )
        
        annotation_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "success": True, 
            "id": annotation_id,
            "message": "Annotation added successfully"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def update_annotation(annotation_id, annotation):
    """Update an existing annotation"""
    try:
        if not annotation_id or not annotation:
            return {"success": False, "error": "Annotation ID and text are required"}
        
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE annotations SET annotation = ?, updated_at = ? WHERE id = ?",
            (annotation, now, annotation_id)
        )
        
        if cursor.rowcount == 0:
            conn.close()
            return {"success": False, "error": f"Annotation with ID {annotation_id} not found"}
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Annotation updated successfully"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def delete_annotation(annotation_id):
    """Delete an annotation by ID"""
    try:
        if not annotation_id:
            return {"success": False, "error": "Annotation ID is required"}
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM annotations WHERE id = ?", (annotation_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return {"success": False, "error": f"Annotation with ID {annotation_id} not found"}
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Annotation deleted successfully"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_compounds():
    """Get all compounds with annotations (stub implementation - adapt to your data model)"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get distinct molecule IDs that have annotations
        cursor.execute(
            "SELECT DISTINCT molecule_id FROM annotations"
        )
        
        rows = cursor.fetchall()
        compounds = []
        
        for row in rows:
            # Count annotations for each molecule
            cursor.execute(
                "SELECT COUNT(*) as annotation_count FROM annotations WHERE molecule_id = ?",
                (row["molecule_id"],)
            )
            count_row = cursor.fetchone()
            
            compounds.append({
                "id": row["molecule_id"],
                "annotation_count": count_row["annotation_count"]
            })
        
        conn.close()
        return jsonify({"success": True, "compounds": compounds})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})