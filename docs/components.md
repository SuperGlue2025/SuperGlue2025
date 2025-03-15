### User Interface
These components handle user interaction and visualization.
#### Homepage
Page Buttons
- What it does: Buttons on the homepage that redirect you
- Input: Click
- Output: Redirect you to the annotation or summary page
- How it uses other components: Takes you to other components

CSV Upload & Preprocessing
- What it does: Lets you access your locally saved files and upload them to the site
- Input: A local CSV file
- Output: Upload the file to backend and show the message “Upload successfully”
- How it uses other components: access using page buttons

User Profile & Authentication
- What it does: Allows users to register and link their email, so they can save their preferences and work directly on the site
- Input: Register/Login with email authentication
- Output: Saves previous work and preferences
- How it uses other components: access using page buttons?
#### Annotate Page
Molecular Visualization Panel
- What it does: Displays 2D/3D molecules, supports highlighting and interaction, embeds Ketcher for structure editing
- Inputs: chemical structure + desired annotations
- Outputs: annotated structure that may be edited/interacted with

Molecular Search
- What it does: given a molecule name, chemical formula, SMILES, structure drawing, etc., it returns said molecule and/or a list of ones with similar properties - may also list said properties
- Input: molecule name, SMILES, or structure drawing
- Outputs: molecule given and/or list of similar molecules and their properties
- How it uses other components: molecules may come from the uploaded csv. file

Annotation Panel
- What it does: annotation tools for highlighting and adding notes
- Inputs: typed annotations and notes
- Outputs: annotations and notes saved to a general large text box below the structure or added directly on the model at a specific atom or bond
- How it uses other components: is part of the molecular visualization panel
#### Summary Page
Property Table
- What it does: Fetch properties from molecular database
- Input: selecting molecule from CSV, or made molecule from Ketcher
- Output: a list of desired properties
### Backend
Handles data processing, storage, and computation.

Molecular Database
- What it does: Stores molecular fingerprints, structures, properties, and annotations; supports efficient searching & querying
- Inputs: Files uploaded from various users, researchers, other databases that contain molecular data and properties and annotations
- Outputs: An amalgamation of information and other users can access and use to assist in their work
- How it uses other components: Reads through uploaded files, holds saved work done on the site, provides similar molecules when user searches

Machine Learning Engine
- What it does: preprocesses molecular data; runs feature engineering, similarity searches, and predictive models; supports adjustable ML annotation weights
- Inputs: User files, search queries, etc.
- Outputs: drives the algorithms that preprocess data, run similarity searches, run predictive models, etc.

Authentication & User Management
- What it does: Handles user registration, login, and session management
- Inputs: username, email, password, data from when user is on the site
- Outputs: stores user data and enables users to save their work and log in at a later time
- How it uses other components: drives user profile and authentication
