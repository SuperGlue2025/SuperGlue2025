import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import "../styles/main.css";

const Details = ({ isLoggedIn, toggleLoginModal, toggleDropdown, showDropdown, handleLogout }) => {
  const { id } = useParams();  
  const location = useLocation();
  const navigate = useNavigate();
  const rowData = location.state?.data;
  const filename = location.state?.filename;
  const totalRows = location.state?.totalRows;
  const [imageData, setImageData] = useState(null);
  const avatarRef = useRef(null);

  const currentId = parseInt(id, 10);

  useEffect(() => {
    const fetchImage = async () => {
      if (!filename) {
        console.error("Filename is missing!");
        return;
      }
      try {
        console.log(`Fetching image for ID: ${id}`);
        const response = await fetch(`http://localhost:5001/get_molecule_image/${id}?filename=${filename}`);
        const result = await response.json();
        if (result.success) {
          setImageData(`data:image/png;base64,${result.data}`);
        } else {
          console.error("Error fetching image:", result.error);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };
  
    fetchImage();
  }, [id, filename]); // listen for changes in id and filename
  

  const handleNavigation = (newId) => {
    if (newId < 0 || newId >= totalRows) return; // avoid out of bounds
  
    navigate(`/editor/${newId}`, {
      state: {
        data: location.state.allData[newId], 
        filename, 
        totalRows,
        allData: location.state.allData
      }
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="user-info">
          <button className="avatar-button" onClick={() => navigate("/")}>
            <img src="/assets/home.png" alt="Home" className="home-icon" />
            <span className="home-label">Homepage</span>
          </button>

          <button className="avatar-button" onClick={() => navigate("/editor")}>
            <img src="/assets/canvas.png" alt="Canvas" className="Canvas-icon" />
            <span className="Canvas-label">Canvas</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        <h1 className="main-title">ComponentID: {currentId}</h1>
        
        {/* Section details */}
        <section className="details-section">
          {rowData && (
            <div className="details-content">
              <p><strong>SMILES:</strong> {rowData.SMILES}</p>
            </div>
          )}

          {imageData ? (
            <img src={imageData} alt={`Molecule structure for ID ${id}`} className="molecule-image" />
          ) : (
            <p>Loading molecule image...</p>
          )}

          {/* Navigation  */}
          <div className="navigation-buttons">
            <button 
              onClick={() => handleNavigation(currentId - 1)}
              disabled={currentId <= 0}
              className="nav-button"
            >
              <FaArrowLeft /> Previous
            </button>

            <button 
              onClick={() => handleNavigation(currentId + 1)}
              disabled={currentId >= totalRows - 1}
              className="nav-button"
            >
              Next <FaArrowRight />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Details;
