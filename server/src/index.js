import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import branchRoutes from './routes/branches.js';
import machineRoutes from './routes/machines.js';
import feedbackRoutes from './routes/feedback.js';
import ussdRoutes from './routes/ussd.js';
import smsRoutes from './routes/sms.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // USSD gateways typically POST form-encoded

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/ussd', ussdRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`ATM Service Quality API listening on http://localhost:${PORT}`);
});
