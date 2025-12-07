# 🏥 Health Monitor IoT

**Système de surveillance de santé en temps réel avec ESP32, Node.js et Angular**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📋 Description

Health Monitor est un système IoT complet permettant de mesurer et surveiller en temps réel :
- ❤️ **BPM** (Battements par minute)
- 🫁 **SpO2** (Saturation en oxygène)
- 📊 **Historique et statistiques**
- ⚡ **Alertes temps réel**

---

## ��️ Architecture
```
┌─────────────┐
│   ESP32     │  Capteur MAX30102
│  + WiFi     │  → Mesure BPM/SpO2
└──────┬──────┘
       │ HTTP POST
       ▼
┌─────────────┐
│   Backend   │  Node.js + Express
│   MongoDB   │  + Socket.IO
└──────┬──────┘
       │ WebSocket
       ▼
┌─────────────┐
│  Frontend   │  Angular 17
│  Dashboard  │  + Chart.js
└─────────────┘
```

---

## 🚀 Technologies

### Backend
- **Node.js** v18+
- **Express.js** - Framework web
- **MongoDB Atlas** - Base de données cloud
- **Socket.IO** - Communication temps réel
- **JWT** - Authentification
- **bcrypt** - Hash mots de passe

### Frontend
- **Angular 17** - Framework frontend
- **PrimeNG** - Composants UI
- **Chart.js** - Graphiques
- **Socket.IO Client** - Temps réel

### Hardware
- **ESP32 DevKit CP2102**
- **MAX30102** - Capteur BPM/SpO2
- **OLED 0.96"** - Affichage local

---

## 📦 Installation

### Backend
```bash
cd health-monitor-backend
npm install
```

Créer `.env` :
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```

Démarrer :
```bash
npm run dev
```

### Frontend
```bash
cd health-monitor-frontend
npm install
ng serve
```

Accéder : `http://localhost:4200`

---

## 🎯 Fonctionnalités

### Pour les patients 👤
- ✅ Mesures temps réel BPM/SpO2
- ✅ Historique personnel
- ✅ Graphiques interactifs
- ✅ Alertes configurables
- ✅ Export données (CSV/PDF)

### Pour les médecins 👨‍⚕️
- ✅ Superviser plusieurs patients
- ✅ Vue globale des alertes
- ✅ Comparaison patients
- ✅ Notes médicales
- ✅ Rapports

### Pour les admins ��
- ✅ Gestion utilisateurs
- ✅ Gestion dispositifs ESP32
- ✅ Statistiques globales
- ✅ Logs système

---

## 🔐 Sécurité

- ✅ Authentification JWT
- ✅ Hash bcrypt (salt rounds: 10)
- ✅ HTTPS en production
- ✅ CORS configuré
- ✅ Rate limiting API
- ✅ Validation des données

---

## 📊 API Endpoints

### Authentification
```
POST   /api/auth/inscription
POST   /api/auth/connexion
GET    /api/auth/profil
```

### Mesures
```
POST   /api/measurements
GET    /api/measurements
GET    /api/measurements/stats
DELETE /api/measurements/:id
```

### Socket.IO Events
```
nouvelle-mesure          → Nouvelle mesure reçue
abonner-utilisateur      → S'abonner aux updates
```

---

## 🚀 Déploiement

### Backend (Render.com)
```bash
# Voir docs/deployment.md
```

### Frontend (Vercel)
```bash
cd health-monitor-frontend
vercel
```

---

## 📝 License

MIT License - Voir [LICENSE](LICENSE)

---

## 👨‍💻 Auteur

**[Ton Nom]**
- GitHub: [@ton-username](https://github.com/ton-username)
- Email: ton-email@example.com

---

## 🙏 Remerciements

- ESP32 community
- Node.js & Angular teams
- MongoDB Atlas
- Socket.IO

---

⭐ **Si ce projet vous aide, donnez une étoile !** ⭐
