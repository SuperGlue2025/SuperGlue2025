import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Typography, Button, Descriptions, Tag } from 'antd';

const { Text, Title } = Typography;

const formatValue = (value) => {
  if (typeof value === 'number') {
    return value.toFixed(3); 
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

const AdmetResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { smiles, predictions } = location.state || {};
  const data = predictions?.[0] || {};

  return (
    <Card title="Predicted ADMET Properties" style={{ margin: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Text strong>SMILES:</Text> <Text code>{smiles}</Text>
      </div>

      <Descriptions
        bordered
        column={2}
        size="middle"
        labelStyle={{ fontWeight: 'bold', width: '30%' }}
        contentStyle={{ wordBreak: 'break-word' }}
      >
        {Object.entries(data).map(([key, value]) => (
          <Descriptions.Item key={key} label={key}>
            {formatValue(value)}
          </Descriptions.Item>
        ))}
      </Descriptions>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Button type="primary" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    </Card>
  );
};

export default AdmetResult;
