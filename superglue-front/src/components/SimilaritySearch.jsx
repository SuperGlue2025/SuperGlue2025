import React, { useState } from 'react';
import { Modal, Button, Tabs, Select, Table, Card, Space, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { Option } = Select;
const { Text } = Typography;

const SimilaritySearch = ({
  currentSmiles,
  currentId,
  filename,
  visible,
  onClose,
  onResultsFound,
  ketcher,
  moleculeProperties,
  dataset_id
}) => {
  const [activeTab, setActiveTab] = useState('query');
  const [similarityMethod, setSimilarityMethod] = useState('Tanimoto');
  const [maxResults, setMaxResults] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const runSearch = async () => {
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
        filename: filename,
        dataset_id: dataset_id
      };

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

  return (
    <Modal
      title="Similarity Search"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Query & Metric" key="query">
          <Card size="small">
            <div style={{ padding: 16 }}>
              <Text strong>Current Smiles:</Text>
              <div style={{ wordBreak: 'break-all', margin: '8px 0' }}>
                <Text>{currentSmiles || 'No structure available'}</Text>
              </div>

              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <Text strong>Similarity Metric:</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  value={similarityMethod}
                  onChange={setSimilarityMethod}
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
                onClick={runSearch}
                disabled={!currentSmiles}
                loading={isLoading}
              >
                Search with {similarityMethod.charAt(0).toUpperCase() + similarityMethod.slice(1)}
              </Button>

              {errorMessage && (
                <div style={{ color: 'red', margin: '8px 0' }}>
                  {errorMessage}
                </div>
              )}
            </div>
          </Card>
        </TabPane>

        <TabPane tab="Filters" key="filters">
          <Card size="small">
            <div style={{ padding: 16, textAlign: 'center' }}>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={runSearch}
                loading={isLoading}
              >
                Search with Filters
              </Button>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default SimilaritySearch;