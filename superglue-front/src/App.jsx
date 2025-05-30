import React, { useState, useRef,useEffect } from "react";
import { Route, Routes, Link,useNavigate, Navigate } from "react-router-dom";
import MoleculeIndex from "./components/ChemicalEditor";
import CsvPreview from "./components/StructurePreview";
import './styles/main.css';
import { ToastContainer, toast } from "react-toastify"; 
import "react-toastify/dist/ReactToastify.css";  
// import Details from "./components/Details";
import ChemicalEditor from "./components/ChemicalEditor.jsx";


const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");  // Store error message
  const[uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [recentFiles, setRecentFiles] = useState([]);
  

  // Handle file selection & upload
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
  useEffect(() => {
    const storedFiles = JSON.parse(localStorage.getItem("recentFiles") || "[]");
    setRecentFiles(storedFiles);
  }, []);

  // Add this function to validate CSV headers
const validateCSVHeaders = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target.result;
        const firstLine = csvText.split('\n')[0].trim();
        const headers = firstLine.split(',').map(header => header.trim());

        // Check if headers contain cmpd_id and SMILES (case-insensitive)
        const hasCmpdId = headers.some(header =>
          header.toLowerCase() === 'cmpd_id');
        const hasSmiles = headers.some(header =>
          header.toLowerCase() === 'smiles');

        if (hasCmpdId && hasSmiles) {
          resolve(true);
        } else {
          resolve({
            valid: false,
            missingHeaders: [
              !hasCmpdId ? 'cmpd_id' : null,
              !hasSmiles ? 'SMILES' : null
            ].filter(Boolean)
          });
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};


  const handleFileChange = async(event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) {
      toast.warn("please select a file first.",{autoClose:3000});
      return;
    }
  // Check file extension first
  const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
  if (fileExtension !== 'csv') {
    toast.error("Upload failed! Only CSV files are supported.", { autoClose: 3000 });
    return;
  }

  try {
    // Validate CSV headers before uploading
    const validationResult = await validateCSVHeaders(selectedFile);

    if (validationResult !== true) {
      const missingHeadersMessage = validationResult.missingHeaders.join(' and ');
      toast.error(`Upload failed! Your file is missing the required header: ${missingHeadersMessage}`, { autoClose: 5000 });
      return;
    }
    // If validation passes, proceed with upload
    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch("http://localhost:5001/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (response.ok) {
      const fileUrl = result.fileUrl;
      const dataset_id = result.dataset_id;

      let recentFiles = JSON.parse(localStorage.getItem("recentFiles") || "[]");
      recentFiles = recentFiles.filter((file) => file.fileUrl !== fileUrl);

      recentFiles.unshift({ fileName: selectedFile.name, fileUrl, dataset_id });

      if (recentFiles.length > 5) {
        recentFiles = recentFiles.slice(0, 5);
      }

      localStorage.setItem("recentFiles", JSON.stringify(recentFiles));
      setRecentFiles(recentFiles);

      toast.success(result.message || "File uploaded successfully!", { autoClose: 3000 });
      navigate("/csv-preview", { state: { fileUrl, dataset_id } });
    } else {
      toast.error(result.message || "Upload failed! Please try again.", { autoClose: 3000 });
    }
  } catch (error) {
    console.error("File processing error:", error);
    toast.error("An error occurred while processing the file. Please try again later.", { autoClose: 3000 });
  }
};


