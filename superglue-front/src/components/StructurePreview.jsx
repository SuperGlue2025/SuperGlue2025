import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Papa from "papaparse";
import "../styles/main.css";

const CsvPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const baseUrl = "http://localhost:5001";
  const fileUrl = location.state?.fileUrl ? `${baseUrl}${location.state.fileUrl}` : null;

  const [rawData, setRawData] = useState([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [columnsToShow, setColumnsToShow] = useState(["cmpd_id", "SMILES"]);
  const [idColumn, setIdColumn] = useState("cmpd_id");
  const [smilesColumn, setSmilesColumn] = useState("SMILES");

  // detect id column and smiles column
  const identifySpecialColumns = (headers, data) => {
    const idPatterns = [
      /^id$/i,
      /^compound.?id$/i,
      /^cmpd.?id$/i,
      /^molecule.?id$/i,
      /^mol.?id$/i,
      /^compound.?number$/i,
      /^cmpd.?no$/i,
      /^no\.?$/i,
      /^index$/i
    ];

    const smilesPatterns = [
      /^smiles$/i,
      /^canonical.?smiles$/i,
      /^structure$/i,
      /^mol.?structure$/i,
      /^smiles.?string$/i,
      /^chem.?structure$/i
    ];

    // recognize id column
    let detectedIdColumn = '';
    for (const pattern of idPatterns) {
      const match = headers.find(header => pattern.test(header));
      if (match) {
        detectedIdColumn = match;
        break;
      }
    }

    // if no ID column matching the patterns is found, check for columns with unique values (possibly IDs)
    if (!detectedIdColumn) {
      const uniqueValueCounts = {};
      headers.forEach(header => {
        const values = data.map(row => row[header]);
        const uniqueValues = new Set(values);
        uniqueValueCounts[header] = uniqueValues.size;
      });

      // if a column has unique values equal to the number of data rows, it might be an ID column
      const possibleIdColumns = headers.filter(header =>
        uniqueValueCounts[header] === data.length &&
        !smilesPatterns.some(pattern => pattern.test(header)) // exclude SMILES columns
      );

      if (possibleIdColumns.length > 0) {
        // prioritize columns that look like IDs (contain numbers or short strings)
        detectedIdColumn = possibleIdColumns.find(header =>
          data.some(row => /^\d+$/.test(row[header]))
        ) || possibleIdColumns[0];
      }
    }

    // recognize smiles column
    let detectedSmilesColumn = '';
    for (const pattern of smilesPatterns) {
      const match = headers.find(header => pattern.test(header));
      if (match) {
        detectedSmilesColumn = match;
        break;
      }
    }

    // if no SMILES column matching the patterns is found, try to identify by SMILES string characteristics
    if (!detectedSmilesColumn) {
      const possibleSmilesColumns = headers.filter(header => {
        // smiles typically contains these special characters
        const smilesChars = ['C', 'c', 'N', 'O', '=', '#', '(', ')', '[', ']'];
        const samples = data.slice(0, Math.min(5, data.length));

        return samples.every(row => {
          const value = String(row[header] || '');
          // smiles are typically strings with specific characters and moderate length
          return typeof value === 'string' &&
                 value.length > 5 &&
                 value.length < 200 &&
                 smilesChars.some(char => value.includes(char));
        });
      });

      if (possibleSmilesColumns.length > 0) {
        detectedSmilesColumn = possibleSmilesColumns[0];
      }
    }

    return {
      idColumn: detectedIdColumn || headers[0],
      smilesColumn: detectedSmilesColumn || "SMILES"
    };
  };

  useEffect(() => {
    if (fileUrl) {
      fetch(fileUrl)
        .then((response) => response.text())
        .then((csvText) => {
          const parsedResult = Papa.parse(csvText, {
            header: true,
            dynamicTyping: true // automatically convert numeric strings to numbers
          });
          const filteredData = parsedResult.data.filter(
            (row) => Object.keys(row).length > 1
          );

          setRawData(filteredData);

          // get column names
          const headers = parsedResult.meta.fields || [];

          // identify ID and SMILES columns
          if (headers.length > 0 && filteredData.length > 0) {
            const { idColumn, smilesColumn } = identifySpecialColumns(headers, filteredData);

            setIdColumn(idColumn);
            setSmilesColumn(smilesColumn);
            setColumnsToShow([idColumn, smilesColumn]);

            console.log("Detected ID column:", idColumn);
            console.log("Detected SMILES column:", smilesColumn);
          }
        })
        .catch((error) => console.error("Error loading CSV:", error));
    }
  }, [fileUrl]);

  const handleRowClick = (row, index) => {
    setSelectedRowIndex(index);
    
    // Create state object to pass to the new window
    const stateData = {
      smiles: row[smilesColumn],
      fromCsv: true,
      moleculeId: index,
      moleculeName: row[idColumn] || `Compound-${index}`,
      sourceData: row,
      allData: rawData,
      idColumn: idColumn,
      smilesColumn: smilesColumn,
      filename: location.state?.fileUrl?.split("/").pop()
    };
    
    // Convert state to a query string
    const serializedState = encodeURIComponent(JSON.stringify(stateData));
    
    // Open a new window with the editor route
    const editorUrl = `/editor/${index}?state=${serializedState}`;
    window.open(editorUrl, `editor_${index}`, 'width=1200,height=800');
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="user-info" onClick={() => navigate("/")}>
          <button className="avatar-button">
            <img src="/assets/home.png" alt="Home" className="home-icon"/>
            <span className="home-label" style={{color: "black"}}>Homepage</span>
          </button>
        </div>
      </header>

      {/* Main Section */}
      <main className="app-main">
        <h1 className="main-title" style={{marginBottom: "100px"}}>CSV Preview</h1>
        {rawData.length > 0 ? (
          <div className="csv-container" style={{maxHeight: "500px", maxWidth: "1000px", overflowY: "auto"}}>
            <table className="csv-table">
              <thead>
                <tr>
                  {columnsToShow.map((key) => (
                    <th key={key} style={{color: "black"}}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawData.map((row, index) => (
                  <tr
                    key={index}
                    onClick={() => handleRowClick(row, index)}
                    onMouseEnter={() => setHoveredRowIndex(index)}
                    onMouseLeave={() => setHoveredRowIndex(null)}
                    style={{
                      cursor: "pointer",
                      backgroundColor: selectedRowIndex === index ? "#ffaa00" : hoveredRowIndex === index ? "#ffaa00" : "white"
                    }}
                  >
                    {columnsToShow.map((colKey) => (
                      <td key={colKey} style={{color: "black"}}>{row[colKey]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{color: "black"}}>Loading CSV...</p>
        )}
      </main>
    </div>
  );
};

export default CsvPreview;