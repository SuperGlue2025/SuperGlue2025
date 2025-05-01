import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Select, Row, Col, message, Space } from 'antd';

const { Option } = Select;

// Simplified molecular viewer component, integrating Ketcher 2D and 3Dmol 3D view
const SimpleMoleculeViewer = ({ ketcher, ketcherPath }) => {
  const viewerRef = useRef(null);
  const ketcherRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [viewStyle, setViewStyle] = useState('stick');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSmiles, setCurrentSmiles] = useState('');

  // Initialize 3Dmol.js
  useEffect(() => {
    if (!viewerRef.current) return;

    // Check if 3Dmol script is already loaded
    const script = document.querySelector('script[src*="3Dmol"]');

    if (!script) {
      // If not loaded, add the script
      const threeScript = document.createElement('script');
      threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.3/3Dmol-min.js';
      threeScript.async = true;
      threeScript.onload = initViewer;
      document.body.appendChild(threeScript);
    } else {
      // If already loaded, initialize directly
      initViewer();
    }

    return () => {
      if (viewer) {
        try {
          viewer.clear();
        } catch (e) {
          console.error('Error clearing 3D viewer:', e);
        }
      }
    };
  }, []);

  // Initialize 3D viewer
  const initViewer = () => {
    try {
      if (window.$3Dmol) {
        const viewerInstance = window.$3Dmol.createViewer(viewerRef.current, {
          backgroundColor: 'white',
          antialias: true
        });

        if (viewerInstance) {
          setViewer(viewerInstance);
        }
      } else {
        console.error('3Dmol library failed to load');
        message.error('Failed to load 3D viewer library');
      }
    } catch (error) {
      console.error('Error initializing 3D viewer:', error);
      message.error('Error initializing 3D viewer');
    }
  };

  // Get current SMILES from Ketcher and update 3D molecule
  const updateMoleculeFrom2D = async () => {
    const ketcherInstance = ketcher || (ketcherRef.current ? ketcherRef.current.contentWindow?.ketcher : null);

    if (!ketcherInstance) {
      message.error('Ketcher instance not initialized');
      return;
    }

    try {
      setIsLoading(true);
      const currentSmiles = await ketcherInstance.getSmiles();

      if (!currentSmiles) {
        message.warning('No molecule to visualize');
        setIsLoading(false);
        return;
      }

      setCurrentSmiles(currentSmiles);

      // Call backend API to convert SMILES to 3D structure
      const response = await fetch('http://localhost:5001/api/convert_to_3d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ smiles: currentSmiles })
      });

      if (!response.ok) {
        throw new Error('Failed to convert molecule to 3D structure');
      }

      const data = await response.json();

      if (data.success && data.molblock && viewer) {
        // Clear current model
        viewer.clear();

        // Add new 3D molecule
        viewer.addModel(data.molblock, 'mol');

        // Apply view style
        applyViewStyle(viewStyle);

        // Zoom and render
        viewer.zoomTo();
        viewer.render();
      } else {
        throw new Error(data.error || 'Failed to generate 3D structure');
      }
    } catch (error) {
      console.error('Error updating 3D molecule:', error);
      message.error('Error visualizing 3D molecule: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply different view styles
  const applyViewStyle = (style) => {
    if (!viewer) return;

    viewer.setStyle({}, {});

    switch (style) {
      case 'stick':
        viewer.setStyle({}, { stick: {} });
        break;
      case 'sphere':
        viewer.setStyle({}, { sphere: { scale: 0.25 } });
        break;
      case 'ball-stick':
        viewer.setStyle({}, { stick: {}, sphere: { scale: 0.25 } });
        break;
      case 'line':
        viewer.setStyle({}, { line: {} });
        break;
      default:
        viewer.setStyle({}, { stick: {} });
    }

    viewer.render();
  };

  const handleViewStyleChange = (value) => {
    setViewStyle(value);
    if (viewer) {
      applyViewStyle(value);
    }
  };

  // Try to get SMILES if external ketcher is provided
  useEffect(() => {
    if (ketcher) {
      try {
        ketcher.getSmiles().then(smiles => {
          if (smiles) {
            setCurrentSmiles(smiles);
          }
        });
      } catch (error) {
        console.error('Error getting SMILES from Ketcher:', error);
      }
    }
  }, [ketcher]);

  return (
    <Card title="3D Viewer">
      <Row gutter={16}>
        {/* 3Dmol.js 3D viewer */}
        <Col span={24}>
          <div
            ref={viewerRef}
            style={{
              width: '100%',
              height: '400px',
              position: 'relative',
              border: '1px solid #ddd',
              borderRadius: '4px',
              overflow: 'hidden'
            }}
          >
            {isLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10
              }}>
                <div style={{
                  border: '5px solid #f3f3f3',
                  borderTop: '5px solid #1890ff',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  animation: 'spin 2s linear infinite'
                }} />
              </div>
            )}
          </div>

          {/* 3D viewer controls */}
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
            <Space>
              <Button type="primary" onClick={updateMoleculeFrom2D} loading={isLoading}>
                3D
              </Button>
              <Select
                value={viewStyle}
                onChange={handleViewStyleChange}
                style={{ width: 160 }}
              >
                <Option value="stick">Stick Model</Option>
                <Option value="sphere">Sphere Model</Option>
                <Option value="ball-stick">Ball-and-Stick Model</Option>
                <Option value="line">Wireframe Model</Option>
              </Select>
            </Space>
          </div>
        </Col>
      </Row>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
};

export default SimpleMoleculeViewer;
