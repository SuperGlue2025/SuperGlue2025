import React, { useState, useEffect } from 'react';
import { Card, Slider, Checkbox, Collapse, Typography, InputNumber, Button, Row, Col, Divider } from 'antd';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';

const { Panel } = Collapse;
const { Text, Title } = Typography;

const SidebarFilter = ({
  isVisible,
  searchResults,
  onApplyFilters,
  onClearFilters,
  currentSmiles,
  isLoading
}) => {
  // State variables
  const [filterRanges, setFilterRanges] = useState({});
  const [activeFilters, setActiveFilters] = useState({});
  const [enabledFilters, setEnabledFilters] = useState({});
  const [filterProperties, setFilterProperties] = useState([]);

  // Add debug logs
  useEffect(() => {
    console.log("SidebarFilter Props:", {
      isVisible,
      searchResultsLength: searchResults?.length || 0,
      currentSmiles: currentSmiles?.substring(0, 20) + (currentSmiles?.length > 20 ? '...' : ''),
      isLoading
    });

    if (searchResults && searchResults.length > 0) {
      console.log("First search result item:", searchResults[0]);
    } else {
      console.log("No search results available");
    }
  }, [isVisible, searchResults, currentSmiles, isLoading]);

  // Get filterable properties and ranges from search results
  useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      console.log("Updating sidebar filter ranges from search results:", searchResults.length);

      try {
        // Get all keys from the first result
        const allKeys = Object.keys(searchResults[0]);

        // Exclude these fields from being used as filters
        const excludedFields = [
          'cmpd_id', 'key', 'smiles', 'molfile', 'structure', 'id',
          'fragment_smarts', 'fragment_smiles', 'match_atoms', 'match_bonds',
          'compound_id', 'molecule_id', 'mol_id', 'name'
        ];

        // Find all possible numeric properties to use as filters
        const possibleFilterProps = allKeys.filter(key => {
          // Exclude basic fields and non-numeric fields
          if (excludedFields.includes(key.toLowerCase())) return false;

          // Check if the field is numeric
          const sampleValue = searchResults[0][key];
          return typeof sampleValue === 'number' ||
                (typeof sampleValue === 'string' && !isNaN(parseFloat(sampleValue)));
        });

        console.log("Found possible filter properties:", possibleFilterProps);
        setFilterProperties(possibleFilterProps);

        if (possibleFilterProps.length === 0) {
          console.log("No filterable numeric properties found in results");
          return; // Exit early if no filterable properties
        }

        // Calculate the range for each property
        const ranges = {};
        const initialActiveFilters = {};
        const initialEnabledFilters = {};

        possibleFilterProps.forEach(prop => {
          const values = searchResults
            .map(result => result[prop])
            .filter(val => val !== undefined && val !== null && !isNaN(val))
            .map(val => typeof val === 'string' ? parseFloat(val) : val);

          if (values.length > 0) {
            // Calculate actual min and max values
            const min = Math.min(...values);
            const max = Math.max(...values);

            // Add a small buffer to ensure the max value is included
            const buffer = (max - min) * 0.05;
            const adjustedMax = max + (buffer || 0.1); // Ensure there is a range even if min=max

            // Store the range
            ranges[prop] = [min, adjustedMax];
            initialActiveFilters[prop] = [min, adjustedMax];

            // By default, enable the similarity filter (if present), or the first filter
            initialEnabledFilters[prop] = prop.toLowerCase() === 'similarity' ||
                                        (possibleFilterProps.indexOf(prop) === 0 && !possibleFilterProps.includes('similarity'));
          }
        });

        if (Object.keys(ranges).length > 0) {
          // Update state
          setFilterRanges(ranges);
          setActiveFilters(initialActiveFilters);
          setEnabledFilters(initialEnabledFilters);
          console.log("Set filter ranges:", ranges);
        } else {
          console.log("No valid ranges found for any property");
        }
      } catch (error) {
        console.error("Error setting up filters:", error);
      }
    } else {
      console.log("No search results available for filtering");
      setFilterProperties([]);
    }
  }, [searchResults]);

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

  // Apply filters
  const handleApplyFilters = () => {
    try {
      const filters = Object.entries(enabledFilters)
        .filter(([key, enabled]) => enabled)
        .reduce((acc, [key]) => {
          // Ensure the property exists in active filters
          if (activeFilters[key]) {
            acc[key] = activeFilters[key];
          }
          return acc;
        }, {});

      console.log("Applying filters:", filters);
      onApplyFilters(filters);
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    try {
      // Reset all enabled filters, only keep one default enabled
      const resetEnabled = {};
      filterProperties.forEach(prop => {
        resetEnabled[prop] = prop.toLowerCase() === 'similarity' ||
                            (filterProperties.indexOf(prop) === 0 && !filterProperties.includes('similarity'));
      });

      setEnabledFilters(resetEnabled);

      // Reset active filters to full range
      setActiveFilters({...filterRanges});

      console.log("Filters cleared");
      // Call clear callback
      onClearFilters();
    } catch (error) {
      console.error("Error clearing filters:", error);
    }
  };

  // Format property label
  const formatLabel = (property) => {
    try {
      return property
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } catch (error) {
      console.error("Error formatting label:", error);
      return property; // Return original property as fallback
    }
  };

  // Predefine step size based on property type
  const getStep = (property) => {
    try {
      if (property.toLowerCase() === 'similarity') return 0.01;
      if (property.toLowerCase().includes('occ')) return 0.1;
      if (property.toLowerCase().includes('prob')) return 0.01;

      // Default step size - dynamically determined by value range
      const range = filterRanges[property];
      if (!range) return 0.01;

      const diff = range[1] - range[0];
      if (diff > 1000) return 10;
      if (diff > 100) return 1;
      if (diff > 10) return 0.1;
      return 0.01;
    } catch (error) {
      console.error("Error getting step:", error);
      return 0.01; // Return default step as fallback
    }
  };

  // Format display value
  const formatValue = (value, property) => {
    try {
      if (!value && value !== 0) return '-';

      if (property.toLowerCase() === 'similarity') {
        return (value * 100).toFixed(0) + '%';
      }

      // Check if integer or float
      return Number.isInteger(value) ? value.toString() : value.toFixed(2);
    } catch (error) {
      console.error("Error formatting value:", error);
      return String(value); // Return stringified value as fallback
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4}>
          <FilterOutlined /> Filters
        </Title>
        <Button type="link" onClick={handleClearFilters}>
          Clear All
        </Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Text strong>Query SMILES:</Text>
        <div style={{ wordBreak: 'break-all', marginTop: '4px', maxHeight: '80px', overflowY: 'auto', padding: '8px', background: '#fafafa', borderRadius: '4px' }}>
          <Text>{currentSmiles ? (currentSmiles.length > 50 ? currentSmiles.substring(0, 50) + '...' : currentSmiles) : 'No structure'}</Text>
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* If there are no filterable properties, show a message */}
      {(!filterProperties || filterProperties.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Text type="secondary">
            {searchResults && searchResults.length > 0
              ? 'No numeric properties found to filter'
              : 'No search results to filter'}
          </Text>
        </div>
      ) : (
        <Collapse defaultActiveKey={['ranges']} ghost>
          <Panel header={<Text strong>Property Ranges</Text>} key="ranges">
            {filterProperties.map(property => (
              <div key={property} style={{ marginBottom: 20 }}>
                <Row align="middle" style={{ marginBottom: 4 }}>
                  <Col span={16}>
                    <Checkbox
                      checked={enabledFilters[property]}
                      onChange={() => handleFilterToggle(property)}
                    >
                      <Text strong>{formatLabel(property)}</Text>
                    </Checkbox>
                  </Col>
                  <Col span={8} style={{ textAlign: 'right' }}>
                    <Text>
                      {activeFilters[property] ?
                        `${formatValue(activeFilters[property][0], property)} - ${formatValue(activeFilters[property][1], property)}` :
                        '-'}
                    </Text>
                  </Col>
                </Row>

                <Row>
                  <Col span={18}>
                    <Slider
                      range
                      min={filterRanges[property] ? filterRanges[property][0] : 0}
                      max={filterRanges[property] ? filterRanges[property][1] : 1}
                      step={getStep(property)}
                      value={activeFilters[property]}
                      onChange={(values) => handleFilterChange(property, values)}
                      disabled={!enabledFilters[property]}
                      tooltip={{
                        formatter: (value) => formatValue(value, property)
                      }}
                    />
                  </Col>
                  <Col span={6} style={{ paddingLeft: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <InputNumber
                        style={{ width: 60 }}
                        min={filterRanges[property] ? filterRanges[property][0] : 0}
                        max={filterRanges[property] ? filterRanges[property][1] : 1}
                        step={getStep(property)}
                        value={activeFilters[property] ? activeFilters[property][0] : 0}
                        onChange={(value) => handleFilterChange(property, [value, activeFilters[property]?.[1] || 1])}
                        disabled={!enabledFilters[property]}
                        size="small"
                        controls={false}
                      />
                    </div>
                  </Col>
                </Row>
              </div>
            ))}
          </Panel>
        </Collapse>
      )}

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleApplyFilters}
          loading={isLoading}
          block
          size="large"
          disabled={!filterProperties || filterProperties.length === 0}
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default SidebarFilter;