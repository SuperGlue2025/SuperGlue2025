import React, { useState, useEffect, useRef } from 'react';
import { Button, message, Tabs, Layout, Menu, Card, List, Typography, Table, Space, Divider, Empty } from 'antd';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ClusterOutlined,
  FileSearchOutlined,
  CalculatorOutlined,
  CommentOutlined,
  ArrowLeftOutlined,
  TableOutlined,
  EyeOutlined,
  AppstoreOutlined,
  HighlightOutlined

} from '@ant-design/icons';
import { FilterOutlined } from '@ant-design/icons';
import SimilaritySearch from './SimilaritySearch';
import '../styles/main.css';
import HighlightAnnotateComponent from './HighlightAnnotateComponent';
import SidebarFilter from './SidebarFilter';
import SimpleMoleculeViewer from './SimpleMoleculeViewer';
import { notification } from 'antd';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

const MoleculeIndex = () => {
  // Get URL parameters
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  // Use URL id parameter
  const moleculeIdFromParams = id ? parseInt(id, 10) : null;

  const [ketcher, setKetcher] = useState(null);
  const [currentSmiles, setCurrentSmiles] = useState('');
  const [ketcherSmiles, setKetcherSmiles] = useState('');
  const [ketcherMolfile, setKetcherMolfile] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTab, setSelectedTab] = useState('annotate');

  // Selected substructure state
  const [selectedAtoms, setSelectedAtoms] = useState([]);
  const [selectedBonds, setSelectedBonds] = useState([]);
  const [highlightedSubstructure, setHighlightedSubstructure] = useState({});

  // Similarity search state
  const [similaritySearchVisible, setSimilaritySearchVisible] = useState(false);
  const [showResultsTable, setShowResultsTable] = useState(false);
  const [similarityResults, setSimilarityResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [similarityMethod, setSimilarityMethod] = useState('tanimoto');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMethod, setSearchMethod] = useState('');

  // Get dynamic molecule properties
  const [moleculeProperties, setMoleculeProperties] = useState({});
  const [propertyKeys, setPropertyKeys] = useState([]);

  // Annotations
  const [annotations, setAnnotations] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState('');
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false);
  const [isSavingAnnotation, setIsSavingAnnotation] = useState(false);

  // Filter sidebar state
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

  // Save original results for filter reset
  const [originalResults, setOriginalResults] = useState([]);

  // Saved highlights state
  const [savedHighlights, setSavedHighlights] = useState([]);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(false);
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(-1);

  // Substructure matching state
  const [showSubstructureResults, setShowSubstructureResults] = useState(false);
  const [substructureResults, setSubstructureResults] = useState([]);
  const [isLoadingSubstructure, setIsLoadingSubstructure] = useState(false);
  const [substructureError, setSubstructureError] = useState('');
  const [selectedMolecule, setSelectedMolecule] = useState(null);
  const [moleculeSvg, setMoleculeSvg] = useState('');

  // Get previous page data
  const smilesFromCSV = location.state?.smiles;
  const moleculeId = location.state?.moleculeId || moleculeIdFromParams;
  const moleculeName = location.state?.moleculeName || `Compound-${moleculeIdFromParams}`;
  const fromCsv = location.state?.fromCsv;
  const sourceData = location.state?.sourceData;
  const idColumn = location.state?.idColumn || "cmpd_id";
  const smilesColumn = location.state?.smilesColumn || "SMILES";
  const filename = location.state?.filename;

  // log
  useEffect(() => {
    console.log("URL Parameter ID:", id);
    console.log("Location state:", location.state);
    console.log("SMILES from CSV:", smilesFromCSV);
    console.log("ID column:", idColumn);
    console.log("SMILES column:", smilesColumn);
    console.log("Source Data:", sourceData);
  }, [location, id]);

  // Initialize smiles
  useEffect(() => {
    if (smilesFromCSV) {
      setCurrentSmiles(smilesFromCSV);
    }
  }, [smilesFromCSV]);

  // Display properties
  useEffect(() => {
    if (sourceData) {
      const basicFields = [idColumn, smilesColumn, 'id', 'smiles', 'structure'];
      const properties = {};
      const propertyNames = [];

      Object.entries(sourceData).forEach(([key, value]) => {
        const isBasicField = basicFields.some(field =>
          key.toLowerCase() === field.toLowerCase() ||
          (field !== idColumn && field !== smilesColumn && (
            key.toLowerCase().includes('id') ||
            key.toLowerCase().includes('name') ||
            key.toLowerCase().includes('smiles')
          ))
        );

        if (!isBasicField && value !== undefined && value !== null && value !== '') {
          properties[key] = value;
          propertyNames.push(key);
        }
      });

      setMoleculeProperties(properties);
      setPropertyKeys(propertyNames);
      console.log("Extracted properties:", properties);
    }
  }, [sourceData, idColumn, smilesColumn]);

  // Initialize Ketcher
  useEffect(() => {

    const initializeKetcher = () => {
      const ketcherFrame = document.getElementById('idKetcher');
      if (!ketcherFrame) {
        message.error('Couldnt find Ketcher');
        return;
      }

      const ketcherInstance = ketcherFrame.contentWindow?.ketcher || document.frames['idKetcher']?.window?.ketcher;

      if (ketcherInstance) {
        setKetcher(ketcherInstance);
        message.success('Ketcher initialized successfully.');
        window.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'ketcher-selection-change') {
            console.log('Received Ketcher selection change:', event.data.selection);
          }
        });

        if (smilesFromCSV) {
          setTimeout(() => {
            try {
              ketcherInstance.setMolecule(smilesFromCSV);
              message.success('Molecule loaded successfully');
            } catch (error) {
              console.error('Error applying SMILES from CSV:', error);
              message.error('Failed to load molecule structure.');
            }
          }, 800);
        }
      } else {
        message.error('Failed to initialize Ketcher.');
      }
    };

    const timer = setTimeout(() => {
      initializeKetcher();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ketcher && moleculeId) {
      loadSavedHighlights();
    }
  }, [ketcher, moleculeId]);

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
      setCurrentSmiles(smiles);
      message.success(`SMILES: ${smiles}`);
      return smiles;
    } catch (error) {
      console.error('Error fetching SMILES from Ketcher:', error);
      message.error('Failed to get SMILES.');
      return '';
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

  // selectsubstructure based on ketcher code
  const getSelectedSubstructure = async (ketcherInstance) => {
    if (!ketcherInstance) {
      ketcherInstance = ketcher;
    }

    if (!ketcherInstance) {
      console.error('Error: Ketcher instance not initialized');
      message.error('Ketcher instance not initialized');
      return null;
    }

    try {
      const editorSelection = ketcherInstance.editor?.selection();

      if (!editorSelection) {
        console.warn('No selection detected, please select part of the molecule first');
        message.warning('No selection detected, please select part of the molecule first');
        return null;
      }

      const atoms = editorSelection.atoms || [];
      const bonds = editorSelection.bonds || [];

      console.log('Selected atoms:', atoms);
      console.log('Selected bonds:', bonds);

      if (atoms.length === 0 && bonds.length === 0) {
        console.warn('No atoms or bonds selected');
        message.warning('No atoms or bonds selected, please select part of the molecule first');
        return null;
      }

      setSelectedAtoms(atoms);
      setSelectedBonds(bonds);

      let smiles = '';
      try {
        smiles = await ketcherInstance.getSmiles();
        console.log('Current molecule SMILES:', smiles);
      } catch (error) {
        console.error('Error getting SMILES:', error);
      }

      const highlightData = {
        compoundId: moleculeName || moleculeId || `Compound-${moleculeIdFromParams}`,
        highlightedAtoms: atoms,
        highlightedBonds: bonds,
        smiles: smiles,
        timestamp: new Date().toISOString()
      };

      setHighlightedSubstructure(highlightData);
      console.log('Highlight substructure object:', highlightData);

      return highlightData;
    } catch (error) {
      console.error('Error getting selected substructure:', error);
      message.error('Failed to get selected substructure');
      return null;
    }
  };

  // captureCurrentSelection
  const captureCurrentSelection = () => {
    if (!ketcher) {
      message.error('Ketcher instance not initialized');
      return;
    }

    console.log('Capturing current selection...');

    if (!ketcher.editor) {
      console.error('Ketcher editor object does not exist');
      message.error('Cannot access Ketcher editor');
      return;
    }

    getSelectedSubstructure(ketcher).then(highlightData => {
      if (highlightData) {
        message.success(`Successfully captured ${highlightData.highlightedAtoms.length} selected atoms`);
      }
    });
  };

  // Add helper function to show Ketcher's selection status
  const showSelectionStatus = () => {
    if (!ketcher || !ketcher.editor) {
      message.error('Ketcher instance not initialized');
      return;
    }

    try {
      const selection = ketcher.editor.selection();
      console.log('Current selection status:', selection);

      if (!selection || (!selection.atoms?.length && !selection.bonds?.length)) {
        message.info('Currently no atoms or bonds are selected. Please use Ketcher\'s selection tool to select part of the molecule.');
      } else {
        message.success(`Currently selected: ${selection.atoms?.length || 0} atoms, ${selection.bonds?.length || 0} bonds`);
      }
    } catch (error) {
      console.error('Error getting selection status:', error);
      message.error('Failed to get selection status');
    }
  };

  // saveHighlightedAtoms function to include annotation
  const saveHighlightedAtoms = async (highlightData, annotation = '') => {
    try {
      if (!highlightData.highlightedAtoms || highlightData.highlightedAtoms.length === 0) {
        console.warn('No atoms selected, no need to save');
        message.warning('No atoms selected, please select part of the molecule first');
        return;
      }

      setIsSavingAnnotation(true);

      const payload = {
        id: moleculeId,
        filename: filename || '',
        smiles: highlightData.smiles,
        atoms: highlightData.highlightedAtoms,
        bonds: highlightData.highlightedBonds,
        annotation: annotation
      };

      console.log('Sending payload to server:', payload);

      const response = await fetch(`http://localhost:5001/api/annotate_molecule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      console.log('Server response (raw):', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (error) {
        console.error('Error parsing server response:', error);
        message.error('Invalid response from server');
        setIsSavingAnnotation(false);
        return;
      }

      if (response.ok && result.success) {
        const successMessage = annotation
          ? `Highlight and annotation saved successfully for molecule ${moleculeId}`
          : `Highlight saved successfully for molecule ${moleculeId}`;

        message.success(successMessage);
        console.log('Server response:', result);

        if (result.canonicalAtoms) {
          setSelectedAtoms(result.canonicalAtoms);
        }

        if (ketcher && ketcher.editor?.highlight) {
          ketcher.editor.highlight(payload.atoms, 'selected');
        }

        setCurrentAnnotation('');

        loadSavedHighlights();
      } else {
        console.error('Server error:', result);
        message.error(`Failed to save: ${result.message || 'unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending data to server:', error);
      message.error('Error sending data to backend');
    } finally {
      setIsSavingAnnotation(false);
    }
  };

  // Combined function to capture selection and save annotation
  const captureAndAnnotate = async () => {
    if (!ketcher) {
      message.error('Ketcher instance not initialized');
      return;
    }

    console.log('Capturing selection and annotation...');

    if (!ketcher.editor) {
      console.error('Ketcher editor object does not exist');
      message.error('Cannot access Ketcher editor');
      return;
    }

    const highlightData = await getSelectedSubstructure(ketcher);

    if (highlightData && highlightData.highlightedAtoms && highlightData.highlightedAtoms.length > 0) {
      await saveHighlightedAtoms(highlightData, currentAnnotation);
    } else {
      message.warning('Please select part of the molecule first');
    }
  };

  // loadSavedHighlights
  const loadSavedHighlights = async () => {
    if (!moleculeId) {
      return;
    }

    setIsLoadingHighlights(true);
    try {
      const response = await fetch(`http://localhost:5001/api/get_molecule_highlights?id=${moleculeId}&filename=${filename || ''}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSavedHighlights(data.highlights || []);

        if (data.highlights && data.highlights.length > 0) {
          setCurrentHighlightIndex(0);
          applyHighlight(data.highlights[0]);
        }
      } else {
        console.error('loading highlights failed:', data.message);
      }
    } catch (error) {
      console.error('connecting server error:', error);
    } finally {
      setIsLoadingHighlights(false);
    }
  };

  // Modified applyHighlight function using atom alignment
  const applyHighlight = async (highlight) => {
    if (!ketcher || !ketcher.editor) {
      return;
    }

    try {
      // Get current molecule
      const currentSmiles = await ketcher.getSmiles();

      // If the highlight contains atoms but no specific bonds information
      // We need to calculate which bonds connect these atoms in the current molecule
      const atoms = highlight.atoms || [];
      let bonds = highlight.bonds || [];

      // If we have atoms but no bonds, try to infer the bonds from the current molecule structure
      if (atoms.length > 0 && bonds.length === 0) {

        const molecule = ketcher.editor.render.ctab.molecule;

        // Loop through all bonds in the molecule and check if both ends are in our highlighted atoms
        if (molecule && molecule.bonds) {
          bonds = molecule.bonds
            .map((bond, index) => ({
              index,
              begin: bond.begin,
              end: bond.end
            }))
            .filter(bond =>
              atoms.includes(bond.begin) && atoms.includes(bond.end)
            )
            .map(bond => bond.index);
        }
      }

      // Clear previous highlights
      ketcher.editor.highlights.clear();

      // Apply the highlight with both atoms and calculated bonds
      ketcher.editor.highlights.create({
        atoms: atoms,
        bonds: bonds,
        color: '#FF0000' // Red highlight
      });
    } catch (error) {
      console.error('apply highlight error:', error);
    }
  };

  const applyHighlightSelection = (highlight) => {
    if (!ketcher || !ketcher.editor) {
      return;
    }

    try {
      const atoms = highlight.atoms || [];
      const bonds = highlight.bonds || [];

      if (atoms.length === 0 && bonds.length === 0) {
        message.warning('There is no selected atom or bond.');
        return;
      }

      ketcher.editor.highlights.clear();

      // highlight API
      ketcher.editor.highlights.create({
        atoms: atoms,
        bonds: bonds,
        color: '#FF0000' // red
      });


    } catch (error) {
      console.error('highlight set error:', error);


      if (ketcher) {
        console.log('ketcher:', Object.keys(ketcher));
        if (ketcher.editor) {
          console.log('ketcher.editor:', Object.keys(ketcher.editor));

          if (ketcher.editor.highlights) {
            console.log('ketcher.editor.highlights:', Object.keys(ketcher.editor.highlights));
          }
        }
      }
    }
  };
  // applyMultipleHighlights function with better color handling

  // const applyMultipleHighlights = async (highlights) => {
  //   if (!ketcher || !ketcher.editor) {
  //     return;
  //   }
  //
  //   try {
  //     // First clear existing highlights
  //     ketcher.editor.highlights.clear();
  //
  //     if (!highlights || highlights.length === 0) {
  //       return;
  //     }
  //
  //     // Define color palette for different highlights
  //     const colors = [
  //       '#FF0000', // Bright Red
  //       '#00CC00', // Green
  //       '#0066FF', // Blue
  //       '#FF9900', // Orange
  //       '#9900CC', // Purple
  //       '#00CCCC', // Teal
  //       '#FF66CC', // Pink
  //       '#FFCC00', // Yellow
  //       '#669900', // Olive
  //       '#FF3366', // Rose
  //       '#006666', // Dark Teal
  //       '#993300'  // Brown
  //     ];
  //
  //     // Get current molecule structure
  //     const molecule = ketcher.editor.render.ctab.molecule;
  //
  //     // Prepare highlight configurations for each highlight
  //     const highlightConfigs = [];
  //     const legendItems = [];
  //
  //     for (let i = 0; i < highlights.length; i++) {
  //       const highlight = highlights[i];
  //       const atoms = highlight.atoms || [];
  //
  //       // Skip if no atoms to highlight
  //       if (atoms.length === 0) continue;
  //
  //       // Get bonds from the highlight or calculate them
  //       let bonds = highlight.bonds || [];
  //
  //       // If we have atoms but no bonds, infer the bonds from the current molecule
  //       if (atoms.length > 0 && bonds.length === 0 && molecule && molecule.bonds) {
  //         bonds = molecule.bonds
  //           .map((bond, index) => ({
  //             index,
  //             begin: bond.begin,
  //             end: bond.end
  //           }))
  //           .filter(bond =>
  //             atoms.includes(bond.begin) && atoms.includes(bond.end)
  //           )
  //           .map(bond => bond.index);
  //       }
  //
  //       // Select color for this highlight
  //       const colorIndex = i % colors.length;
  //       const color = colors[colorIndex];
  //
  //       // Add to highlight configs
  //       highlightConfigs.push({
  //         atoms: atoms,
  //         bonds: bonds,
  //         color: color
  //       });
  //
  //       // Add to legend
  //       const annotationText = highlight.annotation ? ` - ${highlight.annotation}` : '';
  //       legendItems.push(`<span style="color:${color}">●</span> highlight ${i + 1}${annotationText}`);
  //     }
  //
  //     // Apply all highlights
  //     if (highlightConfigs.length > 0) {
  //       ketcher.editor.highlights.create(...highlightConfigs);
  //
  //       // Show success message with color legend
  //       const legendHtml = `<div>${legendItems.join('<br/>')}</div>`;
  //
  //       notification.success({
  //         message: `showing ${highlightConfigs.length} highlights`,
  //         description: (
  //           <div dangerouslySetInnerHTML={{ __html: legendHtml }} />
  //         ),
  //         duration: 5
  //       });
  //     } else {
  //       message.warning('no matching highlights');
  //     }
  //   } catch (error) {
  //     console.error('multiple higlights error:', error);
  //   }
  // };

  // const navigateHighlights = (direction) => {
  //   if (savedHighlights.length === 0) return;
  //
  //   let newIndex;
  //   if (direction === 'next') {
  //     newIndex = currentHighlightIndex < savedHighlights.length - 1 ? currentHighlightIndex + 1 : 0;
  //   } else {
  //     newIndex = currentHighlightIndex > 0 ? currentHighlightIndex - 1 : savedHighlights.length - 1;
  //   }
  //
  //   setCurrentHighlightIndex(newIndex);
  //   applyHighlight(savedHighlights[newIndex]);
  // };

  // Return to last page
  const handleBack = () => {
    const confirmExit = window.confirm('Do you want to save your changes before exiting?');
    if (confirmExit) {
      console.log('Changes saved');
    }
    navigate(-1);
  };

  // Handle sidebar actions
  const handleSidebarAction = (action) => {
    setSelectedTab(action);

    if (action === 'compute') {
      getSmiles();
    }

    if (action === 'similarity') {
      getSmiles().then(() => {
        setSimilaritySearchVisible(true);
      });
    } else {
      setSimilaritySearchVisible(false);
      setShowResultsTable(false);
    }
  };

  // Use the current apply highlight as a substructure
  const performSubstructureMatching = async () => {
    if (!ketcher) {
      return;
    }

    try {
      if (savedHighlights.length === 0 || currentHighlightIndex < 0) {
        return;
      }

      // Get current highlight
      const currentHighlight = savedHighlights[currentHighlightIndex];
      const atoms = currentHighlight.atoms || [];
      const bonds = currentHighlight.bonds || [];

      if (atoms.length === 0) {
        message.warning('There is no atoms in current highlight.');
        return;
      }

      setIsLoadingSubstructure(true);
      setSubstructureError('');

      const smiles = await ketcher.getSmiles();

      const payload = {
        query_smiles: smiles,
        query_id: moleculeName || moleculeId || `Compound-${moleculeIdFromParams}`,
        atoms: atoms,
        bonds: bonds,
        filename: filename || ''
      };

      const response = await fetch('http://localhost:5001/api/substructure_search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`server error: ${response.status}. ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        const formattedResults = data.results.map(result => ({
          key: result.id || `result-${Math.random().toString(36).substr(2, 9)}`,
          cmpd_id: result.id || 'Unknown',
          smiles: result.smiles || result.SMILES || '',
          fragment_smarts: result.fragment_smarts || '',
          fragment_smiles: result.fragment_smiles || '',
          ...result // other properties
        }));

        setSubstructureResults(formattedResults);
        setShowSubstructureResults(true);
        message.success(`find ${formattedResults.length} matching molecules`);

        if (data.fragment_smarts) {
          message.info(`SMARTS: ${data.fragment_smarts}`);
        }
      } else {
        throw new Error(data.error || '未找到匹配的化合物');
      }
    } catch (error) {
      console.error('substructure searching error:', error);
      setSubstructureError(error.message);
      message.error(`searching erro: ${error.message}`);
    } finally {
      setIsLoadingSubstructure(false);
    }
  };

  // fetch molecule SVG
  // const fetchMoleculeSvg = async (smiles) => {
  //   try {
  //     const response = await fetch(`http://localhost:5001/api/get_molecule_svg`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify({ smiles })
  //     });
  //
  //     if (!response.ok) {
  //       throw new Error(`Failed to fetch SVG: ${response.status}`);
  //     }
  //
  //     const data = await response.json();
  //     if (data.success && data.svg) {
  //       setMoleculeSvg(data.svg);
  //     } else {
  //       throw new Error(data.error || 'Could not generate SVG');
  //     }
  //   } catch (error) {
  //     console.error('Error fetching molecule SVG:', error);
  //     message.error(`Could not load molecule image: ${error.message}`);
  //   }
  // };
// fetch molecule SVG

const fetchMoleculeSvg = async (smiles, fragment_smarts = null) => {
  try {
    const requestBody = {
      smiles: smiles,
      fragment_smarts: fragment_smarts
    };

    console.log("请求SVG生成:", requestBody);

    const response = await fetch(`http://localhost:5001/api/get_molecule_svg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch SVG: ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.svg) {
      setMoleculeSvg(data.svg);
    } else {
      throw new Error(data.error || 'Could not generate SVG');
    }
  } catch (error) {
    console.error('Error fetching molecule SVG:', error);
    message.error(`Could not load molecule image: ${error.message}`);
  }
};
  // Columns for the substructure results table
  // const substructureColumns = [
  //   {
  //     title: 'Cmpd Id',
  //     dataIndex: 'cmpd_id',
  //     key: 'cmpd_id',
  //   },
  //   {
  //     title: 'SMILES',
  //     dataIndex: 'smiles',
  //     key: 'smiles',
  //     ellipsis: true,
  //     render: smiles => (
  //       <div style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
  //         {smiles}
  //       </div>
  //     )
  //   },
  //   // -------Add more property columns--------
  //   {
  //     title: 'Actions',
  //     key: 'actions',
  //     render: (_, record) => (
  //       <Space>
  //         <Button size="small" onClick={() => {
  //           setSelectedMolecule(record);
  //           fetchMoleculeSvg(record.smiles);
  //         }}>
  //           View
  //         </Button>
  //       </Space>
  //     ),
  //   },
  // ];
  // Updated substructureColumns with improved View button handler
const substructureColumns = [
  {
    title: 'Cmpd Id',
    dataIndex: 'cmpd_id',
    key: 'cmpd_id',
  },
  {
    title: 'SMILES',
    dataIndex: 'smiles',
    key: 'smiles',
    ellipsis: true,
    render: smiles => (
      <div style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {smiles}
      </div>
    )
  },

{
  title: 'Actions',
  key: 'actions',
  render: (_, record) => (
    <Space>
      <Button size="small" onClick={() => {
        setSelectedMolecule(record);

        // Always use SMARTS pattern for highlighting if available
        if (record.fragment_smarts) {
          console.log(`Highlighting using SMARTS: ${record.fragment_smarts}`);
          fetchMoleculeSvg(record.smiles, record.fragment_smarts);
        } else {
          console.log(`No SMARTS available, displaying molecule without highlight`);
          fetchMoleculeSvg(record.smiles);
        }
      }}>
        View
      </Button>
    </Space>
  ),
},

];

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
          // Safety check for undefined or null values
          return value !== undefined && value !== null && !isNaN(value) &&
                 value >= range[0] && value <= range[1];
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

// Results table columns with filter indicators
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
      title: (
        <span>
          High Gsh Prob
          {filtersActive && activeFilters.high_gsh_prob && (
            <FilterOutlined style={{ color: '#1890ff', marginLeft: 3 }} />
          )}
        </span>
      ),
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
            if (ketcher) {
              try {
                ketcher.setMolecule(record.smiles);
              } catch (error) {
                console.error('Error loading molecule:', error);
              }
            }
          }}>
            View
          </Button>
        </Space>
      ),
    },
  ];

  const ketcherPath = window.location.origin + '/standalone/index.html';

  return (
    <Layout style={{ minHeight: '100vh' }}>
       {/* Left Sidebar */}
      <Sider width={200} theme="light" style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.15)' }}>
        <div className="logo" style={{ height: '64px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>Chemical Canvas</Title>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 64px)' }}>
          <Menu
            mode="vertical"
            selectedKeys={[selectedTab]}
            style={{ borderRight: 0 }}
          >

            <Menu.Item key="annotate" icon={<CommentOutlined />} onClick={() => handleSidebarAction('annotate')}>
              Annotate
            </Menu.Item>
            <Menu.Item key="similarity" icon={<FileSearchOutlined />} onClick={() => handleSidebarAction('similarity')}>
              Similarity Search
            </Menu.Item>
            <Menu.Item key="compute" icon={<CalculatorOutlined />} onClick={() => handleSidebarAction('compute')}>
              Compute
            </Menu.Item>
            <Menu.Item key="export" icon={<HighlightOutlined />} onClick={() => handleSidebarAction('export')}>
              View Highlights
            </Menu.Item>

            <Menu.Item key="modify" icon={<ClusterOutlined />} onClick={() => handleSidebarAction('modify')}>
              3D Visualization
            </Menu.Item>
          </Menu>

          <div style={{ marginTop: 'auto', padding: '20px', textAlign: 'center' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              Back
            </Button>
          </div>
        </div>
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Text strong>Current Mode: </Text>
            <Text>{selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)}</Text>
            {filtersActive && (
              <Text type="secondary" style={{ marginLeft: '10px' }}>
                (Filters Applied: {Object.keys(activeFilters).length})
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
                {showFilterSidebar ? 'Hide Filters' : 'Show Filters'}
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
            <Text>{moleculeName}</Text>
          </div>
        </Header>

        <Layout style={{ padding: '24px', overflow: 'auto' }}>
          {/* Main content layout*/}
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
                  height: 'fit-content',
                }}
              >
                <SidebarFilter
                  isVisible={true}
                  searchResults={originalResults.length > 0 ? originalResults : similarityResults}
                  onApplyFilters={handleApplyFilters}
                  onClearFilters={handleClearFilters}
                  currentSmiles={currentSmiles}
                  isLoading={isSearching}
                />
              </Sider>
            )}

            <Content style={{ width: '100%' }}>
             {/* Ketcher editor area */}
              {!showFilterSidebar && (
                <div style={{ marginBottom: '16px' }}>
                  <Content
                    style={{
                      background: '#fff',
                      padding: '12px',
                      width: '100%',
                      height: '40vh',
                      borderRadius: '4px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      overflow: 'hidden'
                    }}
                  >
                    <iframe
                      id="idKetcher"
                      ref={iframeRef}
                      src={ketcherPath}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  </Content>
                </div>
              )}
              {selectedTab === 'modify' && (
                <div style={{ marginBottom: '16px' }}>
                  <SimpleMoleculeViewer
                    ketcher={ketcher}
                    ketcherPath={ketcherPath}
                  />
                </div>
              )}
              {/* Substructure matching results - at the bottom of Ketcher*/}
              {selectedTab === 'export' && showSubstructureResults && (
                <div style={{ marginBottom: '16px' }}>
                  <Card
                    title="Substructure Matching Results"
                    extra={
                      <Button size="small" onClick={() => setShowSubstructureResults(false)}>
                        Hide Results
                      </Button>
                    }
                  >
                    <div style={{ display: 'flex', height: '400px' }}>
                      {/* Results table taking 2/3 of space */}
                      <div style={{ flex: 2, marginRight: '12px', overflowY: 'auto' }}>
                        <Table
                          columns={substructureColumns}
                          dataSource={substructureResults}
                          size="small"
                          pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            pageSizeOptions: ['5', '10', '20']
                          }}
                          scroll={{ y: 320 }}
                        />
                      </div>

                      {/* Molecule visualization area taking 1/3 of space */}
                      <div style={{ flex: 1, border: '1px solid #f0f0f0', borderRadius: '4px', padding: '8px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Selected Molecule</div>

                        {selectedMolecule ? (
                          <>
                            <div style={{ marginBottom: '8px' }}>
                              <Text strong>ID:</Text> {selectedMolecule.cmpd_id}
                            </div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                              {moleculeSvg ? (
                                <div dangerouslySetInnerHTML={{ __html: moleculeSvg }} />
                              ) : (
                                <div style={{ textAlign: 'center', color: '#999' }}>Loading molecule visualization...</div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#999' }}>
                            Click "View" to display molecule
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

             {/* Similarity Results Table (conditionally rendered) */}
              {showResultsTable && (
                <Content style={{ background: '#fff', padding: '12px', width: '100%', marginBottom: '16px', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>Query SMILES: </Text>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong>Search Results: </Text>
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
                        {filtersActive && (
                          <Button
                            onClick={handleClearFilters}
                            style={{ marginRight: '8px' }}
                          >
                            Reset Filters
                          </Button>
                        )}
                      </div>
                    </div>
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
            </Content>

            {/* Right sidebar with properties */}
            {!showFilterSidebar && (
              <Sider width="30%" style={{ background: '#f0f2f5', marginLeft: '16px', overflowY: 'auto' }}>
                 {/* Basic Information card */}
                <Card title="Basic Information" style={{ marginBottom: '16px' }}>
                  <List size="small">
                    <List.Item>
                      <Text strong style={{ width: '40%' }}>ID:</Text>
                      <Text>{moleculeName}</Text>
                    </List.Item>
                    {sourceData && sourceData[smilesColumn] && (
                      <List.Item>
                        <Text strong style={{ width: '40%' }}>SMILES:</Text>
                        <Text style={{ wordBreak: 'break-all' }}>
                          {sourceData[smilesColumn].length > 50
                            ? sourceData[smilesColumn].substring(0, 50) + '...'
                            : sourceData[smilesColumn]
                          }
                        </Text>
                      </List.Item>
                    )}
                    {filename && (
                      <List.Item>
                        <Text strong style={{ width: '40%' }}>Source:</Text>
                        <Text>{filename}</Text>
                      </List.Item>
                    )}
                  </List>
                </Card>

                {/* Properties from CSV */}
                {propertyKeys.length > 0 ? (
                  <Card title="Properties from CSV" style={{ marginBottom: '16px' }}>
                    <List
                      size="small"
                      itemLayout="horizontal"
                      dataSource={propertyKeys}
                      renderItem={key => {
                        const value = moleculeProperties[key];
                        return (
                          <List.Item style={getPropertyCardStyle(key, value)}>
                            <Text strong style={{ width: '50%' }}>{key}:</Text>
                            <Text>{formatPropertyValue(value)}</Text>
                          </List.Item>
                        );
                      }}
                    />
                  </Card>
                ) : (
                  fromCsv && (
                    <Card title="Properties from CSV" style={{ marginBottom: '16px' }}>
                      <Text type="secondary">No additional properties found in CSV.</Text>
                    </Card>
                  )
                )}



                {/* Annotation Card */}
                {selectedTab === 'annotate' && (
                  <>
                    <Card title="Substructure Selection" style={{ marginBottom: '16px' }}>
                      <div style={{ marginBottom: '10px' }}>
                        <Button type="primary" onClick={captureCurrentSelection}>
                          Capture Selection
                        </Button>
                      </div>

                      {selectedAtoms.length > 0 && (
                        <div>
                          <Text strong>Selected Atoms:</Text>
                          <div style={{
                            padding: '5px',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                            marginTop: '5px',
                            wordBreak: 'break-all'
                          }}>
                            {JSON.stringify(selectedAtoms)}
                          </div>

                          {selectedBonds.length > 0 && (
                            <div style={{ marginTop: '5px' }}>
                              <Text strong>Selected Bonds:</Text>
                              <div style={{
                                padding: '5px',
                                background: '#f5f5f5',
                                borderRadius: '4px',
                                marginTop: '5px',
                                wordBreak: 'break-all'
                              }}>
                                {JSON.stringify(selectedBonds)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                        <div>Selection status: {selectedAtoms.length > 0 ? 'Selected' : 'None'}</div>
                        <div>Selected atoms: {selectedAtoms.length}</div>
                        <div>Selected bonds: {selectedBonds.length}</div>
                        <div style={{ marginTop: '5px', color: '#999' }}>
                          Tip: Use Ketcher's selection tool to select part of the molecule, then click "Capture Selection"
                        </div>
                      </div>
                    </Card>

                    <Card title="Annotations">
                      <textarea
                        placeholder="Add your annotations here..."
                        style={{ width: '100%', height: '100px', padding: '8px', borderRadius: '4px', border: '1px solid #d9d9d9' }}
                        value={currentAnnotation}
                        onChange={(e) => setCurrentAnnotation(e.target.value)}
                      />
                      <Button
                        type="primary"
                        size="small"
                        style={{ marginTop: '8px' }}
                        onClick={captureAndAnnotate}
                        loading={isSavingAnnotation}
                      >
                        Save with Annotation
                      </Button>
                    </Card>
                  </>
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
                  <div>
                    <div className="highlight-annotate-section">
                      <HighlightAnnotateComponent
                        moleculeId={moleculeId || `Compound-${moleculeIdFromParams}`}
                        filename={filename}
                        isLoadingHighlights={isLoadingHighlights}
                        onHighlightSelect={(highlight) => {
                          // Apply the selected highlight to the molecule
                          applyHighlight(highlight);
                          // Set as current highlight
                          const index = savedHighlights.findIndex(h =>
                            h.id === highlight.id ||
                            (h.atoms && highlight.atoms && JSON.stringify(h.atoms) === JSON.stringify(highlight.atoms))
                          );
                          if (index >= 0) {
                            setCurrentHighlightIndex(index);
                          }
                        }}
                        onPerformSubstructureMatch={performSubstructureMatching}
                      />
                    </div>
                  </div>
                )}
              </Sider>
            )}
          </Layout>
        </Layout>
      </Layout>

      {/* Similarity Search Modal */}
      <SimilaritySearch
        currentSmiles={currentSmiles}
        currentId={moleculeName || moleculeId || `Compound-${moleculeIdFromParams}`}
        filename={filename}
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