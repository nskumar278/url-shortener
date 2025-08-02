import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json( {limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

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