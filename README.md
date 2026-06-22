# Mehfil 👥🎉

**Mehfil** (V2) is a comprehensive community gathering, event planning, and kitty party management system. Designed to make hosting and coordinating group activities effortless, it features robust user authentication, group management, event RSVP, automated payment tracking, and PDF summary generation.

---

## 🚀 Features

- **Authentication & Profiles**: Secure sign-up/login with bcryptjs and JWT-based session security.
- **Group Management**: Host and join standard or specialized community/kitty groups.
- **Event Planning**: Create and manage gathering events, specify timings, and keep track of attendees via real-time RSVP.
- **Payments & Dues**: Integrates with **Razorpay** to track kitty party contributions, general event fees, and pending dues.
- **Image Uploads**: Integrated with **Cloudinary** for event posters, group banners, and user profile pictures.
- **PDF Reports**: Generates professional PDF invoices and event reports using **PDFKit**.
- **Modern UI**: A responsive Single Page Application (SPA) built with React, Vite, and Lucide React icons.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite (Fast HMR & build tooling)
- **Routing**: React Router DOM V6
- **HTTP Client**: Axios (for smooth communication with API)
- **Icons**: Lucide React
- **Animations**: Canvas Confetti (for celebratory events and success states)

### Backend
- **Runtime**: Node.js
- **Server Framework**: Express.js
- **Database**: MySQL (using `mysql2` driver with connection pooling)
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **Payments**: Razorpay Node SDK
- **Storage**: Cloudinary Node SDK
- **PDF Generation**: PDFKit

---

## 📁 Directory Structure

```text
mehfil/
├── backend/            # Express API Server & Database scripts
│   ├── db/             # SQL Schema & DB setup scripts
│   └── src/            # API routes, controllers, and configuration
├── frontend/           # React + Vite Single Page Application (SPA)
│   ├── public/         # Static assets
│   └── src/            # React components, contexts, hooks, and views
├── LICENSE             # Project MIT License
└── README.md           # Project documentation (this file)
```

---

## ⚙️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MySQL](https://www.mysql.com/) server running locally or hosted

### Setup Instructions

#### 1. Setup Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables. Copy the example env file and update it with your local credentials:
   ```bash
   cp .env.example .env
   ```
   *Note: Set your database credentials, JWT secret, Cloudinary secrets, and Razorpay API keys.*
4. Initialize the MySQL database and import schemas:
   ```bash
   npm run db:setup
   ```
5. Start the backend developer server:
   ```bash
   npm run dev
   ```
   The backend server will run on `http://localhost:5000`.

#### 2. Setup Frontend
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open the printed URL (typically `http://localhost:5173`) in your browser to access the Mehfil V2 interface.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
