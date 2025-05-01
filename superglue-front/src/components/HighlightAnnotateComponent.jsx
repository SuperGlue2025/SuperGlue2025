import React, { useState, useEffect } from 'react';
import { Button, List, Typography, Divider, Empty, message, Select } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined, SortAscendingOutlined } from '@ant-design/icons';
import PropTypes from 'prop-types';

const { Text } = Typography;
const { Option } = Select;

const HighlightAnnotateComponent = ({
  moleculeId,
  filename,
  onHighlightSelect,
  onPerformSubstructureMatch,
  isLoadingHighlights = false
}) => {
  const [savedHighlights, setSavedHighlights] = useState([]);
  const [sortOrder, setSortOrder] = useState('date_modified');
  const [sortDirection, setSortDirection] = useState('desc');

  // Load saved highlights
  useEffect(() => {
    if (moleculeId) {
      loadSavedHighlights();
    }
  }, [moleculeId]);

  // Load saved highlights function
  const loadSavedHighlights = async () => {
    try {
      // Fetch data from the backend API
      const response = await fetch(`http://localhost:5001/api/get_molecule_highlights?id=${moleculeId}&filename=${filename || ''}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSavedHighlights(data.highlights || []);
      } else {
        console.error('Failed to load highlights:', data.message);
        message.error(`Failed to load highlights: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Server connection error:', error);
      message.error('Server connection error');
    }
  };

  // Handle highlight click
  const handleHighlightClick = (highlight) => {
    if (onHighlightSelect) {
      onHighlightSelect(highlight);
    }
  };

  // Handle delete highlight
  const handleDeleteHighlight = async (highlightId, e) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(`http://localhost:5001/api/delete_highlight`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: moleculeId,
          highlightId: highlightId,
          filename: filename || ''
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        message.success('Highlight deleted successfully');
        loadSavedHighlights(); // Refresh the list
      } else {
        message.error(`Failed to delete: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Server connection error:', error);
      message.error('Server connection error');
    }
  };

  // Handle edit highlight
  const handleEditHighlight = (highlight, e) => {
    if (e) e.stopPropagation();
    message.info('Edit functionality to be implemented');
  };

  // Handle substructure match
  const handleSubstructureMatch = () => {
    if (onPerformSubstructureMatch) {
      onPerformSubstructureMatch();
    }
  };

  // Handle sort order change
  const handleSortChange = (value) => {
    setSortOrder(value);
  };

  // Handle sort direction toggle
  const handleSortDirectionToggle = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Sort highlights based on current sort settings
  const sortedHighlights = [...savedHighlights].sort((a, b) => {
    let comparison = 0;

    if (sortOrder === 'date_modified') {
      const dateA = new Date(a.timestamp || 0);
      const dateB = new Date(b.timestamp || 0);
      comparison = dateA - dateB;
    } else if (sortOrder === 'name') {
      const nameA = a.annotation || '';
      const nameB = b.annotation || '';
      comparison = nameA.localeCompare(nameB);
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="highlight-annotate-container">
      <div className="highlight-annotate-header">
        <h3>Highlight / Annotate</h3>
        <Text type="secondary" style={{ marginBottom: '12px', display: 'block' }}>
          Highlight atoms/substructures and add notes to annotate molecules.
        </Text>
      </div>

      <Divider orientation="left">Saved highlights / annotations</Divider>

      {/*<Button*/}
      {/*  type="primary"*/}
      {/*  block*/}
      {/*  style={{ marginBottom: '16px' }}*/}
      {/*  onClick={loadSavedHighlights}*/}
      {/*  loading={isLoadingHighlights}*/}
      {/*>*/}
      {/*  Load Saved Highlights*/}
      {/*</Button>*/}

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <Text style={{ marginRight: '8px' }}>Sort by:</Text>
        <Select
          defaultValue="date_modified"
          style={{ width: 150 }}
          onChange={handleSortChange}
        >
          <Option value="date_modified">Date Modified</Option>
          <Option value="name">Name</Option>
        </Select>
        <Button
          type="text"
          icon={<SortAscendingOutlined />}
          onClick={handleSortDirectionToggle}
          style={{ marginLeft: '8px' }}
        />
      </div>

      <div className="highlights-list-container" style={{
        maxHeight: '200px',
        overflowY: 'auto',
        border: '1px solid #f0f0f0',
        borderRadius: '4px'
      }}>
        {sortedHighlights.length > 0 ? (
          <List
            dataSource={sortedHighlights}
            renderItem={highlight => (
              <List.Item
                key={highlight.id}
                className="highlight-list-item"
                style={{
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderBottom: '1px solid #f0f0f0'
                }}
                onClick={() => handleHighlightClick(highlight)}
                actions={[
                  <EditOutlined key="edit" onClick={(e) => handleEditHighlight(highlight, e)} />,
                  <DeleteOutlined key="delete" onClick={(e) => handleDeleteHighlight(highlight.id, e)} />
                ]}
              >
                <div>
                  {highlight.annotation ?
                    <Text className="highlight-annotation">{highlight.annotation}</Text> :
                    <Text type="secondary" italic className="highlight-annotation-empty">
                      highlight_{highlight.id || "null"}
                    </Text>
                  }
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No saved highlights"
            style={{ padding: '20px 0' }}
          />
        )}
      </div>

      <Divider orientation="left">Tools</Divider>

      <div>
        <Text strong>Substructure Matching</Text>
        <div style={{ marginTop: '4px', marginBottom: '16px' }}>
          <Text type="secondary">Find molecules that contain the highlighted substructure.</Text>
        </div>
      </div>

      <Button
        type="primary"
        block
        icon={<SearchOutlined />}
        onClick={handleSubstructureMatch}
        className="substructure-tool-btn"
      >
        Substructure Match
      </Button>
    </div>
  );
};

// PropTypes for validation
HighlightAnnotateComponent.propTypes = {
  moleculeId: PropTypes.string.isRequired,
  filename: PropTypes.string,
  onHighlightSelect: PropTypes.func,
  onPerformSubstructureMatch: PropTypes.func,
  isLoadingHighlights: PropTypes.bool
};

HighlightAnnotateComponent.defaultProps = {
  filename: '',
  isLoadingHighlights: false
};

export default HighlightAnnotateComponent;