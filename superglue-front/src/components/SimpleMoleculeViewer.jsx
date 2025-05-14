import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Select, Row, Col, message, Space, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Option } = Select;

// Enhanced molecular viewer component with SDF file support
const SimpleMoleculeViewer = ({ ketcher, ketcherPath }) => {
  const viewerRef = useRef(null);
  const ketcherRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [viewStyle, setViewStyle] = useState('stick');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSmiles, setCurrentSmiles] = useState('');
  const [sdfContent, setSdfContent] = useState('');
  const [moleculeLoaded, setMoleculeLoaded] = useState(false); // Track if molecule is loaded

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

  // Initialize 3D viewer with an empty scene
  const initViewer = () => {
    try {
      if (window.$3Dmol) {
        const viewerInstance = window.$3Dmol.createViewer(viewerRef.current, {
          backgroundColor: 'white',
          antialias: true
        });

        if (viewerInstance) {
          setViewer(viewerInstance);

          // Just initialize the viewer without any molecule
          viewerInstance.render();
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

  // Get current structure from Ketcher and update 3D molecule
  const updateMoleculeFrom2D = async () => {
    const ketcherInstance = ketcher || (ketcherRef.current ? ketcherRef.current.contentWindow?.ketcher : null);

    if (!ketcherInstance) {
      message.error('Ketcher instance not initialized');
      return;
    }

    try {
      setIsLoading(true);

      // First try to get structure as SDF/Molfile
      let molfile = await ketcherInstance.getMolfile();

      if (!molfile || molfile.trim() === '') {
        message.warning('No molecule to visualize');
        setIsLoading(false);
        return;
      }

      // Also get SMILES
      const smiles = await ketcherInstance.getSmiles();
      setCurrentSmiles(smiles);

      // Call backend API to perform structure conversion and optimization
      const response = await fetch('http://localhost:5001/api/optimize_structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          molfile: molfile,
          smiles: smiles,
          use_smiles: true // Tell backend to prefer SMILES method for 3D conversion
        })
      });

      if (!response.ok) {
        throw new Error('Failed to optimize and convert molecule structure');
      }

      const data = await response.json();

      if (data.success && data.optimized_sdf && viewer) {
        // Use the optimized SDF returned from the server
        displaySdfStructure(data.optimized_sdf);
      } else {
        throw new Error(data.error || 'Failed to generate optimized 3D structure');
      }
    } catch (error) {
      console.error('Error updating 3D molecule:', error);
      message.error('Error visualizing 3D molecule: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };


  // Handle SDF file upload and use it directly for 3D visualization
  const handleSdfUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      setSdfContent(content);

      try {
        setIsLoading(true);

        // Option 1: Display SDF directly if it already has 3D coordinates
        // This attempts to display the SDF without optimization
        try {
          displaySdfStructure(content);
          // If successfully displayed, we're done
          setIsLoading(false);
          return;
        } catch (e) {
          console.log('Direct SDF display failed, will try server optimization', e);
          // Continue to server-side optimization
        }

        // Option 2: Send to server for optimization
        const response = await fetch('http://localhost:5001/api/optimize_structure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            molfile: content,
            use_smiles: false // Tell backend to use the SDF file directly
          })
        });

        if (!response.ok) {
          throw new Error('Failed to optimize SDF structure');
        }

        const data = await response.json();

        if (data.success && data.optimized_sdf) {
          displaySdfStructure(data.optimized_sdf);
        } else {
          throw new Error(data.error || 'Failed to optimize SDF structure');
        }
      } catch (error) {
        console.error('Error processing SDF file:', error);
        message.error('Error processing SDF file: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsText(file);
    return false; // Prevent default upload behavior
  };

  // Display SDF structure directly in the 3D viewer
  const displaySdfStructure = (sdfData) => {
    if (!viewer || !sdfData) {
      return;
    }

    try {
      // Clear current model
      viewer.clear();

      // Add SDF model directly to viewer (SDF already contains 3D coordinates)
      viewer.addModel(sdfData, 'sdf');

      // Apply view style
      applyViewStyle(viewStyle);

      // Zoom and render
      viewer.zoomTo();
      viewer.render();

      setMoleculeLoaded(true); // Update state to indicate molecule is loaded
      message.success('3D structure loaded successfully');
    } catch (error) {
      console.error('Error displaying SDF structure:', error);
      message.error('Failed to display 3D structure');
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

  // Try to get structure if external ketcher is provided - now this is commented out to prevent auto-loading
  // useEffect(() => {
  //   if (ketcher) {
  //     try {
  //       ketcher.getMolfile().then(molfile => {
  //         if (molfile && molfile.trim() !== '') {
  //           // Try to visualize directly if it has 3D coordinates
  //           try {
  //             if (viewer) {
  //               displaySdfStructure(molfile);
  //             }
  //           } catch (e) {
  //             console.log('Direct visualization failed, may need conversion', e);
  //           }
  //         }
  //       });
  //     } catch (error) {
  //       console.error('Error getting structure from Ketcher:', error);
  //     }
  //   }
  // }, [ketcher, viewer]);

  return (
    <Card title="3D Molecule Viewer">
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
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f9f9f9'
            }}
          >
            {!moleculeLoaded && !isLoading && (
              <div style={{
                color: '#888',
                fontSize: '16px',
                textAlign: 'center',
                position: 'absolute',
                zIndex: 1
              }}>
                No molecule loaded. Use buttons below to load a 3D structure.
              </div>
            )}

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
              <Button
                type="primary"
                onClick={updateMoleculeFrom2D}
                loading={isLoading}
                title="Convert current 2D structure to 3D using SMILES"
              >
                SMILES to 3D
              </Button>
              <Upload
                beforeUpload={handleSdfUpload}
                showUploadList={false}
                accept=".sdf,.mol"
              >
                <Button
                  icon={<UploadOutlined />}
                  loading={isLoading}
                  title="Load a 3D structure from SDF file"
                >
                  Load SDF
                </Button>
              </Upload>
              <Select
                value={viewStyle}
                onChange={handleViewStyleChange}
                style={{ width: 160 }}
                disabled={!moleculeLoaded} // Disable style selector if no molecule is loaded
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