//     const formData = new FormData();
//     formData.append("file", selectedFile);
//     try{
//       const response = await fetch("http://localhost:5001/api/upload", {
//         method: "POST",
//         body: formData,
//     });
//     const result = await response.json();
//     if (response.ok) {
//       const fileUrl = result.fileUrl;
//
//       let recentFiles = JSON.parse(localStorage.getItem("recentFiles") || "[]");
//       recentFiles = recentFiles.filter((file) => file.fileUrl !== fileUrl);
//
//       recentFiles.unshift({ fileName: selectedFile.name, fileUrl });
//
//       if (recentFiles.length > 5) {
//         recentFiles = recentFiles.slice(0, 5);
//       }
//       localStorage.setItem("recentFiles", JSON.stringify(recentFiles));
//       setRecentFiles(recentFiles);
//
//       toast.success(result.message || "File uploaded successfully!", { autoClose: 3000 });
//       navigate("/csv-preview", { state: { fileUrl } });
//     } else {
//       toast.error(result.message || "Upload failed! csv file only", { autoClose: 3000 });
//     }
//   } catch (error) {
//     toast.error("An error occurred while uploading the file.try again later.", { autoClose: 3000 });
//   }
// };



  // Use useRef to get input element values
  const emailRefLogin = useRef(null);
  const passwordRefLogin = useRef(null);
  const captchaRefLogin = useRef(null);
  const emailRefRegister = useRef(null);
  const passwordRefRegister = useRef(null);
  const repasswordRef = useRef(null);
  const captchaRefRegister = useRef(null);
  const avatarRef = useRef(null);

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };
  //8-16 characters, at least one one special character
  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,16}$/;
    return passwordRegex.test(password);
  };
  
  


  // Toggle login modal
  const toggleLoginModal = () => {
    setShowModal(!showModal);
    setShowDropdown(false);
    setShowRegisterModal(false);
    setErrorMessage("");  // Clear previous error messages
  };

  // Toggle register modal
  const toggleRegisterModal = () => {
    setShowRegisterModal(!showRegisterModal);
    setShowModal(false);
    setErrorMessage("");  // Clear previous error messages
  };

  // Toggle dropdown menu
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    setShowModal(false);
  };

  // Handle login
  const handleLogin = () => {
    const email = emailRefLogin.current.value;
    const password = passwordRefLogin.current.value;
    const captcha = captchaRefLogin.current.value;

    setErrorMessage("");  // Clear previous error messages

    // Validation checks
    if (!email) {
      setErrorMessage("Please enter a valid email address!");
      return;
    }
    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address!");
      return;
    }
    if (!password) {
      setErrorMessage("Please input the password!");
      return;
    }
    if (!captcha) {
      setErrorMessage("Please input the captcha!");
      return;
    }

    // If validation passes, login the user
    setIsLoggedIn(true);
    setShowModal(false);
  };

  // Handle registration
  const handleRegister = () => {
    const email = emailRefRegister.current.value;
    const password = passwordRefRegister.current.value;
    const repassword = repasswordRef.current.value;
    const captcha = captchaRefRegister.current.value;

    setErrorMessage("");  // Clear previous error messages


    // Validation checks
    if (!email) {
      setErrorMessage("Please enter a valid email address!");
      return;
    }
    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address!");
      return;
    }
    if (!password) {
      setErrorMessage("Please create the password!");
      return;
    }
    if (!validatePassword(password)) {
      setErrorMessage("Password must be 8-16 characters, at least one special character!");
      return;
    }
    if (!repassword) {
      setErrorMessage("Please confirm the password!");
      return;
    }
    if (repassword !== password) {
      setErrorMessage("Passwords don't match, please confirm!");
      return;
    }
    if (!captcha) {
      setErrorMessage("Please input the captcha!");
      return;
    }

    setIsLoggedIn(false);
    setShowRegisterModal(false);
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowDropdown(false);
  };



  return (
      <Routes>
        <Route
          path="/"
          element={
            <div className="app-container">
              {/*toast container*/}
              <ToastContainer position="top-center" theme="colored"/>
              {/* Header */}
              <header className="app-header">
                <div className="user-info">
                  <button
                    className="avatar-button"
                    onClick={isLoggedIn ? toggleDropdown : toggleLoginModal} // Toggle login modal or user menu
                    ref={avatarRef} 
                  >
                    <img src="/assets/user.png" className="avatar" alt="User Avatar" />
                    {isLoggedIn ? <span className="avatar-name">User</span> : <span className="login-text">Login</span>}
                  </button>
                </div>
              </header>

              {/* Main page */}
              <main className="app-main">
                <h1 className="main-title">Create</h1>
                <section className="create-section">
                  <div className="action-buttons">
                    {/*<Link to="/editor" className="action-button">*/}
                    {/*  <div className="icon-placeholder">+</div>*/}
                    {/*  <p>New Canvas</p>*/}
                    {/*</Link>*/}
                    <button className="action-button" onClick={handleUploadClick}>
                      <div className="icon-placeholder">📂</div>
                      <p>Upload File</p>
                    </button>
                    <input
                      type = "file"
                      ref={fileInputRef}
                      style= {{display: "none"}}
                      onChange={handleFileChange}
                      />
                  </div>
                  {uploadMessage && <p className="upload-message">{uploadMessage}</p>}
                </section>

                {/* Recent Files */}
                <h2 className="main-title">Recent Files</h2>
                <section className="recent-files">
                  {recentFiles.length ===0 ?(
                  <div className="empty-state">
                    <img src="/path-to-empty-icon.png" alt="No Recent Files" />
                    <p>No recent files currently</p>
                  </div>
                  ) : (
                    <ul>
                      {recentFiles.map((file, index) => (
                        <li key={index} onClick={()=>navigate("/csv-preview",{state:{fileUrl:file.fileUrl}})}>
                          {file.fileName}
                          </li>
                      ))}
                    </ul>
                  )}
                </section>
              </main>

              {/* Login Modal */}
              {showModal && !isLoggedIn && !showRegisterModal && (
                <div className="modal-overlay" onClick={() => setShowModal(true)}>
                  <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <button className="close-button" onClick={() => setShowModal(false)}>
                      &times;
                    </button>

                    <h2>SuperGlue</h2>
                    {errorMessage && (
                      <div className="error-message" 
                      style={{
                        color: "rgb(219, 33, 33)",
                        marginLeft: "0", 
                        marginBottom: "10px",  
                        maxWidth: "100%", 
                        wordWrap: "break-word", 
                        textAlign: "left", 
                      }}>
                        {errorMessage}
                      </div>
                    )}
                    <div className="input-group">
                      <span className="icon">📧</span>
                      <input type="text" ref={emailRefLogin} placeholder="Please enter your email" />
                    </div>
                    <div className="input-group">
                      <span className="icon">🔒</span>
                      <input type="password" ref={passwordRefLogin} placeholder="Please enter the password" />
                    </div>
                    <div className="input-group">
                      <span className="icon">🛡️</span>
                      <input type="text" ref={captchaRefLogin} placeholder="Input the captcha" />
                    </div>
                    <button className="login-button" onClick={handleLogin}>Log In</button>
                    <div className="new-user">
                      <button onClick={toggleRegisterModal} 
                      style={{
                        background: "none", 
                        border: "none", 
                        color: "#ffaa00", 
                        cursor: "pointer",
                        marginLeft: '199px',
                        marginTop: '25px'}}>
                        New User
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Register Modal */}
              {!showModal && !isLoggedIn && showRegisterModal && (
                <div className="modal-overlay" onClick={() => setShowRegisterModal(true)}>
                  <div className="modal-register" onClick={(e) => e.stopPropagation()}>
                  <button className="close-button2" onClick={() => setShowRegisterModal(false)}>
                      &times;
                    </button>
                    <h2>Register</h2>
                    {errorMessage && (
                      <div className="error-message" 
                      style={{
                        color: "rgb(219, 33, 33)",
                        marginLeft: "0", 
                        marginBottom: "10px",  
                        maxWidth: "100%", 
                        wordWrap: "break-word", 
                        textAlign: "left", 
                      }}>
                        {errorMessage}
                      </div>
                    )}
                    <div className="input-group">
                      <span className="icon">📧</span>
                      <input type="text" ref={emailRefRegister} placeholder="Please enter your email" />
                    </div>
                    <div className="input-group">
                      <span className="icon">🔒</span>
                      <input type="password" ref={passwordRefRegister} placeholder="Please create the password" />
                    </div>
                    <div className="input-group">
                      <span className="icon">🔒</span>
                      <input type="password" ref={repasswordRef} placeholder="Please confirm the password" />
                    </div>
                    <div className="input-group">
                      <span className="icon">🛡️</span>
                      <input type="text" ref={captchaRefRegister} placeholder="Input the captcha" />
                    </div>
                    <button className="register-button" onClick={handleRegister}>Register</button>
                    <div className="exsisting-user">
                      <button onClick={toggleLoginModal} 
                      style={{
                        background: "none", 
                        border: "none", 
                        color: "#ffaa00", 
                        cursor: "pointer"}}>
                        Already had an account?
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* User Dropdown */}
              {isLoggedIn && showDropdown && (
                <div
                  className="dropdown-menu"
                  style={{
                    position: "absolute",
                    top: avatarRef.current.offsetTop + avatarRef.current.offsetHeight + 5 + "px",
                    left: avatarRef.current.offsetLeft + "px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ul>
                    <li>Profile</li>
                    <li>Change Password</li>
                    <li>Feedback</li>
                    <li>Download App</li>
                    <li>About SuperGlue</li>
                    <li onClick={handleLogout}>Logout</li>
                  </ul>
                </div>
              )}
            </div>
          }
        />
        <Route path="/editor" element={<MoleculeIndex />} />
        {/*<Route path="/editor" element={<ChemicalEditor />} />*/}
        <Route path="/csv-preview" element={<CsvPreview />} />
        <Route path="/editor/:id" element={<MoleculeIndex />} />
        <Route path="/editor/similarity/:id" element={<MoleculeIndex initialTab="similarity" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        {/*<Route path="/details/:id" element={<Details />} />*/}
      </Routes>
  );
};

export default App; 