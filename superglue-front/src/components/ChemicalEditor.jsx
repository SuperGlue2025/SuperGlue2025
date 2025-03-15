import React, { useState, useEffect, useRef } from 'react';
import { Button, message, Tabs, Layout, Menu, Card, List, Typography, Table, Space, Divider, Image, Collapse } from 'antd';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  EditOutlined,
  FileSearchOutlined,
  CalculatorOutlined,
  ExportOutlined,
  CommentOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  TableOutlined,
  DownOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FilterOutlined
} from '@ant-design/icons';
import SimilaritySearch from './SimilaritySearch';
import '../styles/main.css';
import SidebarFilter from './SidebarFilter';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

const MoleculeIndex = () => {
  // Get the URL parameter
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  // Use the URL id parameter
  const moleculeIdFromParams = id ? parseInt(id, 10) : null;

  const [ketcher, setKetcher] = useState(null);
  const [currentSmiles, setCurrentSmiles] = useState('');
  const [ketcherSmiles, setKetcherSmiles] = useState('');
  const [ketcherMolfile, setKetcherMolfile] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTab, setSelectedTab] = useState('annotate');

  // state for similarity search
  const [similaritySearchVisible, setSimilaritySearchVisible] = useState(false);
  const [showResultsTable, setShowResultsTable] = useState(false);
  const [similarityResults, setSimilarityResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [similarityMethod, setSimilarityMethod] = useState('tanimoto');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMethod, setSearchMethod] = useState('');

  // State for selected compound visualization
  const [selectedCompound, setSelectedCompound] = useState(null);
  const [moleculeImage, setMoleculeImage] = useState('');
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Get dynamic molecule property from CSV
  const [moleculeProperties, setMoleculeProperties] = useState({});
  const [propertyKeys, setPropertyKeys] = useState([]);
  
  // Parse state from URL query if available (this matches CsvPreview's behavior)
  const [parsedState, setParsedState] = useState(null);
  
  //annotations:
  const [annotations, setAnnotations] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState('');
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false);
  const [isSavingAnnotation, setIsSavingAnnotation] = useState(false);
  //State for filter sidebar
    const [showFilterSidebar, setShowFilterSidebar] = useState(false);
    const [filtersActive, setFiltersActive] = useState(false);
    const [activeFilters, setActiveFilters] = useState({});
    const [enabledFilters, setEnabledFilters] = useState({
      similarity: true,
      binary_occ: false,
      cont_occ: false,
      low_gsh_prob: false,
      med_gsh_prob: false,
      high_gsh_prob: false,
      selectivity: false
    });
  
    // Store original results for filter reset
    const [originalResults, setOriginalResults] = useState([]);
  useEffect(() => {
    // First try to get state from URL query parameter (as done in CsvPreview)
    const params = new URLSearchParams(location.search);
    const stateParam = params.get('state');
    
    let stateData = null;
    
    if (stateParam) {
      try {
        stateData = JSON.parse(decodeURIComponent(stateParam));
        console.log("State from URL:", stateData);
        setParsedState(stateData);
      } catch (error) {
        console.error("Error parsing state from URL:", error);
      }
    }
    
    // If no URL state, try location.state (React Router state)
    if (!stateData && location.state) {
      stateData = location.state;
      console.log("State from location:", stateData);
      setParsedState(stateData);
    }
    
    // If still no state, try sessionStorage as fallback
    if (!stateData && moleculeIdFromParams) {
      const storedStateKey = `editorState_${moleculeIdFromParams}`;
      const storedState = sessionStorage.getItem(storedStateKey);
      
      if (storedState) {
        try {
          stateData = JSON.parse(storedState);
          console.log("State from sessionStorage:", stateData);
          setParsedState(stateData);
        } catch (error) {
          console.error("Error parsing stored state:", error);
        }
      }
    }
    
    // Initialize state with the data we found
    if (stateData) {
      // Update component state
      if (stateData.smiles) {
        setCurrentSmiles(stateData.smiles);
      }
      
      // Set molecule properties if sourceData exists
      if (stateData.sourceData) {
        setMoleculeProperties(stateData.sourceData);
        
        // Extract property keys
        const idCol = stateData.idColumn || "cmpd_id";
        const smilesCol = stateData.smilesColumn || "SMILES";
        const basicFields = [idCol, smilesCol, 'id', 'smiles', 'structure'];
        
        const propertyNames = Object.keys(stateData.sourceData).filter(key => {
          const isBasicField = basicFields.some(field =>
            key.toLowerCase() === field.toLowerCase() ||
            (field !== idCol && field !== smilesCol && (
              key.toLowerCase().includes('id') ||
              key.toLowerCase().includes('name') ||
              key.toLowerCase().includes('smiles')
            ))
          );
          return !isBasicField && stateData.sourceData[key] !== undefined && 
                 stateData.sourceData[key] !== null && 
                 stateData.sourceData[key] !== '';
        });
        
        setPropertyKeys(propertyNames);
      }
      
      // Save state to sessionStorage for persistence
      if (moleculeIdFromParams && stateData) {
        sessionStorage.setItem(`editorState_${moleculeIdFromParams}`, JSON.stringify(stateData));
      }
    }
  }, [location, moleculeIdFromParams]);

  // Initialize Ketcher
  useEffect(() => {
    if (!parsedState) return; // Wait until state is parsed
    
    const initializeKetcher = () => {
      const ketcherFrame = document.getElementById('idKetcher');
      if (!ketcherFrame) {
        message.error('Failed to locate the iframe element.');
        return;
      }

      const ketcherInstance = ketcherFrame.contentWindow?.ketcher || document.frames['idKetcher']?.window?.ketcher;

      if (ketcherInstance) {
        setKetcher(ketcherInstance);
        message.success('Ketcher initialized successfully.');
        
        // If we have SMILES from parsed state, load the molecule
        if (parsedState.smiles) {
          setTimeout(() => {
            try {
              ketcherInstance.setMolecule(parsedState.smiles);
              message.success('Molecule loaded successfully');
            } catch (error) {
              console.error('Error applying SMILES:', error);
              message.error('Failed to load molecule structure.');
            }
          }, 800); // give some time for ketcher to initialize
        }
      } else {
        message.error('Failed to initialize Ketcher.');
      }
    };

    const timer = setTimeout(() => {
      initializeKetcher();
    }, 500);

    return () => clearTimeout(timer);
  }, [parsedState]);
  

  // Visualize smiles in Ketcher
  const applySmiles = () => {
    if (!ketcher) {
      message.error('Ketcher instance not initialized.');
      return;
    }
    try {
      ketcher.setMolecule(currentSmiles);
      message.success('SMILES applied successfully.');
    } catch (error) {
      console.error('Error applying SMILES to Ketcher:', error);
      message.error('Failed to apply SMILES.');
    }
  };

  // Get smiles of molecule
  const getSmiles = async () => {
    if (!ketcher) {
      message.error('Ketcher instance not initialized.');
      return;
    }
    try {
      const smiles = await ketcher.getSmiles();
      setKetcherSmiles(smiles);
      setCurrentSmiles(smiles); // Update current SMILES with the one from Ketcher
      message.success(`SMILES: ${smiles}`);
      return smiles;
    } catch (error) {
      console.error('Error fetching SMILES from Ketcher:', error);
      message.error('Failed to get SMILES.');
      return null;
    }
  };

  // Get molfile of molecule
  const getMolfile = async () => {
    if (!ketcher) {
      message.error('Ketcher instance not initialized.');
      return;
    }
    try {
      const molfile = await ketcher.getMolfile();
      setKetcherMolfile(molfile);
      message.success('Molfile fetched successfully.');
    } catch (error) {
      console.error('Error fetching Molfile from Ketcher:', error);
      message.error('Failed to get Molfile.');
    }
  };

  // Return to last page
  const handleBack = () => {
    const confirmExit = window.confirm('Do you want to save your changes before exiting?');
    if (confirmExit) {
      // Save changes logic would go here
      console.log('Changes saved');
    }
    navigate(-1);
  };

  // Handle sidebar collapse toggle
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Handle sidebar actions
  const handleSidebarAction = (action) => {
    setSelectedTab(action);
    message.info(`${action.charAt(0).toUpperCase() + action.slice(1)} action selected`);

    // Handle special functionality
    if (action === 'compute') {
      getSmiles();
    }

    // Handle similarity search panel
    if (action === 'similarity') {
      // First update current SMILES from Ketcher
      getSmiles().then(() => {
        setSimilaritySearchVisible(true);
      });
    } else {
      setSimilaritySearchVisible(false);
      setShowResultsTable(false);
    }
  };

  // Handle similarity search results
  const handleSimilarityResults = (results, method) => {
    setSimilarityResults(results);
    setOriginalResults(results); // Store original results for filtering
    setShowResultsTable(true);
    setSearchMethod(method);
    setFiltersActive(false);
    setActiveFilters({});
    // Extract actual min/max for each property and prepare ranges for filter initialization
    const ranges = {};
    const propertiesToCheck = ['similarity', 'binary_occ', 'cont_occ', 'low_gsh_prob', 'med_gsh_prob', 'high_gsh_prob', 'selectivity'];

    propertiesToCheck.forEach(prop => {
      const values = results
        .map(result => result[prop])
        .filter(val => val !== undefined && val !== null && !isNaN(val));

      if (values.length > 0) {
        // Calculate actual min and max
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Add small buffer to max value (5% of range) to ensure values at max are included
        const buffer = (max - min) * 0.05;
        const adjustedMax = max + buffer;

        // Store the range
        ranges[prop] = [min, adjustedMax];
        console.log(`Property ${prop} range: [${min}, ${adjustedMax}]`);
      }
    });

    // Update enabledFilters state if needed
    // setEnabledFilters(...) - could be updated here if needed
    getSmiles().then(smiles => {
      setSearchQuery(smiles || currentSmiles);
    });
  };
  // Handle filter application
    const handleApplyFilters = (filters) => {
      setIsSearching(true);
      setActiveFilters(filters);
      setFiltersActive(true);
  
      try {
        // Get the enabled filters
        const enabledFilterKeys = Object.keys(filters);
  
        // Update enabled filters state
        const newEnabledFilters = {};
        Object.keys(enabledFilters).forEach(key => {
          newEnabledFilters[key] = enabledFilterKeys.includes(key);
        });
        setEnabledFilters(newEnabledFilters);
  
        // Apply filters to the original results
        const filteredResults = originalResults.filter(result => {
          // Check each enabled filter
          return enabledFilterKeys.every(property => {
            const value = result[property];
            const range = filters[property];
            return value >= range[0] && value <= range[1];
          });
        });
  
        // Update the results table
        setSimilarityResults(filteredResults);
        message.success(`Applied filters: Found ${filteredResults.length} results`);
      } catch (error) {
        console.error('Error applying filters:', error);
        message.error('Failed to apply filters');
      } finally {
        setIsSearching(false);
      }
    };
  
    // Handle clearing filters
    const handleClearFilters = () => {
      setFiltersActive(false);
      setActiveFilters({});
      setEnabledFilters({
        similarity: true,
        binary_occ: false,
        cont_occ: false,
        low_gsh_prob: false,
        med_gsh_prob: false,
        high_gsh_prob: false,
        selectivity: false
      });
      // Restore original search results
      setSimilarityResults(originalResults);
      message.info('Filters cleared');
    };

  // Format property values
  const formatPropertyValue = (value) => {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value.toString();
      } else {
        return value.toFixed(2);
      }
    } else if (typeof value === 'string') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && value.trim() !== '') {
        return numValue.toFixed(2);
      }
      return value;
    }
    return String(value);
  };

  // Get property card style based on value
  const getPropertyCardStyle = (key, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return {};
    }

    if (key.toLowerCase().includes('logp') || key.toLowerCase().includes('alogp')) {
      if (numValue > 5) return { backgroundColor: '#ffecec' };
      if (numValue < 0) return { backgroundColor: '#ecffec' };
    } else if (key.toLowerCase().includes('weight') || key.toLowerCase().includes('mw')) {
      if (numValue > 500) return { backgroundColor: '#f0f0ff' };
      if (numValue < 200) return { backgroundColor: '#fffff0' };
    } else if (key.toLowerCase().includes('tpsa') || key.toLowerCase().includes('psa')) {
      if (numValue > 140) return { backgroundColor: '#e6f7ff' };
      if (numValue < 60) return { backgroundColor: '#fffbe6' };
    }

    return {};
  };

  // Results table columns
  const resultColumns = [
    {
      title: 'Cmpd Id',
      dataIndex: 'cmpd_id',
      key: 'cmpd_id',
    },
    {
      title: (
           <span>
              Similarity
                {filtersActive && activeFilters.similarity && (
                  <FilterOutlined style={{ color: '#1890ff', marginLeft: 3 }} />
                )}
              </span>
            ),
      dataIndex: 'similarity',
      key: 'similarity',
      sorter: (a, b) => a.similarity - b.similarity,
      render: value => (value * 100).toFixed(1) + '%',
      defaultSortOrder: 'descend',
    },
    {
      title: (
              <span>
                Binary Occ
                {filtersActive && activeFilters.binary_occ && (
                  <FilterOutlined style={{ color: '#1890ff', marginLeft: 3 }} />
                )}
              </span>
            ),
      dataIndex: 'binary_occ',
      key: 'binary_occ',
      sorter: (a, b) => a.binary_occ - b.binary_occ,
      render: value => value?.toFixed(2) || '-',
    },
    {
      title: (
              <span>
                Cont Occ
                {filtersActive && activeFilters.cont_occ && (
                  <FilterOutlined style={{ color: '#1890ff', marginLeft: 3 }} />
                )}
              </span>
            ),
      dataIndex: 'cont_occ',
      key: 'cont_occ',
      sorter: (a, b) => a.cont_occ - b.cont_occ,
      render: value => value?.toFixed(2) || '-',
    },
    {
      title: (
              <span>
                Low Gsh Prob
                {filtersActive && activeFilters.low_gsh_prob && (
                  <FilterOutlined style={{ color: '#1890ff', marginLeft: 3 }} />
                )}
              </span>
            ),
      dataIndex: 'low_gsh_prob',
      key: 'low_gsh_prob',
      sorter: (a, b) => a.low_gsh_prob - b.low_gsh_prob,
      render: value => value?.toFixed(2) || '-',
    },
    {
      title: (
              <span>
                Med Gsh Prob
                {filtersActive && activeFilters.med_gsh_prob && (
                  <FilterOutlined style={{ color: '#1890ff', marginLeft: 3 }} />
                )}
              </span>
            ),
      dataIndex: 'med_gsh_prob',
      key: 'med_gsh_prob',
      sorter: (a, b) => a.med_gsh_prob - b.med_gsh_prob,
      render: value => value?.toFixed(2) || '-',
    },
    {
      title: 'High Gsh Prob',
      dataIndex: 'high_gsh_prob',
      key: 'high_gsh_prob',
      sorter: (a, b) => a.high_gsh_prob - b.high_gsh_prob,
      render: value => value?.toFixed(2) || '-',
    },
    {
      title: (
              <span>
                Selectivity
                {filtersActive && activeFilters.selectivity && (
                  <FilterOutlined style={{ color: '#1890ff', marginLeft: 3 }} />
                )}
              </span>
        ),
      dataIndex: 'selectivity',
      key: 'selectivity',
      sorter: (a, b) => a.selectivity - b.selectivity,
      render: value => value?.toFixed(2) || '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => {
            const idMatch = record.cmpd_id.match(/\d+/);
            if(idMatch){
              const idNumber = idMatch[0];
              
              // Create state object matching the CsvPreview pattern
              const stateData = {
                smiles: record.smiles,
                fromCsv: true,
                moleculeId: idNumber,
                moleculeName: record.cmpd_id,
                sourceData: {
                  ...record,
                  [parsedState?.smilesColumn || "SMILES"]: record.smiles,
                  [parsedState?.idColumn || "cmpd_id"]: record.cmpd_id,
                },
                allData: parsedState?.allData || [],
                idColumn: parsedState?.idColumn || "cmpd_id",
                smilesColumn: parsedState?.smilesColumn || "SMILES",
                filename: parsedState?.filename
              };
              
              // Serialize state for URL (matching CsvPreview pattern)
              const serializedState = encodeURIComponent(JSON.stringify(stateData));
              
              // Save to sessionStorage as backup
              sessionStorage.setItem(`editorState_${idNumber}`, JSON.stringify(stateData));
              
              // Open new window with the same pattern as CsvPreview
              const editorUrl = `/editor/${idNumber}?state=${serializedState}`;
              window.open(editorUrl, `editor_${idNumber}`, 'width=1200,height=800');
            } else {
              message.error('Invalid compound ID format');
            }
          }}>
            View
          </Button>
        </Space>
      ),
    }
  ];

  const ketcherPath = window.location.origin + '/standalone/index.html';

  // Split properties into chunks for better organization
  const chunkProperties = (properties, chunkSize = 5) => {
    const chunks = [];
    for (let i = 0; i < properties.length; i += chunkSize) {
      chunks.push(properties.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Group properties for better organization
  const groupProperties = () => {
    // Used when selectedCompound exists
    if (selectedCompound) {
      const properties = Object.keys(selectedCompound).filter(
        key => !['key', 'smiles', 'cmpd_id'].includes(key)
      );
      return chunkProperties(properties);
    }
    
    // Used when using properties from CSV
    return chunkProperties(propertyKeys);
  };

  // Get molecule information for display
  const getMoleculeInfo = () => {
    if (parsedState) {
      return {
        id: parsedState.moleculeName || parsedState.moleculeId || `Compound-${moleculeIdFromParams}`,
        smiles: parsedState.smiles || 
                (parsedState.sourceData && parsedState.sourceData[parsedState.smilesColumn || "SMILES"]) || 
                currentSmiles,
        source: parsedState.filename || "Unknown source"
      };
    }
    
    return {
      id: `Compound-${moleculeIdFromParams}`,
      smiles: currentSmiles,
      source: "Unknown source"
    };
  };

  const moleculeInfo = getMoleculeInfo();
   // Fetch annotations for the current molecule
   const fetchAnnotations = async () => {
    if (!moleculeInfo || !moleculeInfo.id) return;
  
    setIsLoadingAnnotations(true);
  
    try {
      const response = await fetch(`http://localhost:5001/api/annotations/${encodeURIComponent(moleculeInfo.id)}`);
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch annotations');
      }
  
      setAnnotations(data.annotations);
    } catch (error) {
      console.error('Error fetching annotations:', error);
      message.error(error.message);
    } finally {
      setIsLoadingAnnotations(false);
    }
  };
  useEffect(() => {
    fetchAnnotations();
  }, [moleculeInfo.id]);  // 当moleculeId变化时重新调用
  
  

  const saveAnnotation = async () => {
    if (!moleculeInfo || !moleculeInfo.id) {
      message.error('No molecule selected');
      return;
    }
  
    if (!currentAnnotation.trim()) {
      message.error('Annotation cannot be empty');
      return;
    }
  
    setIsSavingAnnotation(true);
  
    try {
      const response = await fetch(`http://localhost:5001/api/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          molecule_id: moleculeInfo.id,
          annotation: currentAnnotation,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save annotation');
      }
  
      message.success('Annotation saved successfully');
      setCurrentAnnotation(''); // Clear input
      fetchAnnotations(); // Refresh annotation list
    } catch (error) {
      console.error('Error saving annotation:', error);
      message.error(error.message);
    } finally {
      setIsSavingAnnotation(false);
    }
  };
  

  // Delete an annotation
  const deleteAnnotation = async (annotationId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/annotations/${annotationId}`, {
        method: 'DELETE',
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete annotation');
      }
  
      message.success('Annotation deleted successfully');
      fetchAnnotations(); // Refresh annotation list
    } catch (error) {
      console.error('Error deleting annotation:', error);
      message.error(error.message);
    }
  };
  

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Left Sidebar */}
      <Sider 
        width={sidebarCollapsed ? 80 : 200} 
        theme="light" 
        style={{ 
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          transition: 'width 0.3s ease'
        }}
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={toggleSidebar}
        trigger={null}
      >
        <div className="logo" style={{ 
          height: '64px', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          overflow: 'hidden' 
        }}>
          {sidebarCollapsed ? (
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>CC</Title>
          ) : (
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>Chemical Canvas</Title>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 64px)' }}>
          <Menu
            mode="vertical"
            selectedKeys={[selectedTab]}
            style={{ borderRight: 0 }}
          >
            <Menu.Item key="modify" icon={<EditOutlined />} onClick={() => handleSidebarAction('modify')}>
              {!sidebarCollapsed && 'Modify'}
            </Menu.Item>
            <Menu.Item key="annotate" icon={<CommentOutlined />} onClick={() => handleSidebarAction('annotate')}>
              {!sidebarCollapsed && 'Annotate'}
            </Menu.Item>
            <Menu.Item key="similarity" icon={<FileSearchOutlined />} onClick={() => handleSidebarAction('similarity')}>
              {!sidebarCollapsed && 'Similarity Search'}
            </Menu.Item>
            <Menu.Item key="compute" icon={<CalculatorOutlined />} onClick={() => handleSidebarAction('compute')}>
              {!sidebarCollapsed && 'Compute'}
            </Menu.Item>
            <Menu.Item key="export" icon={<ExportOutlined />} onClick={() => handleSidebarAction('export')}>
              {!sidebarCollapsed && 'Export'}
            </Menu.Item>
          </Menu>

          <div style={{ marginTop: 'auto', padding: '20px', textAlign: 'center' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              {!sidebarCollapsed && 'Back'}
            </Button>
          </div>
        </div>
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              type="text"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSidebar}
              style={{ marginRight: '16px', fontSize: '16px' }}
            />
            <Text strong>Current Mode: </Text>
            <Text>{selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)}</Text>
            {filtersActive && (
              <Text type="secondary" style={{ marginLeft: '10px' }}>
                (Filters Applied: {Object.keys(activeFilters).filter(key => enabledFilters?.[key]).length})
              </Text>
            )}
          </div>
          {showResultsTable && selectedTab === 'similarity' && (
            <div>
              <Button
                type={showFilterSidebar ? 'primary' : 'default'}
                icon={<FilterOutlined />}
                style={{ marginRight: '8px' }}
                onClick={() => setShowFilterSidebar(!showFilterSidebar)}
                >
                {showFilterSidebar ? 'Hide Filters & Show Properties' : 'Show Filters'}
                </Button>
              <Button
                type="primary"
                icon={<TableOutlined />}
                onClick={() => setShowResultsTable(!showResultsTable)}
              >
                {showResultsTable ? 'Hide Results' : 'Show Results'}
              </Button>
            </div>
          )}
          <div>
            <Text strong>Molecule: </Text>
            <Text>{moleculeInfo.id}</Text>
          </div>
        </Header>

        <Layout style={{ padding: '24px',overflow: 'auto' }}>
          {/* Main content layout with conditional height based on results visibility */}
          <Layout>
             {/* Filter sidebar (conditionally rendered) */}
             {showFilterSidebar && (
              <Sider
                width={280}
                style={{
                  background: '#fff',
                  marginRight: '16px',
                  borderRadius: '4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  height:'fit-content',
                }}
              >
                <SidebarFilter
                  isVisible={true}
                  searchResults={similarityResults}
                  onApplyFilters={handleApplyFilters}
                  onClearFilters={handleClearFilters}
                  currentSmiles={currentSmiles}
                  isLoading={isSearching}
                />
              </Sider>
            )}
            {/* Ketcher editor area */}
            {!showFilterSidebar && (
            <Content
              style={{
                background: '#fff',
                padding: '12px',
                width: '100%',
                height: showResultsTable ? 'calc(50vh - 112px)' : 'calc(80vh - 112px)',
                marginBottom: showResultsTable ? '16px' : '0',
                transition: 'height 0.3s ease',
                overflow:'auto'
              }}
            >
              <iframe
                id="idKetcher"
                ref={iframeRef}
                src={ketcherPath}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </Content>
            )}

            {/* Similarity Results Table (conditionally rendered) */}
            {showResultsTable && (
              <Content style={{ background: '#fff', padding: '12px', width: '100%', marginBottom: '16px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>Query Smiles: </Text>
                    <Text>{searchQuery}</Text>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>Similarity Metric: </Text>
                    <Text>{searchMethod.charAt(0).toUpperCase() + searchMethod.slice(1)}</Text>
                    {filtersActive && (
                        <Text type="secondary" style={{ marginLeft: '10px' }}>
                          (Filters Applied)
                        </Text>
                      )}
                  </div>
                  <Text strong>Search Results</Text>
                  <Text>{similarityResults.length} compounds</Text>
                </div>
                <div>
                                    <Button
                                      icon={<FilterOutlined />}
                                      onClick={() => setShowFilterSidebar(!showFilterSidebar)}
                                      type={showFilterSidebar ? 'primary' : 'default'}
                                      style={{ marginRight: '8px' }}
                                    >
                                      {showFilterSidebar ? 'Hide Filters' : 'Show Filters'}
                                    </Button>
                                  </div>

                <Table
                  columns={resultColumns}
                  dataSource={similarityResults}
                  size="small"
                  pagination={{
                    pageSize: 5,
                    showSizeChanger: true,
                    pageSizeOptions: ['5', '10', '20']
                  }}
                  scroll={{ y: 240 }}
                />
              </Content>
            )}

          </Layout>

          {/* Right sidebar with properties */}
          {!showFilterSidebar && (
          <Sider width="30%" style={{ background: '#f0f2f5', marginLeft: '16px', overflowY: 'auto' }}>
            {/* Basic Information card */}
            <Card title="Basic Information" style={{ marginBottom: '16px' }}>
              <List size="small">
                <List.Item>
                  <Text strong style={{ width: '40%' }}>ID:</Text>
                  <Text>{moleculeInfo.id}</Text>
                </List.Item>
                <List.Item>
                  <Text strong style={{ width: '40%' }}>SMILES:</Text>
                  <Text style={{ wordBreak: 'break-all' }}>
                    {moleculeInfo.smiles || "No SMILES available"}
                  </Text>
                </List.Item>
                {moleculeInfo.source && (
                  <List.Item>
                    <Text strong style={{ width: '40%' }}>Source:</Text>
                    <Text>{moleculeInfo.source}</Text>
                  </List.Item>
                )}
              </List>
            </Card>

            {/* Properties from CSV - Single collapsible panel */}
            {propertyKeys.length > 0 ? (
              <Card 
                title={selectedCompound ? `Properties - ${selectedCompound.cmpd_id}` : "Properties from CSV"}
                style={{ marginBottom: '16px' }}
              >
                {/* Molecule Visualization (conditionally rendered) */}
                {selectedCompound && (
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    {isLoadingImage ? (
                      <div style={{ padding: '20px', textAlign: 'center' }}>
                        Loading visualization...
                      </div>
                    ) : moleculeImage ? (
                      <Image 
                        src={moleculeImage} 
                        alt={`Structure of ${selectedCompound.cmpd_id}`}
                        style={{ maxWidth: '100%', maxHeight: '200px' }}
                        preview={false}
                      />
                    ) : null}
                    <div style={{ marginTop: '8px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        SMILES: {selectedCompound.smiles.length > 30 
                          ? selectedCompound.smiles.substring(0, 30) + '...' 
                          : selectedCompound.smiles}
                      </Text>
                    </div>
                  </div>
                )}

                {/* Single collapsible panel for all properties */}
                <Collapse defaultActiveKey={['all-properties']}>
                  <Panel header="All Properties" key="all-properties">
                    <List
                      size="small"
                      itemLayout="horizontal"
                      dataSource={selectedCompound 
                        ? Object.keys(selectedCompound).filter(key => !['key', 'smiles', 'cmpd_id'].includes(key))
                        : propertyKeys
                      }
                      renderItem={key => {
                        const value = selectedCompound 
                          ? selectedCompound[key]
                          : moleculeProperties[key];
                        return (
                          <List.Item style={getPropertyCardStyle(key, value)}>
                            <Text strong style={{ width: '50%' }}>{key}:</Text>
                            <Text>{formatPropertyValue(value)}</Text>
                          </List.Item>
                        );
                      }}
                    />
                  </Panel>
                </Collapse>
              </Card>
            ) : (
              parsedState?.fromCsv && (
                <Card title="Properties from CSV" style={{ marginBottom: '16px' }}>
                  <Text type="secondary">No additional properties found in CSV.</Text>
                </Card>
              )
            )}
            
            {/* Mode-specific content cards */}
            {selectedTab === 'annotate' && (
  <Card title="Annotations">
    {/* Textarea for entering new annotations */}
    <textarea
      placeholder="Add your annotations here..."
      value={currentAnnotation}
      onChange={(e) => setCurrentAnnotation(e.target.value)}
      style={{
        width: '100%',
        height: '100px',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #d9d9d9',
      }}
    />

    {/* Save annotation button */}
    <Button
      type="primary"
      size="small"
      style={{ marginTop: '8px' }}
      loading={isSavingAnnotation}
      onClick={saveAnnotation}
    >
      Save Annotation
    </Button>

    {/* Display list of saved annotations */}
    {isLoadingAnnotations ? (
      <p>Loading annotations...</p>
    ) : (
      <List
        size="small"
        dataSource={annotations}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button
                type="link"
                danger
                size="small"
                onClick={() => deleteAnnotation(item.id)}
              >
                Delete
              </Button>,
            ]}
          >
            <Text>{item.annotation}</Text>
          </List.Item>
        )}
        style={{ marginTop: '16px' }}
      />
    )}
  </Card>
)}

            {selectedTab === 'compute' && (
              <Card title="Calculated Properties">
                <div style={{ marginBottom: '10px' }}>
                  <Button type="primary" size="small" onClick={getSmiles}>
                    Calculate Properties
                  </Button>
                </div>
                {ketcherSmiles && (
                  <div>
                    <Text strong>SMILES:</Text>
                    <div style={{ wordBreak: 'break-all', margin: '5px 0 10px' }}>
                      <Text>{ketcherSmiles}</Text>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {selectedTab === 'export' && (
              <Card title="Export Options">
                <Button style={{ margin: '5px' }} onClick={getSmiles}>Get SMILES</Button>
                <Button style={{ margin: '5px' }} onClick={getMolfile}>Get Molfile</Button>
                {ketcherSmiles && (
                  <div style={{ marginTop: '10px' }}>
                    <Text strong>SMILES:</Text>
                    <div style={{
                      padding: '5px',
                      background: '#f5f5f5',
                      borderRadius: '4px',
                      marginTop: '5px',
                      wordBreak: 'break-all'
                    }}>
                      {ketcherSmiles}
                    </div>
                  </div>
                )}
                {ketcherMolfile && (
                  <div style={{ marginTop: '10px' }}>
                    <Text strong>Molfile:</Text>
                    <div style={{
                      padding: '5px',
                      background: '#f5f5f5',
                      borderRadius: '4px',
                      marginTop: '5px',
                      height: '100px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      fontSize: '12px'
                    }}>
                      {ketcherMolfile}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </Sider>
          )}
        </Layout>
      </Layout>

      {/* Similarity Search Modal */}
      <SimilaritySearch
        currentSmiles={currentSmiles}
        currentId={moleculeInfo.id}
        filename={moleculeInfo.source !== "Unknown source" ? moleculeInfo.source : undefined}
        visible={similaritySearchVisible}
        onClose={() => setSimilaritySearchVisible(false)}
        onResultsFound={handleSimilarityResults}
        ketcher={ketcher}
        moleculeProperties={moleculeProperties}
      />
    </Layout>
  );
};

export default MoleculeIndex;