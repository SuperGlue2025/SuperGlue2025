import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api.js'; 
import {
  Card,
  Typography,
  Button,
  Collapse,
  Descriptions,
  Tag,
  Modal,
  message,
  Space,
  Row,
  Col
} from 'antd';
import { EyeOutlined, BarChartOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Panel } = Collapse;

/* ---------- regex rules ---------- */

// Phys-Chem Basics
const R_PHYS = /(logp|logs|mw|weight|tpsa|rotatable|hba|hbd|qed|lipinski|sa_score)/i;

// Absorption
const R_AD_ABS = /(hia|caco2|pampa|fa_ss|bioavailability|solubility)/i;
// Distribution
const R_AD_DIS = /(bbb|vdss|ppbr)/i;

// Metabolism
const R_ME_MET = /(cyp|substrate|inhibitor)/i;
// Elimination
const R_ME_ELI = /(clearance|microsome|hepatocyte|half_life|half-life|t1\/2)/i;

// Toxicity
const R_TOX  = /(ames|dili|clintox|herg|carcinogen|ld50|toxic|skin|eye|nags|nr-ar|sr-|occupational|irritation|sensitization)/i;

// DrugBank 
const R_PCTL = /_drugbank_.*percentile$/i;

/* ---------- split---------- */
const getGroup = key => {
  if (R_PCTL.test(key))    return null;                         
  if (R_PHYS.test(key))    return 'Phys-Chem Basics';          
  if (R_AD_ABS.test(key))  return 'Absorption';                
  if (R_AD_DIS.test(key))  return 'Distribution';              
  if (R_ME_MET.test(key))  return 'Metabolism';               
  if (R_ME_ELI.test(key))  return 'Elimination';               
  if (R_TOX.test(key))     return 'Toxicity';                 

  return 'Other';
};

/* ---------- formatting ---------- */
const fmt = v =>
  typeof v === 'number'
    ? v.toFixed(3)
    : typeof v === 'object'
      ? JSON.stringify(v)
      : String(v);

/* ---------- component ---------- */
const AdmetResult = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { smiles, predictions, allSmiles } = state || {};
  
  console.log('Received state:', state); 
  console.log('All SMILES:', allSmiles); 
  console.log('Predictions:', predictions); 
  const data = Array.isArray(predictions) ? predictions : [predictions];
  console.log('Processed data:', data); 

  // 1) Grouping, skipping any percentile keys
  const grouped = {};
  data.forEach(compoundData => {
    if (!compoundData) return; 
    Object.entries(compoundData).forEach(([k, v]) => {
      if (R_PCTL.test(k)) return;             // skip drugbank percentiles
      const g = getGroup(k);
      if (!grouped[g]) {
        grouped[g] = [];
      }
      const existingIndex = grouped[g].findIndex(item => item.k === k);
      if (existingIndex === -1) {
        grouped[g].push({ k, v });
      }
    });
  });

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImage, setModalImage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // 2) fetch & show the plot
const viewPlot = async (property) => {
  setLoading(true);
  try {
    // smile name
    const filename = state.filename;  
    // current smiles
    const highlightSmile = Array.isArray(smiles) ? smiles[0] : smiles;

    const response = await apiFetch('/api/dataset_admet_plot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        property,
        highlight_smiles: highlightSmile
      })
    });
    const data = await response.json();
    if (data.success) {
      setModalImage(data.plot);
      setModalTitle(`${property.replace(/_/g,' ')} Distribution`);
      setModalVisible(true);
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    message.error(`Plot error: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  return (
    <div
      style={{
        paddingTop: 88,
        height: '100vh',
        overflowY: 'auto',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <Card
        title="Predicted ADMET Properties"
        style={{ margin: '0 24px 24px', width:'100%' }}
      >
        <div style={{ marginBottom:16 }}>
          <Text strong>Dataset SMILES:&nbsp;</Text>
          <div>
            {Array.isArray(allSmiles) ? (
              <Text code>{`${allSmiles.length} compounds`}</Text>
            ) : (
              <Text code>{smiles}</Text>
            )}
          </div>
        </div>

        <Collapse defaultActiveKey={Object.keys(grouped)}>
          {Object.entries(grouped).map(([group, arr]) => (
            <Panel header={group} key={group}>
              <Descriptions
                bordered
                size="small"
                column={2}
                labelStyle={{ fontWeight:'bold', width:'40%' }}
                contentStyle={{ wordBreak:'break-word' }}
              >
                {arr.map(({ k, v }) => (
                  <Descriptions.Item
                    key={k}
                    label={k.replace(/_/g,' ')}
                  >
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span>
                        {/_percentile$/i.test(k) ? <Tag color="blue">{fmt(v)} %</Tag> : fmt(v)}
                      </span>
                      <Space>
                        <Button
                          type="link"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => viewPlot(k)}
                          loading={loading}
                        />
                      </Space>
                    </div>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Panel>
          ))}
        </Collapse>

        <div style={{ marginTop:24, textAlign:'right' }}>
          <Button type="primary" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </Card>

      {/* Property Plot Modal */}
      <Modal
        visible={modalVisible}
        title={modalTitle}
        footer={null}
        width="80%"
        onCancel={() => setModalVisible(false)}
        bodyStyle={{ textAlign:'center' }}
      >
        {modalImage && <img src={modalImage} alt={modalTitle} style={{ maxWidth:'100%' }}/>}
      </Modal>
    </div>
  );
};

export default AdmetResult;