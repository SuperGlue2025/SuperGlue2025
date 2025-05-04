<<<<<<< HEAD
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

      let recentFiles = JSON.parse(localStorage.getItem("recentFiles") || "[]");
      recentFiles = recentFiles.filter((file) => file.fileUrl !== fileUrl);

      recentFiles.unshift({ fileName: selectedFile.name, fileUrl });

      if (recentFiles.length > 5) {
        recentFiles = recentFiles.slice(0, 5);
      }

      localStorage.setItem("recentFiles", JSON.stringify(recentFiles));
      setRecentFiles(recentFiles);

      toast.success(result.message || "File uploaded successfully!", { autoClose: 3000 });
      navigate("/csv-preview", { state: { fileUrl } });
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
=======
import React, { useState, useRef, useEffect } from "react";
import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import MoleculeIndex   from "./components/ChemicalEditor";
import CsvPreview      from "./components/StructurePreview";
import MyStructures    from "./components/MyStructures";
import "./styles/main.css";
import { apiFetch }    from "./api";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* ------------------------------------------------------------------ */
/*  App                                                               */
/* ------------------------------------------------------------------ */
const App = () => {
  /* ------------------------- state & refs ------------------------ */
  const [isLoggedIn, setIsLoggedIn]               = useState(false);
  const [showModal, setShowModal]                 = useState(false);
  const [showDropdown, setShowDropdown]           = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [errorMessage, setErrorMessage]           = useState("");
  const [uploadMessage, setUploadMessage]         = useState("");
  const [recentFiles, setRecentFiles]             = useState([]);

  /* captcha 图像 + id */
  const [captchaLogin,    setCaptchaLogin]    = useState({ id: "", img: "" });
  const [captchaRegister, setCaptchaRegister] = useState({ id: "", img: "" });

  const fileInputRef     = useRef(null);
  const avatarRef        = useRef(null);

  /* login / register refs */
  const emailRefLogin       = useRef(null);
  const passwordRefLogin    = useRef(null);
  const captchaRefLogin     = useRef(null);
  const emailRefRegister    = useRef(null);
  const passwordRefRegister = useRef(null);
  const repasswordRef       = useRef(null);
  const captchaRefRegister  = useRef(null);

  const navigate = useNavigate();

  /* ---------------------- recentFiles effect --------------------- */
  useEffect(() => {
    if (!isLoggedIn) {
      setRecentFiles([]);
      return;
    }
    const stored = JSON.parse(localStorage.getItem("recentFiles") || "[]");
    setRecentFiles(stored);
  }, [isLoggedIn]);

  /* ------------------------- C A P T C H A ----------------------- */
  const fetchCaptcha = async (which) => {
    try {
      const res  = await fetch("http://localhost:5001/api/captcha", {
        credentials: "include"          // 让 session cookie 带过去
      });
      const json = await res.json();
      if (!json.success) throw new Error("captcha error");
      (which === "login" ? setCaptchaLogin : setCaptchaRegister)({
        id : json.captcha_id,
        img: json.image
      });
    } catch (e) {
      toast.error("Failed to load captcha");
    }
  };

  /* ------------------------ upload helpers ----------------------- */
  const handleUploadClick = () => fileInputRef.current?.click();

  const validateCSVHeaders = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const firstLine = e.target.result.split("\n")[0].trim();
          const headers   = firstLine.split(",").map((h) => h.trim().toLowerCase());
          const hasId     = headers.includes("cmpd_id");
          const hasSmiles = headers.includes("smiles");
          return hasId && hasSmiles
            ? resolve(true)
            : resolve({
                valid: false,
                missingHeaders: [
                  !hasId && "cmpd_id",
                  !hasSmiles && "SMILES"
                ].filter(Boolean)
              });
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile)
      return toast.warn("Please select a file.", { autoClose: 3000 });

    const ext = selectedFile.name.split(".").pop().toLowerCase();
    if (ext !== "csv")
      return toast.error("Only CSV files are supported.", { autoClose: 3000 });

    try {
      const v = await validateCSVHeaders(selectedFile);
      if (v !== true)
        return toast.error(`Missing header: ${v.missingHeaders.join(" & ")}`, { autoClose: 5000 });

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res  = await apiFetch("/api/upload", {
        method: "POST",
        body  : formData,
        credentials: "include"
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");

      /* --- success – update recentFiles --- */
      const fileUrl = json.fileUrl;
      let list = JSON.parse(localStorage.getItem("recentFiles") || "[]")
                   .filter(f => f.fileUrl !== fileUrl);
      list.unshift({ fileName: selectedFile.name, fileUrl });
      if (list.length > 5) list = list.slice(0, 5);
      localStorage.setItem("recentFiles", JSON.stringify(list));
      setRecentFiles(list);

      toast.success(json.message || "Uploaded!", { autoClose: 3000 });
      navigate("/csv-preview", { state: { fileUrl } });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Upload error", { autoClose: 3000 });
    }
  };

  /* ----------------- validation helpers ------------------------- */
  const emailOK    = (em) => /^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(em);
  const passwordOK = (pw) => /^(?=.*[!@#$%^&*]).{8,16}$/.test(pw);

  /* ---------------------- modal toggles -------------------------- */
  const toggleLoginModal = () => {
    setShowModal(!showModal);
    setShowRegisterModal(false);
    setShowDropdown(false);
    setErrorMessage("");
    if (!showModal) fetchCaptcha("login");
  };
  const toggleRegisterModal = () => {
    setShowRegisterModal(!showRegisterModal);
    setShowModal(false);
    setErrorMessage("");
    if (!showRegisterModal) fetchCaptcha("register");
  };

  /* --------------------------- auth ------------------------------ */
  const handleLogin = async () => {
    const email = emailRefLogin.current.value.trim();
    const pw    = passwordRefLogin.current.value.trim();
    const cap   = captchaRefLogin.current.value.trim();

    if (!email || !emailOK(email))
      return setErrorMessage("Please enter a valid email address!");
    if (!pw)  return setErrorMessage("Please input the password!");
    if (!cap) return setErrorMessage("Please input the captcha!");

    try {
      const res  = await apiFetch("/api/login", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body   : JSON.stringify({
          email,
          password : pw,
          captcha  : cap,
          captcha_id: captchaLogin.id
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error || "Login failed");

      localStorage.setItem("access_token", json.token);
      setIsLoggedIn(true);
      setShowModal(false);
      toast.success("Login successful");
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message);
      fetchCaptcha("login");       // 刷新验证码
    }
  };

  const handleRegister = async () => {
    const email = emailRefRegister.current.value.trim();
    const pw1   = passwordRefRegister.current.value.trim();
    const pw2   = repasswordRef.current.value.trim();
    const cap   = captchaRefRegister.current.value.trim();

    if (!email || !emailOK(email))
      return setErrorMessage("Please enter a valid email address!");
    if (!pw1 || !passwordOK(pw1))
      return setErrorMessage("Password 8‑16 chars, incl. special char!");
    if (!pw2 || pw1 !== pw2)
      return setErrorMessage("Passwords don't match!");
    if (!cap)
      return setErrorMessage("Please input the captcha!");

    try {
      const res  = await apiFetch("/api/register", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body   : JSON.stringify({
          email,
          password : pw1,
          captcha  : cap,
          captcha_id: captchaRegister.id
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error || "Register failed");

      toast.success("Registered. Please log in.");
      setShowRegisterModal(false);
      setShowModal(true);
      fetchCaptcha("login");
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message);
      fetchCaptcha("register");    // 刷新验证码
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("recentFiles");
    setIsLoggedIn(false);
    setShowDropdown(false);
    setRecentFiles([]);
  };

  /* -------------------- protected route helper ------------------ */
  const Protected = ({ children }) =>
    isLoggedIn ? children : <Navigate to="/" replace />;

  /* =============================================================== */
  /* ========================= render ============================== */
  /* =============================================================== */
  return (
    <>
      <ToastContainer position="top-center" theme="colored" />

      <Routes>
        {/* ================== HOME PAGE ================== */}
>>>>>>> 2c86fda (Initial commit on update1)
        <Route
          path="/"
          element={
            <div className="app-container">
<<<<<<< HEAD
              {/*toast container*/}
              <ToastContainer position="top-center" theme="colored"/>
              {/* Header */}
=======
              {/* ---------- header ---------- */}
>>>>>>> 2c86fda (Initial commit on update1)
              <header className="app-header">
                <div className="user-info">
                  <button
                    className="avatar-button"
<<<<<<< HEAD
                    onClick={isLoggedIn ? toggleDropdown : toggleLoginModal} // Toggle login modal or user menu
                    ref={avatarRef} 
                  >
                    <img src="/assets/user.png" className="avatar" alt="User Avatar" />
                    {isLoggedIn ? <span className="avatar-name">User</span> : <span className="login-text">Login</span>}
=======
                    ref={avatarRef}
                    onClick={
                      isLoggedIn
                        ? () => setShowDropdown(!showDropdown)
                        : toggleLoginModal
                    }
                  >
                    <img src="/assets/user.png" className="avatar" alt="avatar" />
                    {isLoggedIn ? (
                      <span className="avatar-name">User</span>
                    ) : (
                      <span className="login-text">Login</span>
                    )}
>>>>>>> 2c86fda (Initial commit on update1)
                  </button>
                </div>
              </header>

<<<<<<< HEAD
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
=======
              {/* ---------- main ---------- */}
              <main className="app-main">
                <h1 className="main-title">Create</h1>

                {/* Upload section */}
                <section className="create-section">
                  <div className="action-buttons">
                    <button
                      className="action-button"
                      onClick={() =>
                        isLoggedIn ? handleUploadClick() : toggleLoginModal()
                      }
                      disabled={!isLoggedIn}
                    >
                      <div className="icon-placeholder">📂</div>
                      <p>Upload File</p>
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                  </div>
                  {uploadMessage && (
                    <p className="upload-message">{uploadMessage}</p>
                  )}
                </section>

                {/* Recent files */}
                <h2 className="main-title">Recent Files</h2>
                <section className="recent-files">
                  {!isLoggedIn ? (
                    <div className="empty-state">
                      <p>Please log in to view your recent files.</p>
                    </div>
                  ) : recentFiles.length === 0 ? (
                    <div className="empty-state">
                      <p>No recent files currently</p>
                    </div>
                  ) : (
                    <ul>
                      {recentFiles.map((f, i) => (
                        <li
                          key={i}
                          onClick={() =>
                            navigate("/csv-preview", { state: { fileUrl: f.fileUrl } })
                          }
                        >
                          {f.fileName}
                        </li>
>>>>>>> 2c86fda (Initial commit on update1)
                      ))}
                    </ul>
                  )}
                </section>
              </main>

<<<<<<< HEAD
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
=======
              {/* ---------- login modal ---------- */}
              {showModal && !isLoggedIn && !showRegisterModal && (
                <div
                  className="modal-overlay"
                >
                  <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="close-button"
                      onClick={() => setShowModal(false)}
                    >
                      &times;
                    </button>
                    <h2>SuperGlue</h2>

                    {errorMessage && (
                      <div className="error-message">{errorMessage}</div>
                    )}

                    <div className="input-group">
                      <span className="icon">📧</span>
                      <input ref={emailRefLogin} placeholder="Email" />
                    </div>
                    <div className="input-group">
                      <span className="icon">🔒</span>
                      <input
                        type="password"
                        ref={passwordRefLogin}
                        placeholder="Password"
                      />
                    </div>
                    <div className="input-group captcha-row">
                      <input ref={captchaRefLogin} placeholder="Captcha" />
                      {captchaLogin.img && (
                        <img
                          src={captchaLogin.img}
                          alt="captcha"
                          onClick={() => fetchCaptcha("login")}
                          style={{ cursor: "pointer" }}
                        />
                      )}
                    </div>

                    <button className="login-button" onClick={handleLogin}>
                      Log in
                    </button>

                    <div className="existing-user">
                      <button
                        className="switch-modal-btn"
                        onClick={toggleRegisterModal}
                      >
>>>>>>> 2c86fda (Initial commit on update1)
                        New User
                      </button>
                    </div>
                  </div>
                </div>
              )}

<<<<<<< HEAD
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
=======
              {/* ---------- register modal ---------- */}
              {!showModal && showRegisterModal && (
                <div
                  className="modal-overlay"
              
                >
                  <div
                    className="modal-register"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="close-button2"
                      onClick={() => setShowRegisterModal(false)}
                    >
                      &times;
                    </button>
                    <h2>Register</h2>

                    {errorMessage && (
                      <div className="error-message">{errorMessage}</div>
                    )}

                    <div className="input-group">
                      <span className="icon">📧</span>
                      <input ref={emailRefRegister} placeholder="Email" />
                    </div>
                    <div className="input-group">
                      <span className="icon">🔒</span>
                      <input
                        type="password"
                        ref={passwordRefRegister}
                        placeholder="Password"
                      />
                    </div>
                    <div className="input-group">
                      <span className="icon">🔒</span>
                      <input
                        type="password"
                        ref={repasswordRef}
                        placeholder="Confirm Password"
                      />
                    </div>
                    <div className="input-group captcha-row">
                      <input ref={captchaRefRegister} placeholder="Captcha" />
                      {captchaRegister.img && (
                        <img
                          src={captchaRegister.img}
                          alt="captcha"
                          onClick={() => fetchCaptcha("register")}
                          style={{ cursor: "pointer" }}
                        />
                      )}
                    </div>

                    <button
                      className="register-button"
                      onClick={handleRegister}
                    >
                      Register
                    </button>

                    <div className="existing-user">
                      <button
                        className="switch-modal-btn"
                        onClick={toggleLoginModal}
                      >
                        Already have an account?
>>>>>>> 2c86fda (Initial commit on update1)
                      </button>
                    </div>
                  </div>
                </div>
              )}

<<<<<<< HEAD
              {/* User Dropdown */}
=======
              {/* ---------- user dropdown ---------- */}
>>>>>>> 2c86fda (Initial commit on update1)
              {isLoggedIn && showDropdown && (
                <div
                  className="dropdown-menu"
                  style={{
                    position: "absolute",
<<<<<<< HEAD
                    top: avatarRef.current.offsetTop + avatarRef.current.offsetHeight + 5 + "px",
                    left: avatarRef.current.offsetLeft + "px",
                  }}
                  onClick={(e) => e.stopPropagation()}
=======
                    top: avatarRef.current.offsetTop +
                      avatarRef.current.offsetHeight + 5,
                    left: avatarRef.current.offsetLeft
                  }}
>>>>>>> 2c86fda (Initial commit on update1)
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
<<<<<<< HEAD
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
=======

        {/* =============== protected & normal routes =============== */}
        <Route
          path="/csv-preview"
          element={
            <Protected>
              <CsvPreview />
            </Protected>
          }
        />
        <Route
          path="/editor"
          element={
            <Protected>
              <MoleculeIndex />
            </Protected>
          }
        />
        <Route
          path="/editor/:id"
          element={
            <Protected>
              <MoleculeIndex />
            </Protected>
          }
        />
        <Route
          path="/editor/similarity/:id"
          element={
            <Protected>
              <MoleculeIndex initialTab="similarity" />
            </Protected>
          }
        />
        <Route
          path="/my-structures"
          element={
            <Protected>
              <MyStructures />
            </Protected>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
>>>>>>> 2c86fda (Initial commit on update1)
