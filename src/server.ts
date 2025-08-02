import { createServer } from 'http';
import app from './app';
import { ServerConfig } from '@interfaces/server.interface';

const server = createServer(app);

const config: ServerConfig = {
  port: 3000,
  host: 'localhost',
  nodeEnv: 'development',
};

server.listen(config.port, config.host, () => {
  console.log(`Server is running at http://${config.host}:${config.port}`);
});
