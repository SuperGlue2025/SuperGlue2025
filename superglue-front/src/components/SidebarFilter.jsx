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

  // Initialize filter ranges based on properties
  const [filterRanges, setFilterRanges] = useState(defaultRanges);

  // Current active filter values
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

  // Update filter ranges when search results change
  useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      console.log("Updating sidebar filter ranges from search results:", searchResults);

      // Calculate min/max values for each property from search results
      const ranges = {};
      const propertiesToCheck = ['similarity', 'binary_occ', 'cont_occ', 'low_gsh_prob', 'med_gsh_prob', 'high_gsh_prob', 'selectivity'];

      // Process each property
      propertiesToCheck.forEach(prop => {
        const values = searchResults
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
        } else {
          console.log(`No valid values found for property ${prop} in sidebar`);
        }
      });

      // Update filter ranges
      setFilterRanges(prev => {
        const newRanges = {...prev, ...ranges};
        console.log("New sidebar filter ranges:", newRanges);
        return newRanges;
      });

      // Also update active filters with the same ranges
      setActiveFilters(prev => {
        const newFilters = {...prev, ...ranges};
        console.log("New sidebar active filters:", newFilters);
        return newFilters;
      });
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
    const filters = Object.entries(enabledFilters)
      .filter(([key, enabled]) => enabled)
      .reduce((acc, [key]) => {
        acc[key] = activeFilters[key];
        return acc;
      }, {});

    onApplyFilters(filters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    // Reset all enabled filters to false except similarity
    setEnabledFilters({
      similarity: true,
      binary_occ: false,
      cont_occ: false,
      low_gsh_prob: false,
      med_gsh_prob: false,
      high_gsh_prob: false,
      selectivity: false
    });

    // Reset active filters to full ranges
    setActiveFilters({...filterRanges});

    // Call the clear callback
    onClearFilters();
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

  // Format value for display
  const formatValue = (value, property) => {
    if (property === 'similarity') {
      return (value * 100).toFixed(0) + '%';
    }
    return value.toFixed(2);
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

      <Collapse defaultActiveKey={['ranges']} ghost>
        <Panel header={<Text strong>Property Ranges</Text>} key="ranges">
          {Object.keys(filterRanges).map(property => (
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
                    {formatValue(activeFilters[property][0], property)} - {formatValue(activeFilters[property][1], property)}
                  </Text>
                </Col>
              </Row>

              <Row>
                <Col span={18}>
                  <Slider
                    range
                    min={filterRanges[property][0]}
                    max={filterRanges[property][1]}
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
                      min={filterRanges[property][0]}
                      max={filterRanges[property][1]}
                      step={getStep(property)}
                      value={activeFilters[property][0]}
                      onChange={(value) => handleFilterChange(property, [value, activeFilters[property][1]])}
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

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleApplyFilters}
          loading={isLoading}
          block
          size="large"
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default SidebarFilter;