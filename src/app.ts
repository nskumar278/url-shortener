import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import logger from '@configs/logger';

const app = express();

app.use(cors());
app.use(express.json( {limit: '10kb' }));

app.use(morgan('tiny', { 
  stream: { write: (message) => logger.info(message.trim()) } 
}));


app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Welcome to the URL Shortener API',
  });
});

app.use((_req, res, _next) => {
  res.status(404).json({
    message: 'Not Found',
  });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
  });
});

export default app;