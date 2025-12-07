# 🏥 Health Monitor Backend

Backend Node.js pour le système IoT de surveillance de santé.

## 🚀 Production

**URL:** https://health-monitor-api-d323.onrender.com

## 📊 Endpoints disponibles

### Authentification
```
POST   /api/auth/inscription    - Créer un compte
POST   /api/auth/connexion      - Se connecter
GET    /api/auth/profil         - Voir son profil (JWT requis)
```

### Mesures
```
POST   /api/measurements        - Recevoir mesure ESP32
GET    /api/measurements        - Lister les mesures
GET    /api/measurements/stats  - Statistiques
DELETE /api/measurements/:id    - Supprimer une mesure
```

### Tests
```
GET    /                        - Status API
GET    /api/test/modeles        - Test MongoDB
```

## ⚡ Socket.IO Events
```javascript
// Client → Serveur
socket.emit('abonner-utilisateur', userId)

// Serveur → Client
socket.on('nouvelle-mesure', (data) => {
  // Mesure temps réel
})
```

## 🔧 Variables d'environnement
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key
```

## 📦 Installation locale
```bash
npm install
npm run dev
```

## 🧪 Tests

Utiliser `test-api.html` et `test-socketio.html` pour tester les endpoints.

## 📈 Statistiques actuelles

- **Utilisateurs:** 2
- **Mesures:** 5
- **Alertes:** 0
- **Uptime:** 100%
