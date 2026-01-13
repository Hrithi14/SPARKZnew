# 🍔 Smart Cafeteria Management System

A real-time, AI-powered solution to streamline cafeteria operations, reduce wait times, and personalize the dining experience using emotion-based recommendations.

## 🚀 Features


* **AI Chatbot:** "Mood-to-Food" recommendation engine (e.g., Stressed → Comfort Food).
* **Pre-Ordering:** Just-in-Time order processing to ensure freshness.
* **Live Dashboard:** Real-time kitchen staff interface for managing orders.
* **Firebase Integration:** Persistent menu data storage.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v14 or higher)
* npm (comes with Node.js)

---

## 📥 Installation

1.  **Clone the Repository**
    ```bash
    git clone <your-repo-url>
    cd kavana
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Firebase (Important!)**
    * Obtain the `serviceAccountKey.json` file (ask the team lead or download from Firebase Console).
    * Place the file in the **root directory** of the project (inside the `kavana` folder, next to `server.js`).
    * *Note: Without this key, the database features will not work, but the server will still run in-memory.*

---

## 🏃‍♂️ How to Run

1.  **Start the Server**
    Run the development server using nodemon:
    ```bash
    npm run dev
    ```

2.  **Verify Output**
    You should see the following in your terminal:
    ```text
    🔥 Firebase Admin Initialized Successfully!
    🍔 Cafeteria Management System running on http://localhost:3000
    📊 Staff Dashboard available at http://localhost:3000/staff
    ```

---

## 📱 Usage Guide

### 1. Student Interface (User App)
* **URL:** [http://localhost:3000](http://localhost:3000)
* **What to try:**
    * Browse the menu.
    * Use the **AI Chatbot** (bottom right) and tell it your mood (e.g., "I am feeling stressed").
    * Place a "Pre-order" or "On-spot" order.

### 2. Staff Dashboard (Kitchen View)
* **URL:** [http://localhost:3000/staff](http://localhost:3000/staff)
* **What to try:**
    * Open this in a separate tab or window.
    * Watch incoming orders appear instantly (Real-time Socket.IO).
    * Click "Mark Ready" to notify the user.

### 3. Initialize Database (Hackathon Demo)
* **URL:** [http://localhost:3000/api/firebase/seed](http://localhost:3000/api/firebase/seed)
* **Action:** Click this link **once** to upload the sample menu data to your Firebase Firestore database.

---
/// related chatbot 
<iframe
    src="https://www.chatbase.co/chatbot-iframe/7aDaJTh3d8xOwyGHWsEqE"
    width="100%"
    style="height: 100%; min-height: 700px"
    frameborder="0"
></iframe>
