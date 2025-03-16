# Components

## **1️⃣ Frontend (User Interface) Components**
The **frontend** consists of three main pages:  
- **Homepage** (Landing Page)  
- **Summary Page** (List View)  
- **Annotation Page** (Main Molecular Interaction Panel)

Each page contains **interactive components**:

---

### **📌 Homepage Components**
#### **1. File Upload Section**
- **Function:** Allows users to upload new CSV files containing molecular data.  
- **Input:** CSV file selection.  
- **Output:** The file is stored and appears in the **recently uploaded files list**.  
- **Interactions:** Sends file to the backend for processing.  

#### **2. Previously Uploaded Files List**
- **Function:** Displays a list of uploaded files.  
- **Input:** Click on a filename.  
- **Output:** Redirects the user to the **Summary Page** to preview the file.  

#### **3. User Profile & Authentication**
- **Function:** Allows users to **register, log in, and link their email** to save work and preferences.  
- **Input:** User enters **email and password** or logs in via authentication provider.  
- **Output:**  
  ✅ The system verifies credentials and grants access.  
  ✅ User preferences and **previously saved work** are restored.  
- **Interactions:**  
  ✅ Accessible via **page buttons** on the Homepage.  
  ✅ Connected to the **Backend Authentication System** for session management. 
---

### **📌 Summary Page Components**
#### **4. Molecular Dataset Table**
- **Function:** Displays a preview of the CSV file in a structured table.  
- **Input:** Molecular dataset from the uploaded file.  
- **Output:** Shows molecules with relevant properties in rows.  
- **Interactions:** Clicking a row redirects the user to the **Annotation Page**.  

#### **5. Navigation Buttons**
- **Function:** Allows users to go **back to Homepage** or **select a molecule**.  
- **Input:** Click event.  
- **Output:** Page navigation.  

---

### **📌 Annotation Page Components**
#### **6. Ketcher Molecular Editor**
- **Function:** Displays molecules, allows structure modification, and annotation.  
- **Input:** Molecular structure from the dataset.  
- **Output:** Updated structure or annotation.  
- **Interactions:**  
  ✅ User can **highlight atoms/bonds**.  
  ✅ User can **edit molecule structure**.  
  ✅ Changes are **saved back to the database**.  

#### **7. Left Vertical Toolbar**
- **Modify Tool** – Allows users to edit molecules.  
- **Annotate Tool** – Highlights bonds/atoms and adds comments.  
- **Similarity Search Tool** – Finds similar molecules in the dataset.  
- **Compute Tool** – Runs RDKit or ML-based calculations.  
- **Export Tool** – Saves annotations and molecular data.  

#### **8. Right-Side Property Table**
- **Function:** Displays properties of the currently selected molecule.  
- **Columns:**  
  ✅ **CSV-Provided Properties**  
  ✅ **RDKit-Computed Values**  
  ✅ **ML-Predicted Properties**  
- **Interactions:** Updates dynamically when a new molecule is selected.  

---

## **2️⃣ Backend Components**
The **backend** processes molecular data, handles user input, and integrates machine learning.

---

### **📌 9. Molecular Database**
- **Function:** Stores molecular structures, properties, and annotations.  
- **Used By:**  
  ✅ **Summary Page** – Fetches molecules from the dataset.  
  ✅ **Annotation Page** – Saves annotations and molecule modifications.  

---

### **📌 10. Machine Learning Engine**
- **Function:** Computes predicted molecular properties.  
- **Used By:**  
  ✅ **Annotation Page** – Generates predictions displayed in the **Property Table**.  

---

### **📌 11. Authentication & User Management**
- **Function:** Handles **user registration, login, and session management**.  
- **Input:** User enters email and password for authentication.  
- **Output:**  
  ✅ Grants access to the system and retrieves user preferences.  
  ✅ Saves session details to allow users to **resume previous work**.  
- **Interactions:**  
  ✅ Connected to **User Profile & Authentication** on the Homepage.  
  ✅ Stores authentication details securely in the backend.  

### **📌 12. API Layer**
- **Function:** Bridges the frontend and backend for seamless interaction.  
- **Used By:**  
  ✅ **Homepage** – Uploads CSV files.  
  ✅ **Summary Page** – Fetches molecule lists.  
  ✅ **Annotation Page** – Saves annotations and retrieves computed properties.  

---

## **3️⃣ Summary**
- **Frontend Components:** Buttons, Ketcher, Tables, Toolbar, Lists.  
- **Backend Components:** Database, Machine Learning, Authentication, API.  