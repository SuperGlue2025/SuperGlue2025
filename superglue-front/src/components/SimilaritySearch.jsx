import React, { useState, useEffect } from 'react';
import { Modal, Button, Tabs, Select, Table, Card, Space, Typography, Slider, Checkbox, Row, Col, Divider, InputNumber } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { Option } = Select;
const { Text, Title } = Typography;

const SimilaritySearch = ({
  currentSmiles,
  currentId,
  filename,
  visible,
  onClose,
  onResultsFound,
  ketcher,
  moleculeProperties
}) => {
  const [activeTab, setActiveTab] = useState('query');
  const [similarityMethod, setSimilarityMethod] = useState('Tanimoto');
  const [maxResults, setMaxResults] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initial default ranges - these will be updated with actual data
  const defaultRanges = {
    similarity: [0, 1],
    binary_occ: [-1, 5],
    cont_occ: [0, 1],
    low_gsh_prob: [0, 1],
    med_gsh_prob: [0, 1],
    high_gsh_prob: [0, 1],
    selectivity: [0, 1]
  };

  // Filter state - will be updated with actual min/max from data
  const [filterRanges, setFilterRanges] = useState(defaultRanges);

  // Active filter state - initially same as filter ranges
  const [activeFilters, setActiveFilters] = useState({...defaultRanges});

  // Enable/disable state for each filter
  const [enabledFilters, setEnabledFilters] = useState({
    similarity: true,
    binary_occ: false,
    cont_occ: false,
    low_gsh_prob: false,
    med_gsh_prob: false,
    high_gsh_prob: false,
    selectivity: false
  });

  // Previous search results for min/max determination
  const [previousResults, setPreviousResults] = useState([]);

  // Update filter ranges based on previous search results
  useEffect(() => {
    if (previousResults.length > 0) {
      console.log("Updating filter ranges from search results:", previousResults);

      // Calculate min/max values for each property from previous results
      const ranges = {};
      const propertiesToCheck = ['similarity', 'binary_occ', 'cont_occ', 'low_gsh_prob', 'med_gsh_prob', 'high_gsh_prob', 'selectivity'];

      // Process each property
      propertiesToCheck.forEach(prop => {
        const values = previousResults
          .map(result => result[prop])
          .filter(val => val !== undefined && val !== null);

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
        } else {
          console.log(`No valid values found for property ${prop}`);
        }
      });

      // Update filter ranges
      setFilterRanges(prev => {
        const newRanges = {...prev, ...ranges};
        console.log("New filter ranges:", newRanges);
        return newRanges;
      });

      // Also update active filters with the same ranges
      setActiveFilters(prev => {
        const newFilters = {...prev, ...ranges};
        console.log("New active filters:", newFilters);
        return newFilters;
      });
    }
  }, [previousResults]);

  // Run the search with current parameters
  const runSearch = async (withFilters = false) => {
    // Set loading state
    setIsLoading(true);
    setErrorMessage('');

    try {
      if (!currentSmiles) {
        throw new Error('No molecule structure available for search');
      }

      // Prepare request parameters
      const searchParams = {
        query_smiles: currentSmiles,
        query_id: currentId,
        similarity_metric: similarityMethod,
        filename: filename
      };

      // Add filters if they're enabled and we're searching with filters
      if (withFilters) {
        searchParams.filters = Object.entries(enabledFilters)
          .filter(([key, enabled]) => enabled)
          .reduce((acc, [key]) => {
            acc[key] = activeFilters[key];
            return acc;
          }, {});
      }

      console.log('Sending search request with params:', searchParams);

      // Send request to backend API
      const response = await fetch('http://localhost:5001/api/similarity_search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchParams)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with status: ${response.status}. ${errorText}`);
      }

      const data = await response.json();

      // Process returned data
      if (data.success) {
        // Format data for table display
        const formattedResults = data.results.map(result => {
          // Create a base object with standard properties
          const formattedResult = {
            key: result.id || `result-${Math.random().toString(36).substr(2, 9)}`,
            id: result.id || 'Unknown',
            cmpd_id: result.cmpd_id || result.id || 'Unknown',
            similarity: typeof result.similarity === 'number'
              ? result.similarity
              : parseFloat(result.similarity || 0),
            smiles: result.smiles || result.SMILES || ''
          };

          // Add all other properties from the result
          Object.keys(result).forEach(key => {
            if (!['id', 'smiles', 'SMILES'].includes(key)) {
              // Try to convert string numbers to actual numbers
              if (typeof result[key] === 'string' && !isNaN(parseFloat(result[key]))) {
                formattedResult[key] = parseFloat(result[key]);
              } else {
                formattedResult[key] = result[key];
              }
            }
          });

          return formattedResult;
        });

        console.log('Received and formatted search results:', formattedResults);

        // Save results for range determination
        setPreviousResults(formattedResults);

        // Call the onResultsFound callback with the results and similarity method
        if (onResultsFound && typeof onResultsFound === 'function') {
          onResultsFound(formattedResults, similarityMethod);
        }

        // Close the modal after search is complete
        onClose();
      } else {
        throw new Error(data.error || 'No matching compounds found');
      }
    } catch (error) {
      console.error('Error during similarity search:', error);
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Search with only the similarity metric (no filters)
  const handleBasicSearch = () => {
    runSearch(false);
  };

  // Search with filters applied
  const handleFilterSearch = () => {
    runSearch(true);
  };

  // Handle filter checkbox change
  const handleFilterToggle = (property) => {
    setEnabledFilters(prev => ({
      ...prev,
      [property]: !prev[property]
    }));
  };

  // Handle filter range change
  const handleFilterChange = (property, values) => {
    setActiveFilters(prev => ({
      ...prev,
      [property]: values
    }));
  };

  const formatLabel = (property) => {
    return property
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Pre-defined range steps based on property type
  const getStep = (property) => {
    if (property === 'similarity') return 0.01;
    if (property.includes('occ')) return 0.1;
    if (property.includes('prob')) return 0.01;
    return 0.01;
  };

  return (
    <Modal
      title="Similarity Search"
      open={visible}
      onCancel={onClose}
      width={1000} // Increased width
      bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }} // Allow scrolling if content is large
      footer={null}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Query & Metric" key="query">
          <Card size="small">
            <div style={{ padding: 16 }}>
              <Title level={5}>Current SMILES:</Title>
              <div style={{ wordBreak: 'break-all', margin: '8px 0', maxHeight: '120px', overflowY: 'auto', padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px', background: '#fafafa' }}>
                <Text>{currentSmiles || 'No structure available'}</Text>
              </div>

              <div style={{ marginTop: 24, marginBottom: 16 }}>
                <Title level={5}>Similarity Metric:</Title>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  value={similarityMethod}
                  onChange={setSimilarityMethod}
                  size="large"
                >
                  <Option value="Tanimoto">Tanimoto (Default)</Option>
                  <Option value="Russel">Russel</Option>
                  <Option value="Sokal">Sokal</Option>
                  <Option value="Cosine">Cosine Similarity</Option>
                  <Option value="Dice">Dice Similarity</Option>
                  <Option value="Kulczynski">Kulczynski</Option>
                  <Option value="McConnaughey">McConnaughey</Option>
                </Select>
              </div>

              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleBasicSearch}
                disabled={!currentSmiles}
                loading={isLoading}
                size="large"
                style={{ marginRight: 10 }}
              >
                Search with {similarityMethod.charAt(0).toUpperCase() + similarityMethod.slice(1)}
              </Button>

              <Button
                type="default"
                onClick={() => setActiveTab('filters')}
                icon={<FilterOutlined />}
                size="large"
              >
                Configure Filters
              </Button>

              {errorMessage && (
                <div style={{ color: 'red', margin: '12px 0', padding: '8px', background: '#fff1f0', borderRadius: '4px' }}>
                  {errorMessage}
                </div>
              )}
            </div>
          </Card>
        </TabPane>

        <TabPane tab="Filters" key="filters">
          <Card size="small">
            <div style={{ padding: 24 }}>
              <Title level={4}>Apply filters to search results:</Title>

              <div style={{ marginTop: 24 }}>
                {Object.keys(filterRanges).map(property => (
                  <div key={property} style={{ marginBottom: 32 }}>
                    <Row align="middle" gutter={16}>
                      <Col span={4}>
                        <Checkbox
                          checked={enabledFilters[property]}
                          onChange={() => handleFilterToggle(property)}
                          style={{ fontSize: '16px' }}
                        >
                          <Text strong>{formatLabel(property)}</Text>
                        </Checkbox>
                      </Col>
                      <Col span={14}>
                        <Slider
                          range
                          min={filterRanges[property][0]}
                          max={filterRanges[property][1]}
                          step={getStep(property)}
                          value={activeFilters[property]}
                          onChange={(values) => handleFilterChange(property, values)}
                          disabled={!enabledFilters[property]}
                          tooltip={{ formatter: value => value.toFixed(2) }}
                        />
                      </Col>
                      <Col span={6}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <InputNumber
                            style={{ width: 80 }}
                            min={filterRanges[property][0]}
                            max={filterRanges[property][1]}
                            step={getStep(property)}
                            value={activeFilters[property][0]}
                            onChange={(value) => handleFilterChange(property, [value, activeFilters[property][1]])}
                            disabled={!enabledFilters[property]}
                            size="middle"
                            controls={false}
                          />
                          <span style={{ margin: '0 8px' }}>-</span>
                          <InputNumber
                            style={{ width: 80 }}
                            min={filterRanges[property][0]}
                            max={filterRanges[property][1]}
                            step={getStep(property)}
                            value={activeFilters[property][1]}
                            onChange={(value) => handleFilterChange(property, [activeFilters[property][0], value])}
                            disabled={!enabledFilters[property]}
                            size="middle"
                            controls={false}
                          />
                        </div>
                      </Col>
                    </Row>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleFilterSearch}
                  loading={isLoading}
                  size="large"
                  style={{ minWidth: 200, height: 48 }}
                >
                  Search with Filters
                </Button>
              </div>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default SimilaritySearch;