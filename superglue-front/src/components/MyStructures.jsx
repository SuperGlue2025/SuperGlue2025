import React, { useEffect, useState } from "react";
import { Table, Button, message, Modal } from "antd";
import { useNavigate } from "react-router-dom";
import { apiFetch } from '../api';
/**
 * MyStructures ‑ list of saved sub‑structures.
 *
 */
const MyStructures = () => {
  /* ----------------------------- state --------------------------------- */
  const [data,          setData]          = useState([]);   // table rows
  const [loading,       setLoading]       = useState(false);
  const [svgModalOpen,  setSvgModalOpen]  = useState(false); // 
  const [svgMarkup,     setSvgMarkup]     = useState('');    // 

  const navigate = useNavigate();   

  /* ----------------------- fetch once on mount ------------------------- */
  useEffect(() => {
    const fetchSubstructures = async () => {
      setLoading(true);
      try {
        const res  = await apiFetch("/api/substructures");
        const json = await res.json();
        if (json.success) {
          const mapped = json.substructures.map(r => ({
            ...r,
            atoms : r.highlighted_atoms ? JSON.parse(r.highlighted_atoms) : [],
            bonds : r.highlighted_bonds ? JSON.parse(r.highlighted_bonds) : []
          }));
          setData(mapped);
        } else {
          message.error(json.error || 'Failed to load sub‑structures');
        }
      } catch (e) {
        console.error(e);
        message.error('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchSubstructures();
  }, []);

  /* --------------------------- columns --------------------------------- */
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
      sortDirections: ['ascend', 'descend']
    },
    { title: 'Molecule ID', dataIndex: 'molecule_id', key: 'mol' },
    { title: 'Annotation',  dataIndex: 'annotation_text', key: 'anno' },
    { title: 'SMARTS',      dataIndex: 'highlight_smarts', key: 'smarts', ellipsis: true },
    /* ------------------- SVG preview button --------------------------- */
    {
      title : 'Preview',
      key   : 'preview',
      width : 140,
      render: (_, record) => (
        <Button type="link" onClick={async () => {
          try {
            const res = await apiFetch('/api/get_molecule_svg', {
              method : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body   : JSON.stringify({
                smiles         : record.smiles,
                fragment_smarts: record.highlight_smarts || null
              })
            });
            const data = await res.json();
            if (data.success) {
              setSvgMarkup(data.svg);
              setSvgModalOpen(true);
            } else {
              message.error(data.error || 'Failed to fetch SVG');
            }
          } catch (err) {
            console.error(err);
            message.error('Server error');
          }
        }}>
          🖼 Preview SVG
        </Button>
      )
    }
  ];

  /* ---------------------------- render --------------------------------- */
  return (
    <div className="app-container">

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 10 }}
        showSorterTooltip={false}
      />

      {/* SVG preview */}
      <Modal
        title="Highlighted Sub‑structure"
        open={svgModalOpen}
        onCancel={() => setSvgModalOpen(false)}
        footer={null}
        width={550}
      >
        <div dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      </Modal>
    </div>
  );
};

export default MyStructures;
