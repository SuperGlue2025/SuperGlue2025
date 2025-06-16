/**
 * SimpleMoleculeViewer Component
 *
 * This component provides a 3D molecule viewer using 3DMol.js, supporting SDF/SMILES structure display,
 * style switching, file upload, and integration with Ketcher for 2D-to-3D conversion.
 *
 * Props:
 *   - ketcher: Ketcher instance for 2D structure editing
 *   - ketcherPath: Path to the Ketcher editor
 *   - moleculeId: Molecule identifier
 *   - isActive: Whether the viewer tab is active (default: true)
 */

import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Select, Row, Col, message, Space, Upload } from 'antd';
import { UploadOutlined, ReloadOutlined } from '@ant-design/icons';

const { Option } = Select;

// Enhanced molecule viewer component, fully rewritten to solve auto-loading issues
const SimpleMoleculeViewer = ({ ketcher, ketcherPath, moleculeId, isActive = true }) => {
  // Track component lifecycle in detail
  useEffect(() => {
    console.log(`[DEBUG] 3D Viewer MOUNTED - ID:${moleculeId}, Active:${isActive}`);
    return () => console.log(`[DEBUG] 3D Viewer UNMOUNTED - ID:${moleculeId}`);
  }, []);

  // Component refs and state
  const viewerRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [viewStyle, setViewStyle] = useState('stick');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSmiles, setCurrentSmiles] = useState('');
  const [moleculeLoaded, setMoleculeLoaded] = useState(false);

  // Track how many times 3D structure load is attempted
  const [loadAttemptCount, setLoadAttemptCount] = useState(0);
  const loadAttemptRef = useRef(0);

  // Get a valid molecule ID
  const effectiveId = moleculeId || `temp_molecule_${Date.now()}`;

  // Listen for changes to tab activation
  useEffect(() => {
    console.log(`[DEBUG] 3D Tab Active State changed to: ${isActive}`);
    if (isActive) {
      const newCount = loadAttemptRef.current + 1;
      loadAttemptRef.current = newCount;
      setLoadAttemptCount(newCount);
      console.log(`[DEBUG] Tab activated, increasing load attempt to ${newCount}`);
    }
  }, [isActive]);

  // React to load attempt changes
  useEffect(() => {
    if (loadAttemptCount > 0 && viewer && isActive) {
      console.log(`[DEBUG] Load attempt #${loadAttemptCount}, forcing database load`);
      loadStructureFromDatabase(effectiveId);
    }
  }, [loadAttemptCount, viewer, isActive]);

  // Initialize 3DMol.js library
  useEffect(() => {
    if (!viewerRef.current) return;

    const loadScript = () => {
      console.log('[DEBUG] Loading 3DMol.js script');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.3/3Dmol-min.js';
      script.async = true;
      script.onload = () => {
        console.log('[DEBUG] 3DMol.js script loaded successfully');
        initializeViewer();
      };
      document.body.appendChild(script);
    };

    const initializeViewer = () => {
      try {
        console.log('[DEBUG] Initializing 3D viewer');
        if (!window.$3Dmol) {
          console.error('[ERROR] 3DMol library not found');
          message.error('Failed to load 3D viewer library');
          return;
        }

        const viewerInstance = window.$3Dmol.createViewer(viewerRef.current, {
          backgroundColor: 'white',
          antialias: true
        });

        if (viewerInstance) {
          console.log('[DEBUG] 3D viewer created successfully');
          setViewer(viewerInstance);
          viewerInstance.render();

          if (isActive) {
            const newCount = loadAttemptRef.current + 1;
            loadAttemptRef.current = newCount;
            setLoadAttemptCount(newCount);
            console.log(`[DEBUG] Viewer created, setting load attempt to ${newCount}`);
          }
        } else {
          console.error('[ERROR] Failed to create 3DMol viewer instance');
          message.error('Failed to create 3D viewer');
        }
      } catch (error) {
        console.error('[ERROR] Error initializing 3D viewer:', error);
        message.error('Error initializing 3D viewer');
      }
    };

    if (window.$3Dmol) {
      console.log('[DEBUG] 3DMol.js already loaded, initializing viewer');
      initializeViewer();
    } else {
      const existingScript = document.querySelector('script[src*="3Dmol"]');
      if (existingScript) {
        console.log('[DEBUG] 3DMol.js script tag exists but not loaded yet, waiting...');
        existingScript.addEventListener('load', initializeViewer);
      } else {
        loadScript();
      }
    }

    // Cleanup function
    return () => {
      if (viewer) {
        try {
          console.log('[DEBUG] Cleaning up 3D viewer');
          viewer.clear();
        } catch (e) {
          console.error('[ERROR] Error clearing 3D viewer:', e);
        }
      }
    };
  }, []);

  // Display SDF structure in viewer
  const displaySdfStructure = (sdfData) => {
    if (!viewer || !sdfData) {
      console.error('[ERROR] Cannot display structure: viewer or data missing');
      return;
    }

    try {
      console.log('[DEBUG] Displaying SDF structure in viewer');
      viewer.clear();
      viewer.addModel(sdfData, 'sdf');
      applyViewStyle(viewStyle);
      viewer.zoomTo();
      viewer.render();

      setMoleculeLoaded(true);
      message.success('3D structure loaded successfully');
    } catch (error) {
      console.error('[ERROR] Failed to display SDF structure:', error);
      message.error('Failed to display 3D structure');
    }
  };

  // Load molecule structure from database
  const loadStructureFromDatabase = async (id) => {
    if (!id || !viewer) {
      console.warn(`[WARN] Cannot load structure: ${!id ? 'no ID' : 'no viewer'}`);
      return;
    }

    try {
      setIsLoading(true);
      console.log(`[DEBUG] Loading structure for molecule ID: ${id}`);

      const response = await fetch(`http://localhost:5001/api/get_molecule_structure/${id}`);

      if (!response.ok) {
        console.log(`[DEBUG] No structure found for molecule ${id}`);
        setIsLoading(false);
        return;
      }

      const responseText = await response.text();
      console.log(`[DEBUG] Server response for ID ${id}:`, responseText.substring(0, 100) + '...');

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.error('[ERROR] Failed to parse response:', error);
        message.error('Server returned invalid data');
        setIsLoading(false);
        return;
      }

      if (data.success && data.structure && data.structure.sdf_content) {
        console.log(`[DEBUG] Found structure for ${id}, SDF content length: ${data.structure.sdf_content.length}`);

        if (data.structure.sdf_content.trim() === '') {
          console.error('[ERROR] SDF content is empty');
          message.error('Empty SDF content received from server');
          setIsLoading(false);
          return;
        }

        displaySdfStructure(data.structure.sdf_content);
        message.success('Previously saved 3D structure loaded automatically');

        if (data.structure.smiles) {
          setCurrentSmiles(data.structure.smiles);
        }
      } else {
        console.warn('[WARN] No valid structure found:', data);
        message.info('No saved 3D structure found for this molecule');
      }
    } catch (error) {
      console.error('[ERROR] Error loading structure:', error);
      message.error(`Could not load structure: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get current structure from Ketcher and convert to 3D
  const updateMoleculeFrom2D = async () => {
    if (!ketcher) {
      message.error('Ketcher instance not initialized');
      return;
    }

    try {
      setIsLoading(true);
      console.log('[DEBUG] Converting 2D structure to 3D');

      // Get Ketcher molfile
      const molfile = await ketcher.getMolfile();
      if (!molfile || molfile.trim() === '') {
        message.warning('No molecule to visualize');
        setIsLoading(false);
        return;
      }

      // Get SMILES
      const smiles = await ketcher.getSmiles();
      setCurrentSmiles(smiles);

      // Convert to 3D
      console.log(`[DEBUG] Converting structure for molecule ID: ${effectiveId}`);
      const response = await fetch('http://localhost:5001/api/optimize_structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          molfile: molfile,
          smiles: smiles,
          use_smiles: true,
          molecule_id: effectiveId
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.optimized_sdf && viewer) {
        displaySdfStructure(data.optimized_sdf);
        message.info('3D structure generated from SMILES (for preview only)');
      } else {
        throw new Error(data.error || 'Failed to generate 3D structure');
      }
    } catch (error) {
      console.error('[ERROR] Error in SMILES to 3D conversion:', error);
      message.error(`Error generating 3D structure: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle SDF file upload
  const handleSdfUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsLoading(true);
        console.log('[DEBUG] Processing uploaded SDF file');

        const content = e.target.result;
        if (!content || typeof content !== 'string' || content.trim() === '') {
          message.error('Invalid or empty SDF file');
          setIsLoading(false);
          return;
        }

        // Try displaying SDF directly
        try {
          displaySdfStructure(content);
        } catch (e) {
          console.warn('[WARN] Direct SDF display failed, will try server optimization:', e);
        }

        // Send to server for optimization and saving
        console.log(`[DEBUG] Sending SDF to server for molecule ID: ${effectiveId}`);
        const response = await fetch('http://localhost:5001/api/optimize_structure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            molfile: content,
            use_smiles: false,
            molecule_id: effectiveId,
            smiles: currentSmiles || ''
          })
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[DEBUG] Server response for SDF upload:', data);

        if (data.success) {
          if (data.db_saved) {
            message.success(`3D structure saved to database with ID: ${effectiveId}`);
            const newCount = loadAttemptRef.current + 1;
            loadAttemptRef.current = newCount;
            setLoadAttemptCount(newCount);
          } else {
            message.warning('Structure displayed but not saved to database');
          }
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (error) {
        console.error('[ERROR] Error processing SDF file:', error);
        message.error(`Error processing SDF file: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsText(file);
    return false;
  };


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


  const handleForceReload = () => {
    console.log('[DEBUG] Manual reload requested');
    const newCount = loadAttemptRef.current + 1;
    loadAttemptRef.current = newCount;
    setLoadAttemptCount(newCount);
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>3D Molecule Viewer</span>
          <span style={{ fontSize: '12px', color: '#888' }}>
            {moleculeLoaded ? 'Structure loaded' : 'No structure'}
            {isActive ? ' | Tab active' : ' | Tab inactive'}
          </span>
        </div>
      }
    >
      <Row gutter={16}>
        <Col span={24}>
          {/* 3D viewer */}
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

          {/* control button */}
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
            <Space>
              <Button
                type="primary"
                onClick={updateMoleculeFrom2D}
                loading={isLoading}
                icon={<ReloadOutlined />}
                title="Convert current 2D structure to 3D (preview only)"
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
                  title="Load and save 3D structure from SDF file"
                >
                  Load SDF
                </Button>
              </Upload>
              <Button
                type="default"
                onClick={handleForceReload}
                loading={isLoading}
                title="Manually reload structure from database"
              >
                Reload
              </Button>
              <Select
                value={viewStyle}
                onChange={handleViewStyleChange}
                style={{ width: 160 }}
                disabled={!moleculeLoaded}
              >
                <Option value="stick">Stick Model</Option>
                <Option value="sphere">Sphere Model</Option>
                <Option value="ball-stick">Ball-and-Stick Model</Option>
                <Option value="line">Wireframe Model</Option>
              </Select>
            </Space>
          </div>

          {/* Information display section */}
          <div style={{ marginTop: '10px', textAlign: 'center', color: '#999' }}>
            {moleculeId ?
              `Molecule ID: ${moleculeId}` :
              'No Molecule ID provided'
            }
          </div>

          <div style={{ marginTop: '5px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
            Note: Only SDF-loaded structures are saved to the database. SMILES-generated structures are for preview only.
            {moleculeLoaded && <div style={{ marginTop: '3px' }}>Last loaded: {new Date().toLocaleTimeString()}</div>}
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