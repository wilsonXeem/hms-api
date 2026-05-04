import https from 'https';
import fs from 'fs';
import path from 'path';

export interface HTTPSConfig {
  key?: Buffer;
  cert?: Buffer;
  enabled: boolean;
}

export const getHTTPSConfig = (): HTTPSConfig => {
  const forceHttps = process.env.FORCE_HTTPS === 'true';
  const sslCertPath = process.env.SSL_CERT_PATH;
  const sslKeyPath = process.env.SSL_KEY_PATH;

  if (!forceHttps || !sslCertPath || !sslKeyPath) {
    return { enabled: false };
  }

  try {
    const key = fs.readFileSync(path.resolve(sslKeyPath));
    const cert = fs.readFileSync(path.resolve(sslCertPath));

    return {
      key,
      cert,
      enabled: true
    };
  } catch (error) {
    console.warn('HTTPS certificates not found, falling back to HTTP');
    return { enabled: false };
  }
};

export const createHTTPSServer = (app: any) => {
  const httpsConfig = getHTTPSConfig();
  
  if (httpsConfig.enabled && httpsConfig.key && httpsConfig.cert) {
    return https.createServer({
      key: httpsConfig.key,
      cert: httpsConfig.cert
    }, app);
  }
  
  return null;
};