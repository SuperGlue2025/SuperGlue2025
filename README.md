# Super-Glue

Super-Glue is a web-based tool for molecular annotation and similarity search. Users can upload chemical compound datasets, visualize molecular structures, and perform similarity searches to analyze relationships between compounds.

---

## 🚀 Features

- 📁 Upload and preview **CSV files** with compound data.
- 🧪 **Interactive molecular visualization** using **Ketcher**.
- ✍️ Add **annotations** and **highlight atoms/bonds** for each compound.
- 🔍 Find similar compounds or structures using **similarity search** and **substructure matching**.
- 📊 Predict **ADMET properties** (Absorption, Distribution, Metabolism, Excretion, Toxicity) with visualizations.
- 🧬 View **3D molecular structures** generated from SMILES.
- 🔄 Responsive **frontend** and efficient **backend pipeline** powered by **Python**, **RDKit**, and **Flask**.

---

## 🔧 Tech Stack  

### **Frontend (React + Vite)**

- **React** – UI framework
- **Vite** – Lightning-fast dev server and bundler
- **Ant Design** – UI component library for layout and styling
- **Ketcher** – Web-based molecular editor for drawing and editing molecules
- **3Dmol.js** – Interactive 3D molecular viewer for structure visualization

### **Backend (Python + RDKit)**

- **Flask** – Lightweight web framework for APIs
- **RDKit** – Open-source cheminformatics toolkit for SMILES parsing, similarity search, etc.
- **Pandas** – Data manipulation and preprocessing
- **ADMET_ai** – Python library for ADMET property prediction
- **Unittest** – Python standard library for unit testing

---

## ⚙️ Installation

### **1. Clone the Repository**

```bash
git clone https://github.com/SuperGlue2025/SuperGlue2025.git
cd SuperGlue
```

### **2. Set Up Backend**

#### **(1) Navigate to the Backend Folder**

```bash
cd backend
```

#### **(2) Set up environment and install dependencies (one-time setup)**

We recommend using **conda** for managing dependencies.

```bash
conda env create -f environment.yml
```

This will create a conda environment with all required packages.

#### **(3) Activate the environment**

```bash
conda activate superglue-backend
```

#### **(4) Start the Backend Server**

```bash
python app.py
```

If everything is working properly, the terminal will display information similar to the following:

```text
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on http://127.0.0.1:5001
Press CTRL+C to quit
 * Restarting with stat
 * Debugger is active!
 * Debugger PIN: 108-282-683
```

### **3. Set Up Frontend**

#### **(1) Ensure Node.js and npm are Installed**

Check if Node.js and npm are installed:

```bash
node -v
npm -v
```

If both commands display version numbers, Node.js is installed.
Otherwise, download it from the [Node.js official website](https://nodejs.org/en).

#### **(2) Navigate to the Frontend Folder & Install Dependencies**

```bash
cd ../superglue-front
npm install
```

This command will install all required dependencies from `package.json`.

#### **(3) Start the Development Server**

```bash
npm run dev
```

If everything is working properly, the terminal will display information similar to the following:

```text
> superglue-front@0.0.0 dev
> vite

Port 5173 is in use, trying another one...

  VITE v6.0.7  ready in 158 ms

  ➜  Local:   http://localhost:5174/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## 📘 User Guide

Get started quickly with the [User Guide](docs/USER_GUIDE.md).  
Covers uploading files, annotating molecules, running predictions, and more.

---

## 🧪 Basic Workflow

1. Upload a `.csv` file with compound IDs and SMILES strings
2. Browse dataset on the summary page
3. Select a compound to open the annotation page
4. Annotate substructures or add notes
5. Run **similarity search** or **substructure match**
6. Predict **ADMET properties** and compare to DrugBank
7. Explore 3D structures using built-in viewer or custom SDF

---

## 🔬 Pipeline Logic

Want to understand how Super-Glue works under the hood?

The [Pipeline Documentation](docs/pipeline.md) explains the backend logic powering molecular annotation, similarity search, ADMET prediction, and database structure.  
This is especially useful for chemists, developers, or collaborators looking to extend the platform or understand how molecular data is processed and stored.

---

## 👥 Contributors

- Haoyu He
- Hongyan Liu
- Zoe Williams
- Junyi Ying

---

## 🙏 Acknowledgements

- Dr. Mahdi Ghorbani - Stakeholder representative, providing feedback and suggestions, and ensuring the project meets the needs of the stakeholders.
- Dr. Orion Dollar - Stakeholder representative, providing guidance and conveying the company's needs.
- Dr. David Beck - Capstone professor, offering insights and software engineering advice.

---

## 📄 License

This project is licensed under the MIT License.
