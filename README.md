LAMP Studio — 3D Interior Design Platform
LAMP Studio is a web-based interior design application that allows users to plan and visualise room layouts in both 2D and 3D. The platform supports drag-and-drop furniture placement, room shape customisation, Three.js 3D visualisation, and MongoDB-backed design saving with role-based user access.

Getting Started
Prerequisites

Node.js 18 or above
MongoDB running locally or a MongoDB Atlas connection string
npm package manager

Installation
bash# Clone the repository
git clone https://github.com/YOUR_USERNAME/PUSL3122-HCI-LAMP-STUDIO.git
cd PUSL3122-HCI-LAMP-STUDIO

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install --legacy-peer-deps
```

### Environment Setup

Create a `.env` file inside the `backend/` folder:
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/lamp-studio
JWT_SECRET=lamp-secret
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

Create a `.env.local` file inside the `frontend/` folder:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
Running the Application
bash# Terminal 1 — Start backend
cd backend
npm run dev

# Terminal 2 — Start frontend
cd frontend
npm run dev
Frontend runs at http://localhost:3000
Backend runs at http://localhost:4000
Seed Demo Data
bashcd backend
npm run seed
```

 
 

Technology Stack
LayerTechnologyFrontendNext.js 14 / React 18 / TypeScriptStylingTailwind CSS2D CanvasHTML Canvas API3D RenderingThree.js / @react-three/fiber3D Helpers@react-three/drei / @react-three/postprocessingBackendNode.js / Express.js 4DatabaseMongoDB / MongooseAuthenticationbcryptjs / jsonwebtokenSecurityHelmet / CORS / express-rate-limit

Additional Resources & Credits
Fonts

Playfair Display — Google Fonts — fonts.google.com — SIL Open Font License
DM Sans — Google Fonts — fonts.google.com — SIL Open Font License
DM Mono — Google Fonts — fonts.google.com — SIL Open Font License

Icons & UI

Lucide React — lucide.dev — ISC License — used for UI icons throughout the application

3D & Visualisation

Three.js — threejs.org — MIT License — 3D WebGL rendering engine
@react-three/fiber — github.com/pmndrs/react-three-fiber — MIT License — React renderer for Three.js
@react-three/drei — github.com/pmndrs/drei — MIT License — Three.js helpers and abstractions
@react-three/postprocessing — github.com/pmndrs/react-postprocessing — MIT License — Bloom and Vignette post-processing effects

Charts & Notifications

Recharts — recharts.org — MIT License — admin panel analytics charts
react-hot-toast — react-hot-toast.com — MIT License — toast notification system

Furniture Models
All 3D furniture models (Sofa, Armchair, Bed, Wardrobe, Bookshelf, Desk, Coffee Table, Dining Table, Floor Lamp, Plant, TV Unit, Rug) were built procedurally using Three.js geometry primitives. No external 3D model files or assets were used.
Textures

Parquet floor texture — procedurally generated using the HTML Canvas API — no external texture files used

No Sound Effects or Audio
LAMP Studio does not use any audio or sound effects.

Module
PUSL3122 — Human Computer Interaction
Plymouth University 

License
This project was developed for academic purposes as part of the PUSL3122 HCI coursework.
