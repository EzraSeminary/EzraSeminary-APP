const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Firebase Admin SDK
// You need to download serviceAccountKey.json from Firebase Console
// Go to Project Settings > Service Accounts > Generate New Private Key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ezra-seminary-ffc4e'
});

// Store FCM tokens (in production, use a database)
const fcmTokens = new Set();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-dashboard.html'));
});

// Register FCM token
app.post('/register-token', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  fcmTokens.add(token);
  console.log(`Registered FCM token: ${token.substring(0, 20)}...`);
  
  res.json({ 
    success: true, 
    message: 'Token registered successfully',
    totalTokens: fcmTokens.size
  });
});

// Send notification to specific token
app.post('/send-to-token', async (req, res) => {
  try {
    const { token, title, body, data = {} } = req.body;
    
    if (!token || !title || !body) {
      return res.status(400).json({ 
        error: 'Token, title, and body are required' 
      });
    }
    
    const message = {
      token,
      notification: {
        title,
        body
      },
      data: {
        ...data,
        timestamp: Date.now().toString()
      },
      android: {
        priority: 'high',
        notification: {
          channelId: data.type === 'daily-verse' ? 'daily-verse' : 'general',
          sound: 'default',
          vibration: true
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };
    
    const response = await admin.messaging().send(message);
    
    console.log(`Notification sent successfully: ${response}`);
    
    res.json({
      success: true,
      messageId: response,
      message: 'Notification sent successfully'
    });
    
  } catch (error) {
    console.error('Error sending notification:', error);
    
    res.status(500).json({
      error: 'Failed to send notification',
      details: error.message
    });
  }
});

// Send notification to all registered tokens
app.post('/send-to-all', async (req, res) => {
  try {
    const { title, body, data = {} } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ 
        error: 'Title and body are required' 
      });
    }
    
    if (fcmTokens.size === 0) {
      return res.status(400).json({ 
        error: 'No registered tokens found' 
      });
    }
    
    const tokens = Array.from(fcmTokens);
    
    const message = {
      tokens,
      notification: {
        title,
        body
      },
      data: {
        ...data,
        timestamp: Date.now().toString()
      },
      android: {
        priority: 'high',
        notification: {
          channelId: data.type === 'daily-verse' ? 'daily-verse' : 'general',
          sound: 'default',
          vibration: true
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };
    
    const response = await admin.messaging().sendMulticast(message);
    
    console.log(`Multicast notification sent: ${response.successCount} successful, ${response.failureCount} failed`);
    
    res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      message: `Notification sent to ${response.successCount} devices`
    });
    
  } catch (error) {
    console.error('Error sending multicast notification:', error);
    
    res.status(500).json({
      error: 'Failed to send multicast notification',
      details: error.message
    });
  }
});

// Send notification to topic
app.post('/send-to-topic', async (req, res) => {
  try {
    const { topic, title, body, data = {} } = req.body;
    
    if (!topic || !title || !body) {
      return res.status(400).json({ 
        error: 'Topic, title, and body are required' 
      });
    }
    
    const message = {
      topic,
      notification: {
        title,
        body
      },
      data: {
        ...data,
        timestamp: Date.now().toString()
      },
      android: {
        priority: 'high',
        notification: {
          channelId: data.type === 'daily-verse' ? 'daily-verse' : 'general',
          sound: 'default',
          vibration: true
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };
    
    const response = await admin.messaging().send(message);
    
    console.log(`Topic notification sent successfully: ${response}`);
    
    res.json({
      success: true,
      messageId: response,
      message: `Notification sent to topic: ${topic}`
    });
    
  } catch (error) {
    console.error('Error sending topic notification:', error);
    
    res.status(500).json({
      error: 'Failed to send topic notification',
      details: error.message
    });
  }
});

// Get registered tokens count
app.get('/tokens/count', (req, res) => {
  res.json({
    count: fcmTokens.size,
    tokens: Array.from(fcmTokens).map(token => token.substring(0, 20) + '...')
  });
});

// Remove token
app.delete('/tokens/:token', (req, res) => {
  const { token } = req.params;
  
  if (fcmTokens.has(token)) {
    fcmTokens.delete(token);
    res.json({ 
      success: true, 
      message: 'Token removed successfully',
      remainingTokens: fcmTokens.size
    });
  } else {
    res.status(404).json({ 
      error: 'Token not found' 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    registeredTokens: fcmTokens.size
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 EzraApp Push Notification Server running on port ${PORT}`);
  console.log(`📱 Web Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 API Endpoints:`);
  console.log(`   POST /register-token - Register FCM token`);
  console.log(`   POST /send-to-token - Send to specific token`);
  console.log(`   POST /send-to-all - Send to all registered tokens`);
  console.log(`   POST /send-to-topic - Send to topic`);
  console.log(`   GET /tokens/count - Get token count`);
  console.log(`   GET /health - Health check`);
});

module.exports = app;

